import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { SlicePipe } from '@angular/common';
import { AfterViewInit, Component, NgZone, OnDestroy, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import * as L from 'leaflet';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { formatDateTime } from '../core/date-format';
import { Territory, Visit } from '../core/models';

@Component({
  selector: 'app-visits',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  template: `
    <section class="workspace">
      <div class="map-panel">
        <div class="map-toolbar">
          <input placeholder="Buscar endereco" [(ngModel)]="searchText" (keyup.enter)="searchAddress()">
          <button type="button" (click)="searchAddress()">Buscar</button>
          <button type="button" class="secondary" (click)="downloadExcel()">Excel</button>
        </div>
        <div id="visit-map" class="map"></div>
      </div>

      <aside class="side-panel">
        @if (canManageVisits()) {
          <h2>{{ editingId() ? 'Editar visita' : 'Nova visita' }}</h2>
          <form #visitForm="ngForm" novalidate (ngSubmit)="save(visitForm)">
            <label>Nome da pessoa<input name="personName" [(ngModel)]="form.personName" required></label>
            <label>Telefone<input name="phone" [(ngModel)]="form.phone"></label>
            <div class="form-grid">
              <label>Rua<input name="street" [(ngModel)]="form.street"></label>
              <label>Numero<input name="number" [(ngModel)]="form.number"></label>
            </div>
            <div class="form-grid">
              <label>Bairro<input name="neighborhood" [(ngModel)]="form.neighborhood"></label>
              <label>Cidade<input name="city" [(ngModel)]="form.city" required></label>
            </div>
            <label>Endereco manual<textarea name="manualAddress" [(ngModel)]="form.manualAddress"></textarea></label>
            <div class="form-grid">
              <label>Idade<input name="personAge" type="number" min="0" [(ngModel)]="form.personAge"></label>
              <label>Moradores na casa<input name="householdSize" type="number" min="0" [(ngModel)]="form.householdSize"></label>
            </div>
            <div class="form-grid">
              <label>Latitude<input name="latitude" type="number" step="any" [(ngModel)]="form.latitude"></label>
              <label>Longitude<input name="longitude" type="number" step="any" [(ngModel)]="form.longitude"></label>
            </div>
            <label class="check-row">
              <input name="wantsVisits" type="checkbox" [(ngModel)]="form.wantsVisits">
              Deseja receber visitas?
            </label>
            <label>Ponto de referencia<textarea name="referencePoint" [(ngModel)]="form.referencePoint"></textarea></label>
            <label>Pedido de oracao<textarea name="prayerRequest" [(ngModel)]="form.prayerRequest"></textarea></label>
            <label>Proxima visita<input name="nextVisitAt" type="datetime-local" [ngModel]="toLocalDateTime(form.nextVisitAt)" (ngModelChange)="setNextVisitAt($event)"></label>
            <label>Link do Street View<input name="streetViewUrl" type="url" placeholder="Cole aqui o link do Google Street View" [(ngModel)]="form.streetViewUrl"></label>
            <label>Observacoes<textarea name="notes" [(ngModel)]="form.notes"></textarea></label>
            <div class="photo-field">
              <label>Foto da casa
                <input type="file" accept="image/*" capture="environment" (change)="attachPhoto($event)">
              </label>
              @if (photoPreview()) {
                <div class="photo-preview">
                  <img [src]="photoPreview()" alt="Foto anexada a ficha">
                  <div>
                    <strong>{{ form.photoFileName || 'Foto anexada' }}</strong>
                    <small>Esta foto sera salva junto com a ficha da casa.</small>
                    <button type="button" class="secondary" (click)="removePhoto()">Remover foto</button>
                  </div>
                </div>
              }
            </div>
            @if (message()) {
              <p class="success">{{ message() }}</p>
            }
            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
            <div class="actions">
              <button type="submit">Salvar</button>
              <button type="button" class="secondary" (click)="resetForm()">Limpar</button>
              <button type="button" class="secondary" [disabled]="!hasStreetViewTarget()" (click)="openStreetView()">
                Ver no Street View
              </button>
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
              <option value="false">Nao aceita</option>
            </select>
          </div>
          <button type="button" class="secondary full" (click)="loadVisits()">Filtrar</button>
        </div>

        <div class="visit-list">
          @for (visit of visits(); track visit.id) {
            <button type="button" class="visit-row" (click)="selectVisit(visit)">
              <strong>{{ visit.personName }}</strong>
              <span>{{ visit.neighborhood || visit.manualAddress || visit.city }}</span>
              @if (showResponsibleName()) {
                <small>{{ visit.responsibleUserName || 'Responsavel nao informado' }}</small>
              }
              @if (visit.hasPhoto) {
                <small>Foto anexada</small>
              }
              <small>{{ formatDate(visit.createdAt) }}</small>
            </button>
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
  searchText = '';
  private map?: L.Map;
  private marker?: L.Marker;
  private visitLayer = L.layerGroup();
  private territoryLayer = L.layerGroup();
  private refreshHandle?: ReturnType<typeof setInterval>;
  private fittedInitialContent = false;

  constructor(public api: ApiService, private http: HttpClient, private auth: AuthService, private zone: NgZone) {}

  ngAfterViewInit(): void {
    this.map = L.map('visit-map', { zoomControl: false }).setView([-7.229, -39.313], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);
    this.territoryLayer.addTo(this.map);
    this.visitLayer.addTo(this.map);
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      if (this.canManageVisits()) {
        this.selectPoint(event.latlng.lat, event.latlng.lng);
      }
    });
    this.loadTerritories();
    this.loadVisits();
    if (!this.canManageVisits()) {
      this.refreshHandle = setInterval(() => this.loadVisits(), 30000);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }
    this.map?.remove();
  }

  loadVisits(): void {
    this.api.visits({ page: 0, size: 100, neighborhood: this.filters.neighborhood, wantsVisits: this.filters.wantsVisits || undefined })
      .subscribe((page) => {
        this.visits.set(page.items);
        this.renderMarkers(page.items);
        this.fitInitialContent();
      });
  }

  loadTerritories(): void {
    this.api.territories().subscribe((territories) => {
      this.territories.set(territories);
      this.renderTerritories();
      this.fitInitialContent();
    });
  }

  searchAddress(): void {
    if (!this.searchText.trim()) {
      return;
    }
    const url = 'https://nominatim.openstreetmap.org/search';
    this.http.get<Array<{ lat: string; lon: string; display_name: string }>>(url, {
      params: { q: this.searchText, format: 'json', limit: 1, addressdetails: 1 }
    }).subscribe((results) => {
      const first = results[0];
      if (!first) {
        if (this.canManageVisits()) {
          this.form.manualAddress = this.searchText;
        }
        this.message.set(this.canManageVisits()
          ? 'Endereco nao encontrado. Preencha manualmente e salve.'
          : 'Endereco nao encontrado.');
        return;
      }
      if (this.canManageVisits()) {
        this.form.manualAddress = first.display_name;
        this.selectPoint(Number(first.lat), Number(first.lon));
      }
      this.map?.setView([Number(first.lat), Number(first.lon)], 17);
    });
  }

  save(form: NgForm): void {
    this.message.set('');
    this.error.set('');
    if (form.invalid) {
      this.error.set('Preencha os campos obrigatorios antes de salvar.');
      return;
    }
    const payload = { ...this.form };
    const action = this.editingId()
      ? this.api.updateVisit(this.editingId() as number, payload)
      : this.api.createVisit(payload);
    action.subscribe({
      next: () => {
        this.message.set('Visita salva.');
        this.resetForm();
        this.loadVisits();
      },
      error: (response: HttpErrorResponse) => this.error.set(this.errorMessage(response))
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
    }
  }

  resetForm(): void {
    this.form = this.blankVisit();
    this.editingId.set(null);
    this.error.set('');
    this.marker?.remove();
    this.marker = undefined;
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
    this.api.exportVisits().subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `minhas-visitas-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
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
      this.error.set('Selecione uma imagem valida para anexar.');
      return;
    }
    this.resizePhoto(file).then((dataUrl) => {
      this.form.photoData = dataUrl;
      this.form.photoUrl = undefined;
      this.form.photoContentType = 'image/jpeg';
      this.form.photoFileName = file.name || `foto-casa-${new Date().toISOString().slice(0, 10)}.jpg`;
      this.form.hasPhoto = true;
      this.message.set('Foto anexada a ficha.');
    }).catch(() => this.error.set('Nao foi possivel anexar a foto. Tente selecionar outra imagem.'));
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
    this.marker = L.marker([latitude, longitude]).addTo(this.map as L.Map);
  }

  private selectPoint(latitude: number, longitude: number): void {
    this.zone.run(() => {
      this.setPoint(latitude, longitude);
      this.message.set('Ponto selecionado no mapa. Latitude e longitude foram preenchidas.');
    });
  }

  private renderMarkers(items: Visit[]): void {
    this.visitLayer.clearLayers();
    items.filter((visit) => visit.latitude && visit.longitude).forEach((visit) => {
      L.circleMarker([visit.latitude as number, visit.longitude as number], {
        radius: 7,
        color: visit.wantsVisits ? '#1f7a4d' : '#a04444',
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
        const polygon = L.polygon(points, {
          color: territory.color,
          fillColor: territory.color,
          fillOpacity: 0.12,
          weight: 2
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

  private fitInitialContent(): void {
    if (!this.map || this.fittedInitialContent) {
      return;
    }
    const bounds = L.latLngBounds([]);
    this.territories().forEach((territory) => {
      this.pointsFromGeoJson(territory.polygonGeoJson).forEach((point) => bounds.extend(point));
    });
    this.visits()
      .filter((visit) => visit.latitude && visit.longitude)
      .forEach((visit) => bounds.extend([visit.latitude as number, visit.longitude as number]));
    if (!bounds.isValid()) {
      return;
    }
    this.fittedInitialContent = true;
    this.map.fitBounds(bounds.pad(0.2), { maxZoom: 16 });
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
      return 'Sua sessao expirou. Faca login novamente.';
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
    return 'Nao foi possivel salvar. Revise os campos e tente novamente.';
  }
}
