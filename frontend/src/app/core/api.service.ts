import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { AppUser, AuditLog, Dashboard, DuplicateVisitGroup, LoginResponse, PageResponse, SocialAssistanceRecord, SocialAssistanceSummary, Team, TeamDetail, Territory, UserSummary, UserTeamHistory, Visit } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  visits(params: Record<string, string | number | boolean | undefined>) {
    return this.http.get<PageResponse<Visit>>(`${environment.apiBaseUrl}/visits`, { params: this.params(params) });
  }

  visit(id: number) {
    return this.http.get<Visit>(`${environment.apiBaseUrl}/visits/${id}`);
  }

  createVisit(visit: Visit) {
    return this.http.post<Visit>(`${environment.apiBaseUrl}/visits`, visit);
  }

  updateVisit(id: number, visit: Visit) {
    return this.http.put<Visit>(`${environment.apiBaseUrl}/visits/${id}`, visit);
  }

  dashboard(params: Record<string, string | undefined>) {
    return this.http.get<Dashboard>(`${environment.apiBaseUrl}/analytics/dashboard`, { params: this.params(params) });
  }

  exportVisits(params: Record<string, string | number | boolean | undefined> = {}) {
    return this.http.get(`${environment.apiBaseUrl}/visits/export.xlsx`, {
      params: this.params(params),
      responseType: 'blob'
    });
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/change-password`, { currentPassword, newPassword });
  }

  users(params: Record<string, string | number | boolean | undefined>) {
    return this.http.get<PageResponse<AppUser>>(`${environment.apiBaseUrl}/users`, { params: this.params(params) });
  }

  userSummary() {
    return this.http.get<UserSummary>(`${environment.apiBaseUrl}/users/summary`);
  }

  createUser(user: AppUser) {
    return this.http.post<AppUser>(`${environment.apiBaseUrl}/users`, user);
  }

  updateUser(user: AppUser) {
    const payload = { ...user };
    if (!payload.password?.trim()) {
      delete payload.password;
    }
    return this.http.put<AppUser>(`${environment.apiBaseUrl}/users/${user.id}`, payload);
  }

  userTeamHistory(userId: number) {
    return this.http.get<UserTeamHistory[]>(`${environment.apiBaseUrl}/users/${userId}/team-history`);
  }

  teams() {
    return this.http.get<Team[]>(`${environment.apiBaseUrl}/teams`);
  }

  myTeam() {
    return this.http.get<TeamDetail>(`${environment.apiBaseUrl}/teams/mine`);
  }

  createTeam(team: Team) {
    return this.http.post<Team>(`${environment.apiBaseUrl}/teams`, team);
  }

  updateTeam(team: Team) {
    return this.http.put<Team>(`${environment.apiBaseUrl}/teams/${team.id}`, team);
  }

  territories() {
    return this.http.get<Territory[]>(`${environment.apiBaseUrl}/territories`);
  }

  createTerritory(territory: Territory) {
    return this.http.post<Territory>(`${environment.apiBaseUrl}/territories`, territory);
  }

  updateTerritory(territory: Territory) {
    return this.http.put<Territory>(`${environment.apiBaseUrl}/territories/${territory.id}`, territory);
  }

  duplicateVisits() {
    return this.http.get<DuplicateVisitGroup[]>(`${environment.apiBaseUrl}/visits/duplicates`);
  }

  mergeVisits(targetId: number, duplicateIds: number[]) {
    return this.http.post<Visit>(`${environment.apiBaseUrl}/visits/duplicates/merge`, { targetId, duplicateIds });
  }

  auditLogs(params: Record<string, string | number | undefined>) {
    return this.http.get<PageResponse<AuditLog>>(`${environment.apiBaseUrl}/audit`, { params: this.params(params) });
  }

  socialAssistance(params: Record<string, string | number | undefined>) {
    return this.http.get<PageResponse<SocialAssistanceRecord>>(`${environment.apiBaseUrl}/social-assistance`, { params: this.params(params) });
  }

  socialAssistanceSummary(params: Record<string, string | number | undefined>) {
    return this.http.get<SocialAssistanceSummary>(`${environment.apiBaseUrl}/social-assistance/summary`, { params: this.params(params) });
  }

  createSocialAssistance(record: SocialAssistanceRecord) {
    return this.http.post<SocialAssistanceRecord>(`${environment.apiBaseUrl}/social-assistance`, record);
  }

  updateSocialAssistance(record: SocialAssistanceRecord) {
    return this.http.put<SocialAssistanceRecord>(`${environment.apiBaseUrl}/social-assistance/${record.id}`, record);
  }

  exportSocialAssistance(params: Record<string, string | number | undefined> = {}) {
    return this.http.get(`${environment.apiBaseUrl}/social-assistance/export.xlsx`, {
      params: this.params(params),
      responseType: 'blob'
    });
  }

  exportVisitsUrl(params: Record<string, string | number | boolean | undefined> = {}): string {
    const query = this.params(params).toString();
    return `${environment.apiBaseUrl}/visits/export.xlsx${query ? `?${query}` : ''}`;
  }

  private params(input: Record<string, string | number | boolean | undefined>): HttpParams {
    let params = new HttpParams();
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }
}
