"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { addCoachMembership, addPlayerMembership, allPages, getCoachCandidates, getCoachMemberships, getPlayerMemberships, getPlayers, getTeamSeason, updateCoachMembership, updatePlayerMembership, type CoachCandidate, type CoachMembership, type IntervalRequest, type PlayerMembership, type PlayerResponse, type TeamSeasonResponse } from "@/api/teams";
import { useAuth } from "@/context/AuthContext";
import { AccessGate } from "../AccessGate";
import { FormField } from "../FormField";
import { FormError, intervalError, intervalLabel, SelectField } from "./Fields";
import { EmptyState, Pagination, ResourceView, useResource } from "./Resource";
import { AdminPageHeader } from "./AdminPageHeader";

function IntervalFields({ team, initial, disabled }: { team: TeamSeasonResponse; initial?: IntervalRequest; disabled: boolean }) {
  return <><div className="form-grid"><FormField name="validFrom" label="Začátek členství" type="date" min={team.startsOn} max={team.endsOn} defaultValue={initial?.validFrom ?? team.startsOn} required disabled={disabled} /><FormField name="validTo" label="Konec členství" type="date" min={team.startsOn} max={team.endsOn} defaultValue={initial?.validTo ?? ""} disabled={disabled} /></div><p className="field-hint">Začátek je zahrnutý, den konce už nepatří do členství. Prázdný konec znamená konec sezóny {team.endsOn}. Celý interval musí ležet v sezóně.</p></>;
}

function MembershipForm({ team, kind, players = [], coaches = [], playerId, initial, onSaved, onCancel }: {
  team: TeamSeasonResponse; kind: "player" | "coach"; players?: PlayerResponse[]; coaches?: CoachCandidate[];
  playerId?: string; initial?: PlayerMembership | CoachMembership; onSaved: () => void; onCancel?: () => void;
}) {
  const { user } = useAuth();
  const [pending, setPending] = useState(false); const [error, setError] = useState<unknown>(null); const [validation, setValidation] = useState<string | null>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const interval: IntervalRequest = { validFrom: String(data.get("validFrom") ?? ""), validTo: String(data.get("validTo") ?? "") || null };
    const invalid = intervalError(interval.validFrom, interval.validTo, team.startsOn, team.endsOn);
    if (invalid) { setValidation(invalid); return; }
    setPending(true); setError(null); setValidation(null);
    try {
      if (initial) { if (kind === "player") await updatePlayerMembership(initial.id, interval); else await updateCoachMembership(initial.id, interval); }
      else if (kind === "player") await addPlayerMembership(team.id, { ...interval, playerId: String(data.get("playerId") ?? "") });
      else await addCoachMembership(team.id, { ...interval, coachUserId: String(data.get("coachUserId") ?? "") });
      if (!initial) form.reset(); onSaved();
    } catch (caught: unknown) { setError(caught); } finally { setPending(false); }
  };
  return <form className="club-form" aria-label={initial ? "Upravit interval členství" : kind === "player" ? "Přidat hráčské členství" : "Přidat trenérské přiřazení"} onSubmit={submit} aria-busy={pending}>
    {!initial && (kind === "player" ? <SelectField name="playerId" label="Hráč" required defaultValue={players.find(({ id }) => id === playerId)?.id ?? ""} disabled={pending}><option value="">Vyberte hráče</option>{players.map((player) => <option key={player.id} value={player.id}>{player.firstName} {player.lastName} · {player.birthDate}</option>)}</SelectField>
      : <SelectField name="coachUserId" label="Trenér" required defaultValue={coaches.some((coach) => coach.id === user?.id) ? user?.id : ""} disabled={pending} hint="Výběr obsahuje jen povolené běžné účty s osobou. Vlastní účet můžete přiřadit stejně jako ostatní kandidáty."><option value="">Vyberte trenéra</option>{coaches.map((coach) => <option key={coach.id} value={coach.id}>{coach.firstName} {coach.lastName} ({coach.username}){coach.id === user?.id ? " · váš účet" : ""}</option>)}</SelectField>)}
    <IntervalFields team={team} initial={initial} disabled={pending} />{validation && <p className="message message-error" role="alert">{validation}</p>}<FormError error={error} />
    <div className="actions"><button className="button button-small" disabled={pending || (!initial && !(kind === "player" ? players.length : coaches.length))}>{pending ? "Ukládám…" : initial ? "Uložit interval" : kind === "player" ? "Přidat hráče do týmu" : "Přidat trenéra"}</button>{onCancel && <button className="text-button" type="button" disabled={pending} onClick={onCancel}>Zrušit úpravy</button>}</div>
  </form>;
}

