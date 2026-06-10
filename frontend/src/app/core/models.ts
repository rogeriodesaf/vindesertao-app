export type Role = 'admin' | 'lider' | 'projetista';

export interface UserPrincipal {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  teamId?: number;
  mustChangePassword: boolean;
  canRegisterVisits: boolean;
  canViewReports: boolean;
  canAccessFinance: boolean;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: UserPrincipal;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface Visit {
  id?: number;
  personName: string;
  phone?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city: string;
  manualAddress?: string;
  latitude?: number;
  longitude?: number;
  wantsVisits: boolean;
  personAge?: number;
  householdSize?: number;
  referencePoint?: string;
  prayerRequest?: string;
  nextVisitAt?: string;
  notes?: string;
  hasPhoto?: boolean;
  photoData?: string;
  photoUrl?: string;
  photoContentType?: string;
  photoFileName?: string;
  streetViewUrl?: string;
  responsibleUserId?: number;
  responsibleUserName?: string;
  teamId?: number;
  createdAt?: string;
}

export interface CountItem {
  label: string;
  total: number;
}

export interface TeamReportItem {
  teamId: number;
  teamName: string;
  totalVisits: number;
  wantsVisitsYes: number;
  wantsVisitsNo: number;
}

export interface Dashboard {
  totalVisits: number;
  wantsVisitsYes: number;
  wantsVisitsNo: number;
  byProjectist: CountItem[];
  byTeam: CountItem[];
  byNeighborhood: CountItem[];
  byPeriod: CountItem[];
  teamReports: TeamReportItem[];
}

export interface AppUser {
  id?: number;
  name: string;
  email: string;
  password?: string;
  roles: Role[];
  teamId?: number;
  teamName?: string;
  additionalTeamIds?: number[];
  additionalTeamNames?: string[];
  active: boolean;
  mustChangePassword?: boolean;
  canRegisterVisits: boolean;
  canViewReports: boolean;
  canAccessFinance: boolean;
}

export type TeamType = 'EVANGELISM' | 'SUPPORT' | 'SOCIAL_ACTION' | 'CHILDREN' | 'KITCHEN' | 'MUSIC' | 'INTERCESSION' | 'MEDIA' | 'SECRETARIAT' | 'FINANCE' | 'OTHER';

export interface Team {
  id?: number;
  name: string;
  leaderId?: number;
  leaderName?: string;
  teamType: TeamType;
  canRegisterVisits: boolean;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  leader: boolean;
}

export interface TeamDetail {
  team: Team;
  members: TeamMember[];
}

export interface Territory {
  id?: number;
  name: string;
  teamId: number;
  teamName?: string;
  color: string;
  polygonGeoJson: string;
  active: boolean;
  enforceForProjectists: boolean;
}

export interface DuplicateVisitGroup {
  reason: string;
  visits: Visit[];
}

export interface AuditLog {
  id: number;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: number;
  beforeData?: string;
  afterData?: string;
  createdAt: string;
}

export interface UserTeamHistory {
  id: number;
  oldTeamId?: number;
  oldTeamName?: string;
  newTeamId?: number;
  newTeamName?: string;
  changedByEmail?: string;
  changedAt: string;
}

export interface UserSummaryItem {
  label: string;
  total: number;
}

export interface UserSummary {
  byRole: UserSummaryItem[];
  byPrimaryTeamType: UserSummaryItem[];
  byAccess: UserSummaryItem[];
}

export type SocialServiceType = 'MEDICAL' | 'DENTAL' | 'HAIRCUT' | 'MANICURE' | 'SPEECH_THERAPY' | 'NUTRITION' | 'FOOD_BASKET' | 'OTHER';

export interface SocialAssistanceRecord {
  id?: number;
  assistedPersonName: string;
  phone?: string;
  age?: number;
  neighborhood?: string;
  city: string;
  serviceType: SocialServiceType;
  serviceTypeLabel?: string;
  quantity: number;
  notes?: string;
  responsibleUserId?: number;
  responsibleUserName?: string;
  teamId?: number;
  teamName?: string;
  createdAt?: string;
}

export interface SocialAssistanceSummary {
  totalPeople: number;
  totalRecords: number;
  byServiceType: CountItem[];
  byTeam: CountItem[];
  byResponsible: CountItem[];
  byNeighborhood: CountItem[];
  byPeriod: CountItem[];
}

export type FinancialTransactionType = 'INCOME' | 'EXPENSE';

export interface FinancialTransaction {
  id?: number;
  type: FinancialTransactionType;
  typeLabel?: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  transactionDate: string;
  notes?: string;
  responsibleUserId?: number;
  responsibleUserName?: string;
  createdAt?: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  totalTransactions: number;
  byCategory: Array<{ label: string; total: number }>;
  byPaymentMethod: Array<{ label: string; total: number }>;
  byPeriod: Array<{ label: string; total: number }>;
}
