import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { SlicePipe } from '@angular/common';
import { AfterViewInit, Component, NgZone, OnDestroy, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import * as L from 'leaflet';
import { finalize } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { formatDateTime } from '../core/date-format';
import { Territory, Visit } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { OfflineVisitQueueService } from '../core/offline-visit-queue.service';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { ListCardComponent } from '../shared/list-card.component';

@Component({
  selector: 'app-visits',
  standalone: true,
  imports: [FormsModule, SlicePipe, ListCardComponent, EmptyStateComponent],
  template: `
    <div class="mobile-view-toggle" role="group" aria-label="Visualização da tela de visitas">
      <button type="button" [class.active]="mobileView() === 'form'" (click)="showMobileView('form')">Cadastro</button>
      <button type="button" [class.active]="mobileView() === 'map'" (click)="showMobileView('map')">Mapa</button>
    </div>
    <section class="workspace" [class.mobile-map-view]="mobileView() === 'map'">
      <div class="map-panel">
        <div class="map-toolbar">
          <input placeholder="Buscar endereço" [(ngModel)]="searchText" (keyup.enter)="searchAddress()">
          <button type="button" [disabled]="searchingAddress()" (click)="searchAddress()">{{ searchingAddress() ? 'Buscando...' : 'Buscar' }}</button>
          <button type="button" class="secondary" [disabled]="exporting()" (click)="downloadExcel()">{{ exporting() ? 'Gerando...' : 'Excel' }}</button>
        </div>
        <div id="visit-map" class="map"></div>
        <button type="button" class="map-location-button" [disabled]="locatingMap()"
          aria-label="Centralizar na minha localização" title="Minha localização" (click)="locateUser(true)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v3m0 14v3M2 12h3m14 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"></path></svg>
        </button>
        @if (mapLocationMessage()) { <div class="map-location-message">{{ mapLocationMessage() }}</div> }
        @if (territoryStatus()) {
          <div class="territory-status" [class.outside]="territoryOutside()">{{ territoryStatus() }}</div>
        }
      </div>

      <aside class="side-panel">
        @if (canManageVisits()) {
          <section class="offline-card" [class.offline-card-warning]="!online() || offlineQueue.pendingCount() > 0">
            <div>
              <strong>{{ online() ? 'Modo online' : 'Sem internet' }}</strong>
              <span>{{ offlineStatusText() }}</span>
            </div>
            @if (offlineQueue.pendingCount() > 0) {
              <div class="offline-actions">
                <button type="button" class="secondary" [disabled]="offlineQueue.syncing()" (click)="syncOfflineVisits()">
                  {{ offlineQueue.syncing() ? 'Sincronizando...' : 'Sincronizar agora' }}
                </button>
                <button type="button" class="secondary" (click)="pendingOpen.set(!pendingOpen())">
                  {{ pendingOpen() ? 'Ocultar pendências' : 'Ver pendências' }}
                </button>
              </div>
            }
          </section>
          @if (pendingOpen() && offlineQueue.pendingItems().length) {
            <section class="pending-list" aria-label="Fichas pendentes">
              @for (pending of offlineQueue.pendingItems(); track pending.id) {
                <article>
                  <div>
                    <strong>{{ pending.visit.personName || 'Sem identificação' }}</strong>
                    <span>{{ formatDate(pending.createdAt) }}</span>
                    <small>Tentativas: {{ pending.attempts }}</small>
                    @if (pending.lastError) { <small class="error">Último erro: {{ pending.lastError }}</small> }
                  </div>
                  @if (pending.id) {
                    <button type="button" class="secondary" (click)="removePending(pending.id, pending.visit.personName)">Excluir</button>
                  }
                </article>
              }
            </section>
          }
        }

        @if (canManageVisits()) {
          <h2>{{ editingId() ? 'Editar visita' : 'Nova visita' }}</h2>
          <form #visitForm="ngForm" novalidate (ngSubmit)="save(visitForm)">
            <label>Nome da pessoa<input name="personName" [(ngModel)]="form.personName" required></label>
            <label>Telefone<input name="phone" type="tel" inputmode="tel" [(ngModel)]="form.phone"></label>
            <label class="check-row">
              <input name="wantsVisits" type="checkbox" [(ngModel)]="form.wantsVisits">
              Deseja receber visitas?
            </label>
            <label>Pedido de oração<textarea name="prayerRequest" [(ngModel)]="form.prayerRequest"></textarea></label>
            <label>Observações<textarea name="notes" [(ngModel)]="form.notes"></textarea></label>

            <section class="location-card">
              <div>
                <strong>Localização</strong>
                <span>{{ geolocationMessage() || 'Use o GPS ou marque o ponto diretamente no mapa.' }}</span>
              </div>
              <button type="button" class="secondary" [disabled]="geolocationState() === 'loading'" (click)="useMyLocation()">
                {{ geolocationState() === 'loading' ? 'Buscando localização...' : 'Usar minha localização' }}
              </button>
              <div class="form-grid coordinates">
                <label>Latitude<input name="latitude" type="number" step="any" [(ngModel)]="form.latitude" (ngModelChange)="manualCoordinatesChanged()"></label>
                <label>Longitude<input name="longitude" type="number" step="any" [(ngModel)]="form.longitude" (ngModelChange)="manualCoordinatesChanged()"></label>
              </div>
              <button type="button" class="secondary mobile-only-action" (click)="showMobileView('map')">Abrir mapa para ajustar</button>
              @if (territoryStatus()) {
                <small [class.error]="territoryOutside()">{{ territoryStatus() }}</small>
              }
            </section>

            <div class="photo-field">
              <strong>Foto da casa</strong>
              <div class="photo-actions">
                <label class="button">Abrir câmera<input class="visually-hidden" type="file" accept="image/*" capture="environment" (change)="attachPhoto($event)"></label>
                <label class="button secondary">Escolher da galeria<input class="visually-hidden" type="file" accept="image/*" (change)="attachPhoto($event)"></label>
              </div>
              @if (photoPreview()) {
                <div class="photo-preview">
                  <img [src]="photoPreview()" alt="Foto anexada à ficha">
                  <div>
                    <strong>{{ form.photoFileName || 'Foto anexada' }}</strong>
                    <small>Esta foto será salva junto com a ficha da casa.</small>
                    <button type="button" class="secondary" (click)="removePhoto()">Remover foto</button>
                  </div>
                </div>
              }
            </div>

            <details class="more-fields">
              <summary>Mais informações</summary>
              <div class="more-fields-content">
                <div class="form-grid">
                  <label>Rua<input name="street" [(ngModel)]="form.street"></label>
                  <label>Número<input name="number" [(ngModel)]="form.number"></label>
                </div>
                <div class="form-grid">
                  <label>Bairro<input name="neighborhood" [(ngModel)]="form.neighborhood"></label>
                  <label>Cidade<input name="city" [(ngModel)]="form.city" required></label>
                </div>
                <label>Endereço manual<textarea name="manualAddress" [(ngModel)]="form.manualAddress"></textarea></label>
                <div class="form-grid">
                  <label>Idade<input name="personAge" type="number" min="0" [(ngModel)]="form.personAge"></label>
                  <label>Moradores na casa<input name="householdSize" type="number" min="0" [(ngModel)]="form.householdSize"></label>
                </div>
                <label>Ponto de referência<textarea name="referencePoint" [(ngModel)]="form.referencePoint"></textarea></label>
                <label>Próxima visita<input name="nextVisitAt" type="datetime-local" [ngModel]="toLocalDateTime(form.nextVisitAt)" (ngModelChange)="setNextVisitAt($event)"></label>
                <label>Link do Street View<input name="streetViewUrl" type="url" placeholder="Cole aqui o link do Google Street View" [(ngModel)]="form.streetViewUrl"></label>
                <button type="button" class="secondary" [disabled]="!hasStreetViewTarget()" (click)="openStreetView()">Ver no Street View</button>
              </div>
            </details>
            @if (message()) {
              <p class="success">{{ message() }}</p>
            }
            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
            <div class="actions">
              <button type="submit" class="save-visit" [disabled]="saving()">{{ saving() ? 'Salvando...' : 'Salvar visita' }}</button>
              <button type="button" class="secondary" [disabled]="saving()" (click)="resetForm()">Limpar</button>
            </div>
          </form>
        } @else {
          <section class="map-summary-card">
            <h2>Mapa de visitas realizadas</h2>
            <p class="muted">Acompanhe aqui as casas marcadas pelas equipes de evangelismo. O mapa atualiza automaticamente enquanto esta tela estiver aberta.</p>
            <strong>{{ visits().length }} casa(s) carregada(s) no mapa</strong>
          </section>
        }

        <div class="filters">
          <h2>{{ visitListTitle() }}</h2>
          <div class="form-grid">
            <input placeholder="Bairro" [(ngModel)]="filters.neighborhood" (keyup.enter)="loadVisits()">
            <select [(ngModel)]="filters.wantsVisits" (change)="loadVisits()">
              <option value="">Todas</option>
              <option value="true">Aceita</option>
              <option value="false">Não aceita</option>
            </select>
          </div>
          <button type="button" class="secondary full" [disabled]="loadingVisits()" (click)="loadVisits()">{{ loadingVisits() ? 'Carregando...' : 'Filtrar' }}</button>
        </div>

        <div class="visit-list unified-list">
          @for (visit of visits(); track visit.id) {
            <app-list-card [title]="visit.personName" [interactive]="true" (activate)="selectVisit(visit)"
              [infos]="[
                { icon: 'location', text: visit.neighborhood || visit.manualAddress || visit.city },
                { icon: 'volunteer', text: showResponsibleName() ? (visit.responsibleUserName || 'Responsável não informado') : '' },
                { icon: 'description', text: visit.hasPhoto ? 'Foto anexada' : '' },
                { icon: 'calendar', text: formatDate(visit.createdAt) }
              ]" />
          } @empty {
            <app-empty-state message="Nenhuma visita encontrada." />
          }
        </div>
      </aside>
    </section>
  `
})
export class VisitsComponent implements AfterViewInit, OnDestroy {
  form: Visit = this.blankVisit();
  filters: { neighborhood: string; wantsVisits: string } = { neighborhood: '', wantsVisits: '' };
  visits = signal<Visit[]>([]);
  territories = signal<Territory[]>([]);
  editingId = signal<number | null>(null);
  message = signal('');
  error = signal('');
  online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  saving = signal(false);
  loadingVisits = signal(false);
  loadingTerritories = signal(false);
  searchingAddress = signal(false);
  exporting = signal(false);
  pendingOpen = signal(false);
  mobileView = signal<'form' | 'map'>('form');
  geolocationState = signal<'idle' | 'loading' | 'success' | 'denied' | 'unavailable' | 'timeout'>('idle');
  geolocationMessage = signal('');
  locatingMap = signal(false);
  mapLocationMessage = signal('');
  territoryStatus = signal('');
  territoryOutside = signal(false);
  searchText = '';
  private map?: L.Map;
  private marker?: L.Marker;
  private userLocationMarker?: L.CircleMarker;
  private userCoordinates?: L.LatLngTuple;
  private visitLayer = L.layerGroup();
  private territoryLayer = L.layerGroup();
  private refreshHandle?: ReturnType<typeof setInterval>;
  private mapTileWarningShown = false;

  constructor(public api: ApiService, private http: HttpClient, private auth: AuthService, private zone: NgZone, private notifications: NotificationService, public offlineQueue: OfflineVisitQueueService) {}

  ngAfterViewInit(): void {
    if (!window.matchMedia('(max-width: 900px)').matches) this.initializeMap();
    this.loadTerritories();
    this.loadVisits();
    if (!this.canManageVisits()) this.refreshHandle = setInterval(() => this.loadVisits(), 30000);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
    this.offlineQueue.refreshCount();
  }

  private initializeMap(): void {
    if (this.map) return;
    this.map = L.map('visit-map', { zoomControl: false }).setView([-7.229, -39.313], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).on('tileerror', () => {
      if (!this.mapTileWarningShown) {
        this.mapTileWarningShown = true;
        this.notifications.info('O mapa não pôde carregar completamente. O formulário continua disponível.');
      }
    }).addTo(this.map);
    this.territoryLayer.addTo(this.map);
    this.visitLayer.addTo(this.map);
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      if (this.canManageVisits()) {
        this.selectPoint(event.latlng.lat, event.latlng.lng);
      }
    });
    this.renderTerritories();
    this.renderMarkers(this.visits());
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    this.map?.remove();
  }

  loadVisits(): void {
    if (this.loadingVisits()) {
      return;
    }
    this.loadingVisits.set(true);
    this.api.visits({ page: 0, size: 100, neighborhood: this.filters.neighborhood, wantsVisits: this.filters.wantsVisits || undefined })
      .pipe(finalize(() => this.loadingVisits.set(false)))
      .subscribe({
        next: (page) => {
          this.visits.set(page.items);
          this.renderMarkers(page.items);
          this.refreshMapView();
        },
        error: () => this.fail('Não foi possível carregar as visitas. O formulário continua disponível.')
      });
  }

  loadTerritories(): void {
    if (this.loadingTerritories()) {
      return;
    }
    this.loadingTerritories.set(true);
    this.api.territories().pipe(finalize(() => this.loadingTerritories.set(false))).subscribe({
      next: (territories) => {
        this.territories.set(territories);
        this.renderTerritories();
        this.updateTerritoryStatus();
        this.refreshMapView();
      },
      error: () => this.notifications.error('Não foi possível carregar os territórios. Tente novamente mais tarde.')
    });
  }

  searchAddress(): void {
    if (!this.searchText.trim()) {
      return;
    }
    if (this.searchingAddress()) {
      return;
    }
    this.searchingAddress.set(true);
    const url = 'https://nominatim.openstreetmap.org/search';
    this.http.get<Array<{ lat: string; lon: string; display_name: string }>>(url, {
      params: { q: this.searchText, format: 'json', limit: 1, addressdetails: 1 }
    }).pipe(finalize(() => this.searchingAddress.set(false))).subscribe({
      next: (results) => {
        const first = results[0];
        if (!first) {
          if (this.canManageVisits()) {
            this.form.manualAddress = this.searchText;
          }
          this.message.set(this.canManageVisits()
            ? 'Endereço não encontrado. Preencha manualmente e salve.'
            : 'Endereço não encontrado.');
          this.notifications.info(this.message());
          return;
        }
        if (this.canManageVisits()) {
          this.form.manualAddress = first.display_name;
          this.selectPoint(Number(first.lat), Number(first.lon));
        }
        this.map?.setView([Number(first.lat), Number(first.lon)], 17);
      },
      error: () => this.fail('A busca de endereço falhou. Você pode preencher o endereço ou marcar o ponto manualmente.')
    });
  }

  save(form: NgForm): void {
    if (this.saving()) {
      return;
    }
    this.message.set('');
    this.error.set('');
    if (form.invalid) {
      const details = document.querySelector<HTMLDetailsElement>('.more-fields');
      if (details) details.open = true;
      this.fail('Preencha os campos obrigatórios antes de salvar.');
      return;
    }
    const payload = { ...this.form };
    const editing = !!this.editingId();
    this.saving.set(true);
    if (!editing && typeof navigator !== 'undefined' && !navigator.onLine) {
      this.enqueueOffline(payload);
      return;
    }
    const action = this.editingId()
      ? this.api.updateVisit(this.editingId() as number, payload)
      : this.api.createVisit(payload);
    action.subscribe({
      next: () => {
        this.saving.set(false);
        this.ok(editing ? 'Ficha de visita atualizada com sucesso.' : 'Ficha de visita salva com sucesso.');
        this.resetForm();
        this.loadVisits();
      },
      error: (response: HttpErrorResponse) => this.handleSaveError(response, payload, editing)
    });
  }

  edit(visit: Visit): void {
    if (!visit.id) {
      return;
    }
    this.api.visit(visit.id).subscribe((fullVisit) => {
      this.form = { ...fullVisit };
      this.editingId.set(fullVisit.id ?? null);
      if (fullVisit.latitude && fullVisit.longitude) {
        this.selectPoint(fullVisit.latitude, fullVisit.longitude);
        this.map?.setView([fullVisit.latitude, fullVisit.longitude], 17);
        this.scrollMapIntoView();
      }
    });
  }

  selectVisit(visit: Visit): void {
    if (this.canEditVisit(visit)) {
      this.edit(visit);
      return;
    }
    if (visit.latitude && visit.longitude) {
      this.map?.setView([visit.latitude, visit.longitude], 18);
      this.scrollMapIntoView();
    }
  }

  resetForm(): void {
    if (this.saving()) {
      return;
    }
    this.form = this.blankVisit();
    this.editingId.set(null);
    this.error.set('');
    this.marker?.remove();
    this.marker = undefined;
    this.geolocationState.set('idle');
    this.geolocationMessage.set('');
    this.territoryStatus.set('');
    this.territoryOutside.set(false);
  }

  showMobileView(view: 'form' | 'map'): void {
    this.mobileView.set(view);
    if (view === 'map') {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        this.initializeMap();
        this.map?.invalidateSize();
        this.renderMarkers(this.visits());
        this.renderTerritories();
        this.locateUser(false);
        document.querySelector('.mobile-view-toggle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));
    }
  }

  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.geolocationState.set('unavailable');
      this.geolocationMessage.set('Localização indisponível neste aparelho ou navegador.');
      return;
    }
    this.geolocationState.set('loading');
    this.geolocationMessage.set('Buscando localização...');
    navigator.geolocation.getCurrentPosition(
      (position) => this.zone.run(() => {
        const { latitude, longitude } = position.coords;
        this.setPoint(latitude, longitude);
        this.map?.setView([latitude, longitude], 18);
        this.geolocationState.set('success');
        this.geolocationMessage.set('Localização encontrada. Você ainda pode ajustar o ponto no mapa.');
        this.ok('Localização encontrada e adicionada à ficha.');
      }),
      (geoError) => this.zone.run(() => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          this.geolocationState.set('denied');
          this.geolocationMessage.set('Permissão de localização negada. Marque o ponto manualmente no mapa.');
        } else if (geoError.code === geoError.TIMEOUT) {
          this.geolocationState.set('timeout');
          this.geolocationMessage.set('A busca de localização demorou demais. Tente novamente ou use o mapa.');
        } else {
          this.geolocationState.set('unavailable');
          this.geolocationMessage.set('Não foi possível obter a localização. Marque o ponto manualmente no mapa.');
        }
        this.notifications.error(this.geolocationMessage());
      }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  locateUser(centerMap = false): void {
    if (this.locatingMap()) return;
    if (!navigator.geolocation) {
      this.mapLocationMessage.set('Localização não suportada neste dispositivo.');
      this.notifications.warning(this.mapLocationMessage());
      this.refreshMapView();
      return;
    }
    this.locatingMap.set(true);
    this.mapLocationMessage.set('Obtendo sua localização...');
    navigator.geolocation.getCurrentPosition(
      position => this.zone.run(() => {
        const point: L.LatLngTuple = [position.coords.latitude, position.coords.longitude];
        this.userCoordinates = point;
        if (this.userLocationMarker) this.userLocationMarker.setLatLng(point);
        else {
          this.userLocationMarker = L.circleMarker(point, {
            radius: 9, color: '#ffffff', weight: 3, fillColor: '#1976d2', fillOpacity: 1
          }).bindPopup('Você está aqui');
          this.userLocationMarker.addTo(this.map as L.Map);
        }
        this.locatingMap.set(false);
        this.mapLocationMessage.set('Você está aqui');
        this.map?.invalidateSize();
        if (centerMap) this.map?.setView(point, 16);
        else this.refreshMapView();
      }),
      error => this.zone.run(() => {
        this.locatingMap.set(false);
        const message = error.code === error.PERMISSION_DENIED
          ? 'Permissão de localização não concedida.'
          : error.code === error.TIMEOUT
            ? 'A localização demorou mais que o esperado.'
            : 'Não foi possível obter sua localização.';
        this.mapLocationMessage.set(message);
        this.notifications.warning(message);
        this.refreshMapView();
      }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  manualCoordinatesChanged(): void {
    if (this.form.latitude == null || this.form.longitude == null) {
      this.territoryStatus.set('');
      this.territoryOutside.set(false);
      return;
    }
    const latitude = Number(this.form.latitude);
    const longitude = Number(this.form.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      this.setPoint(latitude, longitude);
    }
  }

  hasSelectedPoint(): boolean {
    return this.form.latitude != null && this.form.longitude != null;
  }

  hasStreetViewTarget(): boolean {
    return this.hasSelectedPoint() || !!this.form.streetViewUrl?.trim();
  }

  openStreetView(): void {
    if (this.form.streetViewUrl?.trim()) {
      window.open(this.form.streetViewUrl.trim(), '_blank', 'noopener,noreferrer');
      return;
    }
    if (!this.hasSelectedPoint()) {
      return;
    }
    const viewpoint = `${this.form.latitude},${this.form.longitude}`;
    window.open(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(viewpoint)}`, '_blank', 'noopener,noreferrer');
  }

  downloadExcel(): void {
    if (this.exporting()) {
      return;
    }
    this.exporting.set(true);
    this.api.exportVisits().pipe(finalize(() => this.exporting.set(false))).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `minhas-visitas-${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.fail('Não foi possível gerar a exportação. Tente novamente.')
    });
  }

  setNextVisitAt(value: string): void {
    this.form.nextVisitAt = value ? new Date(value).toISOString() : undefined;
  }

  attachPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.fail('Selecione uma imagem válida para anexar.');
      return;
    }
    this.resizePhoto(file).then((dataUrl) => {
      this.form.photoData = dataUrl;
      this.form.photoUrl = undefined;
      this.form.photoContentType = 'image/jpeg';
      this.form.photoFileName = file.name || `foto-casa-${new Date().toISOString().slice(0, 10)}.jpg`;
      this.form.hasPhoto = true;
      this.ok('Foto anexada à ficha.');
    }).catch(() => this.fail('Não foi possível anexar a foto. Tente selecionar outra imagem.'));
  }

  removePhoto(): void {
    this.form.photoData = undefined;
    this.form.photoUrl = undefined;
    this.form.photoContentType = undefined;
    this.form.photoFileName = undefined;
    this.form.hasPhoto = false;
  }

  photoPreview(): string {
    return this.form.photoData || this.form.photoUrl || '';
  }

  canManageVisits(): boolean {
    const user = this.auth.user();
    return !!user && !user.roles.includes('admin') && user.canRegisterVisits;
  }

  canEditVisit(visit: Visit): boolean {
    const user = this.auth.user();
    if (!user || user.roles.includes('admin')) {
      return false;
    }
    return user.roles.includes('lider');
  }

  visitListTitle(): string {
    const user = this.auth.user();
    if (!user) {
      return 'Visitas';
    }
    if (user.roles.includes('admin')) {
      return 'Casas visitadas';
    }
    if (user.roles.includes('lider')) {
      return 'Visitas da equipe';
    }
    return user.canRegisterVisits ? 'Visitas da equipe' : 'Minhas visitas';
  }

  showResponsibleName(): boolean {
    const user = this.auth.user();
    return !!user && (user.roles.includes('admin') || user.canRegisterVisits);
  }

  formatDate(value?: string): string {
    return formatDateTime(value);
  }

  toLocalDateTime(value?: string): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
  }

  private setPoint(latitude: number, longitude: number): void {
    this.form.latitude = latitude;
    this.form.longitude = longitude;
    this.marker?.remove();
    if (this.map) {
      this.marker = L.marker([latitude, longitude]).addTo(this.map);
    }
    this.updateTerritoryStatus();
    this.renderTerritories();
  }

  private selectPoint(latitude: number, longitude: number): void {
    this.zone.run(() => {
      this.setPoint(latitude, longitude);
      this.message.set('Ponto selecionado no mapa. Latitude e longitude foram preenchidas.');
      this.notifications.info('Ponto selecionado no mapa.');
    });
  }

  private renderMarkers(items: Visit[]): void {
    this.visitLayer.clearLayers();
    const located = items.filter(visit => this.validCoordinates(visit.latitude, visit.longitude));
    const visible = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
      ? located.slice(0, 60)
      : located;
    visible.forEach((visit) => {
      L.circleMarker([Number(visit.latitude), Number(visit.longitude)], {
        radius: 7,
        color: this.cssColor(visit.wantsVisits ? '--color-success' : '--color-error'),
        fillOpacity: 0.8
      }).bindPopup(`<strong>${visit.personName}</strong><br>${visit.neighborhood ?? visit.city}<br>${visit.wantsVisits ? 'Aceita visitas' : 'Nao aceita visitas'}`).addTo(this.visitLayer);
    });
  }

  private renderTerritories(): void {
    if (!this.map) {
      return;
    }
    this.territoryLayer.clearLayers();
    this.territories().forEach((territory) => {
      const points = this.pointsFromGeoJson(territory.polygonGeoJson);
      if (points.length >= 3) {
        const selected = this.pointInsideTerritory(territory);
        const polygon = L.polygon(points, {
          color: territory.color,
          fillColor: territory.color,
          fillOpacity: selected ? 0.26 : 0.12,
          weight: selected ? 4 : 2
        }).bindPopup(`<strong>${territory.name}</strong><br>${territory.teamName}`);
        polygon.on('click', (event: L.LeafletMouseEvent) => {
          if (this.canManageVisits()) {
            this.selectPoint(event.latlng.lat, event.latlng.lng);
          }
        });
        polygon.addTo(this.territoryLayer);
      }
    });
  }

  private refreshMapView(): void {
    if (!this.map) return;
    const points: L.LatLngTuple[] = this.visits()
      .filter(visit => this.validCoordinates(visit.latitude, visit.longitude))
      .map(visit => [Number(visit.latitude), Number(visit.longitude)]);
    if (this.userCoordinates) points.push(this.userCoordinates);
    if (points.length > 1) {
      this.map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 17 });
    } else if (points.length === 1) {
      this.map.setView(points[0], 16);
    } else {
      this.map.setView([-7.229, -39.313], 13);
    }
  }

  private validCoordinates(latitude: unknown, longitude: unknown): boolean {
    const lat = Number(latitude);
    const lng = Number(longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);
  }

  private pointsFromGeoJson(value: string): L.LatLng[] {
    try {
      const parsed = JSON.parse(value);
      const points = parsed.coordinates[0].map((item: number[]) => L.latLng(item[1], item[0]));
      const first = points[0];
      const last = points[points.length - 1];
      if (first && last && first.lat === last.lat && first.lng === last.lng) {
        points.pop();
      }
      return points;
    } catch {
      return [];
    }
  }

  private blankVisit(): Visit {
    return { personName: '', city: 'Sertao', wantsVisits: true };
  }

  private resizePhoto(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read-failed'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('image-failed'));
        image.onload = () => {
          const maxSide = 1280;
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('canvas-failed'));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  private errorMessage(response: HttpErrorResponse): string {
    if (response.status === 401) {
      return 'Sua sessão expirou. Faça login novamente.';
    }
    if (response.status === 403) {
      return 'Você não possui permissão para salvar esta ficha ou atuar neste território.';
    }
    if (response.status === 422) {
      return 'Alguns dados da ficha não foram aceitos. Revise os campos e tente novamente.';
    }
    if (response.status === 408 || response.status === 504) {
      return 'O servidor demorou para responder. Os campos foram mantidos; tente novamente.';
    }
    if (response.status >= 500) {
      return 'O servidor está indisponível no momento. Os campos foram mantidos; tente novamente.';
    }
    const body = response.error;
    if (body?.detail) {
      return body.detail;
    }
    if (body?.errors) {
      return Object.values(body.errors).join(' ');
    }
    if (body?.violations?.length) {
      return body.violations.map((violation: { message: string }) => violation.message).join(' ');
    }
    return 'Não foi possível salvar. Revise os campos e tente novamente.';
  }

  offlineStatusText(): string {
    const pending = this.offlineQueue.pendingCount();
    if (!this.online()) {
      return pending
        ? `${pending} ficha(s) salva(s) no aparelho aguardando internet.`
        : 'Se a conexão falhar, novas fichas serão guardadas no aparelho.';
    }
    return pending
      ? `${pending} ficha(s) pendente(s) para enviar ao servidor.`
      : 'As fichas estão sendo enviadas diretamente ao servidor.';
  }

  syncOfflineVisits(): void {
    if (!this.online()) {
      this.notifications.info('Ainda sem internet. As fichas continuam salvas no aparelho.');
      return;
    }
    this.offlineQueue.sync().then((result) => {
      if (result.sent > 0) {
        this.ok(`${result.sent} ficha(s) offline sincronizada(s) com sucesso.`);
        this.loadVisits();
      }
      if (result.failed > 0) {
        this.fail(`${result.failed} ficha(s) ainda não puderam ser sincronizadas.`);
      }
      if (result.sent === 0 && result.failed === 0) {
        this.notifications.info('Não há fichas pendentes para sincronizar.');
      }
    }).catch(() => this.fail('Não foi possível iniciar a sincronização. As fichas continuam salvas no aparelho.'));
  }

  removePending(id: number, personName: string): void {
    if (!window.confirm(`Excluir a ficha pendente de ${personName || 'pessoa sem identificação'} deste aparelho?`)) {
      return;
    }
    this.offlineQueue.remove(id)
      .then(() => this.notifications.info('Ficha pendente excluída do aparelho.'))
      .catch(() => this.fail('Não foi possível excluir a ficha pendente.'));
  }

  private handleSaveError(response: HttpErrorResponse, payload: Visit, editing: boolean): void {
    if (!editing && this.isOfflineError(response)) {
      this.enqueueOffline(payload);
      return;
    }
    this.saving.set(false);
    this.fail(this.errorMessage(response));
  }

  private enqueueOffline(payload: Visit): void {
    this.offlineQueue.enqueue(payload).then(() => {
      this.saving.set(false);
      this.ok('Sem conexão. A ficha foi salva no aparelho e será enviada quando a internet voltar.');
      this.resetForm();
    }).catch(() => {
      this.saving.set(false);
      this.fail('Não foi possível salvar a ficha no aparelho. Os campos foram mantidos para você tentar novamente.');
    });
  }

  private isOfflineError(response: HttpErrorResponse): boolean {
    return !navigator.onLine || response.status === 0;
  }

  private handleOnline = (): void => {
    this.online.set(true);
    if (this.offlineQueue.pendingCount() > 0) {
      this.syncOfflineVisits();
    }
  };

  private handleOffline = (): void => {
    this.online.set(false);
    this.notifications.info('Você está sem internet. Novas fichas serão salvas no aparelho.');
  };

  private handleResize = (): void => {
    if (!this.map || (window.matchMedia('(max-width: 900px)').matches && this.mobileView() !== 'map')) return;
    requestAnimationFrame(() => {
      this.map?.invalidateSize();
      this.refreshMapView();
    });
  };

  private scrollMapIntoView(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches) {
      this.showMobileView('map');
    }
  }

  private updateTerritoryStatus(): void {
    if (!this.hasSelectedPoint()) {
      this.territoryStatus.set('');
      this.territoryOutside.set(false);
      return;
    }
    const territory = this.territories().find((item) => this.pointInsideTerritory(item));
    if (territory) {
      this.territoryOutside.set(false);
      this.territoryStatus.set(`Ponto dentro do território autorizado: ${territory.name}${territory.teamName ? ` (${territory.teamName})` : ''}.`);
      return;
    }
    this.territoryOutside.set(true);
    this.territoryStatus.set('Ponto fora dos territórios autorizados exibidos. As regras atuais do servidor serão respeitadas ao salvar.');
  }

  private pointInsideTerritory(territory: Territory): boolean {
    if (!this.hasSelectedPoint()) {
      return false;
    }
    const latitude = this.form.latitude as number;
    const longitude = this.form.longitude as number;
    const points = this.pointsFromGeoJson(territory.polygonGeoJson);
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].lng;
      const yi = points[i].lat;
      const xj = points[j].lng;
      const yj = points[j].lat;
      const intersects = ((yi > latitude) !== (yj > latitude))
        && (longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  private cssColor(variable: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }

  private ok(message: string): void {
    this.message.set(message);
    this.notifications.success(message);
  }

  private fail(message: string): void {
    this.error.set(message);
    this.notifications.error(message);
  }
}
