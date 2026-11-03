import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  function setup(register: jasmine.Spy) {
    const router = { navigateByUrl: jasmine.createSpy('navigateByUrl') };
    const notifications = { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') };
    const component = new RegisterComponent({ register } as any, router as any, notifications as any, {} as any);
    component.name = 'Novo usuário';
    component.email = 'novo@example.org';
    component.password = 'SenhaSegura123';
    component.confirmation = component.password;
    return { component, router, notifications };
  }

  it('libera o botão e redireciona após criar a conta', () => {
    const response = new Subject<any>();
    const { component, router } = setup(jasmine.createSpy('register').and.returnValue(response));

    component.submit();
    expect(component.loading()).toBeTrue();
    response.next({ token: 'token', user: { roles: ['visualizador'] } });
    response.complete();

    expect(component.loading()).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/visits');
  });

  it('libera nova tentativa após erro sem enviar cadastro duplicado', () => {
    const register = jasmine.createSpy('register').and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 0 })),
      of({ token: 'token' })
    );
    const { component, router } = setup(register);

    component.submit();
    expect(component.loading()).toBeFalse();
    expect(component.error()).toContain('conectar ao servidor');
    component.submit();

    expect(register).toHaveBeenCalledTimes(2);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/visits');
  });
});
