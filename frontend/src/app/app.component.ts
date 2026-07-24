import { Component, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { NotificationService } from './core/notification.service';
import { ThemeService } from './core/theme.service';
import { AtualizacaoAppService } from './core/atualizacao-app.service';

interface NavItem {
  label: string;
  shortLabel: string;
  path: string;
  icon: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const icons = {
  map: 'M4 6.5 9 4l6 2.5L20 4v13.5L15 20l-6-2.5L4 20V6.5Zm5-2.5v13.5m6-11v13.5',
  chart: 'M5 19V9m7 10V5m7 14v-7M3 19h18',
  heart: 'M12 20s-8-4.7-8-10a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 5.3-8 10-8 10Z',
  help: 'M12 18h.01M9.1 9a3 3 0 1 1 4.6 2.5c-1 .7-1.7 1.2-1.7 2.5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  training: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Zm0 0v16M9 8h7m-7 4h7',
  money: 'M4 6h16v12H4V6Zm3 3h.01M17 15h.01M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  child: 'M12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 15v-5a6 6 0 0 1 12 0v5M8 13l-3-2m11 2 3-2',
  team: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87m-1-11.26a4 4 0 0 1 0 7.75',
  user: 'M20 21a8 8 0 0 0-16 0m8-9a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  territory: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  duplicate: 'M8 8h12v12H8V8ZM4 16V4h12',
  audit: 'M9 11h6m-6 4h4m4 6H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z'
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (auth.user(); as user) {
      <div class="app-shell">
        <aside class="desktop-sidebar" aria-label="Menu principal">
          <a class="brand" routerLink="/visits" aria-label="Vinde Sertão">
            <img src="/assets/logo-vinde-sertao.webp" alt="">
            <span>Vinde Sertão</span>
          </a>
          <nav class="sidebar-nav">
            @for (group of navGroups(); track group.label) {
              @if (group.items.length) {
                <section class="nav-group">
                  <strong>{{ group.label }}</strong>
                  @for (item of group.items; track item.path) {
                    <a [routerLink]="item.path" routerLinkActive="active">
                      <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon"></path></svg>
                      <span>{{ item.label }}</span>
                    </a>
                  }
                </section>
              }
            }
          </nav>
          <div class="sidebar-session">
            <div class="authenticated-user" title="{{ displayName() }} — {{ userRoleLabel() }}">
              <strong>{{ displayName() }}</strong>
              <span>{{ userRoleLabel() }}</span>
            </div>
            <button type="button" class="secondary theme-toggle" [attr.title]="theme.label()" (click)="theme.cycle()">
              <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path [attr.d]="theme.activeTheme() === 'dark' ? icons.moon : icons.sun"></path>
              </svg>
              <span>{{ theme.label() }}</span>
            </button>
            <button type="button" class="secondary" (click)="auth.logout()">Sair</button>
          </div>
        </aside>

        <div class="app-content">
          <header class="mobile-topbar">
            <a class="brand" routerLink="/visits" (click)="closeMenu()" aria-label="Vinde Sertão">
              <img src="/assets/logo-vinde-sertao.webp" alt="">
              <span class="mobile-brand-copy">
                <strong>Vinde Sertão</strong>
                <small title="{{ displayName() }} — {{ userRoleLabel() }}">{{ displayName() }} • {{ userRoleLabel() }}</small>
              </span>
            </a>
            <button type="button" class="secondary mobile-theme-toggle" [attr.aria-label]="theme.label()" [attr.title]="theme.label()" (click)="theme.cycle()">
              <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="theme.activeTheme() === 'dark' ? icons.moon : icons.sun"></path></svg>
            </button>
          </header>
          <main><router-outlet /></main>
          <footer class="app-footer">
            © {{ currentYear }} - Rogério de Sá - Engenharia de Softwares
          </footer>
        </div>
      </div>

      @if (menuOpen()) {
        <button type="button" class="mobile-menu-backdrop" aria-label="Fechar menu" (click)="closeMenu()"></button>
        <aside id="mobile-more-menu" class="mobile-more-menu" aria-label="Mais opções">
          <div class="mobile-more-head">
            <div><strong>Todos os módulos</strong><span>{{ user.name }}</span></div>
            <button type="button" class="secondary" aria-label="Fechar menu" (click)="closeMenu()">×</button>
          </div>
          @for (group of navGroups(); track group.label) {
            @if (group.items.length) {
              <section class="nav-group">
                <strong>{{ group.label }}</strong>
                @for (item of group.items; track item.path) {
                  <a [routerLink]="item.path" routerLinkActive="active" (click)="closeMenu()">
                    <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon"></path></svg>
                    <span>{{ item.label }}</span>
                  </a>
                }
              </section>
            }
          }
          <button type="button" class="secondary full" (click)="auth.logout()">Sair</button>
        </aside>
      }

      <nav class="mobile-bottom-nav" aria-label="Ações principais">
        @for (item of mobilePrimaryItems(); track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active" (click)="closeMenu()">
            <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="item.icon"></path></svg>
            <span>{{ item.shortLabel }}</span>
          </a>
        }
        <button type="button" [class.active]="menuOpen()" [attr.aria-expanded]="menuOpen()" aria-controls="mobile-more-menu" (click)="toggleMenu()">
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"></path></svg>
          <span>Mais</span>
        </button>
      </nav>
    } @else {
      <main><router-outlet /></main>
      <footer class="app-footer">
        © {{ currentYear }} - Rogério de Sá - Engenharia de Softwares
      </footer>
    }

    @if (notifications.notification(); as notification) {
      <div class="toast" [class.toast-success]="notification.type === 'success'" [class.toast-error]="notification.type === 'error'" [class.toast-warning]="notification.type === 'warning'" [class.toast-info]="notification.type === 'info'" role="status" [attr.aria-live]="notification.type === 'error' ? 'assertive' : 'polite'">
        <strong>{{ notification.type === 'error' ? 'Atenção' : notification.type === 'success' ? 'Tudo certo' : notification.type === 'warning' ? 'Alerta' : 'Aviso' }}</strong>
        <span>{{ notification.message }}</span>
        <button type="button" class="toast-close" aria-label="Fechar mensagem" (click)="notifications.clear()">×</button>
      </div>
    }

    @if (atualizacaoApp.novaVersaoDisponivel()) {
      <aside class="app-update-notice" role="status" aria-live="polite">
        <div>
          <strong>Nova versão disponível</strong>
          <span>Atualize para carregar a versão mais recente do Vinde Sertão.</span>
        </div>
        <button type="button" [disabled]="atualizacaoApp.atualizando()" (click)="atualizacaoApp.atualizarAgora()">
          {{ atualizacaoApp.atualizando() ? 'Atualizando...' : 'Atualizar agora' }}
        </button>
      </aside>
    }
  `
})
export class AppComponent {
  readonly currentYear = new Date().getFullYear();
  readonly icons = { ...icons, sun: 'M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z', moon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z' };
  menuOpen = signal(false);

  navGroups = computed<NavGroup[]>(() => {
    const user = this.auth.user();
    if (!user) {
      return [];
    }
    const isAdmin = user.roles.includes('admin');
    const canViewDashboard = isAdmin || user.roles.includes('lider') || user.canViewReports || user.canRegisterVisits;
    const canViewTeam = isAdmin || !!user.teamId || user.canRegisterVisits || user.canViewReports;
    return [
      { label: 'Campo', items: [
        this.item('Visitas e mapa', 'Visitas', '/visits', icons.map),
        this.item('Apoio evangelístico', 'Apoio', '/evangelistic-support', icons.help),
        this.item('Treinamento Missionário', 'Treinamento', '/missionary-training', icons.training)
      ] },
      { label: 'Departamentos', items: [
        this.item('Ação Social', 'Social', '/social-assistance', icons.heart),
        ...(isAdmin || user.canAccessFinance ? [this.item('Financeiro', 'Financeiro', '/finance', icons.money)] : []),
        ...(isAdmin || user.canAccessChildren ? [this.item('Infantil', 'Infantil', '/children', icons.child)] : [])
      ] },
      { label: 'Gestão', items: canViewTeam ? [this.item(isAdmin ? 'Equipes' : 'Minha equipe', 'Equipe', '/teams', icons.team)] : [] },
      { label: 'Relatórios', items: canViewDashboard ? [this.item('Dashboard', 'Relatórios', '/dashboard', icons.chart)] : [] },
      { label: 'Administração', items: isAdmin ? [
        this.item('Usuários', 'Usuários', '/users', icons.user),
        this.item('Territórios', 'Territórios', '/territories', icons.territory),
        this.item('Duplicidades', 'Duplicidades', '/duplicates', icons.duplicate),
        this.item('Auditoria', 'Auditoria', '/audit', icons.audit)
      ] : [] }
    ];
  });

  mobilePrimaryItems = computed(() => {
    const items = this.navGroups().flatMap((group) => group.items);
    const preferredPaths = ['/visits', '/dashboard', '/social-assistance', '/evangelistic-support'];
    return preferredPaths
      .map((path) => items.find((item) => item.path === path))
      .filter((item): item is NavItem => !!item)
      .slice(0, 4);
  });

  constructor(
    public auth: AuthService,
    public notifications: NotificationService,
    public theme: ThemeService,
    public atualizacaoApp: AtualizacaoAppService
  ) {}

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  displayName(): string {
    return this.auth.user()?.name?.trim() || 'Usuário';
  }

  userRoleLabel(): string {
    const roles = this.auth.user()?.roles || [];
    if (roles.includes('admin')) return 'Administrador';
    if (roles.includes('lider')) return 'Líder';
    if (roles.includes('projetista')) return 'Projetista';
    return 'Usuário';
  }

  private item(label: string, shortLabel: string, path: string, icon: string): NavItem {
    return { label, shortLabel, path, icon };
  }
}
