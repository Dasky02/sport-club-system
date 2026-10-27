import axios, { type AxiosError } from "axios";
import type {
  ApiErrorBody,
  CsrfResponse,
  HtmlResponse,
  LoginRequest,
  RegisterRequest,
  UserResponse,
  VersionResponse,
} from "./types";

/** Zachovaný klient šablony: JSON API + serverová session, bez tokenu v localStorage. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly body: ApiErrorBody | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function parseApiErrorBody(body: unknown): ApiErrorBody | null {
  if (typeof body !== "object" || body === null
    || !("code" in body) || typeof body.code !== "string"
    || !("message" in body) || typeof body.message !== "string"
    || !("timestamp" in body) || typeof body.timestamp !== "string") return null;
  const fieldErrors = "fieldErrors" in body && Array.isArray(body.fieldErrors)
    ? body.fieldErrors.flatMap((item: unknown) => {
      if (typeof item !== "object" || item === null
        || !("field" in item) || typeof item.field !== "string"
        || !("message" in item) || typeof item.message !== "string") return [];
      return [{
        field: item.field,
        message: item.message,
        ...("code" in item && typeof item.code === "string" ? { code: item.code } : {}),
      }];
    })
    : undefined;
  return {
    timestamp: body.timestamp,
    code: body.code,
    message: body.message,
    ...("details" in body && typeof body.details === "string" ? { details: body.details } : {}),
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

export const apiClient = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api").replace(/\/+$/, ""),
  timeout: 15_000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<unknown>) => {
    if (error.response) {
      const body = parseApiErrorBody(error.response.data);
      return Promise.reject(new ApiError(
        error.response.status,
        body?.code ?? String(error.response.status),
        body?.message ?? "API request failed",
        body,
      ));
    }
    return Promise.reject(new ApiError(0, "NETWORK_ERROR", "API unavailable"));
  },
);

/** Token se necacheuje: Spring jej po login/logout rotuje. */
export async function getCsrfToken(): Promise<CsrfResponse> {
  const { data } = await apiClient.get<CsrfResponse>("/auth/csrf");
  if (!data.token || data.headerName !== "X-CSRF-TOKEN") {
    throw new ApiError(0, "INVALID_RESPONSE", "Invalid CSRF response");
  }
  return data;
}

/** Sdílený transport; server vždy autorizuje konkrétní doménovou operaci. */
export async function mutateWithCsrf<TResponse, TRequest = undefined>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: TRequest,
): Promise<TResponse> {
  const csrf = await getCsrfToken();
  const { data } = await apiClient.request<TResponse>({
    method,
    url: path,
    data: body,
    headers: { [csrf.headerName]: csrf.token },
  });
  // Změnové požadavky se automaticky neopakují, ani po 403 či timeoutu.
  return data;
}

export function authLogin(request: LoginRequest): Promise<UserResponse> {
  return mutateWithCsrf<UserResponse, LoginRequest>("POST", "/auth/login", request);
}

export function authRegister(request: RegisterRequest): Promise<UserResponse> {
  return mutateWithCsrf<UserResponse, RegisterRequest>("POST", "/auth/register", request);
}

export async function getMe(): Promise<UserResponse> {
  const { data } = await apiClient.get<UserResponse>("/auth/me");
  return data;
}

export async function authLogout(): Promise<void> {
  await mutateWithCsrf<void>("POST", "/auth/logout");
}

export async function getAppVersion(): Promise<VersionResponse> {
  const { data } = await apiClient.get<VersionResponse>("/info/version");
  return data;
}

export async function getAppReleaseNotes(): Promise<HtmlResponse> {
  const { data } = await apiClient.get<HtmlResponse>("/info/release-notes");
  return data;
}

export async function getAppTermsOfService(): Promise<HtmlResponse> {
  const { data } = await apiClient.get<HtmlResponse>("/info/terms-of-service");
  return data;
}

export async function getAppPrivacyPolicy(): Promise<HtmlResponse> {
  const { data } = await apiClient.get<HtmlResponse>("/info/privacy-policy");
  return data;
}
