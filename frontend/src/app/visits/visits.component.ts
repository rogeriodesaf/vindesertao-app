import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { SlicePipe } from '@angular/common';
import { AfterViewInit, Component, NgZone, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import * as L from 'leaflet';
import { FileSource, PMTiles } from 'pmtiles';
import { leafletLayer } from 'protomaps-leaflet';
import { finalize, firstValueFrom } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { formatDateTime } from '../core/date-format';
import { missionCityMap, missionCityMaps, MissionCityMapProfile } from '../core/mission-city.config';
import { Team, Territory, Visit } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { OfflineMapCacheService, OfflinePackageMetadata } from '../core/offline-map-cache.service';
import { normalizeOfflineVisit, OfflineVisitQueueService } from '../core/offline-visit-queue.service';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { ListCardAction, ListCardComponent, ListCardInfo } from '../shared/list-card.component';
import { FormSectionComponent } from '../shared/form-section.component';
import { DatePickerComponent } from '../shared/date-picker.component';
import { DateRangeFilterComponent } from '../shared/date-range-filter.component';

type VisitFormSection = 'basic' | 'location' | 'photo' | 'more' | 'visits';
type LocationSource = 'none' | 'gps' | 'map' | 'manual' | 'address';
type VisitMarkerCategory = 'common' | 'photo' | 'prayer';
interface VisitFormDraft {
  form: Visit;
  editingId: number | null;
  locationSource: LocationSource;
  locationAccuracy: number | null;
}

@Component({
  selector: 'app-visits',
  standalone: true,
  imports: [FormsModule, SlicePipe, ListCardComponent, EmptyStateComponent, FormSectionComponent, DatePickerComponent, DateRangeFilterComponent],
  host: {
    '(document:keydown.escape)': 'closePhoto(); closeVisitDetails()'
  },
  template: `
    <div class="mobile-view-toggle" role="group" aria-label="Visualização da tela de visitas">
      <button type="button" [class.active]="mobileView() === 'form'" (click)="showMobileView('form')">Cadastro</button>
      <button type="button" [class.active]="mobileView() === 'map'" (click)="showMobileView('map')">Mapa</button>
    </div>
    <section class="workspace" [class.mobile-map-view]="mobileView() === 'map'">
      @if (shouldMountMap()) {
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
          @if (territories().length) {
            <details class="visit-territory-legend">
              <summary>Territórios</summary>
              @for (territory of territories(); track territory.id) {
                <div>
                  <span [style.background]="territory.color"></span>
                  <strong>{{ territory.teamName || territory.name }}</strong>
                  <small>{{ territory.houseCount || 0 }} casas</small>
                </div>
              }
            </details>
          }
          @if (territoryStatus() && !territoryNoticeDismissed()) {
            <div class="territory-status" [class.outside]="territoryOutside()" role="status">
              <span>
                <span class="territory-status-full">Apenas territórios autorizados são exibidos. As restrições serão aplicadas ao salvar.</span>
                <span class="territory-status-short">Apenas territórios autorizados são exibidos.</span>
              </span>
              <button type="button" class="territory-status-dismiss" aria-label="Fechar aviso de territórios"
                (click)="dismissTerritoryNotice()">×</button>
            </div>
          }
        </div>
      }

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
            <div class="offline-actions">
              <button type="button" class="secondary" [disabled]="offlinePackageBusy() || !online()" (click)="prepareFieldOffline()">
                {{ offlinePackageBusy() ? 'Preparando...' : 'Preparar mapa offline' }}
              </button>
            </div>
            @if (offlinePackageMetadata(); as metadata) {
              <small>Mapa preparado em {{ formatDate(metadata.updatedAt) }} · {{ metadata.visitCount }} casas</small>
            } @else {
              <small class="error">Este aparelho ainda nao foi preparado para o trabalho sem internet.</small>
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

        @if (canModifyVisit()) {
          <h2 class="visit-form-title">{{ editingId() ? 'Editar visita' : 'Nova visita' }}</h2>
          <form #visitForm="ngForm" class="visit-accordion-form" novalidate (ngSubmit)="save(visitForm)">
            <app-form-section title="Informações básicas" subtitle="Dados principais da visita" icon="person" tone="cyan" sectionId="visit-basic"
              [open]="openSection() === 'basic'" [error]="sectionError() === 'basic'" (toggle)="toggleSection('basic')">
              <label for="visit-person-name">Nome da pessoa<input id="visit-person-name" name="personName" [(ngModel)]="form.personName" required [attr.aria-invalid]="sectionError() === 'basic' && !form.personName ? true : null" aria-describedby="visit-person-error"></label>
              @if (sectionError() === 'basic' && !form.personName) { <small id="visit-person-error" class="field-error">Informe o nome da pessoa.</small> }
              <label for="visit-phone">Telefone<input id="visit-phone" name="phone" type="tel" inputmode="tel" [(ngModel)]="form.phone"></label>
              <label class="check-row" for="visit-wants"><input id="visit-wants" name="wantsVisits" type="checkbox" [(ngModel)]="form.wantsVisits"> Deseja receber visitas?</label>
              <label for="visit-prayer">Pedido de oração<textarea id="visit-prayer" name="prayerRequest" [(ngModel)]="form.prayerRequest"></textarea></label>
              <label for="visit-notes">Observações<textarea id="visit-notes" name="notes" [(ngModel)]="form.notes"></textarea></label>
            </app-form-section>

            <app-form-section title="Localização" subtitle="Onde esta visita ocorreu" icon="location" tone="green" sectionId="visit-location"
              [badge]="hasSelectedPoint() ? 'Localização capturada' : ''" [open]="openSection() === 'location'" [error]="sectionError() === 'location'" (toggle)="toggleSection('location')">
              <div class="location-summary" role="status" aria-live="polite" [attr.data-state]="locationStateLabel()"><span class="location-summary-icon" aria-hidden="true">{{ locationStateIcon() }}</span><div><strong>{{ locationHeadline() }}</strong><span>{{ geolocationMessage() || locationAddress() }}</span>@if (locationAccuracy()) { <small>Precisão: ± {{ locationAccuracy() }} metros</small> }</div></div>
              @if (sectionError() === 'location' && error()) { <small class="field-error">{{ error() }}</small> }
              @if (territoryStatus()) { <div class="territory-form-alert" [class.warning]="territoryOutside()" role="status"><span aria-hidden="true">{{ territoryOutside() ? '!' : '✓' }}</span><div><strong>{{ territoryOutside() ? 'Atenção' : 'Território confirmado' }}</strong><small>{{ territoryStatus() }}</small></div></div> }
              <div class="location-primary-actions" [class.has-location]="hasSelectedPoint()">
                @if (hasSelectedPoint()) {
                  <button type="button" class="secondary" (click)="showMobileView('map')">Ver no mapa</button>
                }
                <button type="button" [disabled]="geolocationState() === 'loading'" (click)="handleLocationAction()">{{ locationActionLabel() }}</button>
              </div>
              <details class="technical-details" [open]="technicalDetailsOpen()" (toggle)="technicalDetailsOpen.set($any($event.target).open)">
                <summary>Detalhes técnicos</summary>
                <div class="form-grid coordinates"><label for="visit-latitude">Latitude<input id="visit-latitude" name="latitude" type="number" step="any" [(ngModel)]="form.latitude" (ngModelChange)="manualCoordinatesChanged()"></label><label for="visit-longitude">Longitude<input id="visit-longitude" name="longitude" type="number" step="any" [(ngModel)]="form.longitude" (ngModelChange)="manualCoordinatesChanged()"></label></div>
                <small>Origem: {{ locationSourceLabel() }}</small>
              </details>
            </app-form-section>

            <app-form-section title="Foto da casa" subtitle="Registre a casa visitada" icon="photo" tone="purple" sectionId="visit-photo"
              [badge]="photoPreview() ? 'Foto anexada' : ''" [open]="openSection() === 'photo'" (toggle)="toggleSection('photo')">
              <div class="photo-actions"><label class="button">Abrir câmera<input class="visually-hidden" type="file" accept="image/*" capture="environment" (change)="attachPhoto($event)"></label><label class="button secondary">Escolher da galeria<input class="visually-hidden" type="file" accept="image/*" (change)="attachPhoto($event)"></label></div>
              @if (photoPreview()) { <div class="photo-preview"><img [src]="photoPreview()" alt="Foto anexada à ficha"><div><strong>{{ form.photoFileName || 'Foto anexada' }}</strong><small>Esta foto será salva junto com a ficha da casa.</small><button type="button" class="secondary" (click)="removePhoto()">Remover foto</button></div></div> }
            </app-form-section>

            <app-form-section title="Mais informações" subtitle="Dados complementares" icon="info" tone="orange" sectionId="visit-more"
              [open]="openSection() === 'more'" [error]="sectionError() === 'more'" (toggle)="toggleSection('more')">
              <div class="form-grid"><label for="visit-street">Rua<input id="visit-street" name="street" [(ngModel)]="form.street"></label><label for="visit-number">Número<input id="visit-number" name="number" [(ngModel)]="form.number"></label></div>
              <div class="form-grid"><label for="visit-neighborhood">Bairro<input id="visit-neighborhood" name="neighborhood" [(ngModel)]="form.neighborhood"></label><label for="visit-city">Cidade<input id="visit-city" name="city" [(ngModel)]="form.city" required [attr.aria-invalid]="sectionError() === 'more' && !form.city ? true : null" aria-describedby="visit-city-error"></label></div>
              @if (sectionError() === 'more' && !form.city) { <small id="visit-city-error" class="field-error">Informe a cidade.</small> }
              <label for="visit-address">Endereço manual<textarea id="visit-address" name="manualAddress" [(ngModel)]="form.manualAddress"></textarea></label>
              <div class="form-grid"><label for="visit-age">Idade<input id="visit-age" name="personAge" type="number" min="0" [(ngModel)]="form.personAge"></label><label for="visit-household">Moradores na casa<input id="visit-household" name="householdSize" type="number" min="0" [(ngModel)]="form.householdSize"></label></div>
              <label for="visit-reference">Ponto de referência<textarea id="visit-reference" name="referencePoint" [(ngModel)]="form.referencePoint"></textarea></label>
              <label>Sugestão de próxima visita
                <app-date-picker name="nextVisitAt" ariaLabel="Data e horário sugeridos para a próxima visita" [withTime]="true" [ngModel]="toLocalDateTime(form.nextVisitAt)" (ngModelChange)="setNextVisitAt($event)" />
                <small class="field-help">Esta data é apenas uma sugestão de retorno para a equipe, não um agendamento oficial.</small>
              </label>
              <label for="visit-streetview">Link do Street View<input id="visit-streetview" name="streetViewUrl" type="url" placeholder="Cole aqui o link do Google Street View" [(ngModel)]="form.streetViewUrl"></label>
              <button type="button" class="secondary" [disabled]="!hasStreetViewTarget()" (click)="openStreetView()">Ver no Street View</button>
            </app-form-section>

            <app-form-section title="Visitas da equipe" subtitle="Histórico de visitas" icon="groups" tone="blue" sectionId="visit-team-history"
              [badge]="visits().length + ' visita(s)'" [open]="openSection() === 'visits'" (toggle)="toggleSection('visits')">
              <div class="filters visit-section-filters">
                <div class="form-grid">
                  <input aria-label="Filtrar por bairro" placeholder="Bairro" [(ngModel)]="filters.neighborhood" [ngModelOptions]="{standalone: true}" (keyup.enter)="loadVisits()">
                  <select aria-label="Filtrar por interesse" [(ngModel)]="filters.wantsVisits" [ngModelOptions]="{standalone: true}">
                    <option value="">Todas</option><option value="true">Aceita</option><option value="false">Não aceita</option>
                  </select>
                </div>
                <app-date-range-filter class="visit-date-filter" [(from)]="filters.from" [(to)]="filters.to"
                  valueMode="datetime" [loading]="loadingVisits()" (filter)="loadVisits()" (clear)="loadVisits()" />
              </div>
              <div class="visit-list unified-list">@for (visit of visits(); track visit.id) { <app-list-card [title]="visit.personName" [interactive]="true"
                [actions]="visitActions(visit)" [actionsInline]="true" (activate)="selectVisit(visit)"
                (action)="handleVisitAction(visit, $event)" [infos]="visitCardInfos(visit)" /> } @empty { <app-empty-state message="Nenhuma visita encontrada." /> }</div>
            </app-form-section>
            @if (message()) {
              <p class="success">{{ message() }}</p>
            }
            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
            <div class="actions visit-form-actions">
              <button type="submit" class="save-visit" [class.loading]="saving()" [disabled]="saving()">{{ saving() ? 'Salvando...' : 'Salvar visita' }}</button>
              <button type="button" class="secondary" [disabled]="saving()" (click)="resetForm()">{{ isAdmin() ? 'Cancelar edição' : 'Limpar' }}</button>
            </div>
          </form>
          @if (locationActionsOpen()) {
            <button type="button" class="location-sheet-backdrop" aria-label="Fechar opções de localização" (click)="locationActionsOpen.set(false)"></button>
            <section class="location-action-sheet" role="dialog" aria-modal="true" aria-labelledby="location-sheet-title">
              <h2 id="location-sheet-title">Atualizar localização</h2>
              <button type="button" [disabled]="geolocationState() === 'loading'" (click)="useMyLocation(); locationActionsOpen.set(false)"><strong>Atualizar pelo GPS</strong><small>Capturar novamente a localização atual</small></button>
              <button type="button" (click)="showMobileView('map'); locationActionsOpen.set(false)"><strong>Abrir mapa para ajustar</strong><small>Mover o ponto no mapa</small></button>
              <div class="location-address-action"><input aria-label="Inserir endereço" placeholder="Rua, bairro ou cidade" [(ngModel)]="searchText" (keyup.enter)="searchAddress(); locationActionsOpen.set(false)"><button type="button" (click)="searchAddress(); locationActionsOpen.set(false)">Buscar endereço</button></div>
              <button type="button" class="secondary" (click)="locationActionsOpen.set(false)">Cancelar</button>
            </section>
          }
        } @else {
          <section class="map-summary-card">
            <h2>Mapa de visitas realizadas</h2>
            <p class="muted">Acompanhe aqui as casas marcadas pelas equipes de evangelismo. O mapa atualiza automaticamente enquanto esta tela estiver aberta.</p>
            <strong>{{ visits().length }} casa(s) carregada(s) no mapa</strong>
          </section>
        }

        @if (!canManageVisits() && !adminEditing()) {
          <div class="filters">
            <h2>{{ visitListTitle() }}</h2>
            <div class="form-grid">
              <input placeholder="Bairro" [(ngModel)]="filters.neighborhood" (keyup.enter)="loadVisits()">
              <select [(ngModel)]="filters.wantsVisits">
                <option value="">Todas</option><option value="true">Aceita</option><option value="false">Não aceita</option>
              </select>
            </div>
            <app-date-range-filter class="visit-date-filter" [(from)]="filters.from" [(to)]="filters.to"
              valueMode="datetime" [loading]="loadingVisits()" (filter)="loadVisits()" (clear)="loadVisits()" />
          </div>
          <div class="visit-list unified-list">@for (visit of visits(); track visit.id) { <app-list-card [title]="visit.personName" [interactive]="true"
            [actions]="visitActions(visit)" [actionsInline]="true" (activate)="selectVisit(visit)"
            (action)="handleVisitAction(visit, $event)" [infos]="visitCardInfos(visit)" /> } @empty { <app-empty-state message="Nenhuma visita encontrada." /> }</div>
        }
      </aside>
    </section>
    @if (visitDetails(); as visit) {
      <div class="visit-details-backdrop" (click)="closeVisitDetails()">
        <section class="visit-details-modal" role="dialog" aria-modal="true" aria-labelledby="visit-details-title" (click)="$event.stopPropagation()">
          <div class="visit-details-head">
            <div>
              <small>Detalhes da visita</small>
              <h2 id="visit-details-title">{{ visit.personName }}</h2>
            </div>
            <button type="button" class="icon-button" aria-label="Fechar detalhes" (click)="closeVisitDetails()">×</button>
          </div>
          @if (detailPhotoSource()) {
            @if (detailPhotoLoadFailed()) {
              <p class="visit-photo-error">Não foi possível carregar esta foto.</p>
            } @else {
              <button type="button" class="visit-details-photo" (click)="openPhoto(detailPhotoSource()!, visit.personName)">
                <img [src]="detailPhotoSource()" [alt]="'Foto da visita de ' + visit.personName" (error)="detailPhotoLoadFailed.set(true)">
              </button>
            }
          } @else {
            <p class="visit-map-no-photo">Sem foto registrada</p>
          }
          <dl class="visit-details-grid">
            <div><dt>Nome</dt><dd>{{ visit.personName }}</dd></div>
            @if (visit.phone) { <div><dt>Telefone</dt><dd>{{ visit.phone }}</dd></div> }
            <div><dt>Localização</dt><dd>{{ visitAddress(visit) }}</dd></div>
            <div><dt>Data e hora</dt><dd>{{ formatDate(visit.createdAt) }}</dd></div>
            @if (visit.teamName) { <div><dt>Equipe</dt><dd>{{ visit.teamName }}</dd></div> }
            @if (visit.responsibleUserName) { <div><dt>Projetista responsável</dt><dd>{{ visit.responsibleUserName }}</dd></div> }
            <div><dt>Deseja receber visitas</dt><dd>{{ visit.wantsVisits ? 'Sim' : 'Não' }}</dd></div>
            @if (visit.personAge !== undefined) { <div><dt>Idade</dt><dd>{{ visit.personAge }}</dd></div> }
            @if (visit.householdSize !== undefined) { <div><dt>Moradores</dt><dd>{{ visit.householdSize }}</dd></div> }
            @if (visit.referencePoint) { <div><dt>Ponto de referência</dt><dd>{{ visit.referencePoint }}</dd></div> }
            @if (visit.prayerRequest) { <div class="wide"><dt>Pedido de oração</dt><dd>{{ visit.prayerRequest }}</dd></div> }
            @if (visit.notes) { <div class="wide"><dt>Observações</dt><dd>{{ visit.notes }}</dd></div> }
            @if (visit.nextVisitAt) { <div><dt>Sugestão de próxima visita</dt><dd>{{ formatDate(visit.nextVisitAt) }}</dd></div> }
            @if (visit.streetViewUrl) { <div><dt>Street View</dt><dd><a [href]="visit.streetViewUrl" target="_blank" rel="noopener">Abrir localização</a></dd></div> }
            @if (visit.updatedAt) { <div><dt>Última atualização</dt><dd>{{ formatDate(visit.updatedAt) }}</dd></div> }
          </dl>
          @if (isAdmin()) {
            <div class="actions">
              <button type="button" (click)="edit(visit)">Editar</button>
              <button type="button" class="secondary" [disabled]="deletingId() === visit.id"
                (click)="deleteVisit(visit)">{{ deletingId() === visit.id ? 'Excluindo...' : 'Excluir' }}</button>
            </div>
          }
        </section>
      </div>
    }
    @if (photoViewer()) {
      <div class="visit-photo-modal-backdrop" (click)="closePhoto()">
        <section class="visit-photo-modal" role="dialog" aria-modal="true" aria-labelledby="visit-photo-modal-title" (click)="$event.stopPropagation()">
          <div class="visit-photo-modal-head">
            <h2 id="visit-photo-modal-title">{{ photoViewer()?.title }}</h2>
            <button type="button" class="icon-button" aria-label="Fechar foto" (click)="closePhoto()">×</button>
          </div>
          @if (photoLoadFailed()) {
            <p class="visit-photo-error">Não foi possível carregar esta foto.</p>
          } @else {
            <img [src]="photoViewer()?.src" [alt]="photoViewer()?.alt" (error)="photoLoadFailed.set(true)">
          }
          <small class="visit-photo-zoom-hint">No celular, use o gesto de pinça para ampliar.</small>
        </section>
      </div>
    }
  `
})
export class VisitsComponent implements OnInit, AfterViewInit, OnDestroy {
  form: Visit = this.blankVisit();
  filters: { neighborhood: string; wantsVisits: string; from: string; to: string } = {
    neighborhood: '',
    wantsVisits: '',
    from: '',
    to: ''
  };
  visits = signal<Visit[]>([]);
  territories = signal<Territory[]>([]);
  editingId = signal<number | null>(null);
  message = signal('');
  error = signal('');
  online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  saving = signal(false);
  loadingVisits = signal(false);
  loadingTerritories = signal(false);
  offlinePackageBusy = signal(false);
  offlinePackageMetadata = signal<OfflinePackageMetadata | null>(null);
  searchingAddress = signal(false);
  exporting = signal(false);
  deletingId = signal<number | null>(null);
  pendingOpen = signal(false);
  mobileView = signal<'form' | 'map'>('form');
  mobileViewport = signal(this.isMobileViewport());
  geolocationState = signal<'idle' | 'loading' | 'success' | 'denied' | 'unavailable' | 'timeout'>('idle');
  geolocationMessage = signal('');
  locatingMap = signal(false);
  mapLocationMessage = signal('');
  territoryStatus = signal('');
  territoryOutside = signal(false);
  territoryNoticeDismissed = signal(this.isTerritoryNoticeDismissed());
  openSection = signal<VisitFormSection | null>('basic');
  sectionError = signal<VisitFormSection | null>(null);
  locationActionsOpen = signal(false);
  technicalDetailsOpen = signal(false);
  locationAccuracy = signal<number | null>(null);
  locationSource = signal<LocationSource>('none');
  photoViewer = signal<{ src: string; alt: string; title: string } | null>(null);
  photoLoadFailed = signal(false);
  visitDetails = signal<Visit | null>(null);
  detailPhotoSource = signal<string | null>(null);
  detailPhotoLoadFailed = signal(false);
  searchText = '';
  private map?: L.Map;
  private marker?: L.Marker;
  private userLocationMarker?: L.CircleMarker;
  private userCoordinates?: L.LatLngTuple;
  private visitLayer = L.layerGroup();
  private territoryLayer = L.layerGroup();
  private refreshHandle?: ReturnType<typeof setInterval>;
  private mapTileWarningShown = false;
  private offlineMapNoticeShown = false;
  private missionAreaBounds = L.latLngBounds(
    missionCityMaps.flatMap(city => [city.bounds[0], city.bounds[1]])
  );
  private photoBlobUrls = new WeakMap<Blob, string>();
  private createdPhotoUrls = new Set<string>();
  private mobileFormDraft: VisitFormDraft | null = null;
  private reloadVisitsAfterCurrentRequest = false;
  private mapGeneration = 0;
  private gpsOutsideNoticeShown = false;

  constructor(
    public api: ApiService,
    private http: HttpClient,
    private auth: AuthService,
    private zone: NgZone,
    private notifications: NotificationService,
    private offlineMapCache: OfflineMapCacheService,
    public offlineQueue: OfflineVisitQueueService
  ) {}

  ngOnInit(): void {
    if (this.mobileViewport()) {
      this.restorePersistedVisitDraft();
    }
  }

  dismissTerritoryNotice(): void {
    this.territoryNoticeDismissed.set(true);
    try {
      sessionStorage.setItem('visit-map-territory-notice-dismissed', 'true');
    } catch {
      // O aviso continua fechado enquanto esta instância da tela estiver ativa.
    }
  }

  private isTerritoryNoticeDismissed(): boolean {
    try {
      return typeof sessionStorage !== 'undefined'
        && sessionStorage.getItem('visit-map-territory-notice-dismissed') === 'true';
    } catch {
      return false;
    }
  }

  ngAfterViewInit(): void {
    if (!this.mobileViewport()) this.initializeMap();
    this.loadTerritories();
    this.loadVisits();
    if (!this.canManageVisits()) this.refreshHandle = setInterval(() => this.loadVisits(), 30000);
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleResize);
    this.offlineQueue.refreshCount().then(() => this.renderMarkers(this.visits()));
    this.offlineMapCache.loadPackageMetadata().then(metadata => this.offlinePackageMetadata.set(metadata));
  }

  private initializeMap(): void {
    if (this.map) return;
    const container = document.getElementById('visit-map');
    if (!container) return;
    const generation = ++this.mapGeneration;
    const map = L.map(container, {
      zoomControl: false,
      minZoom: missionCityMap.minZoom,
      maxZoom: missionCityMap.maxZoom,
      maxBounds: this.missionAreaBounds,
      maxBoundsViscosity: 0.9
    }).setView(missionCityMap.center, missionCityMap.initialZoom);
    this.map = map;
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    missionCityMaps.forEach(city => this.addOfflineCityLayer(city, map, generation));
    this.territoryLayer.addTo(map);
    this.visitLayer.addTo(map);
    map.on('click', (event: L.LeafletMouseEvent) => {
      if (this.canModifyVisit()) {
        this.selectPoint(event.latlng.lat, event.latlng.lng);
      }
    });
    if (this.hasSelectedPoint()) {
      this.marker = L.marker([Number(this.form.latitude), Number(this.form.longitude)]).addTo(map);
    }
    this.renderTerritories();
    this.renderMarkers(this.visits());
  }

  private async addOfflineCityLayer(city: MissionCityMapProfile, map: L.Map, generation: number): Promise<void> {
    try {
      const response = await this.offlineMapCache.mapArchive(city.mapArchiveUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const archive = new File(
        [await response.blob()],
        `${city.id}-${city.mapDataVersion}.pmtiles`,
        { type: 'application/vnd.pmtiles' }
      );
      const offlineCityLayer = leafletLayer({
        url: new PMTiles(new FileSource(archive)),
        flavor: 'light',
        lang: 'pt',
        bounds: city.bounds,
        minZoom: city.minZoom,
        maxZoom: city.maxZoom,
        maxDataZoom: city.maxDataZoom,
        noWrap: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | <a href="https://protomaps.com">Protomaps</a>'
      });
      if (this.map !== map || this.mapGeneration !== generation) return;
      offlineCityLayer['addTo'](map);
    } catch {
      if (this.map !== map || this.mapGeneration !== generation) return;
      if (!this.mapTileWarningShown) {
        this.mapTileWarningShown = true;
        this.notifications.info(`O mapa offline de ${city.name} não pôde carregar completamente.`);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.refreshHandle) {
      clearInterval(this.refreshHandle);
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleResize);
    this.createdPhotoUrls.forEach((url) => URL.revokeObjectURL(url));
    this.createdPhotoUrls.clear();
    this.closeMapOverlays();
    this.destroyMap();
  }

  loadVisits(): void {
    if (this.loadingVisits()) {
      return;
    }
    if (!this.online()) {
      this.loadCachedVisits();
      return;
    }
    this.loadingVisits.set(true);
    this.api.visits({
      page: 0,
      size: 100,
      neighborhood: this.filters.neighborhood,
      wantsVisits: this.filters.wantsVisits || undefined,
      from: this.toOffset(this.filters.from),
      to: this.toOffset(this.filters.to)
    })
      .pipe(finalize(() => {
        this.loadingVisits.set(false);
        if (this.reloadVisitsAfterCurrentRequest) {
          this.reloadVisitsAfterCurrentRequest = false;
          queueMicrotask(() => this.loadVisits());
        }
      }))
      .subscribe({
        next: (page) => {
          if (this.reloadVisitsAfterCurrentRequest) {
            return;
          }
          this.visits.set(page.items);
          this.renderMarkers(page.items);
          this.refreshMapView();
          if (!this.hasVisitFilters()) {
            this.offlineMapCache.saveVisits(page.items)
              .catch((error) => console.warn('[Mapa offline] Não foi possível salvar as visitas:', error));
          }
        },
        error: () => this.loadCachedVisits(true)
      });
  }

  loadTerritories(): void {
    if (this.loadingTerritories()) {
      return;
    }
    if (!this.online()) {
      this.loadCachedTerritories();
      return;
    }
    this.loadingTerritories.set(true);
    this.api.territories().pipe(finalize(() => this.loadingTerritories.set(false))).subscribe({
      next: (territories) => {
        this.territories.set(territories);
        this.renderTerritories();
        this.updateTerritoryStatus();
        this.refreshMapView();
        this.offlineMapCache.saveTerritories(territories)
          .catch((error) => console.warn('[Mapa offline] Não foi possível salvar os territórios:', error));
      },
      error: () => this.loadCachedTerritories(true)
    });
  }

  async prepareFieldOffline(): Promise<void> {
    if (this.offlinePackageBusy() || !this.online()) return;
    this.offlinePackageBusy.set(true);
    try {
      const [page, territories] = await Promise.all([
        firstValueFrom(this.api.visits({ page: 0, size: 10000 })),
        firstValueFrom(this.api.territories())
      ]);
      const teams: Team[] = [...new Map(territories.map(territory => [territory.teamId, {
        id: territory.teamId,
        name: territory.teamName || territory.name,
        teamType: 'EVANGELISM' as const,
        canRegisterVisits: true
      }])).values()];
      const metadata = await this.offlineMapCache.prepareOfflinePackage(
        missionCityMaps.map(city => ({ id: city.id, url: city.mapArchiveUrl, version: city.mapDataVersion })),
        territories, page.items, teams, []
      );
      this.offlinePackageMetadata.set(metadata);
      this.notifications.success(`Mapa offline pronto com ${page.items.length} casas e ${territories.length} territorios.`);
    } catch {
      this.notifications.error('Nao foi possivel preparar o mapa offline. Verifique a conexao e o espaco livre.');
    } finally {
      this.offlinePackageBusy.set(false);
    }
  }

  private loadCachedVisits(requestFailed = false): void {
    this.offlineMapCache.loadVisits().then((items) => {
      if (items.length) {
        const filtered = this.filterCachedVisits(items);
        this.visits.set(filtered);
        this.renderMarkers(filtered);
        this.refreshMapView();
        this.showOfflineMapNotice();
        return;
      }
      if (requestFailed) {
        this.fail('Não foi possível carregar as visitas e ainda não há uma cópia offline neste aparelho.');
      }
    });
  }

  private filterCachedVisits(items: Visit[]): Visit[] {
    const neighborhood = this.filters.neighborhood.trim().toLocaleLowerCase('pt-BR');
    const wantsVisits = this.filters.wantsVisits;
    const from = this.filters.from ? new Date(this.filters.from).getTime() : null;
    const to = this.filters.to ? new Date(this.filters.to).getTime() : null;
    return items.filter(visit => {
      if (neighborhood && !String(visit.neighborhood || '').toLocaleLowerCase('pt-BR').includes(neighborhood)) return false;
      if (wantsVisits && String(visit.wantsVisits) !== wantsVisits) return false;
      const createdAt = visit.createdAt ? new Date(visit.createdAt).getTime() : null;
      if (from !== null && (createdAt === null || createdAt < from)) return false;
      if (to !== null && (createdAt === null || createdAt > to)) return false;
      return true;
    });
  }

  private showSavedVisitImmediately(savedVisit: Visit): void {
    this.visits.update(items => {
      const withoutSavedVisit = items.filter(item => item.id !== savedVisit.id);
      return this.filterCachedVisits([savedVisit]).length
        ? [savedVisit, ...withoutSavedVisit]
        : withoutSavedVisit;
    });
    this.renderMarkers(this.visits());
    this.refreshMapView();
  }

  private refreshVisitsAfterSave(): void {
    if (this.loadingVisits()) {
      this.reloadVisitsAfterCurrentRequest = true;
      return;
    }
    this.loadVisits();
  }

  private openVisitListAfterSave(): void {
    this.openSection.set('visits');
    requestAnimationFrame(() => {
      document.getElementById('visit-team-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private hasVisitFilters(): boolean {
    return !!(this.filters.neighborhood.trim() || this.filters.wantsVisits || this.filters.from || this.filters.to);
  }

  private loadCachedTerritories(requestFailed = false): void {
    this.offlineMapCache.loadTerritories().then((territories) => {
      if (territories.length) {
        this.territories.set(territories);
        this.renderTerritories();
        this.updateTerritoryStatus();
        this.refreshMapView();
        this.showOfflineMapNotice();
        return;
      }
      if (requestFailed) {
        this.notifications.error('Não foi possível carregar os territórios e ainda não há uma cópia offline neste aparelho.');
      }
    });
  }

  private showOfflineMapNotice(): void {
    if (!this.offlineMapNoticeShown) {
      this.offlineMapNoticeShown = true;
      this.notifications.info('Exibindo a última cópia salva das visitas no mapa.');
    }
  }

  searchAddress(): void {
    if (!this.searchText.trim()) {
      return;
    }
    const offlineCity = this.findMissionCityBySearch(this.searchText);
    if (offlineCity) {
      this.centerMissionCity(offlineCity);
      this.message.set(`Mapa de ${offlineCity.name} centralizado.`);
      this.notifications.info(this.message());
      return;
    }
    if (!this.online()) {
      this.notifications.info('A busca de ruas precisa de internet. Os mapas de Rio Tinto e João Pessoa continuam disponíveis offline.');
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
          if (this.canModifyVisit()) {
            this.form.manualAddress = this.searchText;
          }
          this.message.set(this.canModifyVisit()
            ? 'Endereço não encontrado. Preencha manualmente e salve.'
            : 'Endereço não encontrado.');
          this.notifications.info(this.message());
          return;
        }
        if (this.canModifyVisit()) {
          this.form.manualAddress = first.display_name;
          this.selectPoint(Number(first.lat), Number(first.lon));
          this.locationSource.set('address');
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
      const invalidName = Object.keys(form.controls).find((name) => form.controls[name].invalid) || 'personName';
      const section: VisitFormSection = invalidName === 'personName' ? 'basic' : 'more';
      this.openInvalidField(section, invalidName);
      this.fail('Preencha os campos obrigatórios antes de salvar.');
      return;
    }
    const payload = normalizeOfflineVisit(this.form);
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
      next: (savedVisit) => {
        this.saving.set(false);
        this.ok(editing ? 'Ficha de visita atualizada com sucesso.' : 'Ficha de visita salva com sucesso.');
        this.showSavedVisitImmediately(savedVisit);
        this.resetForm();
        this.openVisitListAfterSave();
        this.refreshVisitsAfterSave();
      },
      error: (response: HttpErrorResponse) => this.handleSaveError(response, payload, editing)
    });
  }

  edit(visit: Visit): void {
    if (!visit.id) {
      return;
    }
    this.closeVisitDetails();
    this.clearVisitDraft();
    this.api.visit(visit.id).subscribe((fullVisit) => {
      const editingAsAdmin = this.isAdmin();
      this.form = { ...fullVisit };
      this.editingId.set(fullVisit.id ?? null);
      this.mobileView.set('form');
      this.openSection.set('basic');
      if (fullVisit.latitude && fullVisit.longitude) {
        this.selectPoint(fullVisit.latitude, fullVisit.longitude);
        this.locationSource.set('manual');
        this.map?.setView([fullVisit.latitude, fullVisit.longitude], 17);
        if (!editingAsAdmin) this.scrollMapIntoView();
      }
      if (editingAsAdmin) {
        requestAnimationFrame(() => document.querySelector('.visit-form-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    });
  }

  deleteVisit(visit: Visit): void {
    if (!this.isAdmin() || !visit.id || this.deletingId()) return;
    if (!window.confirm(`Excluir a visita de ${visit.personName}? Esta ação não pode ser desfeita.`)) return;
    this.deletingId.set(visit.id);
    this.api.deleteVisit(visit.id).pipe(finalize(() => this.deletingId.set(null))).subscribe({
      next: () => {
        this.visits.update(items => items.filter(item => item.id !== visit.id));
        this.renderMarkers(this.visits());
        this.closeVisitDetails();
        this.notifications.success('Visita excluída com sucesso.');
        this.loadVisits();
      },
      error: () => this.fail('Não foi possível excluir a visita.')
    });
  }

  visitActions(visit: Visit): ListCardAction[] {
    if (!this.isAdmin()) return [];
    return [
      { id: 'edit', label: 'Editar', icon: 'edit' },
      {
        id: 'delete',
        label: this.deletingId() === visit.id ? 'Excluindo...' : 'Excluir',
        icon: 'delete',
        danger: true
      }
    ];
  }

  handleVisitAction(visit: Visit, action: string): void {
    if (action === 'edit') this.edit(visit);
    if (action === 'delete') this.deleteVisit(visit);
  }

  selectVisit(visit: Visit): void {
    this.openVisitDetails(visit);
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
    this.openSection.set('basic');
    this.sectionError.set(null);
    this.locationActionsOpen.set(false);
    this.technicalDetailsOpen.set(false);
    this.locationAccuracy.set(null);
    this.locationSource.set('none');
    this.clearVisitDraft();
  }

  showMobileView(view: 'form' | 'map'): void {
    this.closeMapOverlays();
    if (view === 'map') {
      this.preserveVisitDraft();
    } else {
      this.restoreVisitDraft();
      if (this.mobileViewport()) this.destroyMap();
    }
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

  shouldMountMap(): boolean {
    return !this.mobileViewport() || this.mobileView() === 'map';
  }

  private closeMapOverlays(): void {
    this.locationActionsOpen.set(false);
    this.closeVisitDetails();
    this.closePhoto();
  }

  private destroyMap(): void {
    this.mapGeneration++;
    const map = this.map;
    this.map = undefined;
    if (map) {
      map.off();
      map.remove();
    }
    this.marker = undefined;
    this.userLocationMarker = undefined;
    this.userCoordinates = undefined;
    this.visitLayer.clearLayers();
    this.territoryLayer.clearLayers();
    this.locatingMap.set(false);
    this.mapLocationMessage.set('');
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
        this.locationAccuracy.set(Math.round(position.coords.accuracy));
        this.locationSource.set('gps');
        this.map?.setView([latitude, longitude], 18);
        this.geolocationState.set('success');
        this.geolocationMessage.set('Localização capturada. Use "Ver no mapa" para conferir ou ajustar o ponto.');
        this.ok('Localização capturada e adicionada à ficha.');
      }),
      (geoError) => this.zone.run(() => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          this.geolocationState.set('denied');
          this.geolocationMessage.set('Permissão de localização negada. Autorize o acesso e tente capturar novamente.');
        } else if (geoError.code === geoError.TIMEOUT) {
          this.geolocationState.set('timeout');
          this.geolocationMessage.set('A captura demorou demais. Tente novamente.');
        } else {
          this.geolocationState.set('unavailable');
          this.geolocationMessage.set('Não foi possível capturar a localização. Tente novamente.');
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
        const currentCity = this.findMissionCityByPoint(point);
        if (!currentCity) {
          this.userCoordinates = undefined;
          this.userLocationMarker?.remove();
          this.userLocationMarker = undefined;
          this.locatingMap.set(false);
          this.mapLocationMessage.set('Você está fora das áreas offline de Rio Tinto e João Pessoa. O mapa da missão foi mantido.');
          this.centerMissionCity();
          if (centerMap) {
            this.notifications.info(this.mapLocationMessage());
          }
          return;
        }
        this.userCoordinates = point;
        if (this.userLocationMarker) this.userLocationMarker.setLatLng(point);
        else {
          this.userLocationMarker = L.circleMarker(point, {
            radius: 9, color: '#ffffff', weight: 3, fillColor: '#1976d2', fillOpacity: 1
          }).bindPopup('Você está aqui');
          this.userLocationMarker.addTo(this.map as L.Map);
        }
        this.locatingMap.set(false);
        this.updateGpsTerritoryStatus(point);
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
      this.locationSource.set('manual');
      this.locationAccuracy.set(null);
      this.setPoint(latitude, longitude);
    }
  }

  toggleSection(section: VisitFormSection): void {
    this.openSection.update((current) => current === section ? null : section);
    this.sectionError.set(null);
    requestAnimationFrame(() => document.getElementById(`visit-${section === 'visits' ? 'team-history' : section}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }

  locationHeadline(): string {
    if (this.geolocationState() === 'loading') return this.hasSelectedPoint() ? 'Atualizando localização…' : 'Capturando localização…';
    if (this.geolocationState() === 'denied') return 'Permissão de localização não concedida';
    if (this.geolocationState() === 'unavailable' || this.geolocationState() === 'timeout') return 'Não foi possível obter a localização';
    if (this.hasSelectedPoint()) return this.locationSource() === 'map' ? 'Ponto selecionado no mapa' : 'Localização capturada';
    return 'Localização ainda não capturada';
  }

  locationAddress(): string {
    if (!this.hasSelectedPoint()) return 'Toque em "Capturar localização" para obter as coordenadas pelo GPS.';
    if (this.form.manualAddress?.trim()) return this.form.manualAddress.trim();
    const street = [this.form.street, this.form.number].filter(Boolean).join(', ');
    const place = [this.form.neighborhood, this.form.city].filter(Boolean).join(', ');
    return [street, place].filter(Boolean).join(' · ') || 'Localização pronta para ser conferida no mapa.';
  }

  locationActionLabel(): string {
    if (this.geolocationState() === 'loading') return this.hasSelectedPoint() ? 'Atualizando localização…' : 'Capturando localização…';
    return this.hasSelectedPoint() ? 'Atualizar localização' : 'Capturar localização';
  }

  handleLocationAction(): void {
    if (this.geolocationState() === 'loading') return;
    if (this.hasSelectedPoint()) {
      this.locationActionsOpen.set(true);
      return;
    }
    this.useMyLocation();
  }

  locationStateLabel(): string {
    if (this.geolocationState() === 'loading') return 'loading';
    if (this.geolocationState() === 'denied' || this.geolocationState() === 'unavailable' || this.geolocationState() === 'timeout') return 'error';
    return this.hasSelectedPoint() ? 'success' : 'idle';
  }

  locationStateIcon(): string { return this.locationStateLabel() === 'success' ? '✓' : this.locationStateLabel() === 'error' ? '!' : this.locationStateLabel() === 'loading' ? '…' : '⌖'; }

  locationSourceLabel(): string {
    return ({ none: 'não informada', gps: 'GPS', map: 'mapa', manual: 'coordenadas informadas', address: 'endereço pesquisado' } as const)[this.locationSource()];
  }

  visitCardInfos(visit: Visit): ListCardInfo[] {
    return [
      { icon: 'location', text: visit.neighborhood || visit.manualAddress || visit.city },
      { icon: 'volunteer', text: this.showResponsibleName() ? (visit.responsibleUserName || 'Responsável não informado') : '' },
      { icon: 'description', text: visit.hasPhoto ? 'Foto anexada' : '' },
      { icon: 'calendar', text: this.formatDate(visit.createdAt) }
    ];
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
    this.api.exportVisits({
      neighborhood: this.filters.neighborhood || undefined,
      wantsVisits: this.filters.wantsVisits || undefined,
      from: this.toOffset(this.filters.from),
      to: this.toOffset(this.filters.to)
    }).pipe(finalize(() => this.exporting.set(false))).subscribe({
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

  isAdmin(): boolean {
    return !!this.auth.user()?.roles.includes('admin');
  }

  adminEditing(): boolean {
    return this.isAdmin() && !!this.editingId();
  }

  canModifyVisit(): boolean {
    return this.canManageVisits() || this.adminEditing();
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

  private toOffset(value: string): string | undefined {
    return value ? new Date(value).toISOString() : undefined;
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
      this.locationSource.set('map');
      this.locationAccuracy.set(null);
      this.setPoint(latitude, longitude);
      this.message.set('Ponto selecionado no mapa. Latitude e longitude foram preenchidas.');
      this.notifications.info('Ponto selecionado no mapa.');
      if (this.mobileView() === 'map') {
        this.preserveVisitDraft();
      }
    });
  }

  private renderMarkers(items: Visit[]): void {
    this.visitLayer.clearLayers();
    const saved = items.map((visit) => ({ visit, createdAt: visit.createdAt, pending: false }));
    const pending = this.offlineQueue.pendingItems()
      .map((item) => ({ visit: item.visit, createdAt: item.createdAt, pending: true }));
    const located = [...saved, ...pending]
      .filter(({ visit }) => this.validCoordinates(visit.latitude, visit.longitude));
    const visible = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
      ? located.slice(0, 60)
      : located;
    visible.forEach(({ visit, createdAt, pending: isPending }) => {
      const coordinates: L.LatLngTuple = [Number(visit.latitude), Number(visit.longitude)];
      const photoSource = this.visitPhotoSource(visit);
      const category = this.markerCategory(visit, !!photoSource);
      const popup = this.visitPopup(visit, createdAt, photoSource, isPending);
      if (photoSource || category === 'prayer') {
        L.marker(coordinates, {
          icon: this.visitMarkerIcon(category, !!photoSource, visit.wantsVisits),
          title: `${visit.personName} - ${this.markerCategoryLabel(category)}`
        }).bindPopup(popup, { maxWidth: 320 }).addTo(this.visitLayer);
        return;
      }
      L.circleMarker(coordinates, {
        radius: 7,
        color: this.cssColor(visit.wantsVisits ? '--color-success' : '--color-error'),
        fillOpacity: 0.8
      }).bindPopup(popup, { maxWidth: 320 }).addTo(this.visitLayer);
    });
  }

  private visitPopup(visit: Visit, createdAt: string | undefined, photoSource: string | null, pending: boolean): HTMLElement {
    const popup = document.createElement('article');
    popup.className = 'visit-map-popup';

    const name = document.createElement('strong');
    name.textContent = visit.personName || 'Pessoa não identificada';
    popup.appendChild(name);

    const date = document.createElement('span');
    date.textContent = `Visita: ${this.formatDate(createdAt)}`;
    popup.appendChild(date);

    const address = document.createElement('span');
    address.textContent = this.visitAddress(visit);
    popup.appendChild(address);

    const responsible = document.createElement('span');
    responsible.textContent = [
      visit.teamName && `Equipe: ${visit.teamName}`,
      visit.responsibleUserName && `Projetista: ${visit.responsibleUserName}`
    ].filter(Boolean).join(' | ') || 'Responsável não informado';
    popup.appendChild(responsible);

    const wantsVisits = document.createElement('span');
    wantsVisits.className = 'visit-map-status';
    wantsVisits.textContent = visit.wantsVisits ? 'Deseja receber novas visitas' : 'Não deseja receber novas visitas';
    popup.appendChild(wantsVisits);

    if (visit.prayerRequest?.trim()) {
      const prayer = document.createElement('p');
      prayer.className = 'visit-map-prayer';
      prayer.textContent = `Pedido de oração: ${visit.prayerRequest.trim()}`;
      popup.appendChild(prayer);
    }

    if (pending) {
      const status = document.createElement('small');
      status.textContent = 'Pendente de sincronização';
      popup.appendChild(status);
    }

    if (!photoSource) {
      const noPhoto = document.createElement('span');
      noPhoto.className = 'visit-map-no-photo';
      noPhoto.textContent = 'Sem foto registrada';
      popup.appendChild(noPhoto);
    } else {
      const thumbnail = document.createElement('button');
      thumbnail.type = 'button';
      thumbnail.className = 'visit-map-photo-button';
      thumbnail.setAttribute('aria-label', `Ampliar foto de ${visit.personName}`);
      const image = document.createElement('img');
      image.src = photoSource;
      image.alt = `Foto da visita de ${visit.personName}`;
      const imageError = document.createElement('span');
      imageError.className = 'visit-map-photo-error';
      imageError.textContent = 'Não foi possível carregar a foto.';
      imageError.hidden = true;
      image.addEventListener('error', () => {
        image.hidden = true;
        imageError.hidden = false;
        thumbnail.disabled = true;
      });
      thumbnail.addEventListener('click', (event) => {
        event.preventDefault();
        this.zone.run(() => this.openPhoto(photoSource, visit.personName));
      });
      thumbnail.append(image, imageError);
      popup.appendChild(thumbnail);
    }

    const details = document.createElement('button');
    details.type = 'button';
    details.className = 'visit-map-details-button';
    details.textContent = 'Ver detalhes';
    details.addEventListener('click', (event) => {
      event.preventDefault();
      this.zone.run(() => this.openVisitDetails(visit));
    });
    popup.appendChild(details);
    return popup;
  }

  visitAddress(visit: Visit): string {
    if (visit.manualAddress?.trim()) {
      return visit.manualAddress.trim();
    }
    const street = [visit.street, visit.number].filter(Boolean).join(', ');
    const address = [street, visit.neighborhood, visit.city].filter(Boolean).join(' - ');
    return address || `Coordenadas: ${Number(visit.latitude).toFixed(6)}, ${Number(visit.longitude).toFixed(6)}`;
  }

  private visitPhotoSource(visit: Visit): string | null {
    const photoUrl = this.safeImageSource(visit.photoUrl);
    if (photoUrl) {
      return photoUrl;
    }
    const photo = visit.photoData as unknown;
    if (photo instanceof Blob) {
      let url = this.photoBlobUrls.get(photo);
      if (!url) {
        url = URL.createObjectURL(photo);
        this.photoBlobUrls.set(photo, url);
        this.createdPhotoUrls.add(url);
      }
      return url;
    }
    const photoData = this.safeImageSource(typeof photo === 'string' ? photo : undefined);
    if (photoData) {
      return photoData;
    }
    if (typeof photo === 'string' && /^[A-Za-z0-9+/=\s]+$/.test(photo) && photo.trim().length > 32) {
      return `data:${visit.photoContentType || 'image/jpeg'};base64,${photo.replace(/\s/g, '')}`;
    }
    return null;
  }

  private safeImageSource(value?: string): string | null {
    const source = value?.trim();
    return source && (/^https:\/\//i.test(source) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(source))
      ? source
      : null;
  }

  private markerCategory(visit: Visit, hasPhoto: boolean): VisitMarkerCategory {
    if (visit.prayerRequest?.trim()) {
      return 'prayer';
    }
    return hasPhoto ? 'photo' : 'common';
  }

  private markerCategoryLabel(category: VisitMarkerCategory): string {
    return category === 'prayer' ? 'pedido de oração' : category === 'photo' ? 'foto registrada' : 'visita';
  }

  private visitMarkerIcon(category: VisitMarkerCategory, hasPhoto: boolean, wantsVisits: boolean): L.DivIcon {
    const color = category === 'prayer'
      ? this.cssColor('--color-warning')
      : this.cssColor(wantsVisits ? '--color-success' : '--color-error');
    const symbol = hasPhoto
      ? '<path d="M8.5 5 10 3h4l1.5 2H19a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h3.5ZM12 8a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"/>'
      : '<path d="M12 21s-7-4.4-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.6-7 11-7 11Z"/>';
    return L.divIcon({
      className: `visit-photo-marker-wrapper visit-marker-category-${category}`,
      html: `<span class="visit-photo-map-marker" style="--visit-marker-color:${color}" aria-hidden="true"><svg viewBox="0 0 24 24">${symbol}</svg></span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -14]
    });
  }

  openPhoto(src: string, personName: string): void {
    this.photoLoadFailed.set(false);
    this.photoViewer.set({
      src,
      alt: `Foto da visita de ${personName}`,
      title: personName || 'Foto da visita'
    });
  }

  closePhoto(): void {
    this.photoViewer.set(null);
    this.photoLoadFailed.set(false);
  }

  private openVisitDetails(visit: Visit): void {
    this.setVisitDetails(visit);
    if (!visit.id || !this.online()) {
      return;
    }
    this.api.visit(visit.id).subscribe({
      next: (fullVisit) => this.setVisitDetails(fullVisit),
      error: () => this.notifications.error('Não foi possível carregar todos os detalhes desta visita.')
    });
  }

  private setVisitDetails(visit: Visit): void {
    this.visitDetails.set(visit);
    this.detailPhotoSource.set(this.visitPhotoSource(visit));
    this.detailPhotoLoadFailed.set(false);
  }

  closeVisitDetails(): void {
    this.visitDetails.set(null);
    this.detailPhotoSource.set(null);
    this.detailPhotoLoadFailed.set(false);
  }

  private renderTerritories(): void {
    if (!this.map) {
      return;
    }
    this.territoryLayer.clearLayers();
    this.territories().forEach((territory) => {
      const points = this.pointsFromGeoJson(territory.polygonGeoJson);
      if (points.length >= 3) {
        const selected = this.pointInsideTerritory(territory)
          || !this.isPrivilegedMapViewer();
        const polygon = L.polygon(points, {
          color: territory.color,
          fillColor: territory.color,
          fillOpacity: selected ? 0.26 : 0.12,
          weight: selected ? 4 : 2
        }).bindPopup(`<strong>${territory.name}</strong><br>${territory.teamName}`);
        polygon.on('click', (event: L.LeafletMouseEvent) => {
          if (this.canModifyVisit()) {
            this.selectPoint(event.latlng.lat, event.latlng.lng);
          }
        });
        polygon.addTo(this.territoryLayer);
      }
    });
  }

  private refreshMapView(): void {
    if (!this.map) return;
    const currentCity = this.userCoordinates
      ? this.findMissionCityByPoint(this.userCoordinates)
      : undefined;
    const points: L.LatLngTuple[] = this.visits()
      .filter(visit => this.validCoordinates(visit.latitude, visit.longitude)
        && !!this.findMissionCityByPoint([Number(visit.latitude), Number(visit.longitude)])
        && (!currentCity || this.findMissionCityByPoint([Number(visit.latitude), Number(visit.longitude)])?.id === currentCity.id))
      .map(visit => [Number(visit.latitude), Number(visit.longitude)]);
    if (!this.isPrivilegedMapViewer() && !this.userCoordinates) {
      this.territories().forEach(territory => this.pointsFromGeoJson(territory.polygonGeoJson)
        .forEach(point => points.push([point.lat, point.lng])));
    }
    if (this.userCoordinates && this.findMissionCityByPoint(this.userCoordinates)) {
      points.push(this.userCoordinates);
    }
    if (points.length > 1) {
      this.map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 17 });
    } else if (points.length === 1) {
      this.map.setView(points[0], 16);
    } else {
      this.centerMissionCity();
    }
  }

  private centerMissionCity(city: MissionCityMapProfile = missionCityMap): void {
    this.map?.setView(city.center, city.initialZoom);
  }

  private findMissionCityBySearch(value: string): MissionCityMapProfile | undefined {
    const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    return missionCityMaps.find(city =>
      city.searchTerms.some(term => normalized === term || normalized.includes(term))
    );
  }

  private findMissionCityByPoint(point: L.LatLngExpression): MissionCityMapProfile | undefined {
    return missionCityMaps.find(city => L.latLngBounds(city.bounds).contains(point));
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

  private preserveVisitDraft(): void {
    const draft: VisitFormDraft = {
      form: { ...this.form },
      editingId: this.editingId(),
      locationSource: this.locationSource(),
      locationAccuracy: this.locationAccuracy()
    };
    this.mobileFormDraft = draft;
    try {
      sessionStorage.setItem(this.visitDraftKey(), JSON.stringify(draft));
    } catch {
      try {
        const formWithoutPhoto = { ...draft.form, photoData: undefined };
        sessionStorage.setItem(this.visitDraftKey(), JSON.stringify({ ...draft, form: formWithoutPhoto }));
      } catch {
        // O rascunho em memoria ainda preserva todos os campos durante a troca de painel.
      }
    }
  }

  private restoreVisitDraft(): void {
    const draft = this.mobileFormDraft || this.readPersistedVisitDraft();
    if (!draft) {
      return;
    }
    const currentLatitude = this.form.latitude;
    const currentLongitude = this.form.longitude;
    const currentAddress = this.form.manualAddress;
    this.form = { ...draft.form };
    if (currentLatitude != null && currentLongitude != null) {
      this.form.latitude = currentLatitude;
      this.form.longitude = currentLongitude;
    }
    if (currentAddress?.trim() && currentAddress !== draft.form.manualAddress) {
      this.form.manualAddress = currentAddress;
    }
    this.editingId.set(draft.editingId);
    this.mobileFormDraft = {
      ...draft,
      form: { ...this.form },
      locationSource: this.locationSource(),
      locationAccuracy: this.locationAccuracy()
    };
    this.preserveVisitDraft();
  }

  private restorePersistedVisitDraft(): void {
    const draft = this.readPersistedVisitDraft();
    if (!draft) {
      return;
    }
    this.mobileFormDraft = draft;
    this.form = { ...draft.form };
    this.editingId.set(draft.editingId);
    this.locationSource.set(draft.locationSource);
    this.locationAccuracy.set(draft.locationAccuracy);
  }

  private readPersistedVisitDraft(): VisitFormDraft | null {
    try {
      const value = sessionStorage.getItem(this.visitDraftKey());
      return value ? JSON.parse(value) as VisitFormDraft : null;
    } catch {
      return null;
    }
  }

  private clearVisitDraft(): void {
    this.mobileFormDraft = null;
    try {
      sessionStorage.removeItem(this.visitDraftKey());
    } catch {
      // O rascunho em memoria ja foi removido.
    }
  }

  private visitDraftKey(): string {
    return `visit-form-draft-v1:${this.auth.user()?.email || 'anonymous'}`;
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
      .then(() => {
        this.renderMarkers(this.visits());
        this.notifications.info('Ficha pendente excluída do aparelho.');
      })
      .catch(() => this.fail('Não foi possível excluir a ficha pendente.'));
  }

  private handleSaveError(response: HttpErrorResponse, payload: Visit, editing: boolean): void {
    if (!editing && this.isOfflineError(response)) {
      this.enqueueOffline(payload);
      return;
    }
    this.saving.set(false);
    const message = this.errorMessage(response);
    if (/territ[oó]rio|localiza|coordenada|ponto/i.test(message)) {
      this.openSection.set('location');
      this.sectionError.set('location');
    }
    this.fail(message);
  }

  private enqueueOffline(payload: Visit): void {
    this.offlineQueue.enqueue(payload).then(() => {
      this.saving.set(false);
      this.ok('Sem conexão. A ficha foi salva no aparelho e será enviada quando a internet voltar.');
      this.resetForm();
      this.renderMarkers(this.visits());
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
    this.offlineMapNoticeShown = false;
    this.loadVisits();
    this.loadTerritories();
    this.offlineQueue.refreshCount().then(() => this.renderMarkers(this.visits()));
  };

  private handleOffline = (): void => {
    this.online.set(false);
    this.notifications.info('Você está sem internet. Novas fichas serão salvas no aparelho.');
  };

  private handleResize = (): void => {
    this.zone.run(() => {
      const mobile = this.isMobileViewport();
      this.mobileViewport.set(mobile);
      if (mobile && this.mobileView() !== 'map') {
        this.destroyMap();
        return;
      }
      requestAnimationFrame(() => requestAnimationFrame(() => {
        this.initializeMap();
        this.map?.invalidateSize();
        this.refreshMapView();
      }));
    });
  };

  private scrollMapIntoView(): void {
    if (this.isMobileViewport()) {
      this.showMobileView('map');
    }
  }

  private isMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
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
    return this.pointInsideCoordinates(territory, latitude, longitude);
  }

  private pointInsideCoordinates(territory: Territory, latitude: number, longitude: number): boolean {
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

  private updateGpsTerritoryStatus(point: L.LatLngTuple): void {
    if (!this.territories().length) {
      this.gpsOutsideNoticeShown = false;
      this.mapLocationMessage.set('Você está aqui. Nenhum território foi publicado para sua equipe.');
      return;
    }
    const territory = this.territories().find(item => this.pointInsideCoordinates(item, point[0], point[1]));
    if (territory) {
      this.gpsOutsideNoticeShown = false;
      this.mapLocationMessage.set(`Você está no território da ${territory.teamName || territory.name}.`);
      return;
    }
    const teamNames = [...new Set(this.territories().map(item => item.teamName).filter(Boolean))];
    const label = teamNames.length === 1 ? teamNames[0] : 'sua equipe';
    const message = `Você está fora do território da ${label}.`;
    this.mapLocationMessage.set(message);
    if (!this.gpsOutsideNoticeShown) {
      this.gpsOutsideNoticeShown = true;
      this.notifications.warning(message);
    }
  }

  private isPrivilegedMapViewer(): boolean {
    const roles = this.auth.user()?.roles || [];
    return roles.includes('admin') || roles.includes('lider');
  }

  private cssColor(variable: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }

  private openInvalidField(section: VisitFormSection, fieldName: string): void {
    this.openSection.set(section);
    this.sectionError.set(section);
    requestAnimationFrame(() => {
      const field = document.querySelector<HTMLElement>(`[name="${fieldName}"]`);
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field?.focus();
    });
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
