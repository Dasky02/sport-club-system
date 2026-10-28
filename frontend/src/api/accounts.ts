import { apiClient, mutateWithCsrf } from "./api";
import type { AccountType, PageResponse, ProfileState, UserRole } from "./types";

export interface AdminAccount {
  id: string; username: string; role: UserRole; accountType: AccountType; enabled: boolean;
  personId: string | null; profileState: ProfileState; firstName: string | null; lastName: string | null; createdAt: string;
}
export interface CreateAccountRequest { personId: string; username: string; password: string; accountType: AccountType }
export interface GuardianResponse { guardianPersonId: string; playerId: string; firstName: string; lastName: string; grantedBy: string; grantedAt: string; revokedAt: string | null }

const id = (value: string) => encodeURIComponent(value);
async function get<T>(url: string, page = 0, size = 20): Promise<T> { return (await apiClient.get<T>(url, { params: { page, size } })).data; }
export const getAccounts = (page = 0, size = 20) => get<PageResponse<AdminAccount>>("/admin/users", page, size);
export const createAccount = (body: CreateAccountRequest) => mutateWithCsrf<AdminAccount, CreateAccountRequest>("POST", "/admin/users", body);
export const linkAccountPerson = (userId: string, personId: string, reason: string) => mutateWithCsrf<AdminAccount, { personId: string; reason: string }>("POST", `/admin/users/${id(userId)}/person-link`, { personId, reason });
export const setAccountRole = (userId: string, role: UserRole, reason: string) => mutateWithCsrf<AdminAccount, { role: UserRole; reason: string }>("PATCH", `/admin/users/${id(userId)}/role`, { role, reason });
export const setAccountType = (userId: string, accountType: AccountType, reason: string) => mutateWithCsrf<AdminAccount, { accountType: AccountType; reason: string }>("PATCH", `/admin/users/${id(userId)}/account-type`, { accountType, reason });
export const setAccountEnabled = (userId: string, enabled: boolean, reason: string) => mutateWithCsrf<AdminAccount, { enabled: boolean; reason: string }>("PATCH", `/admin/users/${id(userId)}/enabled`, { enabled, reason });
export const activateChildAccount = (userId: string, reason: string) => mutateWithCsrf<AdminAccount, { reason: string }>("POST", `/admin/users/${id(userId)}/activate`, { reason });
export const getGuardians = (playerId: string, page = 0, size = 20) => get<PageResponse<GuardianResponse>>(`/players/${id(playerId)}/guardians`, page, size);
export const grantGuardian = (playerId: string, guardianPersonId: string, reason: string) => mutateWithCsrf<GuardianResponse, { reason: string }>("PUT", `/players/${id(playerId)}/guardians/${id(guardianPersonId)}`, { reason });
export const revokeGuardian = (playerId: string, guardianPersonId: string, reason: string) => mutateWithCsrf<GuardianResponse, { reason: string }>("POST", `/players/${id(playerId)}/guardians/${id(guardianPersonId)}/revoke`, { reason });

export interface ChildResponse { playerId: string; displayName: string; firstName: string; lastName: string }
export const getMyChildren = (page = 0, size = 20) => get<PageResponse<ChildResponse>>("/me/children", page, size);
export const getMyChild = async (playerId: string): Promise<ChildResponse> => (await apiClient.get<ChildResponse>(`/me/children/${id(playerId)}`)).data;
