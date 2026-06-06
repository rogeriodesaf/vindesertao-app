import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponse, Role, UserPrincipal } from './models';

const TOKEN_KEY = 'vinde.token';
const USER_KEY = 'vinde.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  user = signal<UserPrincipal | null>(this.readUser());

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, { email: email.trim(), password }).pipe(
      tap((response) => this.setSession(response))
    );
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/change-password`, { currentPassword, newPassword }).pipe(
      tap((response) => this.setSession(response))
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }

  expireSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  hasAnyRole(roles: Role[]): boolean {
    const current = this.user();
    return !!current && roles.some((role) => current.roles.includes(role));
  }

  private setSession(response: LoginResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.user.set(response.user);
  }

  private readUser(): UserPrincipal | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as UserPrincipal : null;
  }
}
