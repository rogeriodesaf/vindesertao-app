import { Injectable } from '@angular/core';
import { Territory, Visit } from './models';

type MapSnapshotKey = 'visits' | 'territories';

interface MapSnapshot<T> {
  key: MapSnapshotKey;
  value: T;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineMapCacheService {
  private dbPromise?: Promise<IDBDatabase>;

  saveVisits(visits: Visit[]): Promise<void> {
    return this.save('visits', visits);
  }

  saveTerritories(territories: Territory[]): Promise<void> {
    return this.save('territories', territories);
  }

  loadVisits(): Promise<Visit[]> {
    return this.load<Visit[]>('visits', []);
  }

  loadTerritories(): Promise<Territory[]> {
    return this.load<Territory[]>('territories', []);
  }

  private async save<T>(key: MapSnapshotKey, value: T): Promise<void> {
    const db = await this.db();
    await this.write(db, {
      key,
      value,
      updatedAt: new Date().toISOString()
    });
  }

  private async load<T>(key: MapSnapshotKey, fallback: T): Promise<T> {
    try {
      const db = await this.db();
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction('map-snapshots', 'readonly');
        const request = transaction.objectStore('map-snapshots').get(key);
        request.onsuccess = () => resolve((request.result as MapSnapshot<T> | undefined)?.value ?? fallback);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return fallback;
    }
  }

  private write<T>(db: IDBDatabase, snapshot: MapSnapshot<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('map-snapshots', 'readwrite');
      transaction.objectStore('map-snapshots').put(snapshot);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open('vinde-sertao-map-cache', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('map-snapshots')) {
            request.result.createObjectStore('map-snapshots', { keyPath: 'key' });
          }
        };
      });
    }
    return this.dbPromise;
  }
}
