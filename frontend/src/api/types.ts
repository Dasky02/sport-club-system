/** DTOs odpovídající Spring API; účet není profilem hráče. */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export type UserRole = "ADMIN" | "USER";
export type AccountType = "STANDARD" | "CHILD";
export type ProfileState = "PENDING" | "COMPLETE";

export interface UserResponse {
  id: string;
  username: string;
  role: UserRole;
  accountType: AccountType;
  personId: string | null;
  profileState: ProfileState;
  createdAt: string;
}

export type Capability = "MANAGE_CLUB" | "MANAGE_SPORTS" | "MANAGE_SEASONS" | "MANAGE_TEAMS" | "MANAGE_PLAYERS" | "MANAGE_MEMBERSHIPS" | "MANAGE_ACCOUNTS" | "MANAGE_GUARDIANS";

/** Jen skutečné aktuální kontexty; týmová oprávnění nejsou globální role. */
export interface AccountContext {
  accountType: AccountType;
  capabilities: Capability[];
  ownPlayerId: string | null;
  teamContexts: { teamSeasonId: string; capabilities: "READ_TEAM"[] }[];
  children: { playerId: string; displayName: string; capabilities: "READ_CHILD"[] }[];
}

export interface PersonRequest {
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface PersonResponse {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  email: string | null;
  phone: string | null;
}

export interface ClubSetupStatus {
  completed: boolean;
  available: boolean;
  clubName: string;
}

export interface SportResponse {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface SportRequest {
  code: string;
  name: string;
}

export type SportUpdateRequest =
  | { name: string; active?: boolean }
  | { name?: string; active: boolean };

export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: string;
  totalPages: number;
}

export interface ApiFieldError {
  field: string;
  code?: string;
  message: string;
}

export interface ApiErrorBody {
  timestamp: string;
  code: string;
  message: string;
  details?: string;
  fieldErrors?: ApiFieldError[];
}

export interface CsrfResponse {
  token: string;
  headerName: string;
  parameterName: string;
}

export interface VersionResponse {
  version: string;
}

export interface HtmlResponse {
  content: string;
}
