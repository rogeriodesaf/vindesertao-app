import { Component, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="login-shell">
      <form class="login-panel" (ngSubmit)="submit()">
        <div class="login-logo">
          <img src="/assets/logo-vinde-sertao.webp" alt="Vinde Sertao">
        </div>
        <label>
          E-mail
          <input name="email" type="email" [(ngModel)]="email" autocomplete="username" required>
        </label>
        <div class="login-options">
          <a routerLink="/forgot-password">Esqueci minha senha</a>
          <button type="button" class="secondary theme-toggle compact" [attr.title]="theme.label()" (click)="theme.cycle()">
            <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path [attr.d]="theme.activeTheme() === 'dark' ? moonIcon : sunIcon"></path>
            </svg>
            {{ theme.label() }}
          </button>
        </div>
        <label>
          Senha
          <input name="password" type="password" [(ngModel)]="password" autocomplete="current-password" required>
        </label>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button type="submit" [disabled]="loading()">{{ loading() ? 'Entrando...' : 'Entrar' }}</button>
      </form>
    </section>
  `
})
export class LoginComponent {
  readonly sunIcon = 'M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z';
  readonly moonIcon = 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z';
  email = 'admin@vindesertao.local';
  password = 'Admin123!';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router, private notifications: NotificationService, public theme: ThemeService) {}

  submit(): void {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigateByUrl('/visits'),
      error: (response: HttpErrorResponse) => {
        const message = response.status === 401
          ? 'E-mail ou senha invalidos.'
          : 'Nao foi possivel conectar ao servidor. Tente novamente em instantes.';
        this.error.set(message);
        this.notifications.error(message);
        this.loading.set(false);
      }
    });
  }
}
