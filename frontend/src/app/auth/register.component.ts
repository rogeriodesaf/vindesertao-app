import { Component, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <section class="login-shell login-page">
      <button type="button" class="login-theme-toggle" [attr.title]="theme.label()" [attr.aria-label]="theme.label()" (click)="theme.cycle()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="theme.activeTheme() === 'dark' ? moonIcon : sunIcon"></path></svg>
      </button>
      <form class="login-panel" autocomplete="on" (ngSubmit)="submit()">
        <div class="login-logo"><img src="/assets/logo-vinde-sertao.webp" alt="Vinde Sertão"></div>
        <h1>Criar conta</h1>
        <p class="muted login-help">Crie sua conta para acessar o mapa, o apoio evangelístico e os vídeos. O administrador poderá liberar outras funções depois.</p>
        <label class="login-field">Nome<input name="name" [(ngModel)]="name" autocomplete="name" maxlength="160" required></label>
        <label class="login-field">E-mail<input name="email" type="email" [(ngModel)]="email" autocomplete="email" maxlength="180" required></label>
        <label class="login-field">Senha<input name="password" type="password" [(ngModel)]="password" autocomplete="new-password" minlength="8" required></label>
        <label class="login-field">Confirmar senha<input name="confirmation" type="password" [(ngModel)]="confirmation" autocomplete="new-password" minlength="8" required></label>
        @if (error()) { <p class="error">{{ error() }}</p> }
        <button type="submit" class="login-submit" [disabled]="loading()">{{ loading() ? 'Enviando...' : 'Criar conta' }}</button>
        <a class="login-forgot-link" routerLink="/login">Já tenho uma conta</a>
      </form>
    </section>`
})
export class RegisterComponent {
  readonly sunIcon = 'M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z';
  readonly moonIcon = 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z';
  name = ''; email = ''; password = ''; confirmation = '';
  loading = signal(false); error = signal('');
  constructor(private auth: AuthService, private router: Router, private notifications: NotificationService, public theme: ThemeService) {}
  submit(): void {
    if (this.loading()) return;
    this.error.set('');
    if (this.password.length < 8) { this.error.set('A senha deve ter pelo menos 8 caracteres.'); return; }
    if (this.password !== this.confirmation) { this.error.set('As senhas não coincidem.'); return; }
    this.loading.set(true);
    this.auth.register(this.name, this.email, this.password).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: () => {
        this.notifications.success('Conta criada com sucesso.');
        this.router.navigateByUrl('/visits');
      },
      error: (response: HttpErrorResponse) => {
        this.error.set(this.registrationError(response));
        this.notifications.error(this.error());
      }
    });
  }

  private registrationError(response: HttpErrorResponse): string {
    if (response.status === 0) return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
    if (response.status === 409) return 'Este e-mail já possui cadastro. Tente entrar ou recuperar sua senha.';
    if (response.status === 400 || response.status === 422) {
      const detail = response.error?.detail || response.error?.message;
      return detail || 'Revise nome, e-mail e senha e tente novamente.';
    }
    if (response.status === 404) return 'O serviço de cadastro está temporariamente indisponível. Tente novamente mais tarde.';
    return 'Não foi possível criar a conta agora. Tente novamente em instantes.';
  }
}
