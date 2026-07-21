import { Injectable, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ActiveTheme = 'light' | 'dark';

const THEME_KEY = 'vinde.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  preference = signal<ThemePreference>(this.readPreference());
  activeTheme = signal<ActiveTheme>(this.resolve(this.preference()));
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.apply();
    this.media.addEventListener('change', () => {
      if (this.preference() === 'system') this.apply();
    });
  }

  cycle(): void {
    const next: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' };
    this.preference.set(next[this.preference()]);
    localStorage.setItem(THEME_KEY, this.preference());
    this.apply();
  }

  label(): string {
    const labels: Record<ThemePreference, string> = {
      system: `Automático (${this.activeTheme() === 'dark' ? 'escuro' : 'claro'})`,
      light: 'Tema claro',
      dark: 'Tema escuro'
    };
    return labels[this.preference()];
  }

  private apply(): void {
    const active = this.resolve(this.preference());
    this.activeTheme.set(active);
    document.documentElement.dataset['theme'] = active;
    document.documentElement.style.colorScheme = active;
    const semanticColor = getComputedStyle(document.documentElement)
      .getPropertyValue(active === 'dark' ? '--color-background' : '--color-primary')
      .trim();
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', semanticColor);
  }

  private resolve(preference: ThemePreference): ActiveTheme {
    if (preference === 'light' || preference === 'dark') return preference;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private readPreference(): ThemePreference {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  }
}
