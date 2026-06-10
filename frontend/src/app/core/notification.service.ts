import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface AppNotification {
  type: NotificationType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  notification = signal<AppNotification | null>(null);
  private timer?: number;

  success(message: string): void {
    this.show('success', message);
  }

  error(message: string): void {
    this.show('error', message);
  }

  info(message: string): void {
    this.show('info', message);
  }

  clear(): void {
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.notification.set(null);
  }

  private show(type: NotificationType, message: string): void {
    this.clear();
    this.notification.set({ type, message });
    this.timer = window.setTimeout(() => this.notification.set(null), 4200);
  }
}
