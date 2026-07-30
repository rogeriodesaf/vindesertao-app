import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { formatDateTime } from '../core/date-format';
import { CountItem, PageResponse, SocialAssistanceRecord, SocialAssistanceSummary, SocialServiceType, Team } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { CompactPaginationComponent } from '../shared/compact-pagination.component';
import { DateRangeFilterComponent } from '../shared/date-range-filter.component';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { ListCardAction, ListCardComponent } from '../shared/list-card.component';

@Component({
  selector: 'app-social-assistance',
  standalone: true,
  imports: [FormsModule, ListCardComponent, EmptyStateComponent, CompactPaginationComponent, DateRangeFilterComponent],
  template: `
    <section class="page social-page">
      <div class="page-head social-page-head">
        <div>
          <h1>Ação Social</h1>
          <p class="muted">Registre cada atendimento realizado nas ações sociais do Vinde Sertão.</p>
        </div>
        <button type="button" class="social-new-button" (click)="newRecord()">
          <span aria-hidden="true">+</span> Novo atendimento
        </button>
      </div>

      <section class="social-filter-card" [class.collapsed]="!filtersOpen()">
        <button type="button" class="social-filter-toggle" [attr.aria-expanded]="filtersOpen()"
          aria-controls="social-filter-content" (click)="filtersOpen.set(!filtersOpen())">
          <span><strong>Filtros</strong><small>{{ filterSummary() }}</small></span>
          <span class="social-filter-chevron" aria-hidden="true">⌄</span>
        </button>
        @if (filtersOpen()) {
          <div id="social-filter-content" class="social-filter-content">
            <label for="social-service-filter">Tipo de atendimento
              <select id="social-service-filter" [(ngModel)]="serviceType">
                <option value="">Todos os tipos</option>
                @for (type of serviceTypes; track type.value) {
                  <option [value]="type.value">{{ type.label }}</option>
                }
              </select>
            </label>
            <app-date-range-filter [(from)]="from" [(to)]="to" valueMode="datetime" [loading]="loading()"
              (filter)="applyFilters(true)" (clear)="applyFilters(false)" />
          </div>
        }
      </section>

      @if (message()) {
        <p class="success" role="status">{{ message() }}</p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      <div class="split social-layout social-assistance-layout">
        @if (showForm()) {
          <form #socialForm="ngForm" class="editor social-editor" novalidate (ngSubmit)="save(socialForm)">
            <h2>{{ form.id ? 'Editar atendimento' : 'Novo atendimento' }}</h2>

            <fieldset class="social-form-section">
              <legend>Pessoa</legend>
              <label for="social-name">Nome
                <input id="social-name" name="assistedPersonName" [(ngModel)]="form.assistedPersonName"
                  placeholder="Nome completo da pessoa atendida" autocomplete="name" required>
              </label>
              <div class="form-grid">
                <label for="social-phone">Telefone
                  <input id="social-phone" name="phone" type="tel" inputmode="tel" maxlength="15"
                    placeholder="(83) 99999-9999" autocomplete="tel" [ngModel]="form.phone"
                    (ngModelChange)="updatePhone($event)">
                </label>
                <label for="social-age">Idade
                  <input id="social-age" name="age" type="number" inputmode="numeric" min="0"
                    step="1" placeholder="Ex.: 34" [(ngModel)]="form.age">
                </label>
              </div>
            </fieldset>

            <fieldset class="social-form-section">
              <legend>Local</legend>
              <div class="form-grid">
                <label for="social-neighborhood">Bairro/comunidade
                  <input id="social-neighborhood" name="neighborhood" [(ngModel)]="form.neighborhood"
                    placeholder="Ex.: Centro" autocomplete="address-level3">
                </label>
                <label for="social-city">Cidade
                  <input id="social-city" name="city" [(ngModel)]="form.city"
                    placeholder="Cidade do atendimento" autocomplete="address-level2" required>
                </label>
              </div>
            </fieldset>

            <fieldset class="social-form-section">
              <legend>Atendimento</legend>
              <div class="form-grid">
                <label for="social-service-type">Tipo
                  <select id="social-service-type" name="serviceType" [(ngModel)]="form.serviceType" required>
                    @for (type of serviceTypes; track type.value) {
                      <option [ngValue]="type.value">{{ type.label }}</option>
                    }
                  </select>
                </label>
                <label for="social-team">Equipe
                  <select id="social-team" name="teamId" [(ngModel)]="form.teamId" required
                    [disabled]="teamsLoading() || socialTeams().length === 0">
                    @if (socialTeams().length > 1) {
                      <option [ngValue]="undefined" disabled>Selecione uma equipe</option>
                    }
                    @for (team of socialTeams(); track team.id) {
                      <option [ngValue]="team.id">{{ team.name }}</option>
                    }
                  </select>
                  @if (teamsLoading()) {
                    <small class="muted">Carregando equipes...</small>
                  } @else if (socialTeams().length === 0) {
                    <small class="field-error" role="alert">Nenhuma equipe cadastrada.</small>
                  }
                </label>
              </div>
            </fieldset>

            <fieldset class="social-form-section">
              <legend>Observações</legend>
              <label class="visually-hidden" for="social-notes">Observações do atendimento</label>
              <textarea id="social-notes" name="notes" rows="3" [(ngModel)]="form.notes"
                placeholder="Informações adicionais relevantes sobre o atendimento"></textarea>
            </fieldset>

            <div class="actions social-form-actions">
              <button type="submit" [class.loading]="saving()" [disabled]="saving() || teamsLoading() || socialTeams().length === 0">
                {{ saving() ? 'Salvando...' : 'Salvar atendimento' }}
              </button>
              <button type="button" class="secondary" [disabled]="saving()" (click)="reset(socialForm)">Limpar</button>
              @if (isCompactScreen()) {
                <button type="button" class="secondary" (click)="backToList()">Voltar para lista</button>
              }
            </div>
          </form>
        }

        @if (showReport()) {
          <section class="detail-card social-report">
            <div class="detail-head">
              <div>
                <h2>Relatório de ação social</h2>
                <p class="muted">Resumo dos atendimentos no período filtrado.</p>
              </div>
              <button type="button" class="secondary" [disabled]="exporting()" [class.loading]="exporting()"
                (click)="downloadExcel()">{{ exporting() ? 'Gerando...' : 'Baixar Excel' }}</button>
            </div>

            @if (loading()) {
              <div class="metric-grid"><div class="metric skeleton-card"><span></span><strong></strong></div></div>
              <div class="analytics-grid social-analytics">
                <section class="skeleton-panel"></section><section class="skeleton-panel"></section>
              </div>
            } @else {
              @if (summary(); as data) {
                <div class="metric-grid social-total-metric">
                  <div class="metric"><span>Total de atendimentos</span><strong>{{ data.totalRecords }}</strong></div>
                </div>

                <div class="analytics-grid social-analytics">
                  <section>
                    <h2>Por tipo de atendimento</h2>
                    @for (item of data.byServiceType; track item.label) {
                      <div class="bar-row chart-row">
                        <span>{{ item.label }}</span>
                        <div class="bar-track"><span [style.width.%]="barWidth(item.total, max(data.byServiceType))"></span></div>
                        <strong>{{ item.total }}</strong>
                      </div>
                    } @empty {
                      <p class="muted">Nenhum atendimento no período.</p>
                    }
                  </section>
                  <section>
                    <h2>Por equipe</h2>
                    @for (item of data.byTeam; track item.label) {
                      <div class="bar-row chart-row">
                        <span>{{ item.label }}</span>
                        <div class="bar-track"><span [style.width.%]="barWidth(item.total, max(data.byTeam))"></span></div>
                        <strong>{{ item.total }}</strong>
                      </div>
                    } @empty {
                      <p class="muted">Nenhum atendimento no período.</p>
                    }
                  </section>
                </div>
              }
            }
          </section>
        }
      </div>

      @if (showTable()) {
        <section class="detail-card social-table">
          <div class="list-head">
            <div>
              <h2>Atendimentos cadastrados</h2>
              <p class="muted">{{ page()?.total || 0 }} atendimento(s) encontrado(s).</p>
            </div>
          </div>

          @if (loading()) {
            <div class="unified-list">
              @for (item of skeletonItems; track item) { <div class="list-card skeleton-list-card"></div> }
            </div>
          } @else {
            <div class="unified-list">
              @for (record of records(); track record.id) {
                <app-list-card [title]="record.assistedPersonName" [interactive]="true"
                  [actions]="recordActions(record)" [actionsInline]="true" (activate)="view(record)"
                  (action)="handleRecordAction(record, $event)"
                  [infos]="[
                    { icon: 'service', text: record.serviceTypeLabel },
                    { icon: 'phone', text: formatPhone(record.phone) || 'Telefone não informado' },
                    { icon: 'groups', text: record.age !== undefined ? record.age + ' ano(s)' : 'Idade não informada' },
                    { icon: 'location', text: record.neighborhood || record.city },
                    { icon: 'volunteer', text: record.teamName || record.responsibleUserName || '-' },
                    { icon: 'calendar', text: formatDate(record.createdAt) }
                  ]" />
              } @empty {
                <app-empty-state message="Nenhum atendimento encontrado." />
              }
            </div>
          }
          <app-compact-pagination [pageIndex]="currentPage" [totalPages]="page()?.pages || 1"
            (previous)="goToPage(currentPage - 1)" (next)="goToPage(currentPage + 1)" />
        </section>
      }
    </section>

    @if (selectedRecord(); as record) {
      <div class="visit-details-backdrop" (click)="closeDetails()">
        <section class="visit-details-modal" role="dialog" aria-modal="true" aria-labelledby="social-details-title"
          (click)="$event.stopPropagation()">
          <div class="visit-details-head">
            <div>
              <small>Detalhes do atendimento</small>
              <h2 id="social-details-title">{{ record.assistedPersonName }}</h2>
            </div>
            <button type="button" class="icon-button" aria-label="Fechar detalhes" (click)="closeDetails()">×</button>
          </div>
          <dl class="visit-details-grid">
            <div><dt>Nome</dt><dd>{{ record.assistedPersonName }}</dd></div>
            <div><dt>Telefone</dt><dd>{{ formatPhone(record.phone) || 'Não informado' }}</dd></div>
            <div><dt>Idade</dt><dd>{{ record.age !== undefined ? record.age + ' ano(s)' : 'Não informada' }}</dd></div>
            <div><dt>Local</dt><dd>{{ record.neighborhood || 'Bairro não informado' }} · {{ record.city }}</dd></div>
            <div><dt>Tipo</dt><dd>{{ record.serviceTypeLabel || serviceLabel(record.serviceType) }}</dd></div>
            <div><dt>Equipe</dt><dd>{{ record.teamName || 'Não informada' }}</dd></div>
            <div><dt>Responsável pelo cadastro</dt><dd>{{ record.responsibleUserName || 'Não informado' }}</dd></div>
            <div><dt>Data do cadastro</dt><dd>{{ formatDate(record.createdAt) }}</dd></div>
            @if (record.notes) { <div class="wide"><dt>Observações</dt><dd>{{ record.notes }}</dd></div> }
          </dl>
          @if (canModifyRecord(record)) {
            <div class="actions">
              <button type="button" (click)="edit(record)">Editar</button>
              <button type="button" class="secondary" [disabled]="deletingId() === record.id"
                (click)="delete(record)">{{ deletingId() === record.id ? 'Excluindo...' : 'Excluir' }}</button>
            </div>
          }
        </section>
      </div>
    }
  `
})
export class SocialAssistanceComponent implements OnInit {
  readonly skeletonItems = [1, 2, 3];
  page = signal<PageResponse<SocialAssistanceRecord> | null>(null);
  summary = signal<SocialAssistanceSummary | null>(null);
  teams = signal<Team[]>([]);
  message = signal('');
  error = signal('');
  loading = signal(false);
  teamsLoading = signal(false);
  saving = signal(false);
  exporting = signal(false);
  deletingId = signal<number | null>(null);
  selectedRecord = signal<SocialAssistanceRecord | null>(null);
  filtersOpen = signal(true);
  form: SocialAssistanceRecord = this.blank();
  from = '';
  to = '';
  serviceType = '';
  currentPage = 0;
  pageSize = 6;
  mobileFormOpen = signal(false);
  private appliedParams: Record<string, string | number | undefined> = {};

