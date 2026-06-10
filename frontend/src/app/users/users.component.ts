import { Component, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { SlicePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { formatDateTime } from '../core/date-format';
import { AppUser, Role, Team, UserSummary, UserTeamHistory } from '../core/models';
import { NotificationService } from '../core/notification.service';

const roles: Role[] = ['admin', 'lider', 'projetista'];

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, SlicePipe],
  template: `
    <section class="page users-page">
      <div class="page-head">
        <h1>Usuarios</h1>
        <button type="button" (click)="newUser()">Novo usuario</button>
      </div>

      @if (summary(); as data) {
        <div class="profile-summary">
          <section>
            <h2>Pessoas por perfil</h2>
            @for (item of data.byRole; track item.label) {
              <div class="bar-row"><span>{{ item.label }}</span><strong>{{ item.total }}</strong></div>
            }
          </section>
          <section>
            <h2>Pessoas por area principal</h2>
            @for (item of data.byPrimaryTeamType; track item.label) {
              <div class="bar-row"><span>{{ item.label }}</span><strong>{{ item.total }}</strong></div>
            }
          </section>
          <section>
            <h2>Acessos operacionais</h2>
            @for (item of data.byAccess; track item.label) {
              <div class="bar-row"><span>{{ item.label }}</span><strong>{{ item.total }}</strong></div>
            }
          </section>
        </div>
      }

      <div class="split">
        <form #userForm="ngForm" class="editor" novalidate (ngSubmit)="save(userForm)">
          <h2>{{ form.id ? 'Editar usuario' : 'Novo usuario' }}</h2>
          <label>Nome<input name="name" [(ngModel)]="form.name" required></label>
          <label>E-mail<input name="email" type="email" [(ngModel)]="form.email" required [disabled]="!!form.id"></label>
          <label>Senha<input name="password" type="password" minlength="8" [(ngModel)]="form.password" [required]="!form.id"></label>
          <p class="muted">Ao criar usuario ou redefinir senha, ele sera obrigado a trocar a senha no proximo acesso.</p>
          <label>Equipe
            <select name="teamId" [(ngModel)]="form.teamId" (ngModelChange)="syncVisitPermissionWithTeam()">
              <option [ngValue]="undefined">Sem equipe</option>
              @for (team of teams(); track team.id) {
                <option [ngValue]="team.id">{{ team.name }}</option>
              }
            </select>
          </label>
          <section class="role-box">
            <h2>Vinculos adicionais</h2>
            <p class="muted">Use para pessoas da acao social, musica ou apoio que tambem evangelizam em outra equipe.</p>
            @for (team of teams(); track team.id) {
              @if (team.id !== form.teamId) {
                <label class="check-row">
                  <input type="checkbox" [checked]="isAdditionalTeamSelected(team)" (change)="toggleAdditionalTeam(team)">
                  {{ team.name }} - {{ team.canRegisterVisits ? 'evangelismo/visitas' : 'apoio' }}
                </label>
              }
            }
          </section>
          <div class="role-box">
            @for (role of availableRoles; track role) {
              <label class="check-row">
                <input type="checkbox" [checked]="form.roles.includes(role)" (change)="toggleRole(role)">
                {{ role }}
              </label>
            }
          </div>
          <label class="check-row"><input name="active" type="checkbox" [(ngModel)]="form.active"> Ativo</label>
          <label class="check-row"><input name="canRegisterVisits" type="checkbox" [(ngModel)]="form.canRegisterVisits"> Pode registrar visitas</label>
          <label class="check-row"><input name="canViewReports" type="checkbox" [(ngModel)]="form.canViewReports"> Pode ver relatórios da equipe</label>
          @if (message()) {
            <p class="success">{{ message() }}</p>
          }
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <button type="submit">Salvar</button>

          @if (form.id) {
            <section class="detail-section compact-history">
              <h2>Historico de equipe</h2>
              @for (entry of teamHistory(); track entry.id) {
                <div class="info-row">
                  <div>
                    <strong>{{ entry.oldTeamName || 'Sem equipe' }} -> {{ entry.newTeamName || 'Sem equipe' }}</strong>
                    <span>{{ entry.changedByEmail || '-' }}</span>
                  </div>
                  <small>{{ formatDate(entry.changedAt) }}</small>
                </div>
              } @empty {
                <p class="muted">Nenhuma troca de equipe registrada.</p>
              }
            </section>
          }
        </form>

        <div class="table-wrap">
          <div class="list-head">
            <div>
              <h2>{{ showInactive ? 'Todos os usuarios' : 'Usuarios ativos' }}</h2>
              <p class="muted">{{ total() }} usuario(s) {{ showInactive ? 'encontrados' : 'ativos' }}</p>
            </div>
            <div class="list-actions">
              <label class="check-row">
                <input name="showInactive" type="checkbox" [(ngModel)]="showInactive" (change)="toggleInactive()">
                Mostrar inativos
              </label>
              <label>Por pagina
                <select name="pageSize" [(ngModel)]="pageSize" (change)="changePageSize()">
                  <option [ngValue]="5">5</option>
                  <option [ngValue]="10">10</option>
                  <option [ngValue]="20">20</option>
                  <option [ngValue]="50">50</option>
                </select>
              </label>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Nome</th><th>E-mail</th><th>Equipe principal</th><th>Outras equipes</th><th>Permissoes</th><th>Acessos</th><th>Status</th><th>Senha</th></tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr (click)="edit(user)">
                  <td data-label="Nome">{{ user.name }}</td>
                  <td data-label="E-mail">{{ user.email }}</td>
                  <td data-label="Equipe principal">{{ user.teamName || '-' }}</td>
                  <td data-label="Outras equipes">{{ user.additionalTeamNames?.join(', ') || '-' }}</td>
                  <td data-label="Permissoes">{{ user.roles.join(', ') }}</td>
                  <td data-label="Acessos">{{ accessSummary(user) }}</td>
                  <td data-label="Status">{{ user.active ? 'Ativo' : 'Inativo' }}</td>
                  <td data-label="Senha">{{ user.mustChangePassword ? 'Troca pendente' : 'Definida' }}</td>
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
      </div>
    </section>
  `
})
export class UsersComponent implements OnInit {
  users = signal<AppUser[]>([]);
  teams = signal<Team[]>([]);
  message = signal('');
  error = signal('');
  pageIndex = signal(0);
  total = signal(0);
  totalPages = signal(1);
  teamHistory = signal<UserTeamHistory[]>([]);
  summary = signal<UserSummary | null>(null);
  showInactive = false;
  pageSize = 5;
  availableRoles = roles;
  form: AppUser = this.blank();

