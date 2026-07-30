import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { formatDateTime } from '../core/date-format';
import { ChildRecord, ChildrenSummary, PageResponse } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { CompactPaginationComponent } from '../shared/compact-pagination.component';
import { DateRangeFilterComponent } from '../shared/date-range-filter.component';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { ListCardAction, ListCardComponent, ListCardInfo } from '../shared/list-card.component';

const CHILD_ACTIVITIES = ['EBF', 'Culto Infantil', 'Recreação', 'Evangelismo', 'Visita', 'Outro'] as const;

@Component({
  selector: 'app-children',
  standalone: true,
  imports: [FormsModule, ListCardComponent, EmptyStateComponent, CompactPaginationComponent, DateRangeFilterComponent],
  template: `
    <section class="page children-page">
      <div class="page-head social-page-head children-page-head">
        <div>
          <h1>Departamento Infantil</h1>
          <p class="muted">Cadastre as crianças atendidas nas ações evangelísticas do ministério infantil.</p>
        </div>
        <button type="button" class="social-new-button" (click)="newRecord()">
          <span aria-hidden="true">+</span> Nova criança
        </button>
      </div>

      @if (!formOpen()) {
        <app-date-range-filter [(from)]="from" [(to)]="to" valueMode="datetime" [loading]="loading()"
          (filter)="applyFilters()" (clear)="applyFilters()" />
      }

      @if (message()) {
        <section class="children-save-feedback" role="status" aria-live="polite">
          <div><strong>{{ message() }}</strong><span>Você voltou para a lista de crianças.</span></div>
          <div class="actions">
            <button type="button" (click)="newAfterSave()">Nova criança</button>
            <button type="button" class="secondary" (click)="backToList()">Voltar para lista</button>
          </div>
        </section>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      <div class="split social-layout children-layout" [class.form-only]="formOpen()">
        @if (showForm()) {
          <form #childForm="ngForm" class="editor children-editor" novalidate (ngSubmit)="save(childForm)">
            <h2>{{ form.id ? 'Editar cadastro' : 'Novo cadastro' }}</h2>

            <label for="child-name">Nome da criança
              <input id="child-name" name="childName" [(ngModel)]="form.childName" required autocomplete="name">
            </label>

            <div class="form-grid">
              <label for="child-guardian">Responsável
                <input id="child-guardian" name="guardianName" [(ngModel)]="form.guardianName" autocomplete="name">
              </label>
              <label for="child-phone">Telefone do responsável
                <input id="child-phone" name="guardianPhone" type="tel" inputmode="tel" maxlength="15"
                  autocomplete="tel" placeholder="(83) 99999-9999" [ngModel]="form.guardianPhone"
                  (ngModelChange)="updatePhone($event)">
              </label>
            </div>

            <div class="form-grid">
              <label for="child-age">Idade
                <input id="child-age" name="age" type="text" inputmode="numeric" maxlength="2"
                  pattern="(?:[0-9]|1[0-7])" placeholder="0 a 17" [ngModel]="ageInput"
                  (ngModelChange)="updateAge($event)" #ageField="ngModel"
                  [attr.aria-invalid]="ageField.invalid && ageField.touched ? true : null"
                  aria-describedby="child-age-error">
                @if (ageField.invalid && ageField.touched) {
                  <small id="child-age-error" class="field-error">Informe uma idade entre 0 e 17 anos.</small>
                }
              </label>
              <label for="child-gender">Sexo
                <select id="child-gender" name="gender" [(ngModel)]="form.gender" required>
                  <option [ngValue]="undefined">Selecione</option>
                  <option value="MALE">Menino</option>
                  <option value="FEMALE">Menina</option>
                </select>
              </label>
            </div>

            <label for="child-activity">Atividade
              <select id="child-activity" name="activityName" [(ngModel)]="form.activityName">
                <option [ngValue]="undefined">Selecione</option>
                @for (activity of activities; track activity) {
                  <option [value]="activity">{{ activity }}</option>
                }
              </select>
            </label>

            <div class="form-grid">
              <label for="child-neighborhood">Bairro/comunidade
                <input id="child-neighborhood" name="neighborhood" [(ngModel)]="form.neighborhood" autocomplete="address-level3">
              </label>
              <label for="child-city">Cidade
                <input id="child-city" name="city" [(ngModel)]="form.city" required autocomplete="address-level2">
              </label>
            </div>

            <label for="child-notes">Observações
              <textarea id="child-notes" name="notes" rows="2" class="auto-resize-textarea"
                [(ngModel)]="form.notes" (input)="autoResize($event)"></textarea>
            </label>

            <div class="actions children-form-actions">
              <button type="submit" [class.loading]="saving()" [disabled]="saving()">
                {{ saving() ? 'Salvando...' : 'Salvar cadastro' }}
              </button>
              <button type="button" class="secondary" [disabled]="saving()" (click)="reset(childForm)">Limpar</button>
              <button type="button" class="secondary" [disabled]="saving()" (click)="cancel(childForm)">Cancelar</button>
            </div>
          </form>
        }

        @if (showReport()) {
          <section class="detail-card children-report">
            <div class="detail-head children-report-head">
              <div>
                <h2>Relatório infantil</h2>
                <p class="muted">Resumo dos cadastros no período filtrado.</p>
              </div>
              <div class="children-export-actions">
                <button type="button" class="secondary" [class.loading]="exportingExcel()" [disabled]="exportingExcel() || exportingPdf()"
                  (click)="downloadExcel()">{{ exportingExcel() ? 'Gerando...' : 'Baixar Excel' }}</button>
                <button type="button" class="secondary" [class.loading]="exportingPdf()" [disabled]="exportingExcel() || exportingPdf()"
                  (click)="downloadPdf()">{{ exportingPdf() ? 'Gerando...' : 'Gerar PDF' }}</button>
              </div>
            </div>

            @if (loading()) {
              <div class="metric-grid children-metric-grid" aria-label="Carregando indicadores">
                @for (item of skeletonItems; track item) { <div class="metric skeleton-card"><span></span><strong></strong></div> }
              </div>
              <div class="analytics-grid social-analytics">
                <section class="skeleton-panel"></section>
                <section class="skeleton-panel"></section>
              </div>
            } @else {
              @if (summary(); as data) {
                <div class="metric-grid children-metric-grid">
                <div class="metric"><span>Crianças cadastradas</span><strong>{{ data.totalChildren }}</strong></div>
                <div class="metric"><span>Meninos</span><strong>{{ data.boys }}</strong></div>
                <div class="metric"><span>Meninas</span><strong>{{ data.girls }}</strong></div>
                <div class="metric"><span>Média de idade</span><strong>{{ averageAge(data.averageAge) }}</strong><small>anos</small></div>
                <div class="metric"><span>Responsáveis distintos</span><strong>{{ data.distinctGuardians }}</strong></div>
                <div class="metric"><span>Bairros/comunidades</span><strong>{{ data.distinctNeighborhoods }}</strong></div>
                </div>

                <div class="analytics-grid social-analytics">
                <section>
                  <h2>Por atividade</h2>
                  @for (item of data.byActivity; track item.label) {
                    <div class="bar-row chart-row">
                      <span>{{ item.label }}</span>
                      <div class="bar-track"><span [style.width.%]="barWidth(item.total, max(data.byActivity))"></span></div>
                      <strong>{{ item.total }} ({{ percentage(item.total, data.totalChildren) }}%)</strong>
                    </div>
                  } @empty {
                    <p class="muted">Nenhum cadastro no período.</p>
                  }
                </section>
                <section>
                  <h2>Por responsável pelo cadastro</h2>
                  @for (item of data.byResponsible; track item.label) {
                    <div class="bar-row chart-row">
                      <span>{{ item.label }}</span>
                      <div class="bar-track"><span [style.width.%]="barWidth(item.total, max(data.byResponsible))"></span></div>
                      <strong>{{ item.total }} ({{ percentage(item.total, data.totalChildren) }}%)</strong>
                    </div>
                  } @empty {
                    <p class="muted">Nenhum cadastro no período.</p>
                  }
                </section>
                </div>
              }
            }
          </section>
        }
      </div>

      @if (showTable()) {
        <section class="detail-card children-table">
          <div class="list-head">
            <div>
              <h2>Crianças cadastradas</h2>
              <p class="muted">{{ page()?.total || 0 }} registro(s) encontrado(s).</p>
            </div>
            <label for="children-activity-filter">Atividade
              <select id="children-activity-filter" [(ngModel)]="activityName" (change)="applyFilters()">
                <option value="">Todas</option>
                @for (activity of activities; track activity) {
                  <option [value]="activity">{{ activity }}</option>
                }
              </select>
            </label>
          </div>

          @if (loading()) {
            <div class="unified-list children-list-skeleton" aria-label="Carregando cadastros">
              @for (item of tableSkeletonItems; track item) { <div class="list-card skeleton-list-card"></div> }
            </div>
          } @else {
            <div class="unified-list children-list">
              @for (record of records(); track record.id) {
                <app-list-card [title]="record.childName" [interactive]="true" [state]="record.photoUrl ? 'Foto disponível' : ''"
                  [actions]="recordActions(record)" [actionsInline]="true" (activate)="view(record)"
                  (action)="handleRecordAction(record, $event)" [infos]="recordInfos(record)" />
              } @empty {
                <app-empty-state message="Nenhum cadastro infantil encontrado." />
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
        <section class="visit-details-modal" role="dialog" aria-modal="true" aria-labelledby="children-details-title"
          (click)="$event.stopPropagation()">
          <div class="visit-details-head">
            <div>
              <small>Detalhes da criança</small>
              <h2 id="children-details-title">{{ record.childName }}</h2>
            </div>
            <button type="button" class="icon-button" aria-label="Fechar detalhes" (click)="closeDetails()">×</button>
          </div>
          <dl class="visit-details-grid">
            <div><dt>Nome</dt><dd>{{ record.childName }}</dd></div>
            <div><dt>Idade</dt><dd>{{ record.age === undefined ? 'Não informada' : record.age + ' ano(s)' }}</dd></div>
            <div><dt>Sexo</dt><dd>{{ genderLabel(record.gender) }}</dd></div>
            <div><dt>Responsável</dt><dd>{{ record.guardianName || 'Não informado' }}</dd></div>
            <div><dt>Telefone</dt><dd>{{ formatPhone(record.guardianPhone) || 'Não informado' }}</dd></div>
            <div><dt>Atividade</dt><dd>{{ record.activityName || 'Não informada' }}</dd></div>
            <div><dt>Local</dt><dd>{{ record.neighborhood || 'Bairro não informado' }} · {{ record.city }}</dd></div>
            <div><dt>Responsável pelo cadastro</dt><dd>{{ record.responsibleUserName || 'Não informado' }}</dd></div>
            <div><dt>Data do cadastro</dt><dd>{{ formatDate(record.createdAt) }}</dd></div>
            @if (record.notes) { <div class="wide"><dt>Observações</dt><dd>{{ record.notes }}</dd></div> }
          </dl>
          <div class="actions">
            <button type="button" (click)="edit(record)">Editar</button>
            @if (record.photoUrl) {
              <button type="button" class="secondary" (click)="showPhoto(record)">Visualizar foto</button>
            }
            <button type="button" class="secondary" [disabled]="deletingId() === record.id"
              (click)="delete(record)">{{ deletingId() === record.id ? 'Excluindo...' : 'Excluir' }}</button>
          </div>
        </section>
      </div>
    }

    @if (photoViewer(); as photo) {
      <div class="children-photo-backdrop" (click)="closePhoto()">
        <section class="children-photo-modal" role="dialog" aria-modal="true" aria-labelledby="children-photo-title"
          (click)="$event.stopPropagation()">
          <div class="children-photo-head">
            <h2 id="children-photo-title">Foto de {{ photo.name }}</h2>
            <button type="button" class="secondary" aria-label="Fechar foto" (click)="closePhoto()">×</button>
          </div>
          <img [src]="photo.url" [alt]="'Foto cadastrada de ' + photo.name">
        </section>
      </div>
    }
  `
})
export class ChildrenComponent implements OnInit {
  readonly activities = CHILD_ACTIVITIES;
  readonly skeletonItems = [1, 2, 3, 4, 5, 6];
  readonly tableSkeletonItems = [1, 2, 3];

