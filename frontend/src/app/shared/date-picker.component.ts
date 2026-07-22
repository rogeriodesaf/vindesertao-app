import { Component, ElementRef, EventEmitter, forwardRef, Input, Output, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator, AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [FormsModule],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePickerComponent), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => DatePickerComponent), multi: true }
  ],
  template: `
    <div class="date-picker-group" [class.date-picker-disabled]="disabled" [class.date-picker-invalid]="showInvalid()" [class.date-picker-with-time]="withTime">
      <div class="date-picker-field" (click)="openCalendar()">
        <input #displayInput class="date-picker-display" type="text" inputmode="numeric" autocomplete="off"
          placeholder="dd/mm/aaaa" maxlength="10" [disabled]="disabled" [value]="displayValue"
          [attr.aria-label]="ariaLabel" [attr.aria-invalid]="showInvalid()" [attr.aria-describedby]="showInvalid() ? errorId : null"
          (input)="onTextInput($event)" (blur)="onBlur()" (keydown.enter)="commitText(); $event.preventDefault()" />
        <button type="button" class="date-picker-calendar" [disabled]="disabled" aria-label="Abrir calendário" (click)="$event.stopPropagation(); openCalendar()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2v3m12-3v3M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z"></path></svg>
        </button>
        <input #nativeInput class="date-picker-native" type="date" tabindex="-1" [disabled]="disabled" [value]="dateValue" [min]="min" [max]="max" (change)="selectNativeDate($event)" />
      </div>
      @if (withTime) {
        <label class="date-picker-time"><span>Horário</span><input type="time" [disabled]="disabled || !dateValue" [value]="timeValue" (change)="selectTime($event)"></label>
      }
    </div>
    @if (showInvalid()) { <small class="date-picker-error" [id]="errorId" role="alert">{{ validationMessage }}</small> }
  `
})
export class DatePickerComponent implements ControlValueAccessor, Validator {
  private static nextId = 1;
  @Input() ariaLabel = 'Selecionar data';
  @Input() required = false;
  @Input() disabled = false;
  @Input() withTime = false;
  @Input() min = '';
  @Input() max = '';
  @Input() validationMessage = 'Data inválida. Use o formato dd/mm/aaaa.';
  @Output() dateChange = new EventEmitter<string>();
  @ViewChild('nativeInput') nativeInput?: ElementRef<HTMLInputElement>;

  readonly errorId = `date-error-${DatePickerComponent.nextId++}`;
  displayValue = '';
  dateValue = '';
  timeValue = '00:00';
  touched = false;
  parseError = false;
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private onValidatorChange: () => void = () => undefined;

  writeValue(value: string | null | undefined): void {
    const normalized = typeof value === 'string' ? value : '';
    this.dateValue = /^\d{4}-\d{2}-\d{2}/.test(normalized) ? normalized.slice(0, 10) : '';
    this.timeValue = this.withTime && normalized.length >= 16 ? normalized.slice(11, 16) : '00:00';
    this.displayValue = this.formatBrazilian(this.dateValue);
    this.parseError = !!normalized && !this.dateValue;
  }

  registerOnChange(fn: (value: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  registerOnValidatorChange(fn: () => void): void { this.onValidatorChange = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }

  validate(_: AbstractControl): ValidationErrors | null {
    if (this.required && !this.dateValue) return { required: true };
    if (this.parseError || (this.dateValue && !this.isValidIso(this.dateValue))) return { date: true };
    return null;
  }

  showInvalid(): boolean { return this.touched && !!this.validate({} as AbstractControl); }

  openCalendar(): void {
    if (this.disabled || !this.nativeInput) return;
    const input = this.nativeInput.nativeElement;
    try { input.showPicker(); } catch { input.click(); }
  }

  onTextInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    this.displayValue = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join('/');
    input.value = this.displayValue;
    if (digits.length === 8) this.commitText();
    else {
      this.dateValue = '';
      this.parseError = false;
      this.onChange('');
      this.onValidatorChange();
    }
  }

  onBlur(): void { this.touched = true; this.onTouched(); this.commitText(); }

  commitText(): void {
    if (!this.displayValue) {
      this.dateValue = '';
      this.parseError = false;
      this.emitValue();
      return;
    }
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(this.displayValue);
    const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : '';
    if (!iso || !this.isValidIso(iso)) {
      this.dateValue = '';
      this.parseError = true;
      this.onChange('');
      this.onValidatorChange();
      return;
    }
    this.dateValue = iso;
    this.displayValue = this.formatBrazilian(iso);
    this.parseError = false;
    this.emitValue();
  }

  selectNativeDate(event: Event): void {
    this.dateValue = (event.target as HTMLInputElement).value;
    this.displayValue = this.formatBrazilian(this.dateValue);
    this.parseError = false;
    this.touched = true;
    this.onTouched();
    this.emitValue();
  }

  selectTime(event: Event): void { this.timeValue = (event.target as HTMLInputElement).value || '00:00'; this.emitValue(); }

  private emitValue(): void {
    const value = this.dateValue ? (this.withTime ? `${this.dateValue}T${this.timeValue || '00:00'}` : this.dateValue) : '';
    this.onChange(value);
    this.dateChange.emit(value);
    this.onValidatorChange();
  }

  private formatBrazilian(iso: string): string { return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : ''; }

  private isValidIso(iso: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) return false;
    const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      && (!this.min || iso >= this.min) && (!this.max || iso <= this.max);
  }
}
