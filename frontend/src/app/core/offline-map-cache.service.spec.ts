import { TestBed } from '@angular/core/testing';
import { OfflineMapCacheService } from './offline-map-cache.service';

describe('OfflineMapCacheService', () => {
  let service: OfflineMapCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OfflineMapCacheService);
  });

  it('stores visits and territories for a later offline opening', async () => {
    await service.saveVisits([{
      id: 10,
      personName: 'Visita armazenada',
      city: 'Rio Tinto',
      latitude: -6.81,
      longitude: -35.08,
      wantsVisits: true
    }]);
    await service.saveTerritories([{
      id: 20,
      name: 'Território armazenado',
      teamId: 1,
      teamName: 'Equipe',
      color: '#123456',
      polygonGeoJson: '{"type":"Polygon","coordinates":[]}',
      active: true,
      enforceForProjectists: true
    }]);

    expect((await service.loadVisits())[0].personName).toBe('Visita armazenada');
    expect((await service.loadTerritories())[0].name).toBe('Território armazenado');
  });

  it('distinguishes an empty synchronized history from a missing local snapshot', async () => {
    await service.saveVisits([]);

    expect(await service.loadVisitsSnapshot()).toEqual({ items: [], available: true });
  });

  it('returns a safe unavailable state when no local snapshot can be read', async () => {
    spyOn<any>(service, 'loadSnapshot').and.resolveTo(undefined);

    expect(await service.loadVisitsSnapshot()).toEqual({ items: [], available: false });
  });
});
