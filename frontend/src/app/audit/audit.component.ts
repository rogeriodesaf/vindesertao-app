import { Component, OnInit, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { formatDateTime } from '../core/date-format';
import { AuditLog } from '../core/models';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [SlicePipe],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Auditoria</h1>
          <p class="muted">Registro de quem alterou o que e quando.</p>
        </div>
      </div>

      <div class="table-wrap">
        <div class="list-head">
          <div>
            <h2>Eventos recentes</h2>
            <p class="muted">{{ total() }} evento(s) registrados</p>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Quando</th><th>Quem fez</th><th>O que aconteceu</th><th>Area afetada</th><th>Detalhes</th></tr>
          </thead>
          <tbody>
            @for (log of logs(); track log.id) {
              <tr>
                <td data-label="Quando">{{ formatDate(log.createdAt) }}</td>
                <td data-label="Quem fez">{{ log.actorEmail || 'Sistema' }}</td>
                <td data-label="O que aconteceu">{{ eventTitle(log) }}</td>
                <td data-label="Area afetada">{{ entityLabel(log) }}</td>
                <td data-label="Detalhes">{{ eventDetails(log) }}</td>
              </tr>
            }
          </tbody>
        </table>
        <div class="pagination">
          <button type="button" class="secondary" [disabled]="pageIndex() === 0" (click)="previousPage()">Anterior</button>
          <span>Pagina {{ pageIndex() + 1 }} de {{ totalPages() }}</span>
          <button type="button" class="secondary" [disabled]="pageIndex() + 1 >= totalPages()" (click)="nextPage()">Proxima</button>
        </div>
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
  }

  nextPage(): void {
    this.pageIndex.update((page) => page + 1);
    this.load();
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
      SOCIAL_ASSISTANCE: 'Atendimento social'
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
}
