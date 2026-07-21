import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

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

  warning(message: string): void {
    this.show('warning', message);
  }

  clear(): void {
    if (this.timer) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.notification.set(null);
  }

  private show(type: NotificationType, message: string): void {
    const current = this.notification();
    if (current?.type === type && current.message === message) {
      return;
    }
    this.clear();
    this.notification.set({ type, message });
    const offlineRelated = /offline|internet|aparelho|sincroniz/i.test(message);
    const duration = type === 'error' ? 9000 : type === 'warning' || offlineRelated ? 7000 : type === 'info' ? 5000 : 4200;
    this.timer = window.setTimeout(() => {
      this.notification.set(null);
      this.timer = undefined;
    }, duration);
  }
}
