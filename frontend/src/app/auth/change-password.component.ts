import { Component, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { NotificationService } from '../core/notification.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="login-shell">
      <form #passwordForm="ngForm" class="login-panel" novalidate (ngSubmit)="submit(passwordForm)">
        <h1>Troque sua senha</h1>
        <p class="muted">Por seguranca, o primeiro acesso exige a criacao de uma senha propria.</p>
        <label>Senha atual
          <input name="currentPassword" type="password" [(ngModel)]="currentPassword" autocomplete="current-password" required>
        </label>
        <label>Nova senha
          <input name="newPassword" type="password" minlength="8" [(ngModel)]="newPassword" autocomplete="new-password" required>
        </label>
        <label>Confirmar nova senha
          <input name="confirmPassword" type="password" minlength="8" [(ngModel)]="confirmPassword" autocomplete="new-password" required>
        </label>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button type="submit">Salvar nova senha</button>
        <button type="button" class="secondary" (click)="auth.logout()">Sair</button>
      </form>
    </section>
  `
})
export class ChangePasswordComponent {
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  error = signal('');

  constructor(public auth: AuthService, private router: Router, private notifications: NotificationService) {}

  submit(form: NgForm): void {
    this.error.set('');
    if (form.invalid) {
      this.fail('Informe a senha atual e uma nova senha com pelo menos 8 caracteres.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.fail('A confirmação precisa ser igual à nova senha.');
      return;
    }
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.notifications.success('Senha alterada com sucesso.');
        this.router.navigateByUrl('/visits');
      },
      error: (response: HttpErrorResponse) => this.fail(this.errorMessage(response))
    });
  }

  private errorMessage(response: HttpErrorResponse): string {
    const body = response.error;
    if (body?.detail) {
      return body.detail;
    }
    if (body?.violations?.length) {
      return body.violations.map((violation: { message: string }) => violation.message).join(' ');
    }
    return 'Nao foi possivel trocar a senha. Revise os campos e tente novamente.';
  }

  private fail(message: string): void {
    this.error.set(message);
    this.notifications.error(message);
  }
}
