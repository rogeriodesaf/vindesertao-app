import { AfterViewInit, Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import * as L from 'leaflet';
import { ApiService } from '../core/api.service';
import { Team, Territory } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { ListCardComponent } from '../shared/list-card.component';

type MapMode = 'select' | 'polygon' | 'rectangle' | 'edit';

@Component({
  selector: 'app-territories',
  standalone: true,
  imports: [FormsModule, ListCardComponent, EmptyStateComponent],
  template: `
    <section class="page territory-page">
      <div class="page-head">
        <div>
          <h1>Territorios</h1>
          <p class="muted">Desenhe poligonos no mapa e atribua cada area a uma equipe.</p>
        </div>
      </div>

      <div class="territory-layout">
        <form #territoryForm="ngForm" class="editor" novalidate (ngSubmit)="save(territoryForm)">
          <h2>{{ form.id ? 'Editar territorio' : 'Novo territorio' }}</h2>
          <label>Nome<input name="name" [(ngModel)]="form.name" required></label>
          <label>Equipe
            <select name="teamId" [(ngModel)]="form.teamId" required>
              @for (team of visitTeams(); track team.id) {
                <option [ngValue]="team.id">{{ team.name }}</option>
              }
            </select>
          </label>
          <label>Cor<input name="color" type="color" [(ngModel)]="form.color" (change)="renderDrawing()"></label>
          <label class="check-row"><input name="active" type="checkbox" [(ngModel)]="form.active"> Ativo</label>
          <label class="check-row">
            <input name="enforceForProjectists" type="checkbox" [(ngModel)]="form.enforceForProjectists">
            Projetista so registra dentro do territorio do time
          </label>
          <p class="muted">Use Poligono ou Retangulo sobre o mapa. Sao necessarios pelo menos 3 pontos.</p>
          @if (areaLabel()) { <p class="territory-area">Area aproximada: <strong>{{ areaLabel() }}</strong></p> }
          @if (message()) { <p class="success">{{ message() }}</p> }
          @if (error()) { <p class="error">{{ error() }}</p> }
          <button type="submit">Salvar territorio</button>
        </form>

        <div class="territory-map-panel" [class.is-drawing]="isDrawing()">
          <div class="map-toolbar territory-search">
            <input placeholder="Buscar rua, bairro ou cidade" [(ngModel)]="searchText" (keyup.enter)="searchAddress()">
            <button type="button" (click)="searchAddress()">Buscar</button>
          </div>

          <div class="territory-draw-toolbar" role="toolbar" aria-label="Ferramentas de demarcacao">
            @if (mode() === 'select') {
              <button type="button" (click)="startPolygon()" aria-label="Desenhar poligono" title="Desenhar poligono">Poligono</button>
              <button type="button" (click)="startRectangle()" aria-label="Desenhar retangulo" title="Desenhar retangulo">Retangulo</button>
              <button type="button" class="secondary" [disabled]="drawnPoints.length < 3" (click)="startEditing()" aria-label="Editar territorio selecionado" title="Editar territorio">Editar</button>
              @if (form.id) { <button type="button" class="danger-button" (click)="deleteTerritory()" aria-label="Excluir demarcacao" title="Excluir demarcacao">Excluir</button> }
            } @else if (mode() === 'edit') {
              <button type="button" class="secondary" [disabled]="!canUndo()" (click)="undo()" aria-label="Desfazer ultima alteracao" title="Desfazer">Desfazer</button>
              <button type="button" (click)="saveEditing()" aria-label="Salvar alteracoes" title="Salvar alteracoes">Salvar alteracoes</button>
              <button type="button" class="secondary" (click)="cancelMode()" aria-label="Cancelar edicao" title="Cancelar">Cancelar</button>
            } @else {
              <button type="button" class="secondary" [disabled]="!canUndo()" (click)="undo()" aria-label="Desfazer ultimo ponto" title="Desfazer">Desfazer</button>
              <button type="button" [disabled]="!canComplete()" (click)="completeDrawing()" aria-label="Concluir demarcacao" title="Concluir">Concluir</button>
              <button type="button" class="secondary" (click)="cancelMode()" aria-label="Cancelar desenho" title="Cancelar">Cancelar</button>
            }
          </div>
          @if (instruction()) { <div class="territory-instruction" aria-live="polite">{{ instruction() }}</div> }
          <div id="territory-map" class="territory-map"></div>
        </div>

        <aside class="detail-card">
          <h2>Territorios cadastrados</h2>
          <div class="unified-list">
            @for (territory of territories(); track territory.id) {
              <app-list-card [title]="territory.name" [color]="territory.color" [state]="territory.active ? 'Ativo' : 'Inativo'"
                [selected]="form.id === territory.id" [interactive]="true" [actions]="[{ id: 'edit', label: 'Editar', icon: 'edit' }]"
                [infos]="[{ icon: 'groups', text: territory.teamName }, { icon: 'status', text: territory.enforceForProjectists ? 'Regra ativa' : 'Sem bloqueio' }]"
                (activate)="edit(territory)" (action)="edit(territory)" />
            } @empty { <app-empty-state message="Nenhum territorio cadastrado." /> }
          </div>
        </aside>
      </div>
    </section>
  `
})
export class TerritoriesComponent implements OnInit, AfterViewInit, OnDestroy {
  teams = signal<Team[]>([]);
  territories = signal<Territory[]>([]);
  message = signal('');
  error = signal('');
  mode = signal<MapMode>('select');
  instruction = signal('Selecione um modo para demarcar o territorio.');
  areaLabel = signal('');
  canUndo = signal(false);
  searchText = '';
  form: Territory = this.blank();
  drawnPoints: L.LatLng[] = [];
  private map?: L.Map;
  private drawingLayer = L.layerGroup();
  private territoryLayer = L.layerGroup();
  private history: L.LatLng[][] = [];
  private modeStartPoints: L.LatLng[] = [];
  private dirty = false;

  constructor(private api: ApiService, private http: HttpClient, private notifications: NotificationService) {}

  ngOnInit(): void {
    this.api.teams().subscribe((teams) => {
      this.teams.set(teams);
      if (!this.form.teamId) this.form.teamId = this.visitTeams()[0]?.id ?? 0;
    });
    this.load();
  }

  ngAfterViewInit(): void {
    this.map = L.map('territory-map', { zoomControl: false, doubleClickZoom: false }).setView([-7.229, -39.313], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(this.map);
    this.drawingLayer.addTo(this.map);
    this.territoryLayer.addTo(this.map);
    this.map.on('click', (event: L.LeafletMouseEvent) => this.handleMapClick(event.latlng));
    this.renderTerritories();
  }

  ngOnDestroy(): void { this.map?.remove(); }

  @HostListener('window:beforeunload', ['$event'])
  warnUnsaved(event: BeforeUnloadEvent): void {
    if (this.dirty) event.preventDefault();
  }

  load(): void {
    this.api.territories().subscribe((territories) => {
      this.territories.set(territories);
      this.renderTerritories();
    });
  }

  save(form: NgForm): void {
    if (form.invalid) return this.fail('Preencha os dados obrigatorios.');
    this.persist();
  }

  startPolygon(): void {
    this.beginMode('polygon');
    this.drawnPoints = [];
    this.instruction.set('Toque no mapa para marcar o primeiro ponto.');
    this.renderDrawing();
  }

  startRectangle(): void {
    this.beginMode('rectangle');
    this.drawnPoints = [];
    this.instruction.set('Toque em dois cantos opostos para criar o retangulo.');
    this.renderDrawing();
  }

  startEditing(): void {
    if (this.drawnPoints.length < 3) return;
    this.beginMode('edit');
    this.instruction.set('Arraste os pontos. Toque nos pontos menores para adicionar um vertice; toque em um vertice para remove-lo.');
    this.renderDrawing();
  }

  completeDrawing(): void {
    const validation = this.validatePolygon(this.drawnPoints);
    if (validation) return this.fail(validation);
    this.mode.set('select');
    this.history = [];
    this.canUndo.set(false);
    this.dirty = true;
    this.instruction.set('Demarcacao concluida. Preencha os dados e salve o territorio.');
    this.renderDrawing();
  }

  saveEditing(): void {
    const validation = this.validatePolygon(this.drawnPoints);
    if (validation) return this.fail(validation);
    if (!this.form.name?.trim() || !this.form.teamId) return this.fail('Preencha nome e equipe antes de salvar.');
    this.persist();
  }

  cancelMode(): void {
    this.drawnPoints = this.clonePoints(this.modeStartPoints);
    this.mode.set('select');
    this.history = [];
    this.canUndo.set(false);
    this.dirty = false;
    this.error.set('');
    this.instruction.set('Alteracoes canceladas.');
    this.renderDrawing();
  }

  undo(): void {
    const previous = this.history.pop();
    if (!previous) return;
    this.drawnPoints = this.clonePoints(previous);
    this.canUndo.set(this.history.length > 0);
    this.dirty = true;
    this.renderDrawing();
  }

  canComplete(): boolean { return this.mode() === 'rectangle' ? this.drawnPoints.length === 4 : this.drawnPoints.length >= 3; }
  isDrawing(): boolean { return this.mode() === 'polygon' || this.mode() === 'rectangle'; }

  edit(territory: Territory): void {
    if (this.dirty && !confirm('Descartar as alteracoes nao salvas?')) return;
    this.form = { ...territory };
    this.drawnPoints = this.pointsFromGeoJson(territory.polygonGeoJson);
    this.mode.set('select');
    this.dirty = false;
    this.history = [];
    this.instruction.set('Territorio selecionado. Use Editar para ajustar os vertices.');
    this.renderDrawing();
    if (this.drawnPoints.length >= 3) this.map?.fitBounds(L.latLngBounds(this.drawnPoints), { padding: [30, 30], maxZoom: 17 });
  }

  deleteTerritory(): void {
    if (!this.form.id || !confirm(`Excluir a demarcacao "${this.form.name}"? Esta acao nao pode ser desfeita.`)) return;
    this.api.deleteTerritory(this.form.id).subscribe({
      next: () => {
        this.ok('Demarcacao excluida com sucesso.');
        this.resetForm();
        this.load();
      },
      error: () => this.fail('Nao foi possivel excluir a demarcacao.')
    });
  }

  searchAddress(): void {
    if (!this.searchText.trim()) return;
    this.http.get<Array<{ lat: string; lon: string }>>('https://nominatim.openstreetmap.org/search', {
      params: { q: this.searchText, format: 'json', limit: 1, addressdetails: 1 }
    }).subscribe((results) => {
      const first = results[0];
      if (!first) return this.fail('Endereco nao encontrado. Tente informar rua, bairro e cidade.');
      this.error.set('');
      this.map?.setView([Number(first.lat), Number(first.lon)], 17);
    });
  }

  renderDrawing(): void {
    this.drawingLayer.clearLayers();
    const color = this.form.color || this.cssColor('--color-primary');
    if (this.drawnPoints.length >= 2) L.polyline(this.drawnPoints, { color, weight: 3 }).addTo(this.drawingLayer);
    if (this.drawnPoints.length >= 3) L.polygon(this.drawnPoints, { color, fillColor: color, fillOpacity: 0.2, weight: 3 }).addTo(this.drawingLayer);

    this.drawnPoints.forEach((point, index) => {
      if (this.mode() !== 'edit') {
        L.circleMarker(point, { radius: 8, color: '#ffffff', weight: 3, fillColor: color, fillOpacity: 1, interactive: false }).addTo(this.drawingLayer);
        return;
      }
      let moved = false;
      const marker = L.marker(point, {
        draggable: true,
        keyboard: true,
        title: `Vertice ${index + 1}. Arraste para ajustar ou toque para remover.`,
        icon: L.divIcon({ className: 'territory-vertex-icon', html: `<span style="--territory-color:${color}"></span>`, iconSize: [24, 24], iconAnchor: [12, 12] })
      });
      marker.on('dragstart', () => { moved = false; this.pushHistory(); });
      marker.on('drag', () => { moved = true; this.drawnPoints[index] = marker.getLatLng(); this.dirty = true; });
      marker.on('dragend', () => this.renderDrawing());
      marker.on('click', (event) => {
        L.DomEvent.stopPropagation(event);
        if (moved) return;
        if (this.drawnPoints.length <= 3) return this.fail('O territorio precisa manter pelo menos 3 vertices.');
        this.pushHistory();
        this.drawnPoints.splice(index, 1);
        this.dirty = true;
        this.renderDrawing();
      });
      marker.addTo(this.drawingLayer);
    });

    if (this.mode() === 'edit' && this.drawnPoints.length >= 3) {
      this.drawnPoints.forEach((point, index) => {
        const next = this.drawnPoints[(index + 1) % this.drawnPoints.length];
        const midpoint = L.latLng((point.lat + next.lat) / 2, (point.lng + next.lng) / 2);
        L.circleMarker(midpoint, { radius: 6, color, weight: 2, fillColor: '#ffffff', fillOpacity: 1 })
          .bindTooltip('Adicionar vertice')
          .on('click', (event) => {
            L.DomEvent.stopPropagation(event);
            this.pushHistory();
            this.drawnPoints.splice(index + 1, 0, midpoint);
            this.dirty = true;
            this.renderDrawing();
          }).addTo(this.drawingLayer);
      });
    }
    this.updateArea();
  }

  private handleMapClick(point: L.LatLng): void {
    if (!this.validPoint(point)) return this.fail('Coordenada invalida. Escolha outro ponto.');
    if (this.mode() === 'polygon') {
      this.pushHistory();
      this.drawnPoints.push(point);
      this.dirty = true;
      this.instruction.set(this.drawnPoints.length < 3 ? 'Continue marcando o contorno do territorio.' : 'Toque em Concluir para fechar o territorio.');
      this.renderDrawing();
    } else if (this.mode() === 'rectangle' && this.drawnPoints.length === 0) {
      this.pushHistory();
      this.drawnPoints = [point];
      this.dirty = true;
      this.instruction.set('Toque no canto oposto para concluir o retangulo.');
      this.renderDrawing();
    } else if (this.mode() === 'rectangle' && this.drawnPoints.length === 1) {
      this.pushHistory();
      const first = this.drawnPoints[0];
      this.drawnPoints = [first, L.latLng(first.lat, point.lng), point, L.latLng(point.lat, first.lng)];
      this.dirty = true;
      this.instruction.set('Retangulo pronto. Toque em Concluir.');
      this.renderDrawing();
    }
  }

  private beginMode(mode: MapMode): void {
    this.modeStartPoints = this.clonePoints(this.drawnPoints);
    this.history = [];
    this.canUndo.set(false);
    this.error.set('');
    this.mode.set(mode);
  }

  private pushHistory(): void {
    this.history.push(this.clonePoints(this.drawnPoints));
    if (this.history.length > 30) this.history.shift();
    this.canUndo.set(true);
  }

  private persist(): void {
    this.message.set('');
    this.error.set('');
    const validation = this.validatePolygon(this.drawnPoints);
    if (validation) return this.fail(validation);
    this.form.polygonGeoJson = this.geoJson();
    const editing = !!this.form.id;
    const action = editing ? this.api.updateTerritory(this.form) : this.api.createTerritory(this.form);
    action.subscribe({
      next: () => {
        this.ok(editing ? 'Territorio atualizado com sucesso.' : 'Territorio salvo com sucesso.');
        this.resetForm();
        this.load();
      },
      error: () => this.fail('Nao foi possivel salvar o territorio.')
    });
  }

  private resetForm(): void {
    this.form = this.blank();
    this.drawnPoints = [];
    this.mode.set('select');
    this.dirty = false;
    this.history = [];
    this.canUndo.set(false);
    this.instruction.set('Selecione um modo para demarcar o territorio.');
    this.renderDrawing();
  }

  private renderTerritories(): void {
    if (!this.map) return;
    this.territoryLayer.clearLayers();
    const allBounds: L.LatLng[] = [];
    this.territories().forEach((territory) => {
      const points = this.pointsFromGeoJson(territory.polygonGeoJson);
      if (points.length < 3) return;
      allBounds.push(...points);
      const selected = territory.id === this.form.id;
      L.polygon(points, { color: territory.color, fillColor: territory.color, fillOpacity: selected ? 0.28 : 0.12, weight: selected ? 4 : 2 })
        .bindTooltip(territory.name)
        .bindPopup(`<strong>${territory.name}</strong><br>${territory.teamName || ''}`)
        .on('click', (event) => { L.DomEvent.stopPropagation(event); this.edit(territory); })
        .addTo(this.territoryLayer);
    });
    if (allBounds.length && !this.form.id) this.map.fitBounds(L.latLngBounds(allBounds), { padding: [30, 30], maxZoom: 15 });
  }

  private validatePolygon(points: L.LatLng[]): string {
    if (points.length < 3) return 'Marque pelo menos 3 pontos para concluir o territorio.';
    if (points.some((point) => !this.validPoint(point))) return 'O territorio possui coordenadas invalidas.';
    if (this.selfIntersects(points)) return 'O contorno cruza a propria linha. Ajuste os vertices antes de salvar.';
    return '';
  }

  private validPoint(point: L.LatLng): boolean {
    return Number.isFinite(point.lat) && Number.isFinite(point.lng) && point.lat >= -90 && point.lat <= 90 && point.lng >= -180 && point.lng <= 180 && !(point.lat === 0 && point.lng === 0);
  }

  private selfIntersects(points: L.LatLng[]): boolean {
    const cross = (a: L.LatLng, b: L.LatLng, c: L.LatLng) => (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      for (let j = i + 1; j < points.length; j++) {
        if (Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)) continue;
        const c = points[j], d = points[(j + 1) % points.length];
        if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) return true;
      }
    }
    return false;
  }

  private geoJson(): string {
    const coordinates = this.drawnPoints.map((point) => [point.lng, point.lat]);
    coordinates.push([...coordinates[0]]);
    return JSON.stringify({ type: 'Polygon', coordinates: [coordinates] });
  }

  private pointsFromGeoJson(value: string): L.LatLng[] {
    try {
      const parsed = JSON.parse(value);
      if (parsed?.type !== 'Polygon' || !Array.isArray(parsed.coordinates?.[0])) return [];
      const points = parsed.coordinates[0].map((item: number[]) => L.latLng(item[1], item[0])).filter((point: L.LatLng) => this.validPoint(point));
      const first = points[0], last = points[points.length - 1];
      if (first && last && first.equals(last)) points.pop();
      return points;
    } catch { return []; }
  }

  private updateArea(): void {
    if (this.drawnPoints.length < 3) return this.areaLabel.set('');
    const earth = 6371000;
    const lat0 = this.drawnPoints.reduce((sum, point) => sum + point.lat, 0) / this.drawnPoints.length * Math.PI / 180;
    const projected = this.drawnPoints.map((point) => ({ x: earth * point.lng * Math.PI / 180 * Math.cos(lat0), y: earth * point.lat * Math.PI / 180 }));
    let sum = 0;
    projected.forEach((point, index) => { const next = projected[(index + 1) % projected.length]; sum += point.x * next.y - next.x * point.y; });
    const area = Math.abs(sum) / 2;
    this.areaLabel.set(area >= 1_000_000 ? `${(area / 1_000_000).toFixed(2)} km²` : `${Math.round(area).toLocaleString('pt-BR')} m²`);
  }

  private clonePoints(points: L.LatLng[]): L.LatLng[] { return points.map((point) => L.latLng(point.lat, point.lng)); }
  private blank(): Territory { return { name: '', teamId: this.visitTeams()[0]?.id ?? 0, color: this.cssColor('--color-primary'), polygonGeoJson: '', active: true, enforceForProjectists: false }; }
  private cssColor(variable: string): string { return getComputedStyle(document.documentElement).getPropertyValue(variable).trim(); }
  visitTeams(): Team[] { return this.teams().filter((team) => team.canRegisterVisits); }
  private ok(message: string): void { this.message.set(message); this.notifications.success(message); }
  private fail(message: string): void { this.error.set(message); this.notifications.error(message); }
}
