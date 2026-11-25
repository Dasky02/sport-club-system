"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  addEventParticipant, changeParticipation, discardEventDraft, eventAction, getEligibleEventParticipants, getEvent, saveAttendance, saveAvailability, saveNomination,
  type Attendance, type Availability, type ClubEvent, type EventDetails, type EventTeam, type Nomination, type Participant,
} from "@/api/events";
import { useAuth } from "@/context/AuthContext";
import { ResourceView, useResource } from "@/components/club/Resource";
import { displayDateTime } from "./clubTime";
import { EventForm, eventError } from "./EventForm";
import { attendanceLabels, availabilityLabels, nominationLabels, statusLabels, typeLabels } from "./labels";

type Run = (operation: () => Promise<unknown>, message: string) => Promise<void>;
const notRecorded = "Bez záznamu";

function Values<T extends string>({ labels, value, change }: { labels: Record<T, string>; value: T | ""; change: (next: T | "") => void }) {
  return <select required value={value} onChange={(e) => change(e.target.value as T | "")}>
    <option value="">Vyberte odpověď</option>
    {(Object.keys(labels) as T[]).map((key) => <option key={key} value={key}>{labels[key]}</option>)}
  </select>;
}

function ParticipationForm({ children, submit, busy, text }: { children: ReactNode; submit: (data: FormData) => void; busy: boolean; text: string }) {
  const handle = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit(new FormData(e.currentTarget));
  };
  return <form className="event-part-form" onSubmit={handle}>
    <fieldset disabled={busy} className="event-fieldset">
      {children}
      <button type="submit" className="button button-secondary button-small">{text}</button>
    </fieldset>
  </form>;
}

function AvailabilityForm({ event, p, correction, busy, run }: { event: ClubEvent; p: Participant; correction: boolean; busy: boolean; run: Run }) {
  const [selection, choose] = useState<Availability | "">(p.availability ?? "");
  return <ParticipationForm busy={busy} text={correction ? "Opravit dostupnost" : "Uložit dostupnost"} submit={(data) => {
    if (selection) void run(() => saveAvailability(event.id, p.playerId, {
      version: p.version, availability: selection, availabilityComment: String(data.get("comment") ?? ""), reason: String(data.get("reason") ?? "") || undefined,
    }), "Dostupnost uložena.");
  }}>
    <label className="field">Odpověď<Values labels={availabilityLabels} value={selection} change={choose} /></label>
    <label className="field">Poznámka k dostupnosti<input name="comment" maxLength={500} defaultValue={p.availabilityComment ?? ""} /></label>
    {correction && <label className="field">Důvod opravy<input name="reason" maxLength={500} required /></label>}
  </ParticipationForm>;
}

function NominationForm({ event, p, busy, run }: { event: ClubEvent; p: Participant; busy: boolean; run: Run }) {
  const [selection, choose] = useState<Nomination | "">(p.nomination ?? "");
  return <ParticipationForm busy={busy} text="Uložit návrh nominace" submit={() => {
    if (selection) void run(() => saveNomination(event.id, event.version, [{ playerId: p.playerId, version: p.version, nomination: selection }]), "Návrh nominace uložen.");
  }}>
    <label className="field">Návrh nominace<Values labels={nominationLabels} value={selection} change={choose} /></label>
  </ParticipationForm>;
}

function AttendanceForm({ event, p, busy, run }: { event: ClubEvent; p: Participant; busy: boolean; run: Run }) {
  const [selection, choose] = useState<Attendance | "">(p.attendance ?? "");
  const [played, setPlayed] = useState(p.played === null ? "" : String(p.played));
  return <ParticipationForm busy={busy} text={event.status === "COMPLETED" ? "Opravit docházku" : "Uložit docházku"} submit={(data) => {
    if (selection) void run(() => saveAttendance(event.id, p.playerId, {
      version: p.version, attendance: selection, attendanceComment: String(data.get("comment") ?? ""),
      played: played === "" ? null : played === "true", reason: String(data.get("reason") ?? "") || undefined,
    }), "Docházka uložena.");
  }}>
    <label className="field">Stav docházky<Values labels={attendanceLabels} value={selection} change={(value) => {
      choose(value); if (played === "true" && value !== "PRESENT" && value !== "LATE") setPlayed("");
    }} /></label>
    {event.type === "MATCH" && <label className="field">Nastoupil(a)<select value={played} onChange={(e) => setPlayed(e.target.value)}>
      <option value="">Bez záznamu</option><option value="true" disabled={selection !== "PRESENT" && selection !== "LATE"}>Ano</option><option value="false">Ne</option>
    </select></label>}
    <label className="field">Poznámka k docházce<input name="comment" maxLength={500} defaultValue={p.attendanceComment ?? ""} /></label>
    {event.status === "COMPLETED" && <label className="field">Důvod opravy<input name="reason" maxLength={500} required /></label>}
  </ParticipationForm>;
}

