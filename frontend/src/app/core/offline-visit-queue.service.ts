import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Visit } from './models';

export interface PendingVisit {
  id?: number;
  visit: Visit;
  createdAt: string;
  attempts: number;
  lastError?: string;
  lastAttempt?: {
    endpoint: string;
    status?: number;
    responseBody: string;
    exceptionMessage: string;
    payload: Record<string, unknown>;
    attemptedAt: string;
  };
}

export function normalizeOfflineVisit(source: Visit): Visit {
  const value = source as Visit & Record<string, unknown>;
  const photoData = optionalString(value.photoData);
  return {
    personName: requiredString(value.personName),
    phone: optionalString(value.phone),
    street: optionalString(value.street),
    number: optionalString(value.number),
    neighborhood: optionalString(value.neighborhood),
    city: requiredString(value.city) || 'Sertao',
    manualAddress: optionalString(value.manualAddress),
    latitude: optionalNumber(value.latitude),
    longitude: optionalNumber(value.longitude),
    wantsVisits: booleanValue(value.wantsVisits, true),
    personAge: optionalNumber(value.personAge),
    householdSize: optionalNumber(value.householdSize),
    referencePoint: optionalString(value.referencePoint),
    prayerRequest: optionalString(value.prayerRequest),
    nextVisitAt: optionalDate(value.nextVisitAt),
    notes: optionalString(value.notes),
    photoData,
    photoUrl: optionalString(value.photoUrl),
    photoContentType: optionalString(value.photoContentType) || (photoData ? dataUrlContentType(photoData) : undefined),
    photoFileName: optionalString(value.photoFileName) || (photoData ? 'ficha-offline.jpg' : undefined),
    streetViewUrl: optionalString(value.streetViewUrl)
  };
}

export function redactVisitPayload(payload: Visit): Record<string, unknown> {
  const sensitive = new Set([
    'personName', 'phone', 'street', 'number', 'neighborhood', 'manualAddress',
    'latitude', 'longitude', 'referencePoint', 'prayerRequest', 'notes',
    'photoData', 'photoUrl', 'streetViewUrl'
  ]);
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        sensitive.has(key)
          ? key === 'photoData' && typeof value === 'string'
            ? `[OCULTO: ${value.length} caracteres]`
            : '[OCULTO]'
          : value
      ])
  );
}

@Injectable({ providedIn: 'root' })
export class OfflineVisitQueueService {
  pendingCount = signal(0);
  pendingItems = signal<PendingVisit[]>([]);
  syncing = signal(false);
  private dbPromise?: Promise<IDBDatabase>;
  private syncPromise?: Promise<{ sent: number; failed: number }>;

  constructor(private http: HttpClient) {
    this.refreshCount();
  }

  async enqueue(visit: Visit): Promise<void> {
    const db = await this.db();
    await this.write(db, 'readwrite', (store) => {
      store.add({
        visit: normalizeOfflineVisit(visit),
        createdAt: new Date().toISOString(),
        attempts: 0
      });
    });
    await this.refreshCount();
  }

  async all(): Promise<PendingVisit[]> {
    const db = await this.db();
    return this.readAll(db);
  }

  sync(): Promise<{ sent: number; failed: number }> {
    if (this.syncPromise) {
      return this.syncPromise;
    }
    this.syncing.set(true);
    this.syncPromise = this.runSync()
      .catch((error) => {
        console.error('[Sincronização offline] Exceção:', this.exceptionMessage(error));
        throw error;
      })
      .finally(() => {
        this.syncing.set(false);
        this.syncPromise = undefined;
      });
    return this.syncPromise;
  }

  async remove(id: number): Promise<void> {
    const db = await this.db();
    await this.delete(db, id);
    await this.refreshCount();
  }

