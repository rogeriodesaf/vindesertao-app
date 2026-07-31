import { Injectable } from '@angular/core';
import { AppUser, Team, Territory, TerritoryDistributionPlan, Visit } from './models';

type MapSnapshotKey = 'visits' | 'territories' | 'teams' | 'users' | 'distribution-draft' | 'offline-package';

export interface OfflinePackageMetadata {
  updatedAt: string;
  sizeBytes: number;
  mapVersions: Record<string, string>;
  visitCount: number;
  territoryCount: number;
  teamCount: number;
  userCount: number;
  cachedPhotoCount: number;
  photoCount: number;
}

export interface OfflineMapArchive {
  id: string;
  url: string;
  version: string;
}

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

  saveTeams(teams: Team[]): Promise<void> {
    return this.save('teams', teams);
  }

  loadTeams(): Promise<Team[]> {
    return this.load<Team[]>('teams', []);
  }

  saveUsers(users: AppUser[]): Promise<void> {
    return this.save('users', users);
  }

  loadUsers(): Promise<AppUser[]> {
    return this.load<AppUser[]>('users', []);
  }

  saveDistributionDraft(draft: TerritoryDistributionPlan | null): Promise<void> {
    return this.save('distribution-draft', draft);
  }

  loadDistributionDraft(): Promise<TerritoryDistributionPlan | null> {
    return this.load<TerritoryDistributionPlan | null>('distribution-draft', null);
  }

  loadPackageMetadata(): Promise<OfflinePackageMetadata | null> {
    return this.load<OfflinePackageMetadata | null>('offline-package', null);
  }

  async estimateArchiveBytes(archives: OfflineMapArchive[]): Promise<number | null> {
    let total = 0;
    for (const archive of archives) {
      try {
        const cached = await this.cachedMapResponse(archive.url);
        if (cached) {
          total += (await cached.blob()).size;
          continue;
        }
        const response = await fetch(archive.url, { method: 'HEAD' });
        const length = Number(response.headers.get('content-length'));
        if (!response.ok || !Number.isFinite(length) || length <= 0) return null;
        total += length;
      } catch {
        return null;
      }
    }
    return total;
  }

  async prepareOfflinePackage(
    archives: OfflineMapArchive[],
    territories: Territory[],
    visits: Visit[],
    teams: Team[],
    users: AppUser[]
  ): Promise<OfflinePackageMetadata> {
    let sizeBytes = 0;
    const cache = await caches.open('vinde-sertao-offline-maps-v1');
    for (const archive of archives) {
      const response = await fetch(archive.url, { cache: 'reload' });
      if (!response.ok) throw new Error(`Mapa ${archive.id}: HTTP ${response.status}`);
      const blob = await response.clone().blob();
      sizeBytes += blob.size;
      await cache.put(archive.url, response.clone());
    }
    const mediaCache = await caches.open('vinde-sertao-offline-media-v1');
    const photoUrls = [...new Set(visits.map(visit => visit.photoUrl).filter((url): url is string => !!url))];
    let cachedPhotoCount = 0;
    for (const photoUrl of photoUrls) {
      try {
        const response = await fetch(photoUrl);
        if (!response.ok) continue;
        sizeBytes += (await response.clone().blob()).size;
        await mediaCache.put(photoUrl, response.clone());
        cachedPhotoCount++;
      } catch {
        // A ficha continua disponivel; a contagem informa fotos que nao puderam ser preparadas.
      }
    }
    await Promise.all([this.saveVisits(visits), this.saveTerritories(territories), this.saveTeams(teams), this.saveUsers(users)]);
    const metadata: OfflinePackageMetadata = {
      updatedAt: new Date().toISOString(),
      sizeBytes,
      mapVersions: Object.fromEntries(archives.map(archive => [archive.id, archive.version])),
      visitCount: visits.length,
      territoryCount: territories.length,
      teamCount: teams.length,
      userCount: users.length,
      cachedPhotoCount,
      photoCount: photoUrls.length
    };
    await this.save('offline-package', metadata);
    return metadata;
  }

  async mapArchive(url: string): Promise<Response> {
    const cached = await this.cachedMapResponse(url);
    return cached ?? fetch(url);
  }

  private async cachedMapResponse(url: string): Promise<Response | undefined> {
    if (typeof caches === 'undefined') return undefined;
    const response = await caches.match(url);
    return response?.clone();
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
