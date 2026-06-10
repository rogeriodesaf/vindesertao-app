import { Component, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { formatDateTime } from '../core/date-format';
import { PageResponse, SocialAssistanceRecord, SocialAssistanceSummary, SocialServiceType, Team } from '../core/models';
import { NotificationService } from '../core/notification.service';

@Component({
  selector: 'app-social-assistance',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Ação Social</h1>
          <p class="muted">Registre atendimentos médicos, odontológicos, cortes de cabelo, manicure, cestas básicas e outros serviços.</p>
        </div>
        <div class="date-filters">
          <label>Data inicial<input type="datetime-local" [(ngModel)]="from"></label>
          <label>Data final<input type="datetime-local" [(ngModel)]="to"></label>
          <button type="button" (click)="load()">Filtrar</button>
          <button type="button" class="secondary" (click)="newRecord()">Novo atendimento</button>
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
        <form #socialForm="ngForm" class="editor" novalidate (ngSubmit)="save(socialForm)">
          <h2>{{ form.id ? 'Editar atendimento' : 'Novo atendimento' }}</h2>
          <label>Nome da pessoa atendida<input name="assistedPersonName" [(ngModel)]="form.assistedPersonName" required></label>
          <div class="form-grid">
            <label>Telefone<input name="phone" [(ngModel)]="form.phone"></label>
            <label>Idade<input type="number" min="0" name="age" [(ngModel)]="form.age"></label>
          </div>
          <div class="form-grid">
            <label>Bairro/comunidade<input name="neighborhood" [(ngModel)]="form.neighborhood"></label>
            <label>Cidade<input name="city" [(ngModel)]="form.city" required></label>
          </div>
          <div class="form-grid">
            <label>Tipo de atendimento
              <select name="serviceType" [(ngModel)]="form.serviceType" required>
                @for (type of serviceTypes; track type.value) {
                  <option [ngValue]="type.value">{{ type.label }}</option>
                }
              </select>
            </label>
            <label>Quantidade atendida<input type="number" min="1" name="quantity" [(ngModel)]="form.quantity" required></label>
          </div>
          <label>Equipe de ação social
            <select name="teamId" [(ngModel)]="form.teamId">
              <option [ngValue]="undefined">Selecionar automaticamente</option>
              @for (team of socialTeams(); track team.id) {
                <option [ngValue]="team.id">{{ team.name }}</option>
              }
            </select>
          </label>
          <label>Observações<textarea name="notes" [(ngModel)]="form.notes"></textarea></label>
          <div class="actions">
            <button type="submit">Salvar atendimento</button>
            <button type="button" class="secondary" (click)="reset(socialForm)">Limpar</button>
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
              <h2>Relatório de ação social</h2>
              <p class="muted">Resumo dos atendimentos no período filtrado.</p>
            </div>
            <button type="button" class="secondary" (click)="downloadExcel()">Baixar Excel</button>
          </div>

          @if (summary(); as data) {
            <div class="metric-grid">
              <div class="metric"><span>Pessoas atendidas</span><strong>{{ data.totalPeople }}</strong></div>
              <div class="metric"><span>Registros</span><strong>{{ data.totalRecords }}</strong></div>
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
        </section>
        }
      </div>

      @if (showTable()) {
      <section class="detail-card social-table">
        <div class="list-head">
          <div>
            <h2>Atendimentos cadastrados</h2>
            <p class="muted">{{ page()?.total || 0 }} registro(s) encontrado(s).</p>
          </div>
          <label>Tipo
            <select [(ngModel)]="serviceType" (change)="load()">
              <option value="">Todos</option>
              @for (type of serviceTypes; track type.value) {
                <option [value]="type.value">{{ type.label }}</option>
              }
            </select>
          </label>
        </div>

        <div class="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Atendimento</th>
                <th>Quantidade</th>
                <th>Bairro</th>
                <th>Voluntário</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              @for (record of records(); track record.id) {
                <tr (click)="edit(record)">
                  <td data-label="Pessoa">{{ record.assistedPersonName }}</td>
                  <td data-label="Atendimento">{{ record.serviceTypeLabel }}</td>
                  <td data-label="Quantidade">{{ record.quantity }}</td>
                  <td data-label="Bairro">{{ record.neighborhood || '-' }}</td>
                  <td data-label="Voluntário">{{ record.responsibleUserName || '-' }}</td>
                  <td data-label="Data">{{ formatDate(record.createdAt) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <button type="button" class="secondary" [disabled]="currentPage === 0" (click)="goToPage(currentPage - 1)">Anterior</button>
          <span>Página {{ currentPage + 1 }} de {{ page()?.pages || 1 }}</span>
          <button type="button" class="secondary" [disabled]="currentPage + 1 >= (page()?.pages || 1)" (click)="goToPage(currentPage + 1)">Próxima</button>
        </div>
      </section>
      }
    </section>
  `
})
export class SocialAssistanceComponent implements OnInit {
  page = signal<PageResponse<SocialAssistanceRecord> | null>(null);
  summary = signal<SocialAssistanceSummary | null>(null);
  teams = signal<Team[]>([]);
  message = signal('');
  error = signal('');
  form: SocialAssistanceRecord = this.blank();
  from = '';
  to = '';
  serviceType = '';
  currentPage = 0;
  pageSize = 5;
  mobileFormOpen = signal(false);

  serviceTypes: Array<{ value: SocialServiceType; label: string }> = [
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
    if (this.auth.user()?.roles.includes('admin')) {
      this.api.teams().subscribe((teams) => this.teams.set(teams));
    }
    this.load();
  }

  socialTeams(): Team[] {
    return this.teams().filter((team) => team.teamType === 'SOCIAL_ACTION');
  }

  records(): SocialAssistanceRecord[] {
    return this.page()?.items || [];
  }

  load(): void {
    const params = this.params();
    this.api.socialAssistance({ ...params, page: this.currentPage, size: this.pageSize }).subscribe((page) => this.page.set(page));
    this.api.socialAssistanceSummary(params).subscribe((summary) => this.summary.set(summary));
  }

  newRecord(): void {
    this.reset();
    this.openFormOnMobile();
  }

  save(form: NgForm): void {
    this.message.set('');
    this.error.set('');
    if (form.invalid) {
      this.fail('Preencha pelo menos nome, cidade, tipo de atendimento e quantidade.');
      return;
    }
    const editing = !!this.form.id;
    const action = this.form.id ? this.api.updateSocialAssistance(this.form) : this.api.createSocialAssistance(this.form);
    action.subscribe({
      next: () => {
        this.ok(editing ? 'Atendimento social atualizado com sucesso.' : 'Atendimento social salvo com sucesso.');
        this.reset(form);
        this.backToList();
        this.load();
      },
      error: (error) => this.fail(this.errorMessage(error))
    });
  }

  edit(record: SocialAssistanceRecord): void {
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
    this.api.exportSocialAssistance(this.params()).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-acao-social-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
      quantity: 1
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

  isCompactScreen(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
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