  readonly serviceTypes: Array<{ value: SocialServiceType; label: string }> = [
    { value: 'MEDICAL', label: 'Atendimento médico' },
    { value: 'DENTAL', label: 'Atendimento odontológico' },
    { value: 'HAIRCUT', label: 'Corte de cabelo' },
    { value: 'MANICURE', label: 'Manicure' },
    { value: 'SPEECH_THERAPY', label: 'Fonoaudiologia' },
    { value: 'NUTRITION', label: 'Nutrição' },
    { value: 'FOOD_BASKET', label: 'Cesta básica' },
    { value: 'OTHER', label: 'Outro atendimento' }
  ];

  constructor(private api: ApiService, public auth: AuthService, private notifications: NotificationService) {}

  ngOnInit(): void {
    this.loadTeams();
    this.applyFilters(false);
  }

  socialTeams(): Team[] {
    return this.teams().filter(team => team.teamType === 'SOCIAL_ACTION');
  }

  records(): SocialAssistanceRecord[] {
    return this.page()?.items || [];
  }

  applyFilters(collapse: boolean): void {
    this.currentPage = 0;
    this.appliedParams = this.params();
    this.fetchData();
    if (collapse) this.filtersOpen.set(false);
  }

  newRecord(): void {
    this.closeDetails();
    this.reset();
    this.message.set('');
    this.openFormOnMobile();
  }

