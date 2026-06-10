import { AfterViewInit, Component, OnDestroy, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import * as L from 'leaflet';
import { ApiService } from '../core/api.service';
import { Team, Territory } from '../core/models';
import { NotificationService } from '../core/notification.service';

@Component({
  selector: 'app-territories',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Territorios</h1>
          <p class="muted">Desenhe poligonos no mapa e atribua cada area a uma equipe.</p>
        </div>
        <button type="button" class="secondary" (click)="clearDrawing()">Limpar desenho</button>
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
          <label>Cor<input name="color" type="color" [(ngModel)]="form.color"></label>
          <label class="check-row"><input name="active" type="checkbox" [(ngModel)]="form.active"> Ativo</label>
          <label class="check-row">
            <input name="enforceForProjectists" type="checkbox" [(ngModel)]="form.enforceForProjectists">
            Projetista so registra dentro do territorio do time
          </label>
          <p class="muted">Clique no mapa para adicionar pontos. Use pelo menos 3 pontos.</p>
          @if (message()) {
            <p class="success">{{ message() }}</p>
          }
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <button type="submit">Salvar territorio</button>
        </form>

        <div class="territory-map-panel">
          <div class="map-toolbar territory-search">
            <input placeholder="Buscar rua, bairro ou cidade" [(ngModel)]="searchText" (keyup.enter)="searchAddress()">
            <button type="button" (click)="searchAddress()">Buscar</button>
          </div>
          <div id="territory-map" class="territory-map"></div>
        </div>

        <aside class="detail-card">
          <h2>Territorios cadastrados</h2>
          @for (territory of territories(); track territory.id) {
            <button type="button" class="visit-row" (click)="edit(territory)">
              <strong><span class="color-dot" [style.background]="territory.color"></span>{{ territory.name }}</strong>
              <span>{{ territory.teamName }}</span>
              <small>{{ territory.active ? 'Ativo' : 'Inativo' }} | {{ territory.enforceForProjectists ? 'Regra ativa' : 'Sem bloqueio' }}</small>
            </button>
          }
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
  searchText = '';
  form: Territory = this.blank();
  private map?: L.Map;
  private drawnPoints: L.LatLng[] = [];
  private drawingLayer = L.layerGroup();
  private territoryLayer = L.layerGroup();

  constructor(private api: ApiService, private http: HttpClient, private notifications: NotificationService) {}

  ngOnInit(): void {
    this.api.teams().subscribe((teams) => {
      this.teams.set(teams);
      this.form.teamId = this.visitTeams()[0]?.id ?? 0;
    });
    this.load();
  }

  ngAfterViewInit(): void {
    this.map = L.map('territory-map', { zoomControl: false }).setView([-7.229, -39.313], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);
    this.drawingLayer.addTo(this.map);
    this.territoryLayer.addTo(this.map);
    this.map.on('click', (event: L.LeafletMouseEvent) => this.addPoint(event.latlng));
    this.renderTerritories();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  load(): void {
    this.api.territories().subscribe((territories) => {
      this.territories.set(territories);
      this.renderTerritories();
    });
  }

  save(form: NgForm): void {
    this.message.set('');
    this.error.set('');
    if (form.invalid || this.drawnPoints.length < 3) {
      this.fail('Preencha os dados e marque pelo menos 3 pontos no mapa.');
      return;
    }
    this.form.polygonGeoJson = this.geoJson();
    const editing = !!this.form.id;
    const action = this.form.id ? this.api.updateTerritory(this.form) : this.api.createTerritory(this.form);
    action.subscribe({
      next: () => {
        this.ok(editing ? 'Território atualizado com sucesso.' : 'Território salvo com sucesso.');
        this.form = this.blank();
        this.clearDrawing();
        this.load();
      },
      error: () => this.fail('Não foi possível salvar o território.')
    });
  }

  edit(territory: Territory): void {
    this.form = { ...territory };
    this.drawnPoints = this.pointsFromGeoJson(territory.polygonGeoJson);
    this.renderDrawing();
    if (this.drawnPoints[0]) {
      this.map?.setView(this.drawnPoints[0], 15);
    }
  }

  clearDrawing(): void {
    this.drawnPoints = [];
    this.renderDrawing();
  }

  searchAddress(): void {
    if (!this.searchText.trim()) {
      return;
    }
    this.http.get<Array<{ lat: string; lon: string; display_name: string }>>('https://nominatim.openstreetmap.org/search', {
      params: { q: this.searchText, format: 'json', limit: 1, addressdetails: 1 }
    }).subscribe((results) => {
      const first = results[0];
      if (!first) {
        this.fail('Endereço não encontrado. Tente informar rua, bairro e cidade.');
        return;
      }
      this.error.set('');
      this.map?.setView([Number(first.lat), Number(first.lon)], 17);
    });
  }

  private addPoint(point: L.LatLng): void {
    this.drawnPoints.push(point);
    this.renderDrawing();
  }

  private renderDrawing(): void {
    this.drawingLayer.clearLayers();
    this.drawnPoints.forEach((point) => L.circleMarker(point, { radius: 5, color: this.form.color }).addTo(this.drawingLayer));
    if (this.drawnPoints.length >= 2) {
      L.polyline(this.drawnPoints, { color: this.form.color }).addTo(this.drawingLayer);
    }
    if (this.drawnPoints.length >= 3) {
      L.polygon(this.drawnPoints, { color: this.form.color, fillOpacity: 0.18 }).addTo(this.drawingLayer);
    }
  }

  private renderTerritories(): void {
    if (!this.map) {
      return;
    }
    this.territoryLayer.clearLayers();
    this.territories().forEach((territory) => {
      const points = this.pointsFromGeoJson(territory.polygonGeoJson);
      if (points.length >= 3) {
        L.polygon(points, { color: territory.color, fillOpacity: 0.12 })
          .bindPopup(`<strong>${territory.name}</strong><br>${territory.teamName}`)
          .addTo(this.territoryLayer);
      }
    });
  }

  private geoJson(): string {
    const coordinates = this.drawnPoints.map((point) => [point.lng, point.lat]);
    coordinates.push(coordinates[0]);
    return JSON.stringify({ type: 'Polygon', coordinates: [coordinates] });
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

  private blank(): Territory {
    return { name: '', teamId: this.visitTeams()[0]?.id ?? 0, color: '#276749', polygonGeoJson: '', active: true, enforceForProjectists: false };
  }

  visitTeams(): Team[] {
    return this.teams().filter((team) => team.canRegisterVisits);
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