function AddParticipantForm({ event, teams, admin, busy, run }: { event: ClubEvent; teams: EventTeam[]; admin: boolean; busy: boolean; run: Run }) {
  const [team, setTeam] = useState(teams[0].id);
  const [player, setPlayer] = useState("");
  const load = useCallback(() => getEligibleEventParticipants(event.id, team), [event.id, team]);
  const eligible = useResource(load, event.version);
  return <details className="detail-card event-expand">
    <summary>Přidat účastníka</summary>
    <label className="field">Tým<select value={team} onChange={(e) => { setTeam(e.target.value); setPlayer(""); }}>
      {teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
    <ResourceView {...eligible}>{(players) => players.length
      ? <ParticipationForm busy={busy} text="Přidat hráče" submit={() => {
        if (player) void run(() => addEventParticipant(event.id, { version: event.version, playerId: player, teamSeasonId: team }), "Hráč přidán k akci.");
      }}><label className="field">Hráč<select required value={player} onChange={(e) => setPlayer(e.target.value)}>
        <option value="">Vyberte hráče</option>{players.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label></ParticipationForm>
      : <div className="event-prerequisite">
        <p>V tomto týmu nejsou další hráči s platným členstvím v den akce.</p>
        {admin && <Link href={`/admin/teams/${team}#pridat-hrace`}>Zkontrolovat členství hráčů</Link>}
      </div>}
    </ResourceView>
  </details>;
}

function ParticipantCard({ event, p, team, admin, now, busy, run }: { event: ClubEvent; p: Participant; team: string; admin: boolean; now: number; busy: boolean; run: Run }) {
  const published = event.status === "PUBLISHED";
  const started = now >= Date.parse(event.schedule.startsAt);
  const deadline = Date.parse(event.schedule.availabilityDeadline ?? event.schedule.startsAt);
  const canAnswer = published && p.canAnswer && now <= deadline;
  const correction = !canAnswer && admin && (published || event.status === "COMPLETED");
  const active = !p.withdrawn;
  const canNominate = active && event.canManage && published && !started;
  const showNomination = event.type === "MATCH" || p.nomination !== null || p.publishedNomination !== null;
  return <article className="detail-card event-participant">
    <header className="event-heading"><div><h3>{p.name}</h3><p>{team}</p></div>{p.withdrawn && <span className="pill">Vyřazen z akce</span>}</header>
    <div className="event-part-columns">
      <section aria-label={`Dostupnost hráče ${p.name}`}>
        <h4>Dostupnost</h4>
        <p>{p.availability ? availabilityLabels[p.availability] : notRecorded}</p>
        {p.availabilityComment && <p className="event-description">{p.availabilityComment}</p>}
        {active && (canAnswer || correction) && <AvailabilityForm event={event} p={p} correction={correction} busy={busy} run={run} />}
      </section>
      {showNomination && <section aria-label={`Nominace hráče ${p.name}`}>
        <h4>Nominace</h4>
        <p>{p.publishedNomination ? nominationLabels[p.publishedNomination] : "Bez zveřejněné nominace"}</p>
        {canNominate && <NominationForm event={event} p={p} busy={busy} run={run} />}
      </section>}
      {!showNomination && canNominate && <details className="event-expand">
        <summary>Přidat nominaci</summary>
        <NominationForm event={event} p={p} busy={busy} run={run} />
      </details>}
      <section aria-label={`Docházka hráče ${p.name}`}>
        <h4>Docházka</h4>
        <p>{p.attendance ? attendanceLabels[p.attendance] : notRecorded}</p>
        {p.attendanceComment && <p className="event-description">{p.attendanceComment}</p>}
        {p.played !== null && <p>Nastoupil(a) {p.played ? "ano" : "ne"}</p>}
        {active && p.canManage && started && (published || (admin && event.status === "COMPLETED")) && <AttendanceForm event={event} p={p} busy={busy} run={run} />}
      </section>
    </div>
    {p.canManage && published && !started && (p.withdrawn ? admin : p.attendance === null) && <details className="event-expand">
      <summary>{p.withdrawn ? "Obnovit účast" : "Vyřadit z akce"}</summary>
      <ParticipationForm busy={busy} text={p.withdrawn ? "Obnovit účast" : "Vyřadit z akce"} submit={(data) => {
        void run(() => changeParticipation(event.id, p.playerId, p.withdrawn ? "restore" : "withdraw", p.version, String(data.get("reason"))), "Účast upravena.");
      }}><label className="field">Důvod změny<input name="reason" maxLength={500} required /></label></ParticipationForm>
    </details>}
  </article>;
}

function EventContent({ details, reload, admin }: { details: EventDetails; reload: (message?: string) => void; admin: boolean }) {
  const router = useRouter();
  const { event, teams, match, participants } = details;
  const { schedule } = event;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const started = now >= Date.parse(schedule.startsAt);
  const ended = now >= Date.parse(schedule.endsAt);
  const published = event.status === "PUBLISHED";
  const draft = event.status === "DRAFT";
  const canEdit = event.canManage && (draft || (published && !started));
  const pendingNomination = participants.some((p) => !p.withdrawn && p.nomination !== p.publishedNomination);
  const run: Run = async (operation, text) => {
    setBusy(true); setError("");
    try { await operation(); reload(text); }
    catch (failure) { setError(eventError(failure)); }
    finally { setBusy(false); }
  };
  const discard = async () => {
    if (!window.confirm("Zahodit koncept akce?")) return;
    setBusy(true); setError("");
    try { await discardEventDraft(event.id, event.version); router.push("/calendar"); }
    catch (failure) { setError(eventError(failure)); setBusy(false); }
  };
  const action = (name: Parameters<typeof eventAction>[1], text: string) => void run(() => eventAction(event.id, name, event.version), text);
  return <>
    <header className="event-heading"><h1>{schedule.title}</h1><span className="pill">{typeLabels[event.type]} · {statusLabels[event.status]}</span></header>
    <div className="detail-card">
      {match && <p className="event-match"><strong>{match.homeTeamName} – {match.awayTeamName}</strong><br />{match.competitionName ?? "Přátelský zápas"} · {match.formatName}</p>}
      <dl className="event-meta">
        <div><dt>Začátek</dt><dd>{displayDateTime(schedule.startsAt)}</dd></div>
        <div><dt>Konec</dt><dd>{displayDateTime(schedule.endsAt)}</dd></div>
        {schedule.location && <div><dt>Místo</dt><dd>{schedule.location}</dd></div>}
        {!!teams.length && <div><dt>Klubové týmy</dt><dd>{teams.map((team) => team.name).join(", ")}</dd></div>}
        <div><dt>Uzávěrka dostupnosti</dt><dd>{displayDateTime(schedule.availabilityDeadline ?? schedule.startsAt)}</dd></div>
        {event.nominationPublishedAt && <div><dt>Poslední zveřejnění nominace</dt><dd>{displayDateTime(event.nominationPublishedAt)}</dd></div>}
      </dl>
      {schedule.description && <p className="event-description">{schedule.description}</p>}
      {event.canManage && <div className="event-actions">
        {draft && !started && <button className="button" type="button" disabled={busy} onClick={() => action("publish", "Akce zveřejněna.")}>Zveřejnit akci</button>}
        {draft && <button className="button button-secondary" type="button" disabled={busy} onClick={() => void discard()}>Zahodit koncept</button>}
        {published && !started && <button className="button button-secondary" type="button" disabled={busy} onClick={() => {
          if (window.confirm("Zrušit tuto akci a upozornit účastníky?")) action("cancel", "Akce zrušena.");
        }}>Zrušit akci</button>}
        {published && ended && <button className="button" type="button" disabled={busy} onClick={() => action("complete", "Akce označena jako dokončená.")}>Označit jako dokončenou</button>}
      </div>}
    </div>
    {canEdit && <details className="detail-card event-expand"><summary>Upravit údaje akce</summary><EventForm key={event.version} event={event} onSaved={() => reload("Údaje akce uloženy.")} /></details>}
    {error && <div className="message message-error" role="alert">{error} <button className="text-button" type="button" onClick={() => reload()}>Obnovit údaje</button></div>}
    {!draft && <section className="event-participants">
      <div className="event-heading">
        <h2>Účastníci</h2>
        {event.canManage && published && !started && pendingNomination && <button type="button" className="button" disabled={busy} onClick={() => action("nomination/publish", "Nominace zveřejněna.")}>Zveřejnit nominaci</button>}
      </div>
      {event.canManage && published && !started && teams.length > 0 && <AddParticipantForm event={event} teams={teams} admin={admin} busy={busy} run={run} />}
      {participants.length ? participants.map((p) => <ParticipantCard key={`${p.playerId}-${p.version}`} event={event} p={p} team={teams.find((team) => team.id === p.teamSeasonId)?.name ?? ""} admin={admin} now={now} busy={busy} run={run} />)
        : <p>Nemáte žádné dostupné záznamy účastníků.</p>}
    </section>}
  </>;
}

export function EventDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const [notice, setNotice] = useState("");
  const load = useCallback(() => getEvent(id), [id]);
  const state = useResource(load, user?.id);
  return <section className="club-page event-page">
    <Link className="back-link" href="/calendar">← Kalendář</Link>
    {notice && <p role="status">{notice}</p>}
    <ResourceView {...state}>{(details) => <EventContent details={details} reload={(message) => { setNotice(message ?? ""); state.reload(); }} admin={user?.role === "ADMIN"} />}</ResourceView>
  </section>;
}
