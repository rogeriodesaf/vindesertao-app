import { Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { NotificationService } from './core/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <ng-container>
      @if (auth.user(); as user) {
        <header class="topbar">
          <a class="brand" routerLink="/visits" (click)="closeMenu()" aria-label="Vinde Sertao">
            <img src="/assets/logo-vinde-sertao.webp" alt="">
            <span>Vinde Sertao</span>
          </a>
          <button type="button" class="menu-toggle secondary" [attr.aria-expanded]="menuOpen()" aria-controls="main-menu" (click)="toggleMenu()">
            <span></span>
            <span></span>
            <span></span>
            Menu
          </button>
          <nav id="main-menu" [class.open]="menuOpen()">
            <a routerLink="/visits" (click)="closeMenu()">Mapa</a>
            @if (user.roles.includes('admin') || user.roles.includes('lider') || user.canViewReports || user.canRegisterVisits) {
              <a routerLink="/dashboard" (click)="closeMenu()">Dashboard</a>
            }
            <a routerLink="/social-assistance" (click)="closeMenu()">Ação Social</a>
            <a routerLink="/evangelistic-support" (click)="closeMenu()">Apoio Evangelístico</a>
            @if (user.roles.includes('admin') || user.canAccessFinance) {
              <a routerLink="/finance" (click)="closeMenu()">Financeiro</a>
            }
            @if (user.roles.includes('admin')) {
              <a routerLink="/teams" (click)="closeMenu()">Equipes</a>
              <a routerLink="/users" (click)="closeMenu()">Usuarios</a>
              <a routerLink="/territories" (click)="closeMenu()">Territorios</a>
              <a routerLink="/duplicates" (click)="closeMenu()">Duplicidades</a>
              <a routerLink="/audit" (click)="closeMenu()">Auditoria</a>
            } @else if (user.teamId || user.canRegisterVisits || user.canViewReports) {
              <a routerLink="/teams" (click)="closeMenu()">Minha equipe</a>
            }
          </nav>
          <div class="session">
            <span>{{ user.name }}</span>
            <button type="button" class="icon-button" title="Sair" (click)="auth.logout()">Sair</button>
          </div>
        </header>
      }
      <main>
        <router-outlet />
      </main>
      @if (auth.user()) {
        <a class="support-fab" routerLink="/evangelistic-support" (click)="closeMenu()" aria-label="Abrir apoio evangelístico">
          <strong>?</strong>
          <span>Apoio</span>
        </a>
      }
      @if (notifications.notification(); as notification) {
        <div class="toast" [class.toast-success]="notification.type === 'success'" [class.toast-error]="notification.type === 'error'" [class.toast-info]="notification.type === 'info'" role="status" aria-live="polite">
          <strong>{{ notification.type === 'error' ? 'Atenção' : notification.type === 'success' ? 'Tudo certo' : 'Aviso' }}</strong>
          <span>{{ notification.message }}</span>
          <button type="button" class="toast-close" aria-label="Fechar mensagem" (click)="notifications.clear()">×</button>
        </div>
      }
      <footer class="app-footer">
        © 2026 Desenvolvido por Rogério de Sá - Analista de Sistemas com pós-graduação em Engenharia de Software
      </footer>
    </ng-container>
  `
})
export class AppComponent {
  menuOpen = signal(false);

  constructor(public auth: AuthService, public notifications: NotificationService) {}

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
