import { apiClient, mutateWithCsrf } from "./api";
import type { PageResponse } from "./types";

export type EventType = "TRAINING" | "MATCH" | "OTHER";
export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
export type Availability = "UNKNOWN" | "AVAILABLE" | "UNAVAILABLE";
export type Nomination = "NOT_SELECTED" | "SELECTED" | "RESERVE";
export type Attendance = "PRESENT" | "ABSENT" | "EXCUSED" | "LATE";
export type EventSchedule = {
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  location: string | null;
  availabilityDeadline: string | null;
};
export type ClubEvent = {
  id: string;
  seasonId: string;
  type: EventType;
  status: EventStatus;
  schedule: EventSchedule;
  version: string;
  nominationPublishedAt: string | null;
  canManage: boolean;
};
export type EventTeam = { id: string; seasonId: string; sportId: string; name: string; clubTeam: boolean };
export type Match = {
  competitionSeasonId: string | null;
  matchFormatId: string;
  homeTeamSeasonId: string;
  awayTeamSeasonId: string;
};
export type MatchDetails = Match & { homeTeamName: string; awayTeamName: string; competitionName: string | null; formatName: string };
export type Participant = {
  playerId: string;
  teamSeasonId: string;
  name: string;
  version: string;
  availability: Availability | null;
  availabilityComment: string | null;
  nomination: Nomination | null;
  publishedNomination: Nomination | null;
  attendance: Attendance | null;
  attendanceComment: string | null;
  played: boolean | null;
  withdrawn: boolean;
  canAnswer: boolean;
  canManage: boolean;
};
export type EventDetails = { event: ClubEvent; teams: EventTeam[]; match: MatchDetails | null; participants: Participant[] };
export type EventOptions = {
  seasons: { id: string; name: string; startsOn: string; endsOn: string }[];
  teams: EventTeam[];
  formats: { id: string; sportId: string; name: string }[];
  competitions: { id: string; matchFormatId: string; name: string; teamSeasonIds: string[] }[];
};
export type EventFilters = { from?: string; to?: string; teamSeasonId?: string; type?: EventType; page?: number; size?: number };
export type CreateEvent = { seasonId: string; type: EventType; schedule: EventSchedule; teamSeasonIds: string[]; match: Match | null };
export type NoticeType = "EVENT_CREATED" | "EVENT_CHANGED" | "EVENT_CANCELLED" | "NOMINATION_PUBLISHED" | "NOMINATION_CHANGED";
export type Notice = {
  id: string;
  type: NoticeType;
  eventId: string;
  title: string;
  body: string;
  deliveredAt: string;
  readAt: string | null;
};

export async function getEvents(params: EventFilters) {
  return (await apiClient.get<PageResponse<ClubEvent>>("/events", { params })).data;
}
export async function getEventOptions() {
  return (await apiClient.get<EventOptions>("/events/options")).data;
}
export async function getEvent(id: string) {
  return (await apiClient.get<EventDetails>(`/events/${id}`)).data;
}
export const createEvent = (body: CreateEvent) => mutateWithCsrf<EventDetails, CreateEvent>("POST", "/events", body);
export const discardEventDraft = (id: string, version: string) =>
  mutateWithCsrf<void, { version: string }>("DELETE", `/events/${id}`, { version });
export const editEvent = (id: string, version: string, schedule: EventSchedule) =>
  mutateWithCsrf<EventDetails, { version: string; schedule: EventSchedule }>("PATCH", `/events/${id}`, { version, schedule });
export const eventAction = (id: string, action: "publish" | "cancel" | "complete" | "nomination/publish", version: string) =>
  mutateWithCsrf<EventDetails, { version: string }>("POST", `/events/${id}/${action}`, { version });
export const saveAvailability = (id: string, playerId: string, body: { version: string; availability: Availability; availabilityComment: string; reason?: string }) =>
  mutateWithCsrf<Participant, typeof body>("PUT", `/events/${id}/participants/${playerId}/availability`, body);
export const saveAttendance = (id: string, playerId: string, body: { version: string; attendance: Attendance; attendanceComment: string; played: boolean | null; reason?: string }) =>
  mutateWithCsrf<Participant, typeof body>("PUT", `/events/${id}/participants/${playerId}/attendance`, body);
export const saveNomination = (id: string, version: string, entries: { playerId: string; version: string; nomination: Nomination }[]) =>
  mutateWithCsrf<EventDetails, { version: string; entries: typeof entries }>("PUT", `/events/${id}/nomination`, { version, entries });
export const changeParticipation = (id: string, playerId: string, action: "withdraw" | "restore", version: string, reason: string) =>
  mutateWithCsrf<EventDetails, { version: string; reason: string }>("POST", `/events/${id}/participants/${playerId}/${action}`, { version, reason });
export const addEventParticipant = (id: string, body: { version: string; playerId: string; teamSeasonId: string }) =>
  mutateWithCsrf<EventDetails, typeof body>("POST", `/events/${id}/participants`, body);
export async function getNotifications(page: number) {
  return (await apiClient.get<PageResponse<Notice>>("/notifications", { params: { page } })).data;
}
export async function getUnreadCount() {
  return (await apiClient.get<{ count: number }>("/notifications/unread-count")).data.count;
}
export const markNoticeRead = (id: string) => mutateWithCsrf<void>("POST", `/notifications/${id}/read`);
export async function getEligibleEventParticipants(id: string, teamSeasonId: string) {
  return (await apiClient.get<{ id: string; name: string }[]>(`/events/${id}/eligible-participants`, { params: { teamSeasonId } })).data;
}
