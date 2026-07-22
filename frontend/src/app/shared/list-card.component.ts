import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';

export interface ListCardInfo {
  icon: string;
  text: string | number | null | undefined;
  title?: string;
}

export interface ListCardAction {
  id: string;
  label: string;
  icon?: string;
  danger?: boolean;
}

const iconPaths: Record<string, string> = {
  person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  location: 'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  calendar: 'M6 2v3m12-3v3M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z',
  groups: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m7-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87m-1-11.26a4 4 0 0 1 0 7.75',
  service: 'M9 3h6v4h4v6h-4v4H9v-4H5V7h4V3Z',
  volunteer: 'M12 21s-8-4.7-8-10a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 11c0 5.3-8 10-8 10Z',
  description: 'M6 2h9l5 5v15H6V2Zm8 0v6h6M9 13h8m-8 4h8',
  phone: 'M5 3h4l2 5-2.5 1.5a15 15 0 0 0 6 6L16 13l5 2v4c0 1.1-.9 2-2 2A16 16 0 0 1 3 5c0-1.1.9-2 2-2Z',
  email: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
  home: 'm3 11 9-8 9 8v10h-6v-6H9v6H3V11Z',
  money: 'M4 6h16v12H4V6Zm8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  status: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-4-10 3 3 5-6',
  edit: 'm4 20 4-1 11-11-3-3L5 16l-1 4Z',
  open: 'M14 3h7v7m0-7L10 14M19 13v8H3V5h8'
};

@Component({
  selector: 'app-list-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="list-card" [class.list-card-interactive]="interactive" [class.list-card-selected]="selected"
      [style.--list-card-accent]="color || null" [attr.role]="interactive ? 'button' : null" [attr.tabindex]="interactive ? 0 : null"
      (click)="activate.emit()" (keydown)="onKeydown($event)">
      <header>
        <h3>{{ title }}</h3>
        @if (state) { <span class="list-card-state">{{ state }}</span> }
        @if (actions.length) {
          <button type="button" class="list-card-menu-button" aria-label="Abrir ações" title="Ações"
            [attr.aria-expanded]="menuOpen()" (click)="toggleMenu($event)">⋮</button>
          @if (menuOpen()) {
            <div class="list-card-menu" role="menu">
              @for (item of actions; track item.id) {
                <button type="button" role="menuitem" [class.danger]="item.danger" (click)="choose(item.id, $event)">
                  @if (item.icon) { <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="icon(item.icon)"></path></svg> }
                  {{ item.label }}
                </button>
              }
            </div>
          }
        }
      </header>
      <div class="list-card-content">
        @for (info of infos; track $index) {
          @if (info.text !== null && info.text !== undefined && info.text !== '') {
            <div class="list-card-info" [attr.title]="info.title || null">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="icon(info.icon)"></path></svg>
              <span>{{ info.text }}</span>
            </div>
          }
        }
      </div>
    </article>
  `
})
export class ListCardComponent {
  @Input({ required: true }) title = '';
  @Input() infos: ListCardInfo[] = [];
  @Input() actions: ListCardAction[] = [];
  @Input() state = '';
  @Input() color = '';
  @Input() interactive = false;
  @Input() selected = false;
  @Output() activate = new EventEmitter<void>();
  @Output() action = new EventEmitter<string>();
  menuOpen = signal(false);

  icon(name: string): string { return iconPaths[name] || iconPaths['description']; }
  toggleMenu(event: Event): void { event.stopPropagation(); this.menuOpen.update(open => !open); }
  choose(id: string, event: Event): void { event.stopPropagation(); this.menuOpen.set(false); this.action.emit(id); }
  onKeydown(event: KeyboardEvent): void {
    if (event.target === event.currentTarget && this.interactive && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.activate.emit();
    }
  }
}