  save(form: NgForm): void {
    this.message.set('');
    this.error.set('');
    if (this.socialTeams().length === 0) {
      this.fail('Nenhuma equipe cadastrada. Solicite ao administrador o cadastro ou vínculo de uma equipe de ação social.');
      return;
    }
    if (form.invalid) {
      this.fail('Preencha nome, cidade, tipo de atendimento e equipe.');
      return;
    }
    const editing = !!this.form.id;
    const payload: SocialAssistanceRecord = {
      ...this.form,
      phone: this.phoneDigits(this.form.phone),
      quantity: 1
    };
    const action = this.form.id ? this.api.updateSocialAssistance(payload) : this.api.createSocialAssistance(payload);
    this.saving.set(true);
    action.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.ok(editing ? 'Atendimento social atualizado com sucesso.' : 'Atendimento social salvo com sucesso.');
        this.reset(form);
        this.backToList();
        this.fetchData();
      },
      error: error => this.fail(this.errorMessage(error))
    });
  }

  edit(record: SocialAssistanceRecord): void {
    this.closeDetails();
    this.form = { ...record, phone: this.formatPhone(record.phone), quantity: 1 };
    this.openFormOnMobile();
  }

  view(record: SocialAssistanceRecord): void {
    this.selectedRecord.set(record);
  }

  closeDetails(): void {
    this.selectedRecord.set(null);
  }

  canModifyRecord(record: SocialAssistanceRecord): boolean {
    const user = this.auth.user();
    return !!user && (
      user.roles.includes('admin') ||
      user.roles.includes('lider') ||
      record.responsibleUserId === user.id
    );
  }

  recordActions(record: SocialAssistanceRecord): ListCardAction[] {
    if (!this.canModifyRecord(record)) return [];
    return [
      { id: 'edit', label: 'Editar', icon: 'edit' },
      {
        id: 'delete',
        label: this.deletingId() === record.id ? 'Excluindo...' : 'Excluir',
        icon: 'delete',
        danger: true
      }
    ];
  }

  handleRecordAction(record: SocialAssistanceRecord, action: string): void {
    if (action === 'edit') this.edit(record);
    if (action === 'delete') this.delete(record);
  }

  delete(record: SocialAssistanceRecord): void {
    if (!record.id || !this.canModifyRecord(record) || this.deletingId()) return;
    if (!window.confirm(`Excluir o atendimento de ${record.assistedPersonName}? Esta ação não pode ser desfeita.`)) return;
    this.deletingId.set(record.id);
    this.api.deleteSocialAssistance(record.id).pipe(finalize(() => this.deletingId.set(null))).subscribe({
      next: () => {
        this.closeDetails();
        this.notifications.success('Atendimento social excluído com sucesso.');
        if (this.records().length === 1 && this.currentPage > 0) this.currentPage--;
        this.fetchData();
      },
      error: error => this.fail(this.errorMessage(error))
    });
  }

  reset(form?: NgForm): void {
    this.form = this.blank();
    form?.resetForm(this.form);
  }

  goToPage(page: number): void {
    this.currentPage = Math.max(0, page);
    this.fetchData();
    this.scrollToTable();
  }

  showForm(): boolean {
    return !this.isCompactScreen() || this.mobileFormOpen();
  }

  showReport(): boolean {
    return !this.isCompactScreen();
  }

  showTable(): boolean {
    return !this.isCompactScreen() || !this.mobileFormOpen();
  }

  backToList(): void {
    this.mobileFormOpen.set(false);
    this.scrollToTable();
  }

  downloadExcel(): void {
    this.exporting.set(true);
    this.api.exportSocialAssistance(this.appliedParams).pipe(finalize(() => this.exporting.set(false))).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-acao-social-${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.fail('Não foi possível gerar o relatório de ação social.')
    });
  }

  updatePhone(value: string): void {
    this.form.phone = this.formatPhone(value);
  }

  formatPhone(value?: string): string {
    const digits = this.phoneDigits(value) || '';
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  filterSummary(): string {
    const parts: string[] = [];
    if (this.serviceType) parts.push(this.serviceTypes.find(type => type.value === this.serviceType)?.label || this.serviceType);
    if (this.from || this.to) parts.push('período selecionado');
    return parts.length ? parts.join(' · ') : 'Todos os atendimentos';
  }

  formatDate(value?: string): string {
    return formatDateTime(value);
  }

  max(items: { total: number }[]): number {
    return Math.max(1, ...items.map(item => item.total));
  }

  barWidth(total: number, max: number): number {
    return Math.max(4, Math.round((total / max) * 100));
  }

  isCompactScreen(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
  }

  private fetchData(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      page: this.api.socialAssistance({ ...this.appliedParams, page: this.currentPage, size: this.pageSize }),
      filtered: this.api.socialAssistance({ ...this.appliedParams, page: 0, size: 10000 })
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: result => {
        this.page.set(result.page);
        this.summary.set(this.buildSummary(result.filtered.items));
      },
      error: () => this.fail('Não foi possível carregar os atendimentos sociais.')
    });
  }

  private buildSummary(records: SocialAssistanceRecord[]): SocialAssistanceSummary {
    return {
      totalPeople: records.length,
      totalRecords: records.length,
      byServiceType: this.count(records, record => record.serviceTypeLabel || this.serviceLabel(record.serviceType)),
      byTeam: this.count(records, record => record.teamName || 'Sem equipe'),
      byResponsible: this.count(records, record => record.responsibleUserName || 'Sem responsável'),
      byNeighborhood: this.count(records, record => record.neighborhood || 'Não informado'),
      byPeriod: this.count(records, record => record.createdAt?.slice(0, 10) || '-')
    };
  }

  private count(records: SocialAssistanceRecord[], classifier: (record: SocialAssistanceRecord) => string): CountItem[] {
    const counts = new Map<string, number>();
    records.forEach(record => {
      const label = classifier(record);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([label, total]) => ({ label, total }));
  }

  serviceLabel(serviceType: SocialServiceType): string {
    return this.serviceTypes.find(type => type.value === serviceType)?.label || 'Não informado';
  }

  private params(): Record<string, string | number | undefined> {
    return {
      serviceType: this.serviceType || undefined,
      from: this.toOffset(this.from),
      to: this.toOffset(this.to)
    };
  }

  private blank(): SocialAssistanceRecord {
    return {
      assistedPersonName: '',
      city: 'Sertão',
      serviceType: 'MEDICAL',
      quantity: 1,
      teamId: this.socialTeams().length === 1 ? this.socialTeams()[0].id : undefined
    };
  }

  private loadTeams(): void {
    this.teamsLoading.set(true);
    this.api.socialAssistanceTeams().pipe(finalize(() => this.teamsLoading.set(false))).subscribe({
      next: teams => {
        const available = teams.filter(team => team.id !== undefined && team.teamType === 'SOCIAL_ACTION');
        this.teams.set(available);
        const selectedIsAvailable = available.some(team => team.id === this.form.teamId);
        if (available.length === 1 && !selectedIsAvailable) {
          this.form = { ...this.form, teamId: available[0].id };
        } else if (this.form.teamId && !selectedIsAvailable) {
          this.form = { ...this.form, teamId: undefined };
        }
      },
      error: () => {
        this.teams.set([]);
        this.fail('Não foi possível carregar as equipes de ação social.');
      }
    });
  }

  private phoneDigits(value?: string): string | undefined {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11);
    return digits || undefined;
  }

  private toOffset(value: string): string | undefined {
    return value ? new Date(value).toISOString() : undefined;
  }

  private errorMessage(error: { error?: { detail?: string; violations?: Array<{ message: string }> } }): string {
    const body = error.error;
    if (body?.violations?.length) {
      return body.violations.map(violation => violation.message).join(' ');
    }
    return body?.detail || 'Não foi possível salvar o atendimento social.';
  }

  private ok(message: string): void {
    this.message.set(message);
    this.notifications.success(message);
  }

  private fail(message: string): void {
    this.error.set(message);
    this.notifications.error(message);
  }

  private openFormOnMobile(): void {
    if (this.isCompactScreen()) {
      this.mobileFormOpen.set(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private scrollToTable(): void {
    if (this.isCompactScreen()) {
      window.setTimeout(() => document.querySelector('.social-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
  }
}
