import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AppUser, Edition, EditionStatus, Team } from '../core/models';
import { NotificationService } from '../core/notification.service';

@Component({ selector: 'app-editions', standalone: true, imports: [FormsModule], template: `
  <section class="page editions-page">
    <div class="page-heading"><div><span class="eyebrow">Administração</span><h1>Edições anuais</h1><p class="muted">Separe cada missão sem apagar o histórico nem as contas existentes.</p></div></div>
    <form class="panel edition-form" (ngSubmit)="create()">
      <h2>Nova edição</h2><div class="form-grid">
        <label>Ano<input name="year" type="number" [(ngModel)]="draft.year" required></label>
        <label>Nome<input name="name" [(ngModel)]="draft.name" required placeholder="Vinde Sertão 2027"></label>
        <label>Localidade<input name="locality" [(ngModel)]="draft.locality" required></label>
        <label>Início<input name="startsOn" type="date" [(ngModel)]="draft.startsOn"></label>
        <label>Fim<input name="endsOn" type="date" [(ngModel)]="draft.endsOn"></label>
      </div><button type="submit" [disabled]="saving()">{{ saving() ? 'Salvando...' : 'Criar edição' }}</button>
    </form>
    <section class="panel"><div class="list-head"><h2>Edições cadastradas</h2><span class="badge">{{ editions().length }}</span></div>
      @for (edition of editions(); track edition.id) { <article class="edition-row"><div><strong>{{ edition.year }} · {{ edition.name }}</strong><span>{{ edition.locality }}{{ edition.startsOn ? ' · ' + edition.startsOn : '' }}{{ edition.endsOn ? ' a ' + edition.endsOn : '' }}</span></div><div class="edition-actions"><span class="status-pill" [attr.data-status]="edition.status">{{ label(edition.status) }}</span><button class="secondary" (click)="select(edition)">Configurar acesso</button>@if (edition.status === 'PREPARATION') { <button class="secondary" (click)="changeStatus(edition, 'ACTIVE')">Ativar</button> } @if (edition.status === 'ACTIVE') { <button class="secondary" (click)="changeStatus(edition, 'CLOSED')">Encerrar</button> } @if (edition.status === 'CLOSED') { <button class="secondary" (click)="changeStatus(edition, 'ACTIVE')">Reabrir</button> }</div></article> } @empty { <p class="muted">Nenhuma edição cadastrada.</p> }
    </section>
    @if (selectedEdition(); as edition) { <section class="panel edition-access"><h2>Autorizar participante · {{ edition.name }}</h2><p class="muted">A autorização vale somente para esta edição e pode apontar a equipe operacional.</p><div class="form-grid"><label>Participante<select [(ngModel)]="accessUserId" name="accessUserId"><option [ngValue]="undefined">Selecione</option>@for (user of users(); track user.id) { <option [ngValue]="user.id">{{ user.name }} · {{ user.email }}</option> }</select></label><label>Equipe<select [(ngModel)]="accessTeamId" name="accessTeamId"><option [ngValue]="undefined">Sem equipe</option>@for (team of teams(); track team.id) { <option [ngValue]="team.id">{{ team.name }}</option> }</select></label></div><button (click)="grantAccess()" [disabled]="!accessUserId">Autorizar nesta edição</button></section> }
  </section>` })
export class EditionsComponent implements OnInit {
  editions = signal<Edition[]>([]); users = signal<AppUser[]>([]); teams = signal<Team[]>([]); selectedEdition = signal<Edition | null>(null); saving = signal(false);
  accessUserId?: number; accessTeamId?: number;
  draft: Partial<Edition> = { year: new Date().getFullYear() + 1, name: '', locality: '' };
  constructor(private api: ApiService, private notifications: NotificationService) {}
  ngOnInit() { this.load(); this.api.users({ page: 0, size: 500 }).subscribe(response => this.users.set(response.items)); this.api.teams().subscribe(value => this.teams.set(value)); }
  load() { this.api.editions().subscribe({ next: value => this.editions.set(value), error: error => this.notifications.error(error?.error?.message || 'Não foi possível carregar as edições.') }); }
  create() { if (!this.draft.year || !this.draft.name || !this.draft.locality) return; this.saving.set(true); this.api.createEdition(this.draft as Omit<Edition, 'id'|'status'|'createdAt'>).subscribe({ next: value => { this.editions.update(items => [value, ...items]); this.draft = { year: (this.draft.year || 2026) + 1, name: '', locality: '' }; this.notifications.success('Edição criada em preparação.'); }, error: error => this.notifications.error(error?.error?.message || 'Não foi possível criar a edição.'), complete: () => this.saving.set(false) }); }
  changeStatus(edition: Edition, status: EditionStatus) { if (status === 'ACTIVE') this.selectedEdition.set(edition); this.api.setEditionStatus(edition.id, status).subscribe({ next: value => this.editions.update(items => items.map(item => item.id === value.id ? value : item)), error: error => this.notifications.error(error?.error?.message || 'Não foi possível alterar o status.') }); }
  select(edition: Edition) { this.selectedEdition.set(edition); this.api.editionTeams(edition.id).subscribe(value => this.teams.set(value)); }
  grantAccess() { const edition = this.selectedEdition(); if (!edition || !this.accessUserId) return; this.api.grantEditionAccess(edition.id, this.accessUserId, this.accessTeamId).subscribe({ next: () => this.notifications.success('Participante autorizado nesta edição.'), error: error => this.notifications.error(error?.error?.message || 'Não foi possível autorizar o participante.') }); }
  label(status: EditionStatus) { return { PREPARATION: 'Preparação', ACTIVE: 'Ativa', CLOSED: 'Encerrada' }[status]; }
}
