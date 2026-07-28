import { Component, EventEmitter, Input, Output } from '@angular/core';

export type DateRangePreset = 'today' | '7days' | '30days' | 'month' | 'custom';

@Component({
  selector: 'app-date-range-filter',
  standalone: true,
  template: `
    <section class="date-range-filter" aria-label="Filtro por período" [attr.data-preset]="preset">
      <div class="date-range-chips" role="group" aria-label="Períodos rápidos">
        <button type="button" [class.active]="preset === 'today'" [attr.aria-pressed]="preset === 'today'"
          [disabled]="loading" (click)="choosePreset('today')">Hoje</button>
        <button type="button" [class.active]="preset === '7days'" [attr.aria-pressed]="preset === '7days'"
          [disabled]="loading" (click)="choosePreset('7days')">Últimos 7 dias</button>
        <button type="button" [class.active]="preset === '30days'" [attr.aria-pressed]="preset === '30days'"
          [disabled]="loading" (click)="choosePreset('30days')">Últimos 30 dias</button>
        <button type="button" [class.active]="preset === 'month'" [attr.aria-pressed]="preset === 'month'"
          [disabled]="loading" (click)="choosePreset('month')">Este mês</button>
        <button type="button" [class.active]="preset === 'custom'" [attr.aria-pressed]="preset === 'custom'"
          [attr.aria-expanded]="preset === 'custom'" aria-controls="custom-date-range"
          [disabled]="loading" (click)="choosePreset('custom')">Personalizado</button>
      </div>
      @if (preset === 'custom') {
        <div id="custom-date-range" class="date-range-custom">
          <label>Data inicial
            <input type="date" [disabled]="loading" [value]="datePart(from)"
              (change)="setCustomFrom($any($event.target).value)">
          </label>
          <label>Data final
            <input type="date" [disabled]="loading" [value]="datePart(to)"
              (change)="setCustomTo($any($event.target).value)">
          </label>
        </div>
      }
      <div class="date-range-actions">
        <button type="button" class="secondary" [disabled]="loading" (click)="clearDates()">Limpar</button>
        <button type="button" [class.loading]="loading" [disabled]="loading" (click)="filter.emit()">
          {{ loading ? 'Filtrando...' : 'Filtrar' }}
        </button>
      </div>
    </section>
  `
})
export class DateRangeFilterComponent {
  @Input() from = '';
  @Input() to = '';
  @Input() valueMode: 'date' | 'datetime' = 'datetime';
  @Input() loading = false;
  @Output() fromChange = new EventEmitter<string>();
  @Output() toChange = new EventEmitter<string>();
  @Output() filter = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  preset: DateRangePreset = 'custom';

  choosePreset(preset: DateRangePreset): void {
    this.preset = preset;
    if (preset === 'custom') return;
    const end = this.startOfDay(new Date());
    const start = new Date(end);
    if (preset === '7days') start.setDate(start.getDate() - 6);
    if (preset === '30days') start.setDate(start.getDate() - 29);
    if (preset === 'month') start.setDate(1);
    this.setDates(this.toIsoDate(start), this.toIsoDate(end));
  }

  setCustomFrom(value: string): void { this.from = this.outputValue(value, false); this.fromChange.emit(this.from); }
  setCustomTo(value: string): void { this.to = this.outputValue(value, true); this.toChange.emit(this.to); }

  clearDates(): void {
    this.preset = 'custom';
    this.setDates('', '');
    this.clear.emit();
  }

  datePart(value: string): string { return /^\d{4}-\d{2}-\d{2}/.test(value || '') ? value.slice(0, 10) : ''; }

  private setDates(from: string, to: string): void {
    this.from = this.outputValue(from, false);
    this.to = this.outputValue(to, true);
    this.fromChange.emit(this.from);
    this.toChange.emit(this.to);
  }

  private outputValue(date: string, end: boolean): string {
    if (!date) return '';
    return this.valueMode === 'datetime' ? `${date}T${end ? '23:59:59' : '00:00:00'}` : date;
  }

  private startOfDay(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  private toIsoDate(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
}
