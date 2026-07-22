import { Component, OnInit, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { formatDateTime } from '../core/date-format';
import { DuplicateVisitGroup, Visit } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { ListCardComponent } from '../shared/list-card.component';

@Component({
  selector: 'app-duplicates',
  standalone: true,
  imports: [ListCardComponent, EmptyStateComponent],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Possiveis duplicidades</h1>
          <p class="muted">Revise fichas com telefone igual ou mesmo nome e endereco.</p>
        </div>
        <button type="button" (click)="load()">Atualizar</button>
      </div>

      @if (message()) {
        <p class="success">{{ message() }}</p>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="duplicate-grid">
        @for (group of groups(); track group.reason) {
          <section class="detail-card">
            <h2>{{ group.reason }}</h2>
            <p class="muted">{{ group.visits.length }} fichas parecidas encontradas.</p>
            <div class="unified-list">
              @for (visit of group.visits; track visit.id) {
                <app-list-card [title]="'#' + visit.id + ' - ' + visit.personName" [interactive]="true"
                  [selected]="targetId(group) === visit.id" [state]="targetId(group) === visit.id ? 'Ficha principal' : ''"
                  [actions]="[{ id: 'primary', label: 'Definir como principal', icon: 'status' }]"
                  [infos]="[{ icon: 'phone', text: visit.phone || 'Sem telefone' }, { icon: 'location', text: (visit.street || visit.manualAddress || '-') + ', ' + (visit.number || '-') }, { icon: 'volunteer', text: visit.responsibleUserName || '-' }, { icon: 'calendar', text: formatDate(visit.createdAt) }]"
                  (activate)="setTarget(group, visit)" (action)="setTarget(group, visit)" />
              }
            </div>
            <button type="button" class="secondary" (click)="merge(group)">Mesclar nesta ficha principal</button>
          </section>
        } @empty {
          <app-empty-state message="Nenhuma duplicidade provável encontrada." />
        }
      </div>
    </section>
  `
})
export class DuplicatesComponent implements OnInit {
  groups = signal<DuplicateVisitGroup[]>([]);
  targets = new Map<string, number>();
  message = signal('');
  error = signal('');

  constructor(private api: ApiService, private notifications: NotificationService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.message.set('');
    this.error.set('');
    this.api.duplicateVisits().subscribe((groups) => {
      this.groups.set(groups);
      groups.forEach((group) => {
        if (!this.targets.has(group.reason) && group.visits[0]?.id) {
          this.targets.set(group.reason, group.visits[0].id);
        }
      });
    });
  }

  targetId(group: DuplicateVisitGroup): number | undefined {
    return this.targets.get(group.reason);
  }

  setTarget(group: DuplicateVisitGroup, visit: Visit): void {
    if (visit.id) {
      this.targets.set(group.reason, visit.id);
    }
  }

  formatDate(value?: string): string {
    return formatDateTime(value);
  }

  merge(group: DuplicateVisitGroup): void {
    const targetId = this.targetId(group);
    if (!targetId) {
      this.fail('Escolha a ficha principal antes de mesclar.');
      return;
    }
    const duplicateIds = group.visits.map((visit) => visit.id).filter((id): id is number => !!id && id !== targetId);
    this.api.mergeVisits(targetId, duplicateIds).subscribe({
      next: () => {
        this.ok('Fichas mescladas com sucesso.');
        this.load();
      },
      error: () => this.fail('Não foi possível mesclar as fichas.')
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
