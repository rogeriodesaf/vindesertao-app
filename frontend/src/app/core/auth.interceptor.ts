import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isExternal = req.url.startsWith('https://nominatim.openstreetmap.org');
  if (!token || isExternal) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.expireSession();
      }
      return throwError(() => error);
    })
  );
};
