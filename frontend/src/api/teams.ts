import { apiClient, mutateWithCsrf } from "./api";
import type { PageResponse, PersonRequest, PersonResponse } from "./types";

export interface SeasonResponse { id: string; name: string; startsOn: string; endsOn: string; archived: boolean }
export interface SeasonRequest { name: string; startsOn: string; endsOn: string }
export interface TeamResponse { id: string; sportId: string; sportName: string; name: string; isClubTeam: boolean }
export interface TeamRequest { sportId: string; name: string; isClubTeam: boolean }
export interface TeamSeasonResponse {
  id: string; teamId: string; seasonId: string; sportId: string; sportName: string; teamName: string;
  displayName: string; isClubTeam: boolean; seasonName: string; startsOn: string; endsOn: string; archived: boolean;
}
export interface TeamSeasonRequest { teamId: string; seasonId: string; displayName: string }
export interface PlayerResponse { id: string; personId: string; firstName: string; lastName: string; birthDate: string }
export interface PlayerDetail { id: string; firstName: string; lastName: string }
export type PlayerRequest = { personId: string; person?: never } | { person: PersonRequest & { birthDate: string }; personId?: never };
export interface IntervalRequest { validFrom: string; validTo: string | null }
export interface PlayerMembership extends IntervalRequest { id: string; teamSeasonId: string; playerId: string; firstName: string; lastName: string }
export interface CoachMembership extends IntervalRequest { id: string; teamSeasonId: string; coachUserId: string; username: string; firstName: string; lastName: string }
export interface CoachCandidate { id: string; username: string; firstName: string; lastName: string }
export interface RosterRow extends IntervalRequest { playerId: string; firstName: string; lastName: string; membershipId: string }
export interface PlayerHistory extends IntervalRequest { membershipId: string; teamSeasonId: string; displayName: string; seasonName: string; sportName: string }

async function get<T>(url: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const { data } = await apiClient.get<T>(url, { params });
  return data;
}
const pathId = (id: string) => encodeURIComponent(id);

export const getSeasons = (page = 0, size = 20) => get<PageResponse<SeasonResponse>>("/seasons", { page, size });
export const createSeason = (body: SeasonRequest) => mutateWithCsrf<SeasonResponse, SeasonRequest>("POST", "/seasons", body);
export const updateSeason = (id: string, body: Partial<SeasonRequest>) => mutateWithCsrf<SeasonResponse, Partial<SeasonRequest>>("PATCH", `/seasons/${pathId(id)}`, body);
export const archiveSeason = (id: string) => mutateWithCsrf<SeasonResponse, Record<string, never>>("POST", `/seasons/${pathId(id)}/archive`, {});
export const getTeams = (page = 0, size = 20, sportId?: string) => get<PageResponse<TeamResponse>>("/teams", { page, size, sportId });
export const createTeam = (body: TeamRequest) => mutateWithCsrf<TeamResponse, TeamRequest>("POST", "/teams", body);
export const updateTeam = (id: string, body: Partial<TeamRequest>) => mutateWithCsrf<TeamResponse, Partial<TeamRequest>>("PATCH", `/teams/${pathId(id)}`, body);
export const getTeamSeasons = (page = 0, size = 20, filters?: { seasonId?: string; sportId?: string }) => get<PageResponse<TeamSeasonResponse>>("/team-seasons", { page, size, ...filters });
export const getTeamSeason = (id: string) => get<TeamSeasonResponse>(`/team-seasons/${pathId(id)}`);
export const createTeamSeason = (body: TeamSeasonRequest) => mutateWithCsrf<TeamSeasonResponse, TeamSeasonRequest>("POST", "/team-seasons", body);
export const renameTeamSeason = (id: string, displayName: string) => mutateWithCsrf<TeamSeasonResponse, { displayName: string }>("PATCH", `/team-seasons/${pathId(id)}`, { displayName });
export const getRoster = (id: string, page = 0, size = 20, on?: string) => get<PageResponse<RosterRow>>(`/team-seasons/${pathId(id)}/players`, { page, size, on });
export const getPersons = (page = 0, size = 20) => get<PageResponse<PersonResponse>>("/persons", { page, size });
export const getPerson = (id: string) => get<PersonResponse>(`/persons/${pathId(id)}`);
export const createPerson = (body: PersonRequest) => mutateWithCsrf<PersonResponse, PersonRequest>("POST", "/persons", body);
export const updatePerson = (id: string, body: PersonRequest) => mutateWithCsrf<PersonResponse, PersonRequest>("PUT", `/persons/${pathId(id)}`, body);
export const getPlayers = (page = 0, size = 20) => get<PageResponse<PlayerResponse>>("/players", { page, size });
export const createPlayer = (body: PlayerRequest) => mutateWithCsrf<PlayerResponse, PlayerRequest>("POST", "/players", body);
export const getPlayer = (id: string) => get<PlayerDetail>(`/players/${pathId(id)}`);
export const getPlayerHistory = (id: string, page = 0, size = 20) => get<PageResponse<PlayerHistory>>(`/players/${pathId(id)}/memberships`, { page, size });
export const getPlayerMemberships = (id: string, page = 0, size = 20) => get<PageResponse<PlayerMembership>>(`/team-seasons/${pathId(id)}/player-memberships`, { page, size });
export const getCoachMemberships = (id: string, page = 0, size = 20) => get<PageResponse<CoachMembership>>(`/team-seasons/${pathId(id)}/coach-memberships`, { page, size });
export const getCoachCandidates = (page = 0, size = 20) => get<PageResponse<CoachCandidate>>("/admin/coach-candidates", { page, size });
export const addPlayerMembership = (id: string, body: IntervalRequest & { playerId: string }) => mutateWithCsrf<PlayerMembership, typeof body>("POST", `/team-seasons/${pathId(id)}/player-memberships`, body);
export const addCoachMembership = (id: string, body: IntervalRequest & { coachUserId: string }) => mutateWithCsrf<CoachMembership, typeof body>("POST", `/team-seasons/${pathId(id)}/coach-memberships`, body);
export const updatePlayerMembership = (id: string, body: IntervalRequest) => mutateWithCsrf<PlayerMembership, IntervalRequest>("PATCH", `/player-memberships/${pathId(id)}`, body);
export const updateCoachMembership = (id: string, body: IntervalRequest) => mutateWithCsrf<CoachMembership, IntervalRequest>("PATCH", `/coach-memberships/${pathId(id)}`, body);

/** Výběrové seznamy načítají všechny povolené stránky; první stovka není vydávána za úplný seznam. */
export async function allPages<T>(load: (page: number, size: number) => Promise<PageResponse<T>>): Promise<T[]> {
  const first = await load(0, 100);
  const items = [...first.items];
  for (let page = 1; page < first.totalPages; page += 1) items.push(...(await load(page, 100)).items);
  return items;
}