  page = signal<PageResponse<ChildRecord> | null>(null);
  summary = signal<ChildrenSummary | null>(null);
  message = signal('');
  error = signal('');
  loading = signal(false);
  saving = signal(false);
  exportingExcel = signal(false);
  exportingPdf = signal(false);
  deletingId = signal<number | null>(null);
  photoViewer = signal<{ url: string; name: string } | null>(null);
  selectedRecord = signal<ChildRecord | null>(null);
  form: ChildRecord = this.blank();
  ageInput = '';
  from = '';
  to = '';
  activityName = '';
  currentPage = 0;
  pageSize = 6;
  formOpen = signal(false);
  private appliedParams: Record<string, string | number | undefined> = {};

  constructor(private api: ApiService, public auth: AuthService, private notifications: NotificationService) {}

  ngOnInit(): void {
    this.applyFilters();
  }

  records(): ChildRecord[] {
    return this.page()?.items || [];
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.appliedParams = this.params();
    this.fetchData();
  }

  newRecord(): void {
    this.closeDetails();
    this.reset();
    this.message.set('');
    this.openForm();
  }

  newAfterSave(): void {
    this.message.set('');
    this.reset();
    this.openForm();
  }

  save(form: NgForm): void {
    this.message.set('');
    this.error.set('');
    if (form.invalid || !this.validAge()) {
      this.fail('Preencha nome, cidade e sexo, com idade entre 0 e 17 anos.');
      return;
    }
    const editing = !!this.form.id;
    const payload: ChildRecord = {
      ...this.form,
      guardianPhone: this.phoneDigits(this.form.guardianPhone)
    };
    const action = this.form.id ? this.api.updateChild(payload) : this.api.createChild(payload);
    this.saving.set(true);
    action.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.ok(editing ? 'Cadastro infantil atualizado com sucesso.' : 'Cadastro infantil salvo com sucesso.');
        this.reset(form);
        this.backToList();
        this.fetchData();
      },
      error: error => this.fail(this.errorMessage(error))
    });
  }

  edit(record: ChildRecord): void {
    this.closeDetails();
    this.message.set('');
    this.form = { ...record, guardianPhone: this.formatPhone(record.guardianPhone) };
    this.ageInput = record.age === undefined ? '' : String(record.age);
    this.openForm();
  }

  delete(record: ChildRecord): void {
    if (!record.id || !confirm(`Excluir o cadastro de ${record.childName}? Esta ação não pode ser desfeita.`)) return;
    this.deletingId.set(record.id);
    this.api.deleteChild(record.id).pipe(finalize(() => this.deletingId.set(null))).subscribe({
      next: () => {
        this.closeDetails();
        this.notifications.success('Cadastro infantil excluído com sucesso.');
        if (this.records().length === 1 && this.currentPage > 0) this.currentPage--;
        this.fetchData();
      },
      error: error => this.fail(this.errorMessage(error))
    });
  }

  reset(form?: NgForm): void {
    this.form = this.blank();
    this.ageInput = '';
    form?.resetForm(this.form);
  }

  cancel(form: NgForm): void {
    this.reset(form);
    this.message.set('');
    this.error.set('');
    this.backToList();
  }

  goToPage(page: number): void {
    this.currentPage = Math.max(0, page);
    this.fetchData();
    this.scrollToTable();
  }

  showForm(): boolean {
    return this.formOpen();
  }

  showReport(): boolean {
    return !this.formOpen();
  }

  showTable(): boolean {
    return !this.formOpen();
  }

  backToList(): void {
    this.formOpen.set(false);
    this.scrollToTable();
  }

  downloadExcel(): void {
    this.exportingExcel.set(true);
    this.api.exportChildren(this.appliedParams).pipe(finalize(() => this.exportingExcel.set(false))).subscribe({
      next: blob => this.saveBlob(blob, `relatorio-infantil-${new Date().toISOString().slice(0, 10)}.xlsx`),
      error: () => this.fail('Não foi possível gerar o relatório em Excel.')
    });
  }

  downloadPdf(): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.notifications.warning('Libere pop-ups para gerar o PDF.');
      return;
    }
    printWindow.document.write('<p style="font-family:sans-serif;padding:24px">Preparando relatório...</p>');
    this.exportingPdf.set(true);
    this.api.children({ ...this.appliedParams, page: 0, size: 10000 }).subscribe({
        next: async page => {
          try {
            const summary = this.summary();
            if (!summary) throw new Error('Resumo indisponível.');
            const { renderChildrenPdf } = await import('./children-pdf-report');
            renderChildrenPdf(printWindow, page.items, summary, this.reportPeriod(), location.origin);
          } catch {
            printWindow.close();
            this.fail('Não foi possível gerar o relatório em PDF.');
          } finally {
            this.exportingPdf.set(false);
          }
        },
        error: () => {
          this.exportingPdf.set(false);
          printWindow.close();
          this.fail('Não foi possível gerar o relatório em PDF.');
        }
      });
  }

  updatePhone(value: string): void {
    this.form.guardianPhone = this.formatPhone(value);
  }

  updateAge(value: string): void {
    this.ageInput = String(value ?? '').replace(/\D/g, '').slice(0, 2);
    this.form.age = this.ageInput === '' ? undefined : Number(this.ageInput);
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
  }

  recordInfos(record: ChildRecord): ListCardInfo[] {
    return [
      { icon: 'groups', text: record.age === undefined ? 'Idade não informada' : `${record.age} ano(s)` },
      { icon: 'person', text: record.guardianName || 'Responsável não informado' },
      { icon: 'phone', text: this.formatPhone(record.guardianPhone) || 'Telefone não informado' },
      { icon: 'service', text: record.activityName || 'Atividade não informada' },
      { icon: 'calendar', text: this.formatDate(record.createdAt) }
    ];
  }

  recordActions(record: ChildRecord): ListCardAction[] {
    const actions: ListCardAction[] = [
      { id: 'edit', label: 'Editar', icon: 'edit' },
      { id: 'delete', label: this.deletingId() === record.id ? 'Excluindo...' : 'Excluir', icon: 'delete', danger: true }
    ];
    if (record.photoUrl) actions.splice(1, 0, { id: 'photo', label: 'Visualizar foto', icon: 'camera' });
    return actions;
  }

  handleRecordAction(record: ChildRecord, action: string): void {
    if (action === 'edit') this.edit(record);
    if (action === 'delete') this.delete(record);
    if (action === 'photo') this.showPhoto(record);
  }

  view(record: ChildRecord): void {
    this.selectedRecord.set(record);
  }

  closeDetails(): void {
    this.selectedRecord.set(null);
  }

  showPhoto(record: ChildRecord): void {
    if (record.photoUrl) this.photoViewer.set({ url: record.photoUrl, name: record.childName });
  }

  genderLabel(gender?: ChildRecord['gender']): string {
    if (gender === 'MALE') return 'Menino';
    if (gender === 'FEMALE') return 'Menina';
    return 'Não informado';
  }

  closePhoto(): void {
    this.photoViewer.set(null);
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

  percentage(total: number, filteredTotal: number): number {
    return filteredTotal ? Math.round((total / filteredTotal) * 100) : 0;
  }

  averageAge(value: number): string {
    return value ? value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0';
  }

  private fetchData(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      page: this.api.children({ ...this.appliedParams, page: this.currentPage, size: this.pageSize }),
      summary: this.api.childrenSummary(this.appliedParams)
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: result => {
        this.page.set(result.page);
        this.summary.set(result.summary);
      },
      error: () => this.fail('Não foi possível carregar os dados do departamento infantil.')
    });
  }

  private params(): Record<string, string | number | undefined> {
    return {
      activityName: this.activityName || undefined,
      from: this.toOffset(this.from),
      to: this.toOffset(this.to)
    };
  }

  private blank(): ChildRecord {
    return {
      childName: '',
      city: 'Sertão'
    };
  }

  private validAge(): boolean {
    return this.form.age === undefined || (Number.isInteger(this.form.age) && this.form.age >= 0 && this.form.age <= 17);
  }

  private phoneDigits(value?: string): string | undefined {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11);
    return digits || undefined;
  }

  formatPhone(value?: string): string {
    const digits = this.phoneDigits(value) || '';
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  private toOffset(value: string): string | undefined {
    return value ? new Date(value).toISOString() : undefined;
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  private reportPeriod(): string {
    if (!this.appliedParams['from'] && !this.appliedParams['to']) return 'Todos os registros';
    const format = (value: unknown) => value ? new Date(String(value)).toLocaleDateString('pt-BR') : 'início';
    return `${format(this.appliedParams['from'])} a ${format(this.appliedParams['to'])}`;
  }

  private errorMessage(error: { error?: { detail?: string; violations?: Array<{ message: string }> } }): string {
    const body = error.error;
    if (body?.violations?.length) {
      return body.violations.map(violation => violation.message).join(' ');
    }
    return body?.detail || 'Não foi possível concluir a operação no cadastro infantil.';
  }

  private ok(message: string): void {
    this.message.set(message);
    this.notifications.success(message);
  }

  private fail(message: string): void {
    this.error.set(message);
    this.notifications.error(message);
  }

  private openForm(): void {
    this.formOpen.set(true);
    window.setTimeout(() => {
      document.querySelector('.children-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.querySelector<HTMLInputElement>('#child-name')?.focus();
    }, 0);
  }

  private scrollToTable(): void {
    window.setTimeout(() => document.querySelector('.children-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }
}
