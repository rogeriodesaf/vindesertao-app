import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { formatDateTime } from '../core/date-format';
import { ChildRecord, ChildrenSummary, PageResponse } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { CompactPaginationComponent } from '../shared/compact-pagination.component';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { ListCardComponent } from '../shared/list-card.component';
import { DateRangeFilterComponent } from '../shared/date-range-filter.component';

@Component({
  selector: 'app-children',
  standalone: true,
  imports: [FormsModule, ListCardComponent, EmptyStateComponent, CompactPaginationComponent, DateRangeFilterComponent],
  template: `
    <section class="page children-page">
      <div class="page-head">
        <div>
          <h1>Departamento Infantil</h1>
          <p class="muted">Cadastre as crianças atendidas nas ações evangelísticas do ministério infantil.</p>
        </div>
        <div class="page-head-actions">
          <app-date-range-filter [(from)]="from" [(to)]="to" valueMode="datetime" (filter)="load()" (clear)="load()" />
          <button type="button" class="secondary" (click)="newRecord()">Nova criança</button>
        </div>
      </div>

      @if (message()) {
        <p class="success">{{ message() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="split social-layout">
        @if (showForm()) {
        <form #childForm="ngForm" class="editor" novalidate (ngSubmit)="save(childForm)">
          <h2>{{ form.id ? 'Editar cadastro' : 'Novo cadastro' }}</h2>
          <label>Nome da criança<input name="childName" [(ngModel)]="form.childName" required></label>
          <div class="form-grid">
            <label>Responsável<input name="guardianName" [(ngModel)]="form.guardianName"></label>
            <label>Telefone do responsável<input name="guardianPhone" [(ngModel)]="form.guardianPhone"></label>
          </div>
          <div class="form-grid">
            <label>Idade<input type="number" min="0" name="age" [(ngModel)]="form.age"></label>
            <label>Atividade<input name="activityName" [(ngModel)]="form.activityName" placeholder="Ex.: EBF, culto infantil, recreação"></label>
          </div>
          <div class="form-grid">
            <label>Bairro/comunidade<input name="neighborhood" [(ngModel)]="form.neighborhood"></label>
            <label>Cidade<input name="city" [(ngModel)]="form.city" required></label>
          </div>
          <label>Observações<textarea name="notes" [(ngModel)]="form.notes"></textarea></label>
          <div class="actions">
            <button type="submit">Salvar cadastro</button>
            <button type="button" class="secondary" (click)="reset(childForm)">Limpar</button>
            @if (isCompactScreen()) {
              <button type="button" class="secondary" (click)="backToList()">Voltar para lista</button>
            }
          </div>
        </form>
        }

        @if (showReport()) {
        <section class="detail-card">
          <div class="detail-head">
            <div>
              <h2>Relatório infantil</h2>
              <p class="muted">Resumo dos cadastros no período filtrado.</p>
            </div>
            <button type="button" class="secondary" (click)="downloadExcel()">Baixar Excel</button>
          </div>

          @if (summary(); as data) {
            <div class="metric-grid">
              <div class="metric"><span>Crianças cadastradas</span><strong>{{ data.totalChildren }}</strong></div>
              <div class="metric"><span>Registros</span><strong>{{ data.totalRecords }}</strong></div>
            </div>

            <div class="analytics-grid social-analytics">
              <section>
                <h2>Por atividade</h2>
                @for (item of data.byActivity; track item.label) {
                  <div class="bar-row chart-row">
                    <span>{{ item.label }}</span>
                    <div class="bar-track"><span [style.width.%]="barWidth(item.total, max(data.byActivity))"></span></div>
                    <strong>{{ item.total }}</strong>
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
                    <strong>{{ item.total }}</strong>
                  </div>
                } @empty {
                  <p class="muted">Nenhum cadastro no período.</p>
                }
              </section>
            </div>
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
          <label>Atividade
            <input [(ngModel)]="activityName" (keyup.enter)="load()" placeholder="Filtrar atividade">
          </label>
        </div>

        <div class="unified-list">
          @for (record of records(); track record.id) {
            <app-list-card [title]="record.childName" [interactive]="true" [actions]="[{ id: 'edit', label: 'Editar', icon: 'edit' }]"
              (activate)="edit(record)" (action)="edit(record)"
              [infos]="[{ icon: 'person', text: record.guardianName || '-' }, { icon: 'groups', text: record.age !== undefined ? record.age + ' ano(s)' : '-' }, { icon: 'service', text: record.activityName || '-' }, { icon: 'location', text: record.neighborhood || '-' }, { icon: 'volunteer', text: record.responsibleUserName || '-' }, { icon: 'calendar', text: formatDate(record.createdAt) }]" />
          } @empty { <app-empty-state message="Nenhum cadastro infantil encontrado." /> }
        </div>
        <app-compact-pagination [pageIndex]="currentPage" [totalPages]="page()?.pages || 1"
          (previous)="goToPage(currentPage - 1)" (next)="goToPage(currentPage + 1)" />
      </section>
      }
    </section>
  `
})
export class ChildrenComponent implements OnInit {
  page = signal<PageResponse<ChildRecord> | null>(null);
  summary = signal<ChildrenSummary | null>(null);
  message = signal('');
  error = signal('');
  form: ChildRecord = this.blank();
  from = '';
  to = '';
  activityName = '';
  currentPage = 0;
  pageSize = 5;
  mobileFormOpen = signal(false);

