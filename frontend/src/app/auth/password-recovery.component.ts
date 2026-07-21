import { HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="login-shell">
      <form #recoveryForm="ngForm" class="login-panel" novalidate (ngSubmit)="submit(recoveryForm)">
        <div class="login-logo">
          <img src="/assets/logo-vinde-sertao.webp" alt="Vinde Sertão">
        </div>
        <div>
          <h1>{{ resetting ? 'Criar nova senha' : 'Recuperar senha' }}</h1>
          <p class="muted">{{ resetting ? 'Informe e confirme sua nova senha.' : 'Enviaremos um link temporário para o e-mail cadastrado.' }}</p>
        </div>

        @if (!resetting) {
          <label>E-mail<input name="email" type="email" inputmode="email" autocomplete="email" [(ngModel)]="email" required email></label>
        } @else if (!completed()) {
          <label>Nova senha<input name="newPassword" type="password" autocomplete="new-password" minlength="8" [(ngModel)]="newPassword" required></label>
          <label>Confirmar nova senha<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" [(ngModel)]="confirmPassword" required></label>
        }

        @if (message()) { <p class="success">{{ message() }}</p> }
        @if (error()) { <p class="error">{{ error() }}</p> }

        @if (!completed()) {
          <button type="submit" [disabled]="loading() || (resetting && !token)">
            {{ loading() ? 'Enviando...' : resetting ? 'Redefinir senha' : 'Enviar link' }}
          </button>
        }
        <a class="button secondary full" routerLink="/login">Voltar ao login</a>
        <button type="button" class="secondary theme-toggle compact" [attr.title]="theme.label()" (click)="theme.cycle()">
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path [attr.d]="theme.activeTheme() === 'dark' ? moonIcon : sunIcon"></path>
          </svg>
          {{ theme.label() }}
        </button>
      </form>
    </section>
  `
})
export class PasswordRecoveryComponent {
  readonly sunIcon = 'M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z';
  readonly moonIcon = 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z';
  readonly resetting: boolean;
  readonly token: string;
  email = '';
  newPassword = '';
  confirmPassword = '';
  loading = signal(false);
  completed = signal(false);
  message = signal('');
  error = signal('');

  constructor(
    private auth: AuthService,
    route: ActivatedRoute,
    private notifications: NotificationService,
    public theme: ThemeService
  ) {
    this.resetting = route.snapshot.routeConfig?.path === 'reset-password';
    this.token = route.snapshot.queryParamMap.get('token') || '';
    if (this.resetting && !this.token) this.error.set('Link de redefinição inválido ou incompleto.');
  }

  submit(form: NgForm): void {
    if (this.loading() || form.invalid) {
      if (form.invalid) this.fail('Revise os campos antes de continuar.');
      return;
    }
    this.error.set('');
    this.message.set('');
    if (this.resetting) {
      this.reset();
    } else {
      this.request();
    }
  }

  private request(): void {
    const generic = 'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.';
    this.loading.set(true);
    this.auth.forgotPassword(this.email).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => {
        this.completed.set(true);
        this.message.set(response.message || generic);
        this.notifications.info(this.message());
      },
      error: () => {
        this.completed.set(true);
        this.message.set(generic);
        this.notifications.info(generic);
      }
    });
  }

  private reset(): void {
    if (this.newPassword.length < 8) {
      this.fail('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.fail('A confirmação da senha não confere.');
      return;
    }
    this.loading.set(true);
    this.auth.resetPassword(this.token, this.newPassword, this.confirmPassword)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.completed.set(true);
          this.message.set(response.message);
          this.notifications.success(response.message);
        },
        error: (response: HttpErrorResponse) => this.fail(response.error?.detail || 'Não foi possível redefinir a senha. Solicite um novo link.')
      });
  }

  private fail(message: string): void {
    this.error.set(message);
    this.notifications.error(message);
  }
}
