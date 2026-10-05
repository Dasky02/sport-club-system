/** DTOs odpovídající Spring API; účet není profilem hráče. */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export type UserRole = "ADMIN" | "USER" | "COACH" | "PLAYER" | "PARENT";

export interface UserResponse {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface ApiErrorBody {
  timestamp: string;
  code: string;
  message: string;
  details?: string;
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
