import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { ChangePasswordComponent } from './auth/change-password.component';
import { authGuard } from './core/auth.guard';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuditComponent } from './audit/audit.component';
import { DuplicatesComponent } from './duplicates/duplicates.component';
import { TeamsComponent } from './teams/teams.component';
import { TerritoriesComponent } from './territories/territories.component';
import { UsersComponent } from './users/users.component';
import { VisitsComponent } from './visits/visits.component';
import { SocialAssistanceComponent } from './social-assistance/social-assistance.component';
import { FinanceComponent } from './finance/finance.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'change-password', component: ChangePasswordComponent, canActivate: [authGuard] },
  { path: 'visits', component: VisitsComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], data: { canViewReports: true } },
  { path: 'social-assistance', component: SocialAssistanceComponent, canActivate: [authGuard], data: { roles: ['admin', 'lider', 'projetista'] } },
  { path: 'finance', component: FinanceComponent, canActivate: [authGuard], data: { canAccessFinance: true } },
  { path: 'teams', component: TeamsComponent, canActivate: [authGuard], data: { roles: ['admin', 'lider', 'projetista'] } },
  { path: 'users', component: UsersComponent, canActivate: [authGuard], data: { roles: ['admin'] } },
  { path: 'territories', component: TerritoriesComponent, canActivate: [authGuard], data: { roles: ['admin'] } },
  { path: 'duplicates', component: DuplicatesComponent, canActivate: [authGuard], data: { roles: ['admin'] } },
  { path: 'audit', component: AuditComponent, canActivate: [authGuard], data: { roles: ['admin'] } },
  { path: '', pathMatch: 'full', redirectTo: 'visits' },
  { path: '**', redirectTo: 'visits' }
];
