import { ElementRef } from '@angular/core';
import { DatePickerComponent } from './date-picker.component';

describe('DatePickerComponent', () => {
  it('usa o clique nativo quando showPicker não está disponível no navegador', () => {
    const component = new DatePickerComponent();
    const input = document.createElement('input');
    input.type = 'date';
    Object.defineProperty(input, 'showPicker', {
      configurable: true,
      value: jasmine.createSpy('showPicker').and.throwError('indisponível')
    });
    const focus = spyOn(input, 'focus');
    const click = spyOn(input, 'click');
    component.nativeInput = new ElementRef(input);

    component.openCalendar();

    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(click).toHaveBeenCalled();
  });
});
