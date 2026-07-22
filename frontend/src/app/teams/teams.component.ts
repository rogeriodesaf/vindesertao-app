import { SlicePipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { AppUser, Team, TeamMember, TeamType, Visit } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { EmptyStateComponent } from '../shared/empty-state.component';
import { ListCardComponent } from '../shared/list-card.component';

const teamTypes: Array<{ value: TeamType; label: string }> = [
  { value: 'EVANGELISM', label: 'Evangelismo' },
  { value: 'SUPPORT', label: 'Apoio' },
  { value: 'SOCIAL_ACTION', label: 'Acao social' },
  { value: 'CHILDREN', label: 'Infantil' },
  { value: 'KITCHEN', label: 'Cozinha' },
  { value: 'MUSIC', label: 'Musica' },
  { value: 'INTERCESSION', label: 'Intercessao' },
  { value: 'MEDIA', label: 'Midias' },
  { value: 'SECRETARIAT', label: 'Secretaria' },
  { value: 'FINANCE', label: 'Financeiro' },
  { value: 'OTHER', label: 'Outro' }
];

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [FormsModule, SlicePipe, ListCardComponent, EmptyStateComponent],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>{{ isAdmin() ? 'Equipes' : 'Minha equipe' }}</h1>
          @if (!isAdmin()) {
            <p class="muted">Veja aqui o lider e os integrantes vinculados a sua equipe.</p>
          }
        </div>
        @if (isAdmin()) {
          <button type="button" (click)="newTeam()">Nova equipe</button>
        }
      </div>

      <div class="teams-layout" [class.member-view]="!isAdmin()" [class.focused-mobile]="mobileFocusedTeam()">
        @if (isAdmin() && !mobileFocusedTeam()) {
          <form #teamForm="ngForm" class="editor" novalidate (ngSubmit)="save(teamForm)">
            <h2>{{ form.id ? 'Editar equipe' : 'Nova equipe' }}</h2>
            <label>Nome da equipe<input name="name" [(ngModel)]="form.name" required></label>
            <label>Tipo da equipe
              <select name="teamType" [(ngModel)]="form.teamType">
                @for (type of teamTypes; track type.value) {
                  <option [ngValue]="type.value">{{ type.label }}</option>
                }
              </select>
            </label>
            <label>Lider
              <select name="leaderId" [(ngModel)]="form.leaderId">
                <option [ngValue]="undefined">Sem lider</option>
                @for (leader of leaders(); track leader.id) {
                  <option [ngValue]="leader.id">{{ leader.name }}</option>
                }
              </select>
            </label>
            <label class="check-row">
              <input name="canRegisterVisits" type="checkbox" [(ngModel)]="form.canRegisterVisits">
              Esta equipe pode registrar visitas/evangelismo
            </label>
            @if (message()) {
              <p class="success">{{ message() }}</p>
            }
            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
            <button type="submit">Salvar</button>
          </form>

          <div class="table-wrap unified-list">
            @for (team of teams(); track team.id) {
              <app-list-card [title]="team.name" [interactive]="true" [selected]="selectedTeam()?.id === team.id"
                [actions]="[{ id: 'view', label: 'Visualizar', icon: 'open' }, { id: 'edit', label: 'Editar', icon: 'edit' }]"
                [infos]="[{ icon: 'service', text: teamTypeLabel(team.teamType) }, { icon: 'person', text: team.leaderName || '-' }, { icon: 'groups', text: membersOf(team).length + ' integrante(s)' }]"
                (activate)="selectTeam(team)" (action)="handleTeamAction($event, team)" />
            } @empty { <app-empty-state message="Nenhuma equipe encontrada." /> }
          </div>
        }

        <aside class="detail-card">
          @if (selectedTeam(); as team) {
            <div class="detail-head">
              <div>
                <h2>{{ team.name }}</h2>
                <span>Lider: {{ team.leaderName || 'Sem lider definido' }}</span>
                <span>Tipo: {{ teamTypeLabel(team.teamType) }} | {{ team.canRegisterVisits ? 'Registra visitas' : 'Equipe de apoio' }}</span>
              </div>
              @if (isAdmin()) {
                <div class="actions">
                  @if (mobileFocusedTeam()) {
                    <button type="button" class="secondary" (click)="backToTeams()">Voltar para equipes</button>
                  }
                  <button type="button" class="secondary" (click)="edit(team)">Editar</button>
                </div>
              }
            </div>

            <div class="metric-grid compact">
              <div class="metric"><span>Integrantes</span><strong>{{ membersOf(team).length }}</strong></div>
              @if (isEvangelismTeam(team)) {
                <div class="metric"><span>Casas visitadas</span><strong>{{ teamVisits().length }}</strong></div>
                <div class="metric"><span>Aceitam visitas</span><strong>{{ acceptedVisits() }}</strong></div>
              }
            </div>

            <section class="detail-section">
              <h2>Integrantes</h2>
              <div class="unified-list">
                @for (member of membersOf(team); track member.id) {
                  <app-list-card [title]="member.name" [state]="memberIsLeader(member) ? 'Líder' : ''"
                    [infos]="[{ icon: 'email', text: member.email }, { icon: 'status', text: memberIsLeader(member) ? 'Líder da equipe' : roleNames(member.roles) }]" />
                } @empty { <app-empty-state message="Nenhum usuário vinculado a esta equipe." /> }
              </div>
            </section>

            @if (isEvangelismTeam(team)) {
              <section class="detail-section">
                <h2>Ultimas visitas</h2>
                <div class="unified-list">
                  @for (visit of teamVisits() | slice:0:8; track visit.id) {
                    <app-list-card [title]="visit.personName"
                      [infos]="[{ icon: 'location', text: visit.neighborhood || visit.manualAddress || visit.city }, { icon: 'volunteer', text: visit.responsibleUserName || '-' }]" />
                  } @empty { <app-empty-state message="Nenhuma visita registrada para esta equipe." /> }
                </div>
              </section>
            } @else {
              <section class="detail-section">
                <h2>Indicadores da equipe</h2>
                <p class="muted">Esta area tera metricas proprias para {{ teamTypeLabel(team.teamType).toLowerCase() }} em uma proxima etapa.</p>
              </section>
            }
          } @else {
            <p class="muted">{{ isAdmin() ? 'Clique em uma equipe para ver integrantes, lider e visitas relacionadas.' : 'Nenhuma equipe vinculada ao seu usuario.' }}</p>
          }
        </aside>
      </div>
    </section>
  `
})
export class TeamsComponent implements OnInit {
  teams = signal<Team[]>([]);
  users = signal<AppUser[]>([]);
  myTeamMembers = signal<TeamMember[]>([]);
  selectedTeam = signal<Team | null>(null);
  mobileFocusedTeam = signal(false);
  teamVisits = signal<Visit[]>([]);
  message = signal('');
  error = signal('');
  form: Team = this.blank();
  teamTypes = teamTypes;

  constructor(private api: ApiService, public auth: AuthService, private notifications: NotificationService) {}

  ngOnInit(): void {
    if (this.isAdmin()) {
      this.load();
      this.loadUsers();
      return;
    }
    this.loadMyTeam();
  }

  load(): void {
    this.api.teams().subscribe((teams) => {
      this.teams.set(teams);
      const selected = this.selectedTeam();
      if (selected) {
        this.selectedTeam.set(teams.find((team) => team.id === selected.id) ?? null);
      }
    });
  }

  loadUsers(): void {
    this.api.users({ page: 0, size: 100 }).subscribe((page) => this.users.set(page.items));
  }

  leaders(): AppUser[] {
    return this.users().filter((user) => user.active && !user.roles.includes('admin'));
  }

  membersOf(team: Team): Array<AppUser | TeamMember> {
    if (!this.isAdmin()) {
      return this.myTeamMembers();
    }
    return this.users().filter((user) => user.teamId === team.id || user.additionalTeamIds?.includes(team.id ?? -1));
  }

  acceptedVisits(): number {
    return this.teamVisits().filter((visit) => visit.wantsVisits).length;
  }

  isEvangelismTeam(team: Team): boolean {
    return team.teamType === 'EVANGELISM';
  }

  selectTeam(team: Team): void {
    this.selectedTeam.set(team);
    this.form = { ...team };
    this.message.set('');
    this.error.set('');
    this.mobileFocusedTeam.set(this.isCompactScreen());
    this.loadTeamVisits(team);
    if (this.mobileFocusedTeam()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  handleTeamAction(action: string, team: Team): void {
    if (action === 'edit') this.edit(team);
    else this.selectTeam(team);
  }

  isAdmin(): boolean {
    return !!this.auth.user()?.roles.includes('admin');
  }

  edit(team: Team): void {
    this.form = { ...team };
    this.message.set('');
    this.error.set('');
    this.mobileFocusedTeam.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  newTeam(): void {
    this.form = this.blank();
    this.selectedTeam.set(null);
    this.teamVisits.set([]);
    this.mobileFocusedTeam.set(false);
    this.message.set('');
    this.error.set('');
  }

  backToTeams(): void {
    this.mobileFocusedTeam.set(false);
  }

  save(form: NgForm): void {
    this.message.set('');
    this.error.set('');
    if (form.invalid) {
      this.fail('Informe o nome da equipe antes de salvar.');
      return;
    }
    const editing = !!this.form.id;
    const action = this.form.id ? this.api.updateTeam(this.form) : this.api.createTeam(this.form);
    action.subscribe({
      next: () => {
        this.ok(editing ? 'Equipe atualizada com sucesso.' : 'Equipe salva com sucesso.');
        this.form = this.blank();
        this.load();
        this.loadUsers();
      },
      error: (response: HttpErrorResponse) => this.fail(this.errorMessage(response))
    });
  }

  private blank(): Team {
    return { name: '', teamType: 'EVANGELISM', canRegisterVisits: true };
  }

  teamTypeLabel(value: TeamType): string {
    return this.teamTypes.find((type) => type.value === value)?.label || value;
  }

  private loadTeamVisits(team: Team): void {
    if (!team.id || !this.isEvangelismTeam(team)) {
      this.teamVisits.set([]);
      return;
    }
    this.api.visits({ page: 0, size: 100, teamId: team.id }).subscribe((page) => this.teamVisits.set(page.items));
  }

  private loadMyTeam(): void {
    this.api.myTeam().subscribe({
      next: (detail) => {
        this.teams.set([detail.team]);
        this.selectedTeam.set(detail.team);
        this.myTeamMembers.set(detail.members);
        this.loadTeamVisits(detail.team);
      },
      error: (response: HttpErrorResponse) => this.fail(this.errorMessage(response))
    });
  }

  private isCompactScreen(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches;
  }

  roleNames(roles: string[]): string {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      lider: 'Lider',
      projetista: 'Projetista'
    };
    return roles.map((role) => labels[role] || role).join(', ');
  }

  memberIsLeader(member: AppUser | TeamMember): boolean {
    return 'leader' in member ? member.leader : this.selectedTeam()?.leaderId === member.id;
  }

  private errorMessage(response: HttpErrorResponse): string {
    if (response.status === 401) {
      return 'Sua sessao expirou. Faca login novamente.';
    }
    const body = response.error;
    if (body?.detail) {
      return body.detail;
    }
    if (body?.errors) {
      return Object.values(body.errors).join(' ');
    }
    if (body?.violations?.length) {
      return body.violations.map((violation: { message: string }) => violation.message).join(' ');
    }
    return 'Nao foi possivel salvar a equipe. Revise os campos e tente novamente.';
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
