import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { FinanceSummary, FinancialTransaction, FinancialTransactionType, PageResponse } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { CompactPaginationComponent } from '../shared/compact-pagination.component';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { ListCardComponent } from '../shared/list-card.component';
import { DatePickerComponent } from '../shared/date-picker.component';
import { DateRangeFilterComponent } from '../shared/date-range-filter.component';

@Component({
  selector: 'app-finance',
  standalone: true,
  imports: [FormsModule, ListCardComponent, EmptyStateComponent, CompactPaginationComponent, DatePickerComponent, DateRangeFilterComponent],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Financeiro</h1>
          <p class="muted">Controle entradas, saídas e saldo do projeto.</p>
        </div>
        <div class="page-head-actions">
          <app-date-range-filter [(from)]="from" [(to)]="to" valueMode="date" (filter)="load()" (clear)="load()" />
          <button type="button" class="secondary" (click)="newTransaction()">Novo lançamento</button>
        </div>
      </div>

      @if (message()) {
        <p class="success">{{ message() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @if (showSummary()) {
        @if (summary(); as data) {
          <div class="metric-grid">
            <div class="metric"><span>Entradas</span><strong>{{ money(data.totalIncome) }}</strong></div>
            <div class="metric"><span>Saídas</span><strong>{{ money(data.totalExpense) }}</strong></div>
            <div class="metric"><span>Saldo</span><strong>{{ money(data.balance) }}</strong><small>{{ data.totalTransactions }} lançamento(s)</small></div>
          </div>
        }
      }

      <div class="split social-layout">
        @if (showForm()) {
          <form #financeForm="ngForm" class="editor" novalidate (ngSubmit)="save(financeForm)">
            <h2>{{ form.id ? 'Editar lançamento' : 'Novo lançamento' }}</h2>
            <div class="form-grid">
              <label>Tipo
                <select name="type" [(ngModel)]="form.type" required>
                  <option value="INCOME">Entrada</option>
                  <option value="EXPENSE">Saída</option>
                </select>
              </label>
              <label>Data<app-date-picker name="transactionDate" ariaLabel="Data do lançamento" [(ngModel)]="form.transactionDate" [required]="true" /></label>
            </div>
            <label>Categoria
              <select name="category" [(ngModel)]="form.category" required>
                @for (category of categoriesForType(); track category) {
                  <option [value]="category">{{ category }}</option>
                }
              </select>
            </label>
            <label>Descrição<input name="description" [(ngModel)]="form.description" required></label>
            <div class="form-grid">
              <label>Valor<input type="number" min="0.01" step="0.01" name="amount" [(ngModel)]="form.amount" required></label>
              <label>Forma de pagamento<input name="paymentMethod" placeholder="Pix, dinheiro, cartão..." [(ngModel)]="form.paymentMethod"></label>
            </div>
            <label>Observações<textarea name="notes" [(ngModel)]="form.notes"></textarea></label>
            <div class="actions">
              <button type="submit">Salvar lançamento</button>
              <button type="button" class="secondary" (click)="reset(financeForm)">Limpar</button>
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
                <h2>Relatório financeiro</h2>
                <p class="muted">Totais por categoria e forma de pagamento.</p>
              </div>
              <button type="button" class="secondary" (click)="downloadExcel()">Baixar Excel</button>
            </div>
            @if (summary(); as data) {
              <div class="analytics-grid social-analytics">
                <section>
                  <h2>Por categoria</h2>
                  @for (item of data.byCategory; track item.label) {
                    <div class="bar-row chart-row">
                      <span>{{ item.label }}</span>
                      <div class="bar-track"><span [style.width.%]="barWidth(abs(item.total), maxAbs(data.byCategory))"></span></div>
                      <strong>{{ money(item.total) }}</strong>
                    </div>
                  } @empty {
                    <p class="muted">Nenhum lançamento no período.</p>
                  }
                </section>
                <section>
                  <h2>Por forma de pagamento</h2>
                  @for (item of data.byPaymentMethod; track item.label) {
                    <div class="bar-row chart-row">
                      <span>{{ item.label }}</span>
                      <div class="bar-track"><span [style.width.%]="barWidth(abs(item.total), maxAbs(data.byPaymentMethod))"></span></div>
                      <strong>{{ money(item.total) }}</strong>
                    </div>
                  } @empty {
                    <p class="muted">Nenhum lançamento no período.</p>
                  }
                </section>
              </div>
            }
          </section>
        }
      </div>

      @if (showTable()) {
        <section class="detail-card finance-table">
          <div class="list-head">
            <div>
              <h2>Lançamentos</h2>
              <p class="muted">{{ page()?.total || 0 }} lançamento(s) encontrado(s).</p>
            </div>
            <div class="list-actions">
              <label>Tipo
                <select [(ngModel)]="type" (change)="load()">
                  <option value="">Todos</option>
                  <option value="INCOME">Entrada</option>
                  <option value="EXPENSE">Saída</option>
                </select>
              </label>
              <button type="button" class="secondary" (click)="downloadExcel()">Excel</button>
            </div>
          </div>

          <div class="unified-list">
            @for (transaction of transactions(); track transaction.id) {
              <app-list-card [title]="transaction.description" [state]="transaction.typeLabel || ''" [interactive]="true"
                [actions]="[{ id: 'edit', label: 'Editar', icon: 'edit' }]" (activate)="edit(transaction)" (action)="edit(transaction)"
                [infos]="[{ icon: 'calendar', text: formatDate(transaction.transactionDate) }, { icon: 'description', text: transaction.category }, { icon: 'money', text: signedMoney(transaction) }, { icon: 'volunteer', text: transaction.responsibleUserName || '-' }]" />
            } @empty { <app-empty-state message="Nenhum lançamento encontrado." /> }
          </div>
          <app-compact-pagination [pageIndex]="currentPage" [totalPages]="page()?.pages || 1"
            (previous)="goToPage(currentPage - 1)" (next)="goToPage(currentPage + 1)" />
        </section>
      }
    </section>
  `
})
export class FinanceComponent implements OnInit {
  page = signal<PageResponse<FinancialTransaction> | null>(null);
  summary = signal<FinanceSummary | null>(null);
  message = signal('');
  error = signal('');
  form: FinancialTransaction = this.blank();
  currentPage = 0;
  pageSize = 5;
  type = '';
  from = '';
  to = '';
  mobileFormOpen = signal(false);

  incomeCategories = ['Doação', 'Oferta', 'Patrocínio', 'Inscrição', 'Reembolso', 'Outro'];
  expenseCategories = ['Alimentação', 'Transporte', 'Material evangelístico', 'Ação social', 'Estrutura', 'Mídia/comunicação', 'Hospedagem', 'Saúde', 'Outro'];

  constructor(private api: ApiService, private notifications: NotificationService) {}

  ngOnInit(): void {
    this.load();
  }

  transactions(): FinancialTransaction[] {
    return this.page()?.items || [];
  }

  load(): void {
    const params = this.params();
    this.api.financialTransactions({ ...params, page: this.currentPage, size: this.pageSize }).subscribe((page) => this.page.set(page));
    this.api.financeSummary(params).subscribe((summary) => this.summary.set(summary));
  }

  save(form: NgForm): void {
    this.message.set('');
    this.error.set('');
    if (form.invalid) {
      this.fail('Preencha tipo, data, categoria, descrição e valor.');
      return;
    }
    const editing = !!this.form.id;
    const action = this.form.id ? this.api.updateFinancialTransaction(this.form) : this.api.createFinancialTransaction(this.form);
    action.subscribe({
      next: () => {
        this.ok(editing ? 'Lançamento atualizado com sucesso.' : 'Lançamento salvo com sucesso.');
        this.reset(form);
        this.backToList();
        this.load();
      },
      error: (error) => this.fail(this.errorMessage(error))
    });
  }

  edit(transaction: FinancialTransaction): void {
    this.form = { ...transaction };
    this.openFormOnMobile();
  }

  newTransaction(): void {
    this.reset();
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

  downloadExcel(): void {
    this.api.exportFinance(this.params()).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  categoriesForType(): string[] {
    return this.form.type === 'INCOME' ? this.incomeCategories : this.expenseCategories;
  }

  showSummary(): boolean {
    return !this.isCompactScreen() || !this.mobileFormOpen();
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

  isCompactScreen(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
  }

  money(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  }

  signedMoney(transaction: FinancialTransaction): string {
    const value = transaction.type === 'EXPENSE' ? -Math.abs(Number(transaction.amount || 0)) : Number(transaction.amount || 0);
    return this.money(value);
  }

  abs(value: number): number {
    return Math.abs(Number(value || 0));
  }

  maxAbs(items: Array<{ total: number }>): number {
    return Math.max(1, ...items.map((item) => this.abs(item.total)));
  }

  barWidth(total: number, max: number): number {
    return Math.max(4, Math.round((total / max) * 100));
  }

  formatDate(value?: string): string {
    if (!value) {
      return '-';
    }
    const parts = value.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
  }

  private params(): Record<string, string | number | undefined> {
    return {
      type: this.type || undefined,
      from: this.from || undefined,
      to: this.to || undefined
    };
  }

  private blank(): FinancialTransaction {
    return {
      type: 'INCOME',
      category: 'Doação',
      description: '',
      amount: 0,
      paymentMethod: 'Pix',
      transactionDate: new Date().toISOString().slice(0, 10)
    };
  }

  private openFormOnMobile(): void {
    if (this.isCompactScreen()) {
      this.mobileFormOpen.set(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private scrollToTable(): void {
    if (this.isCompactScreen()) {
      window.setTimeout(() => document.querySelector('.finance-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
  }

  private errorMessage(error: { error?: { detail?: string; violations?: Array<{ message: string }> } }): string {
    const body = error.error;
    if (body?.violations?.length) {
      return body.violations.map((violation) => violation.message).join(' ');
    }
    return body?.detail || 'Não foi possível salvar o lançamento financeiro.';
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
