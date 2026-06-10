import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = route.data['roles'] as Role[] | undefined;

  if (!auth.user()) {
    return router.parseUrl('/login');
  }
  if (auth.user()?.mustChangePassword && route.routeConfig?.path !== 'change-password') {
    return router.parseUrl('/change-password');
  }
  if (roles && !auth.hasAnyRole(roles)) {
    return router.parseUrl('/visits');
  }
  if (route.data['canViewReports'] && !auth.user()?.canViewReports && !auth.user()?.canRegisterVisits && !auth.hasAnyRole(['admin', 'lider'])) {
    return router.parseUrl('/visits');
  }
  if (route.data['canAccessFinance'] && !auth.user()?.canAccessFinance && !auth.hasAnyRole(['admin'])) {
    return router.parseUrl('/visits');
  }
  if (route.data['canAccessChildren'] && !auth.user()?.canAccessChildren && !auth.hasAnyRole(['admin'])) {
    return router.parseUrl('/visits');
  }
  return true;
};
