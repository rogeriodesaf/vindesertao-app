import { Component, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { formatDateTime } from '../core/date-format';
import { AuditLog } from '../core/models';
import { CompactPaginationComponent } from '../shared/compact-pagination.component';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { ListCardComponent } from '../shared/list-card.component';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [SlicePipe, ListCardComponent, EmptyStateComponent, CompactPaginationComponent],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Auditoria</h1>
          <p class="muted">Registro de quem alterou o que e quando.</p>
        </div>
      </div>

      <div class="table-wrap audit-table">
        <div class="list-head">
          <div>
            <h2>Eventos recentes</h2>
            <p class="muted">{{ total() }} evento(s) registrados</p>
          </div>
        </div>
        <div class="unified-list">
          @for (log of logs(); track log.id) {
            <app-list-card [title]="eventTitle(log)" [state]="entityLabel(log)"
              [infos]="[{ icon: 'calendar', text: formatDate(log.createdAt) }, { icon: 'person', text: log.actorEmail || 'Sistema' }, { icon: 'description', text: eventDetails(log) }]" />
          } @empty { <app-empty-state message="Nenhum evento de auditoria encontrado." /> }
        </div>
        <app-compact-pagination [pageIndex]="pageIndex()" [totalPages]="totalPages()" (previous)="previousPage()" (next)="nextPage()" />
      </div>
    </section>
  `
})
export class AuditComponent implements OnInit {
  logs = signal<AuditLog[]>([]);
  pageIndex = signal(0);
  total = signal(0);
  totalPages = signal(1);
  pageSize = 10;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.auditLogs({ page: this.pageIndex(), size: this.pageSize }).subscribe((page) => {
      this.logs.set(page.items);
      this.total.set(page.total);
      this.totalPages.set(Math.max(1, page.pages));
    });
  }

  previousPage(): void {
    this.pageIndex.update((page) => Math.max(0, page - 1));
    this.load();
    this.scrollToTable();
  }

  nextPage(): void {
    this.pageIndex.update((page) => page + 1);
    this.load();
    this.scrollToTable();
  }

  formatDate(value: string): string {
    return formatDateTime(value);
  }

  eventTitle(log: AuditLog): string {
    const action = this.actionLabel(log.action);
    const entity = this.entityName(log.entityType).toLowerCase();
    if (log.action === 'MERGE' && log.entityType === 'VISIT') {
      return 'Dados duplicados removidos';
    }
    if (log.entityType === 'TERRITORY' && log.action === 'CREATE') {
      const data = this.parse(log.afterData);
      return `Criacao de demarcacao de territorio${data['team'] ? ` para ${data['team']}` : ''}`;
    }
    if (log.entityType === 'TERRITORY' && log.action === 'UPDATE') {
      const data = this.parse(log.afterData);
      return `Alteracao de demarcacao de territorio${data['team'] ? ` de ${data['team']}` : ''}`;
    }
    return `${action} de ${entity}`;
  }

  entityLabel(log: AuditLog): string {
    const entity = this.entityName(log.entityType);
    return log.entityId ? `${entity} ${log.entityId}` : entity;
  }

  eventDetails(log: AuditLog): string {
    if (log.action === 'MERGE') {
      return 'Fichas repetidas foram unificadas em uma ficha principal.';
    }
    const after = this.parse(log.afterData);
    const before = this.parse(log.beforeData);
    const data = Object.keys(after).length ? after : before;
    if (!Object.keys(data).length) {
      return 'Registro de alteracao administrativa.';
    }

    if (log.entityType === 'TERRITORY') {
      const status = data['active'] === true || data['active'] === 'true' ? 'ativo' : 'inativo';
      const rule = data['enforceForProjectists'] === true || data['enforceForProjectists'] === 'true'
        ? 'com bloqueio para registros fora do territorio'
        : 'sem bloqueio territorial';
      return `${data['name'] || 'Territorio'} vinculado a ${data['team'] || 'equipe nao informada'}, ${status}, ${rule}.`;
    }
    if (log.entityType === 'USER') {
      const status = data['active'] === true || data['active'] === 'true' ? 'ativo' : 'inativo';
      return `${data['name'] || 'Usuario'} (${data['email'] || 'sem e-mail'}), perfil ${data['roles'] || 'nao informado'}, equipe ${data['team'] || 'sem equipe'}, ${status}.`;
    }
    if (log.entityType === 'TEAM') {
      const operation = data['canRegisterVisits'] === true || data['canRegisterVisits'] === 'true'
        ? 'pode registrar visitas'
        : 'equipe de apoio, sem registro de visitas';
      return `${data['name'] || 'Equipe'} (${this.teamTypeLabel(String(data['teamType'] || 'OTHER'))}) com lider ${data['leader'] || 'nao definido'}; ${operation}.`;
    }
    if (log.entityType === 'VISIT') {
      return `Ficha de ${data['personName'] || 'morador nao informado'}, responsavel ${data['responsible'] || 'nao informado'}, equipe ${data['team'] || 'sem equipe'}.`;
    }
    if (log.entityType === 'SOCIAL_ASSISTANCE') {
      return `Atendimento de ${data['assistedPersonName'] || 'pessoa nao informada'}, tipo ${data['serviceType'] || 'nao informado'}, quantidade ${data['quantity'] || 1}, equipe ${data['team'] || 'sem equipe'}.`;
    }
    if (log.entityType === 'FINANCE') {
      return `${data['type'] || 'Lancamento'} de ${data['amount'] || 'valor nao informado'} em ${data['category'] || 'categoria nao informada'}, responsavel ${data['responsible'] || 'nao informado'}.`;
    }
    return 'Registro administrativo atualizado.';
  }

  private actionLabel(action: string): string {
    const labels: Record<string, string> = {
      CREATE: 'Criacao',
      UPDATE: 'Alteracao',
      MERGE: 'Mesclagem'
    };
    return labels[action] || action;
  }

  private entityName(entity: string): string {
    const labels: Record<string, string> = {
      USER: 'Usuario',
      TEAM: 'Equipe',
      VISIT: 'Ficha de visita',
      TERRITORY: 'Territorio',
      SOCIAL_ASSISTANCE: 'Atendimento social',
      FINANCE: 'Lancamento financeiro'
    };
    return labels[entity] || entity;
  }

  private teamTypeLabel(value: string): string {
    const labels: Record<string, string> = {
      EVANGELISM: 'Evangelismo',
      SUPPORT: 'Apoio',
      SOCIAL_ACTION: 'Acao social',
      CHILDREN: 'Infantil',
      KITCHEN: 'Cozinha',
      MUSIC: 'Musica',
      INTERCESSION: 'Intercessao',
      MEDIA: 'Midias',
      SECRETARIAT: 'Secretaria',
      FINANCE: 'Financeiro',
      OTHER: 'Outro'
    };
    return labels[value] || value;
  }

  private parse(value?: string): Record<string, string | boolean> {
    if (!value) {
      return {};
    }
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private scrollToTable(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches) {
      window.setTimeout(() => document.querySelector('.audit-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
  }
}
