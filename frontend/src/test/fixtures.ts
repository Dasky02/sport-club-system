import type { AccountContext, PersonResponse, UserResponse } from "@/api/types";

export const pendingUser: UserResponse = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "tester",
  role: "USER",
  accountType: "STANDARD",
  personId: null,
  profileState: "PENDING",
  createdAt: "2026-10-05T10:00:00Z",
};

export const person: PersonResponse = {
  id: "00000000-0000-0000-0000-000000000002",
  firstName: "Jan", lastName: "Novák", birthDate: null, email: null, phone: null,
};

export const completeUser: UserResponse = { ...pendingUser, personId: person.id, profileState: "COMPLETE" };
export const adminUser: UserResponse = { ...completeUser, role: "ADMIN" };
export const userContext: AccountContext = { accountType: "STANDARD", capabilities: [], ownPlayerId: null, teamContexts: [], children: [] };
export const adminContext: AccountContext = { ...userContext, capabilities: ["MANAGE_CLUB", "MANAGE_SPORTS", "MANAGE_SEASONS", "MANAGE_TEAMS", "MANAGE_PLAYERS", "MANAGE_MEMBERSHIPS", "MANAGE_ACCOUNTS", "MANAGE_GUARDIANS"] };