  constructor(private api: ApiService, public auth: AuthService, private notifications: NotificationService) {}

  ngOnInit(): void {
    this.load();
  }

  records(): ChildRecord[] {
    return this.page()?.items || [];
  }

  load(): void {
    const params = this.params();
    this.api.children({ ...params, page: this.currentPage, size: this.pageSize }).subscribe((page) => this.page.set(page));
    this.api.childrenSummary(params).subscribe((summary) => this.summary.set(summary));
  }

  newRecord(): void {
    this.reset();
    this.openFormOnMobile();
  }

  save(form: NgForm): void {
    this.message.set('');
    this.error.set('');
    if (form.invalid) {
      this.fail('Preencha pelo menos nome da criança e cidade.');
      return;
    }
    const editing = !!this.form.id;
    const action = this.form.id ? this.api.updateChild(this.form) : this.api.createChild(this.form);
    action.subscribe({
      next: () => {
        this.ok(editing ? 'Cadastro infantil atualizado com sucesso.' : 'Cadastro infantil salvo com sucesso.');
        this.reset(form);
        this.backToList();
        this.load();
      },
      error: (error) => this.fail(this.errorMessage(error))
    });
  }

  edit(record: ChildRecord): void {
    this.form = { ...record };
    this.openFormOnMobile();
  }

  reset(form?: NgForm): void {
    this.form = this.blank();
    form?.resetForm(this.form);
  }

  goToPage(page: number): void {
    this.currentPage = Math.max(0, page);
    this.load();
    this.scrollToTable();
  }

  showForm(): boolean {
    return !this.isCompactScreen() || this.mobileFormOpen();
  }

  showReport(): boolean {
    return !this.isCompactScreen() || !this.mobileFormOpen();
  }

  showTable(): boolean {
    return !this.isCompactScreen() || !this.mobileFormOpen();
  }

  backToList(): void {
    this.mobileFormOpen.set(false);
    this.scrollToTable();
  }

  downloadExcel(): void {
    this.api.exportChildren(this.params()).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-infantil-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  formatDate(value?: string): string {
    return formatDateTime(value);
  }

  max(items: { total: number }[]): number {
    return Math.max(1, ...items.map((item) => item.total));
  }

  barWidth(total: number, max: number): number {
    return Math.max(4, Math.round((total / max) * 100));
  }

  isCompactScreen(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
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

  private toOffset(value: string): string | undefined {
    return value ? new Date(value).toISOString() : undefined;
  }

  private errorMessage(error: { error?: { detail?: string; violations?: Array<{ message: string }> } }): string {
    const body = error.error;
    if (body?.violations?.length) {
      return body.violations.map((violation) => violation.message).join(' ');
    }
    return body?.detail || 'Não foi possível salvar o cadastro infantil.';
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
      window.setTimeout(() => document.querySelector('.children-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
  }
}