function MembershipCard({ membership, team, kind, onSaved }: { membership: PlayerMembership | CoachMembership; team: TeamSeasonResponse; kind: "player" | "coach"; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const name = `${membership.firstName} ${membership.lastName}`;
  return <article className="detail-card" aria-label={name}><h3>{name}</h3>{"username" in membership && <p className="subtle">Účet: {membership.username}</p>}<p>{intervalLabel(membership.validFrom, membership.validTo)}</p>{"playerId" in membership && <Link className="text-button" href={`/players/${membership.playerId}`}>Profil a členství</Link>}{!team.archived && <button className="text-button" onClick={() => setEditing(true)}>Upravit interval</button>}{editing && !team.archived && <MembershipForm team={team} kind={kind} initial={membership} onSaved={onSaved} onCancel={() => setEditing(false)} />}</article>;
}

function NewMemberships({ team, playerId, onSaved }: { team: TeamSeasonResponse; playerId?: string; onSaved: () => void }) {
  const load = useCallback(async () => {
    const [players, coaches] = await Promise.all([allPages(getPlayers), allPages(getCoachCandidates)]);
    return { players, coaches };
  }, []);
  const { resource, reload } = useResource(load);
  return (
    <ResourceView resource={resource} reload={reload}>{({ players, coaches }) => (
      <div className="club-two-columns section-space">
        <section id="pridat-hrace" className="detail-card admin-editor">
          <h2>Přidat hráčské členství</h2>
          {!players.length && <p>Nejprve <Link href="/admin/players#novy-hrac">založte hráče</Link>.</p>}
          <MembershipForm key={playerId} team={team} kind="player" players={players} playerId={playerId} onSaved={onSaved} />
        </section>
        <section id="pridat-trenera" className="detail-card admin-editor">
          <h2>Přidat trenérské přiřazení</h2>
          <MembershipForm team={team} kind="coach" coaches={coaches} onSaved={onSaved} />
        </section>
      </div>
    )}</ResourceView>
  );
}

function MembershipLists({ team, playerId, onSaved }: { team: TeamSeasonResponse; playerId?: string; onSaved: () => void }) {
  const [playerPage, setPlayerPage] = useState(0);
  const [coachPage, setCoachPage] = useState(0);
  const load = useCallback(async () => {
    const [players, coaches] = await Promise.all([getPlayerMemberships(team.id, playerPage), getCoachMemberships(team.id, coachPage)]);
    return { players, coaches };
  }, [team.id, playerPage, coachPage]);
  const { resource, reload } = useResource(load);

  return <>
    {team.archived && <p className="message" role="status">Sezóna je archivovaná. Členství jsou dostupná ke čtení.</p>}
    {playerId && !team.archived && <NewMemberships team={team} playerId={playerId} onSaved={onSaved} />}
    <ResourceView resource={resource} reload={reload}>{({ players, coaches }) => (
      <div className="club-two-columns club-section">
        <section className="club-stack" aria-label="Hráčská členství">
          <h2>Hráčská členství</h2>
          {players.items.length ? players.items.map((membership) => (
            <MembershipCard key={membership.id} membership={membership} team={team} kind="player" onSaved={onSaved} />
          )) : <EmptyState>Tým zatím nemá hráčská členství.</EmptyState>}
          <Pagination page={playerPage} result={players} changePage={setPlayerPage} />
        </section>
        <section className="club-stack" aria-label="Trenérská přiřazení">
          <h2>Trenérská přiřazení</h2>
          {coaches.items.length ? coaches.items.map((membership) => (
            <MembershipCard key={membership.id} membership={membership} team={team} kind="coach" onSaved={onSaved} />
          )) : <EmptyState>Tým zatím nemá trenérská přiřazení.</EmptyState>}
          <Pagination page={coachPage} result={coaches} changePage={setCoachPage} />
        </section>
      </div>
    )}</ResourceView>
    {!playerId && !team.archived && <NewMemberships team={team} onSaved={onSaved} />}
  </>;
}

function MembershipContent({ id, playerId, saved, onSaved }: { id: string; playerId?: string; saved: boolean; onSaved: () => void }) {
  const load = useCallback(() => getTeamSeason(id), [id]);
  const { resource, reload } = useResource(load);
  return <section className="club-page">
    {saved && <p className="message message-success" role="status">Členství bylo uloženo.</p>}
    <ResourceView resource={resource} reload={reload}>{(team) => <>
      <Link className="back-link" href="/admin/teams">Zpět na správu týmů</Link>
      <AdminPageHeader title={team.displayName} actions={team.isClubTeam && !team.archived ? [{ id: "pridat-hrace", label: "Přidat hráče" }, { id: "pridat-trenera", label: "Přidat trenéra" }] : undefined} />
      <p>{team.sportName} · {team.seasonName}</p>
      <Link className="text-button" href={`/teams/${team.id}`}>Zobrazit soupisku</Link>
      {team.isClubTeam ? <MembershipLists team={team} playerId={saved ? undefined : playerId} onSaved={onSaved} /> : <EmptyState>Externí soupeř nemá interní hráčská ani trenérská členství.</EmptyState>}
    </>}</ResourceView>
  </section>;
}

export function MembershipsManager({ id, playerId }: { id: string; playerId?: string }) {
  const { refreshUser } = useAuth();
  const [saved, setSaved] = useState(false);
  return <AccessGate completeProfile capability="MANAGE_MEMBERSHIPS"><MembershipContent id={id} playerId={playerId} saved={saved}
    onSaved={() => { setSaved(true); void refreshUser(); }} /></AccessGate>;
}
