import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { Visit } from './models';

export interface PendingVisit {
  id?: number;
  visit: Visit;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineVisitQueueService {
  pendingCount = signal(0);
  private dbPromise?: Promise<IDBDatabase>;

  constructor(private api: ApiService) {
    this.refreshCount();
  }

  async enqueue(visit: Visit): Promise<void> {
    const db = await this.db();
    await this.write(db, 'readwrite', (store) => {
      store.add({
        visit,
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

  async sync(): Promise<{ sent: number; failed: number }> {
    const db = await this.db();
    const items = await this.readAll(db);
    let sent = 0;
    let failed = 0;

    for (const item of items) {
      if (!item.id) {
        continue;
      }
      try {
        await firstValueFrom(this.api.createVisit(item.visit));
        await this.delete(db, item.id);
        sent++;
      } catch (error) {
        failed++;
        await this.updateFailure(db, item, this.message(error));
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
    } catch {
      this.pendingCount.set(0);
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

  private updateFailure(db: IDBDatabase, item: PendingVisit, lastError: string): Promise<void> {
    return this.write(db, 'readwrite', (store) => {
      store.put({ ...item, attempts: item.attempts + 1, lastError });
    });
  }

  private message(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message?: string }).message || 'Falha ao sincronizar.');
    }
    return 'Falha ao sincronizar.';
  }
}
