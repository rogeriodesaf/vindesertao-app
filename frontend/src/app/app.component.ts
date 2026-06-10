import { Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

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
      <footer class="app-footer">
        © 2026 Desenvolvido por Rogério de Sá - Analista de Sistemas com pós-graduação em Engenharia de Software
      </footer>
    </ng-container>
  `
})
export class AppComponent {
  menuOpen = signal(false);

  constructor(public auth: AuthService) {}

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
