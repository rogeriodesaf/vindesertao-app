import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateRangeFilterComponent } from './date-range-filter.component';

describe('DateRangeFilterComponent', () => {
  let fixture: ComponentFixture<DateRangeFilterComponent>;
  let component: DateRangeFilterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DateRangeFilterComponent] }).compileComponents();
    fixture = TestBed.createComponent(DateRangeFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exibe seletores nativos somente no modo personalizado', () => {
    expect(component.preset).toBeNull();
    expect(fixture.nativeElement.querySelector('.date-range-custom')).toBeNull();

    component.choosePreset('7days');
    fixture.detectChanges();

    expect(component.preset).toBe('7days');
    expect(fixture.nativeElement.querySelector('.date-range-custom')).toBeNull();
    expect(component.from).toContain('T00:00:00');
    expect(component.to).toContain('T23:59:59');
  });

  it('reabre as datas ao selecionar Personalizado', () => {
    component.choosePreset('today');
    fixture.detectChanges();
    component.choosePreset('custom');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('input[type="date"]').length).toBe(2);
  });

  it('propaga a data selecionada pelo controle nativo', () => {
    const fromChange = jasmine.createSpy('fromChange');
    component.fromChange.subscribe(fromChange);
    component.choosePreset('custom');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement;

    input.value = '2026-07-15';
    input.dispatchEvent(new Event('change'));

    expect(component.from).toBe('2026-07-15T00:00:00');
    expect(fromChange).toHaveBeenCalledWith('2026-07-15T00:00:00');
  });

  it('recolhe as datas ao limpar o filtro', () => {
    component.choosePreset('custom');
    fixture.detectChanges();

    component.clearDates();
    fixture.detectChanges();

    expect(component.preset).toBeNull();
    expect(fixture.nativeElement.querySelector('.date-range-custom')).toBeNull();
  });
});
