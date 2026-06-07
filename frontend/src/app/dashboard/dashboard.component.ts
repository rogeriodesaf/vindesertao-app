import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { Dashboard } from '../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Dashboard administrativo</h1>
          <p class="muted">Resumo das fichas de visita cadastradas no período selecionado.</p>
        </div>
        <div class="date-filters">
          <label>Data inicial<input type="datetime-local" [(ngModel)]="from"></label>
          <label>Data final<input type="datetime-local" [(ngModel)]="to"></label>
          <button type="button" (click)="load()">Atualizar</button>
        </div>
      </div>

      @if (dashboard(); as data) {
        <section class="report-actions">
          <div>
            <h2>Relatorio de fichas de visita</h2>
            <p class="muted">Baixe todas as fichas em Excel ou gere um PDF pela impressao do navegador.</p>
          </div>
          <div class="actions">
            <button type="button" (click)="downloadExcel()">Baixar Excel (.xlsx)</button>
            <button type="button" class="secondary" (click)="printReport()">Gerar PDF</button>
          </div>
        </section>

        <div class="metric-grid">
          <div class="metric"><span>Casas alcançadas</span><strong>{{ data.totalVisits }}</strong><small>Total de fichas cadastradas</small></div>
          <div class="metric"><span>Aceitam visitas</span><strong>{{ data.wantsVisitsYes }}</strong><small>{{ acceptanceRate(data) }}% das casas alcançadas</small></div>
          <div class="metric"><span>Nao aceitam</span><strong>{{ data.wantsVisitsNo }}</strong><small>{{ rejectionRate(data) }}% das casas alcançadas</small></div>
        </div>

        <section class="goal-card">
          <div>
            <h2>Meta diária de casas alcançadas</h2>
            <p class="muted">Defina uma meta para comparar com a média diária do período filtrado.</p>
          </div>
          <label>Meta por dia<input type="number" min="0" [(ngModel)]="dailyGoal" (change)="saveGoal()"></label>
          <div class="goal-progress">
            <div class="bar-track"><span [style.width.%]="goalProgress(data)"></span></div>
            <strong>{{ dailyAverage(data) }} / {{ dailyGoal || 0 }}</strong>
            <small>Média diária x meta</small>
          </div>
        </section>

        <section class="productivity-card">
          <div>
            <h2>Produtividade por equipe</h2>
            <p class="muted">Total de casas alcancadas por cada equipe no periodo selecionado.</p>
          </div>
          <div class="team-productivity">
            @for (item of data.byTeam; track item.label) {
              <div class="bar-row chart-row">
                <span>{{ item.label }}</span>
                <div class="bar-track"><span [style.width.%]="barWidth(item.total, max(data.byTeam))"></span></div>
                <strong>{{ item.total }}</strong>
              </div>
            }
          </div>
        </section>

        <section class="productivity-card">
          <div>
            <h2>Relatorio individual por equipe</h2>
            <p class="muted">Veja o desempenho separado de cada equipe e baixe as fichas filtradas por equipe.</p>
          </div>
          <div class="team-report-grid">
            @for (team of data.teamReports; track team.teamId) {
              <article class="team-report-card">
                <div>
                  <h3>{{ team.teamName }}</h3>
                  <p class="muted">{{ teamAcceptanceRate(team) }}% aceitaram receber visitas</p>
                </div>
                <div class="metric-grid compact">
                  <div class="metric"><span>Casas</span><strong>{{ team.totalVisits }}</strong></div>
                  <div class="metric"><span>Aceitam</span><strong>{{ team.wantsVisitsYes }}</strong></div>
                  <div class="metric"><span>Nao aceitam</span><strong>{{ team.wantsVisitsNo }}</strong></div>
                </div>
                <button type="button" class="secondary" (click)="downloadTeamExcel(team.teamId, team.teamName)">Baixar Excel desta equipe</button>
              </article>
            } @empty {
              <p class="muted">Nenhuma equipe cadastrada para exibir neste relatorio.</p>
            }
          </div>
        </section>

        <div class="analytics-grid">
          <section>
            <h2>Quem cadastrou as fichas</h2>
            <p class="muted">Usuário responsável por inserir cada visita no sistema.</p>
            @for (item of data.byProjectist; track item.label) {
              <div class="bar-row chart-row">
                <span>{{ item.label }}</span>
                <div class="bar-track"><span [style.width.%]="barWidth(item.total, max(data.byProjectist))"></span></div>
                <strong>{{ item.total }}</strong>
              </div>
            }
          </section>
          <section>
            <h2>Bairros informados nas fichas</h2>
            <p class="muted">Locais cadastrados nas visitas dentro do período selecionado.</p>
            @for (item of data.byNeighborhood; track item.label) {
              <div class="bar-row chart-row">
                <span>{{ item.label }}</span>
                <div class="bar-track"><span [style.width.%]="barWidth(item.total, max(data.byNeighborhood))"></span></div>
                <strong>{{ item.total }}</strong>
              </div>
            }
          </section>
          <section>
            <h2>Casas alcançadas por dia</h2>
            <p class="muted">Quantidade de fichas cadastradas em cada data.</p>
            @for (item of data.byPeriod; track item.label) {
              <div class="bar-row chart-row">
                <span>{{ formatDateLabel(item.label) }}</span>
                <div class="bar-track"><span [style.width.%]="barWidth(item.total, max(data.byPeriod))"></span></div>
                <strong>{{ item.total }}</strong>
              </div>
            }
          </section>
        </div>
      }
    </section>
  `
})
export class DashboardComponent implements OnInit {
  dashboard = signal<Dashboard | null>(null);
  from = '';
  to = '';
  dailyGoal = Number(localStorage.getItem('vinde.dashboard.dailyGoal') || 20);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.dashboard({ from: this.toOffset(this.from), to: this.toOffset(this.to) })
      .subscribe((dashboard) => this.dashboard.set(dashboard));
  }

  downloadExcel(): void {
    this.api.exportVisits({ from: this.toOffset(this.from), to: this.toOffset(this.to) }).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-visitas-${this.fileDate()}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  downloadTeamExcel(teamId: number, teamName: string): void {
    this.api.exportVisits({ teamId, from: this.toOffset(this.from), to: this.toOffset(this.to) }).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-${this.slug(teamName)}-${this.fileDate()}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  printReport(): void {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      window.print();
      return;
    }
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');
    const dashboard = document.querySelector('.page')?.outerHTML ?? '';
    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>Relatorio de visitas</title>
          ${styles}
        </head>
        <body>${dashboard}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  saveGoal(): void {
    localStorage.setItem('vinde.dashboard.dailyGoal', String(this.dailyGoal || 0));
  }

  acceptanceRate(data: Dashboard): number {
    return data.totalVisits ? Math.round((data.wantsVisitsYes / data.totalVisits) * 100) : 0;
  }

  rejectionRate(data: Dashboard): number {
    return data.totalVisits ? Math.round((data.wantsVisitsNo / data.totalVisits) * 100) : 0;
  }

  teamAcceptanceRate(team: { totalVisits: number; wantsVisitsYes: number }): number {
    return team.totalVisits ? Math.round((team.wantsVisitsYes / team.totalVisits) * 100) : 0;
  }

  dailyAverage(data: Dashboard): number {
    const days = this.periodDays(data);
    return days ? Math.round((data.totalVisits / days) * 10) / 10 : data.totalVisits;
  }

  goalProgress(data: Dashboard): number {
    if (!this.dailyGoal) {
      return 0;
    }
    return Math.min(100, Math.round((this.dailyAverage(data) / this.dailyGoal) * 100));
  }

  max(items: { total: number }[]): number {
    return Math.max(1, ...items.map((item) => item.total));
  }

  barWidth(total: number, max: number): number {
    return Math.max(4, Math.round((total / max) * 100));
  }

  formatDateLabel(value: string): string {
    const parts = value.split('-');
    if (parts.length !== 3) {
      return value;
    }
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  private periodDays(data: Dashboard): number {
    if (this.from && this.to) {
      const start = new Date(this.from);
      const end = new Date(this.to);
      return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    }
    return Math.max(1, data.byPeriod.length);
  }

  private toOffset(value: string): string | undefined {
    return value ? new Date(value).toISOString() : undefined;
  }

  private fileDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private slug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'equipe';
  }
}
