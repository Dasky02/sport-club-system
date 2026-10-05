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

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === "object" && body !== null
    && "code" in body && typeof body.code === "string"
    && "message" in body && typeof body.message === "string"
    && "timestamp" in body && typeof body.timestamp === "string";
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
      const body = isApiErrorBody(error.response.data) ? error.response.data : null;
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

async function postWithCsrf<T>(path: string, body?: LoginRequest | RegisterRequest): Promise<T> {
  const csrf = await getCsrfToken();
  const { data } = await apiClient.post<T>(path, body, {
    headers: { [csrf.headerName]: csrf.token },
  });
  // Změnové požadavky se automaticky neopakují, ani po 403 či timeoutu.
  return data;
}

export function authLogin(request: LoginRequest): Promise<UserResponse> {
  return postWithCsrf<UserResponse>("/auth/login", request);
}

export function authRegister(request: RegisterRequest): Promise<UserResponse> {
  return postWithCsrf<UserResponse>("/auth/register", request);
}

export async function getMe(): Promise<UserResponse> {
  const { data } = await apiClient.get<UserResponse>("/auth/me");
  return data;
}

export async function authLogout(): Promise<void> {
  await postWithCsrf<void>("/auth/logout");
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
