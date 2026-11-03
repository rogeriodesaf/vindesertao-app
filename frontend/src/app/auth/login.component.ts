import { Component, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PublicEdition } from '../core/models';
import { NotificationService } from '../core/notification.service';
import { ThemeService } from '../core/theme.service';

const REMEMBERED_EMAIL_KEY = 'vinde.rememberedEmail';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="login-shell login-page">
      <button
        type="button"
        class="login-theme-toggle"
        [attr.title]="theme.label()"
        [attr.aria-label]="theme.label()"
        (click)="theme.cycle()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path [attr.d]="theme.activeTheme() === 'dark' ? moonIcon : sunIcon"></path>
        </svg>
      </button>

      <form class="login-panel" autocomplete="on" (ngSubmit)="submit()" [attr.aria-busy]="loading()">
        <div class="login-logo">
          <img src="/assets/logo-vinde-oficial-ajustada.png" alt="Vinde Sertão">
          @if (edition(); as activeEdition) {
            <p class="login-edition">{{ activeEdition.locality }} · {{ activeEdition.year }}</p>
          }
        </div>

        <label class="login-field">
          E-mail
          <input name="email" type="email" inputmode="email" autocapitalize="off" [spellcheck]="false" [(ngModel)]="email" autocomplete="username" required>
        </label>

        <label class="login-field">
          Senha
          <span class="password-field">
            <input
              name="password"
              [type]="visiblePassword() ? 'text' : 'password'"
              [(ngModel)]="password"
              autocomplete="current-password"
              required
            >
            <button
              type="button"
              class="password-toggle"
              [attr.aria-label]="visiblePassword() ? 'Ocultar senha' : 'Mostrar senha'"
              [attr.title]="visiblePassword() ? 'Ocultar senha' : 'Mostrar senha'"
              (click)="togglePassword()"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0Z"></path>
                <circle cx="12" cy="12" r="3"></circle>
                @if (visiblePassword()) {
                  <path class="password-toggle-slash" d="M3 3 21 21"></path>
                }
              </svg>
            </button>
          </span>
        </label>

        <label class="check-row">
          <input name="rememberEmail" type="checkbox" [(ngModel)]="rememberEmail">
          Lembrar meu e-mail
        </label>

        @if (error()) {
          <p class="error" role="alert">{{ error() }}</p>
        }

        <button type="submit" class="login-submit" [class.loading]="loading()" [disabled]="loading()">{{ loading() ? 'Entrando...' : 'Entrar' }}</button>
        <a class="login-forgot-link" routerLink="/forgot-password">Esqueci minha senha</a>
        <p class="login-first-access">Primeiro acesso? <a routerLink="/register">Criar conta</a></p>
      </form>
    </section>
  `
})
export class LoginComponent implements OnInit {
  readonly sunIcon = 'M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z';
  readonly moonIcon = 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z';
  email = '';
  password = '';
  rememberEmail = false;
  loading = signal(false);
  error = signal('');
  visiblePassword = signal(false);
  edition = signal<PublicEdition | null>(null);

  constructor(private api: ApiService, private auth: AuthService, private router: Router, private notifications: NotificationService, public theme: ThemeService) {
    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      this.email = rememberedEmail;
      this.rememberEmail = true;
    }
  }

  ngOnInit(): void {
    this.api.publicActiveEdition().subscribe({ next: edition => this.edition.set(edition), error: () => this.edition.set(null) });
  }

  togglePassword(): void {
    this.visiblePassword.update(visible => !visible);
  }

  submit(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.email, this.password).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        if (this.rememberEmail) localStorage.setItem(REMEMBERED_EMAIL_KEY, this.email.trim());
        else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        this.router.navigateByUrl('/visits');
      },
      error: (response: HttpErrorResponse) => {
        const message = response.status === 401
          ? 'E-mail ou senha inválidos.'
          : response.status === 0
            ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
            : 'Não foi possível entrar agora. Tente novamente em instantes.';
        this.error.set(message);
        this.notifications.error(message);
      }
    });
  }
}