  constructor(private api: ApiService, private notifications: NotificationService) {}

  ngOnInit(): void {
    this.load();
    this.loadTeams();
    this.loadSummary();
  }

  load(): void {
    this.api.users({ page: this.pageIndex(), size: this.pageSize, includeInactive: this.showInactive }).subscribe((page) => {
      this.users.set(page.items);
      this.total.set(page.total);
      this.totalPages.set(Math.max(1, page.pages));
      if (this.pageIndex() >= page.pages && page.pages > 0) {
        this.pageIndex.set(page.pages - 1);
        this.load();
      }
    });
  }

  loadTeams(): void {
    this.api.teams().subscribe((teams) => this.teams.set(teams));
  }

  loadSummary(): void {
    this.api.userSummary().subscribe((summary) => this.summary.set(summary));
  }

  edit(user: AppUser): void {
    this.form = { ...user, password: '' };
    this.message.set('');
    this.error.set('');
    if (user.id) {
      this.api.userTeamHistory(user.id).subscribe((history) => this.teamHistory.set(history));
    }
  }

  newUser(): void {
    this.form = this.blank();
    this.teamHistory.set([]);
    this.message.set('');
    this.error.set('');
  }

  save(form: NgForm): void {
    this.message.set('');
    this.error.set('');
    if (form.invalid) {
      this.fail('Preencha nome, e-mail e uma senha com pelo menos 8 caracteres.');
      return;
    }
    if (this.form.roles.length === 0) {
      this.fail('Selecione pelo menos uma permissao para o usuario.');
      return;
    }
    const action = this.form.id ? this.api.updateUser(this.form) : this.api.createUser(this.form);
    action.subscribe({
      next: () => {
        this.ok(this.form.id ? 'Usuário atualizado com sucesso.' : 'Usuário salvo com sucesso.');
        this.form = this.blank();
        this.pageIndex.set(0);
        this.load();
        this.loadSummary();
      },
      error: (response: HttpErrorResponse) => this.fail(this.errorMessage(response))
    });
  }

  toggleRole(role: Role): void {
    this.form.roles = this.form.roles.includes(role)
      ? this.form.roles.filter((current) => current !== role)
      : [...this.form.roles, role];
  }

  isAdditionalTeamSelected(team: Team): boolean {
    return !!team.id && (this.form.additionalTeamIds || []).includes(team.id);
  }

  toggleAdditionalTeam(team: Team): void {
    if (!team.id) {
      return;
    }
    const current = this.form.additionalTeamIds || [];
    this.form.additionalTeamIds = current.includes(team.id)
      ? current.filter((id) => id !== team.id)
      : [...current, team.id];
  }

  previousPage(): void {
    if (this.pageIndex() === 0) {
      return;
    }
    this.pageIndex.update((page) => page - 1);
    this.load();
  }

  nextPage(): void {
    if (this.pageIndex() + 1 >= this.totalPages()) {
      return;
    }
    this.pageIndex.update((page) => page + 1);
    this.load();
  }

  changePageSize(): void {
    this.pageIndex.set(0);
    this.load();
  }

  toggleInactive(): void {
    this.pageIndex.set(0);
    this.load();
  }

  private blank(): AppUser {
    return { name: '', email: '', password: '', roles: ['projetista'], active: true, canRegisterVisits: true, canViewReports: false, additionalTeamIds: [] };
  }

  accessSummary(user: AppUser): string {
    const access = [];
    if (user.canRegisterVisits) {
      access.push('visitas');
    }
    if (user.canViewReports) {
      access.push('relatórios');
    }
    return access.length ? access.join(', ') : 'apoio';
  }

  formatDate(value?: string): string {
    return formatDateTime(value);
  }

  syncVisitPermissionWithTeam(): void {
    const team = this.teams().find((current) => current.id === this.form.teamId);
    if (team && !team.canRegisterVisits) {
      this.form.canRegisterVisits = false;
    }
    this.form.additionalTeamIds = (this.form.additionalTeamIds || []).filter((id) => id !== this.form.teamId);
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
    return 'Nao foi possivel salvar o usuario. Revise os campos e tente novamente.';
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
