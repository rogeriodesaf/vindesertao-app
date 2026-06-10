import { Component, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
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
  email = 'admin@vindesertao.local';
  password = 'Admin123!';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router, private notifications: NotificationService) {}

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