  private async runSync(): Promise<{ sent: number; failed: number }> {
    const db = await this.db();
    const items = await this.readAll(db);
    const url = `${environment.apiBaseUrl}/visits`;
    console.info('[Sincronização offline] Fichas pendentes:', items.length);
    let sent = 0;
    let failed = 0;

    for (const item of items) {
      if (!item.id) {
        continue;
      }
      const payload = normalizeOfflineVisit(item.visit);
      const redactedPayload = redactVisitPayload(payload);
      try {
        console.info('[Sincronização offline] URL:', url);
        console.info('[Sincronização offline] Payload:', redactedPayload);
        const response = await firstValueFrom(
          this.http.post<Visit>(url, payload, { observe: 'response' })
        );
        console.info('[Sincronização offline] Status HTTP:', response.status);
        console.info('[Sincronização offline] Corpo da resposta:', response.body);
        if (response.status >= 200 && response.status < 300) {
          await this.delete(db, item.id);
          sent++;
        }
      } catch (error) {
        const status = error instanceof HttpErrorResponse ? error.status : undefined;
        const responseBody = error instanceof HttpErrorResponse ? this.serialize(error.error) : '';
        const exceptionMessage = this.exceptionMessage(error);
        if (error instanceof HttpErrorResponse) {
          console.error('[Sincronização offline] Status HTTP:', status);
          console.error('[Sincronização offline] Corpo da resposta:', responseBody);
        }
        console.error('[Sincronização offline] Exceção:', exceptionMessage);
        failed++;
        await this.updateFailure(db, {
          ...item,
          visit: payload,
          lastError: this.fullError(error),
          lastAttempt: {
            endpoint: url,
            status,
            responseBody,
            exceptionMessage,
            payload: redactedPayload,
            attemptedAt: new Date().toISOString()
          }
        });
      }
    }

    await this.refreshCount();
    return { sent, failed };
  }

  async refreshCount(): Promise<void> {
    try {
      const db = await this.db();
      const items = await this.readAll(db);
      this.pendingCount.set(items.length);
      this.pendingItems.set(items);
    } catch {
      this.pendingCount.set(0);
      this.pendingItems.set([]);
    }
  }

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open('vinde-sertao-offline', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('visits')) {
            db.createObjectStore('visits', { keyPath: 'id', autoIncrement: true });
          }
        };
      });
    }
    return this.dbPromise;
  }

  private write(db: IDBDatabase, mode: IDBTransactionMode, action: (store: IDBObjectStore) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('visits', mode);
      const store = transaction.objectStore('visits');
      action(store);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private readAll(db: IDBDatabase): Promise<PendingVisit[]> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('visits', 'readonly');
      const request = transaction.objectStore('visits').getAll();
      request.onsuccess = () => resolve(request.result as PendingVisit[]);
      request.onerror = () => reject(request.error);
    });
  }

  private delete(db: IDBDatabase, id: number): Promise<void> {
    return this.write(db, 'readwrite', (store) => store.delete(id));
  }

  private updateFailure(db: IDBDatabase, item: PendingVisit): Promise<void> {
    return this.write(db, 'readwrite', (store) => {
      store.put({ ...item, attempts: item.attempts + 1 });
    });
  }

  private fullError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const body = this.serialize(error.error);
      return [
        `HTTP ${error.status}`,
        body && `Resposta: ${body}`,
        `Exceção: ${this.exceptionMessage(error)}`
      ].filter(Boolean).join(' | ');
    }
    return this.exceptionMessage(error);
  }

  private serialize(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private exceptionMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}

function requiredString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function optionalString(value: unknown): string | undefined {
  const normalized = requiredString(value);
  return normalized || undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === '' || value == null) {
    return undefined;
  }
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'false' || value === 0 || value === '0') {
    return false;
  }
  if (value === 'true' || value === 1 || value === '1') {
    return true;
  }
  return fallback;
}

function optionalDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function dataUrlContentType(value: string): string {
  return /^data:([^;,]+)/.exec(value)?.[1] || 'image/jpeg';
}
