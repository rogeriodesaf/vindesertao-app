import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { Visit } from './models';
import { normalizeOfflineVisit, OfflineVisitQueueService, redactVisitPayload } from './offline-visit-queue.service';

describe('offline visit payload', () => {
  it('normalizes legacy values to the current visit DTO', () => {
    const legacy = {
      personName: ' Teste antigo ',
      city: '',
      wantsVisits: 'false',
      personAge: '32',
      householdSize: '4',
      latitude: '-7.23',
      longitude: '-39.31',
      nextVisitAt: 'data-invalida',
      photoData: 'data:image/png;base64,abc',
      id: 99,
      responsibleUserId: 10,
      createdAt: '2026-01-01'
    } as unknown as Visit;

    const payload = normalizeOfflineVisit(legacy);

    expect(payload.personName).toBe('Teste antigo');
    expect(payload.city).toBe('Sertao');
    expect(payload.wantsVisits).toBeFalse();
    expect(payload.personAge).toBe(32);
    expect(payload.householdSize).toBe(4);
    expect(payload.latitude).toBe(-7.23);
    expect(payload.longitude).toBe(-39.31);
    expect(payload.nextVisitAt).toBeUndefined();
    expect(payload.photoContentType).toBe('image/png');
    expect(payload.photoFileName).toBe('ficha-offline.jpg');
    expect('id' in payload).toBeFalse();
    expect('responsibleUserId' in payload).toBeFalse();
    expect('createdAt' in payload).toBeFalse();
  });

  it('uses the same required field types as the online DTO', () => {
    const payload = normalizeOfflineVisit({
      personName: 'Pessoa',
      city: 'Sertao',
      wantsVisits: true
    });

    expect(typeof payload.personName).toBe('string');
    expect(typeof payload.city).toBe('string');
    expect(typeof payload.wantsVisits).toBe('boolean');
  });

  it('redacts personal, location and photo data from diagnostics', () => {
    const diagnostic = redactVisitPayload(normalizeOfflineVisit({
      personName: 'Pessoa',
      phone: '88999999999',
      city: 'Sertao',
      latitude: -7.23,
      longitude: -39.31,
      wantsVisits: true,
      prayerRequest: 'conteudo privado',
      photoData: 'data:image/jpeg;base64,abc'
    }));

    expect(diagnostic['personName']).toBe('[OCULTO]');
    expect(diagnostic['phone']).toBe('[OCULTO]');
    expect(diagnostic['latitude']).toBe('[OCULTO]');
    expect(diagnostic['prayerRequest']).toBe('[OCULTO]');
    expect(String(diagnostic['photoData'])).toContain('[OCULTO:');
    expect(diagnostic['city']).toBe('Sertao');
    expect(diagnostic['wantsVisits']).toBeTrue();
  });
});

describe('OfflineVisitQueueService sync', () => {
  let service: OfflineVisitQueueService;
  let http: HttpTestingController;
  const endpoint = `${environment.apiBaseUrl}/visits`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(OfflineVisitQueueService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('keeps full diagnostics after failure and removes the item only after success', async () => {
    await service.enqueue({
      personName: ' Teste legado ',
      city: '',
      wantsVisits: true
    });

    const failedSync = service.sync();
    await waitForRequest();
    const failedRequest = http.expectOne(endpoint);
    expect(failedRequest.request.body.personName).toBe('Teste legado');
    expect(failedRequest.request.body.city).toBe('Sertao');
    failedRequest.flush(
      { status: 500, detail: 'Nao foi possivel concluir a operacao.' },
      { status: 500, statusText: 'Internal Server Error' }
    );

    expect(await failedSync).toEqual({ sent: 0, failed: 1 });
    const pending = await service.all();
    expect(pending.length).toBe(1);
    expect(pending[0].attempts).toBe(1);
    expect(pending[0].lastError).toContain('HTTP 500');
    expect(pending[0].lastAttempt?.endpoint).toBe(endpoint);
    expect(pending[0].lastAttempt?.status).toBe(500);
    expect(pending[0].lastAttempt?.responseBody).toContain('Nao foi possivel concluir');
    expect(pending[0].lastAttempt?.exceptionMessage).toContain('500 Internal Server Error');
    expect(pending[0].lastAttempt?.payload['personName']).toBe('[OCULTO]');

    const successfulSync = service.sync();
    await waitForRequest();
    http.expectOne(endpoint).flush(
      { id: 123, personName: 'Teste legado', city: 'Sertao', wantsVisits: true },
      { status: 200, statusText: 'OK' }
    );

    expect(await successfulSync).toEqual({ sent: 1, failed: 0 });
    expect(await service.all()).toEqual([]);

    expect(await service.sync()).toEqual({ sent: 0, failed: 0 });
  });

  it('synchronizes JPEG and PNG photos once and does not repeat after success', async () => {
    await service.enqueue({
      personName: 'Foto JPEG',
      city: 'Sertao',
      wantsVisits: true,
      photoData: 'data:image/jpeg;base64,/9j/2Q==',
      photoContentType: 'image/jpeg',
      photoFileName: 'foto.jpg'
    });
    await service.enqueue({
      personName: 'Foto PNG',
      city: 'Sertao',
      wantsVisits: true,
      photoData: 'data:image/png;base64,iVBORw0KGgo=',
      photoContentType: 'image/png',
      photoFileName: 'foto.png'
    });

    const sync = service.sync();
    await waitForRequest();
    const jpeg = http.expectOne(endpoint);
    expect(jpeg.request.body.photoData).toBe('data:image/jpeg;base64,/9j/2Q==');
    jpeg.flush({ id: 201, personName: 'Foto JPEG', city: 'Sertao', wantsVisits: true });

    await waitForRequest();
    const png = http.expectOne(endpoint);
    expect(png.request.body.photoData).toBe('data:image/png;base64,iVBORw0KGgo=');
    png.flush({ id: 202, personName: 'Foto PNG', city: 'Sertao', wantsVisits: true });

    expect(await sync).toEqual({ sent: 2, failed: 0 });
    expect(await service.all()).toEqual([]);
    expect(await service.sync()).toEqual({ sent: 0, failed: 0 });
  });
});

async function waitForRequest(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 20));
}
