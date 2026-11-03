import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  afterEach(() => localStorage.removeItem('vinde.rememberedEmail'));

  function setup(login: jasmine.Spy, activeEdition = of({ year: 2026, locality: 'Cidade configurada' })) {
    const api = { publicActiveEdition: jasmine.createSpy('publicActiveEdition').and.returnValue(activeEdition) };
    const router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
    const notifications = { error: jasmine.createSpy('error') };
    const component = new LoginComponent(api as any, { login } as any, router as any, notifications as any, {} as any);
    component.email = ' pessoa@example.org ';
    component.password = 'senha de teste';
    return { component, api, router, notifications };
  }

  it('exibe apenas localidade e ano da edição pública', () => {
    const { component } = setup(jasmine.createSpy('login'));
    component.ngOnInit();
    expect(component.edition()).toEqual({ year: 2026, locality: 'Cidade configurada' });
  });

  it('oculta a edição se a consulta pública falhar', () => {
    const { component } = setup(jasmine.createSpy('login'), throwError(() => new Error('offline')));
    component.ngOnInit();
    expect(component.edition()).toBeNull();
  });

  it('impede envio duplicado e lembra somente o e-mail escolhido', () => {
    const response = new Subject<any>();
    const login = jasmine.createSpy('login').and.returnValue(response);
    const { component, router } = setup(login);
    component.rememberEmail = true;

    component.submit();
    component.submit();
    expect(login).toHaveBeenCalledTimes(1);
    expect(component.loading()).toBeTrue();

    response.next({ token: 'token' });
    response.complete();
    expect(component.loading()).toBeFalse();
    expect(localStorage.getItem('vinde.rememberedEmail')).toBe('pessoa@example.org');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/visits');
  });

  it('libera nova tentativa após erro e permite desmarcar a lembrança', () => {
    localStorage.setItem('vinde.rememberedEmail', 'antigo@example.org');
    const login = jasmine.createSpy('login').and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 401 })),
      of({ token: 'token' })
    );
    const { component } = setup(login);
    component.rememberEmail = false;

    component.submit();
    expect(component.loading()).toBeFalse();
    expect(component.error()).toContain('inválidos');
    component.submit();

    expect(login).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('vinde.rememberedEmail')).toBeNull();
  });
});
