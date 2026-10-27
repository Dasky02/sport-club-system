import { apiClient, mutateWithCsrf } from "./api";
import type {
  AccountContext, ClubSetupStatus, PageResponse, PersonRequest, PersonResponse,
  SportRequest, SportResponse, SportUpdateRequest, UserResponse,
} from "./types";

export async function getAccountContext(): Promise<AccountContext> {
  const { data } = await apiClient.get<AccountContext>("/me/context");
  return data;
}

export async function getMyPerson(): Promise<PersonResponse> {
  const { data } = await apiClient.get<PersonResponse>("/me/person");
  return data;
}

export function createMyPerson(request: PersonRequest): Promise<PersonResponse> {
  return mutateWithCsrf<PersonResponse, PersonRequest>("POST", "/me/person", request);
}

export async function getClubSetupStatus(): Promise<ClubSetupStatus> {
  const { data } = await apiClient.get<ClubSetupStatus>("/club/setup-status");
  return data;
}

export function completeClubSetup(token: string): Promise<UserResponse> {
  return mutateWithCsrf<UserResponse, { token: string }>("POST", "/club/setup", { token });
}

export async function getSports(page = 0, size = 20): Promise<PageResponse<SportResponse>> {
  const { data } = await apiClient.get<PageResponse<SportResponse>>("/sports", { params: { page, size } });
  return data;
}

export function createSport(request: SportRequest): Promise<SportResponse> {
  return mutateWithCsrf<SportResponse, SportRequest>("POST", "/sports", request);
}

export function updateSport(id: string, request: SportUpdateRequest): Promise<SportResponse> {
  return mutateWithCsrf<SportResponse, SportUpdateRequest>("PATCH", `/sports/${encodeURIComponent(id)}`, request);
}
