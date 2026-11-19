"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { getSports } from "@/api/club";
import { allPages, createTeam, createTeamSeason, getSeasons, getTeams, getTeamSeasons, renameTeamSeason, updateTeam, type SeasonResponse, type TeamRequest, type TeamResponse, type TeamSeasonResponse } from "@/api/teams";
import { mapFieldErrors } from "@/api/errorMapper";
import type { SportResponse } from "@/api/types";
import { AccessGate } from "../AccessGate";
import { FormField } from "../FormField";
import { FormError, SelectField } from "./Fields";
import { EmptyState, Pagination, ResourceView, useResource } from "./Resource";
import { AdminPageHeader } from "./AdminPageHeader";

function TeamForm({ initial, sportId, sports, onSaved, onCancel }: {
  initial?: TeamResponse; sportId?: string; sports: SportResponse[]; onSaved: (created?: TeamResponse) => void; onCancel?: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const body: TeamRequest = { name: String(data.get("name") ?? "").trim(), sportId: String(data.get("sportId") ?? ""), isClubTeam: data.get("isClubTeam") === "on" };
    if (!body.name || !body.sportId) { setError(new Error("Invalid fields")); setErrors({ ...(!body.name ? { name: "Vyplňte název týmu." } : {}) }); return; }
    setPending(true); setError(null); setErrors({});
    try {
      if (initial) {
        const changes: Partial<TeamRequest> = {};
        if (body.name !== initial.name) changes.name = body.name;
        if (body.sportId !== initial.sportId) changes.sportId = body.sportId;
        if (body.isClubTeam !== initial.isClubTeam) changes.isClubTeam = body.isClubTeam;
        if (Object.keys(changes).length) await updateTeam(initial.id, changes);
        onSaved();
      } else {
        const created = await createTeam(body);
        form.reset();
        onSaved(created);
      }
    } catch (caught: unknown) { setError(caught); setErrors(mapFieldErrors(caught, ["name", "sportId", "isClubTeam"])); }
    finally { setPending(false); }
  };
  return <form className="club-form" aria-label={initial ? "Upravit tým" : "Nový tým"} onSubmit={submit} aria-busy={pending}>
    <FormField name="name" label="Název týmu" defaultValue={initial?.name} maxLength={120} required disabled={pending} error={errors.name} />
    <SelectField name="sportId" label="Sport týmu" defaultValue={initial?.sportId ?? sportId ?? ""} required disabled={pending} error={errors.sportId}><option value="">Vyberte sport</option>{sports.filter((sport) => sport.active || sport.id === initial?.sportId).map((sport) => <option key={sport.id} value={sport.id}>{sport.name}{sport.active ? "" : " (neaktivní)"}</option>)}</SelectField>
    <label className="checkbox-field"><input name="isClubTeam" type="checkbox" defaultChecked={initial?.isClubTeam ?? true} disabled={pending} /> Klubový tým</label>
    <p className="field-hint">Pro soupeře z jiného klubu volbu odškrtněte.</p>
    <FormError error={error} fieldErrors={errors} /><div className="actions"><button className="button" disabled={pending || !sports.some((sport) => sport.active || sport.id === initial?.sportId)}>{pending ? "Ukládám…" : initial ? "Uložit tým" : "Vytvořit tým"}</button>{onCancel && <button type="button" className="text-button" onClick={onCancel} disabled={pending}>Zrušit úpravy</button>}</div>
  </form>;
}

function TeamCard({ team, sports, onSaved }: { team: TeamResponse; sports: SportResponse[]; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  return <article className="detail-card" aria-label={team.name}><h3>{team.name}</h3><p>{team.sportName} · {team.isClubTeam ? "Klubový tým" : "Externí soupeř"}</p>{editing ? <TeamForm initial={team} sports={sports} onSaved={onSaved} onCancel={() => setEditing(false)} /> : <button className="text-button" onClick={() => setEditing(true)}>Upravit tým</button>}</article>;
}

function TeamSeasonForm({ teams, seasons, initialTeam, onSaved }: {
  teams: TeamResponse[]; seasons: SeasonResponse[]; initialTeam: TeamResponse | null; onSaved: (team: TeamSeasonResponse) => void;
}) {
  const [pending, setPending] = useState(false); const [error, setError] = useState<unknown>(null); const [errors, setErrors] = useState<Record<string, string>>({});
  const openSeasons = seasons.filter((season) => !season.archived);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const body = { teamId: String(data.get("teamId") ?? ""), seasonId: String(data.get("seasonId") ?? ""), displayName: String(data.get("displayName") ?? "").trim() };
    if (!body.displayName) { setError(new Error("Name missing")); setErrors({ displayName: "Vyplňte sezónní název týmu." }); return; }
    setPending(true); setError(null); setErrors({});
    try { const team = await createTeamSeason(body); form.reset(); onSaved(team); }
    catch (caught: unknown) { setError(caught); setErrors(mapFieldErrors(caught, ["displayName", "teamId", "seasonId"])); }
    finally { setPending(false); }
  };
  return <form id="zaradit-tym" className="detail-card club-form admin-editor" aria-label="Tým do sezóny" onSubmit={submit} aria-busy={pending}><h3>Zařadit tým do sezóny</h3>
    <SelectField name="teamId" label="Tým k zařazení" required defaultValue={initialTeam?.id ?? ""} disabled={pending} error={errors.teamId}><option value="">Vyberte tým</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name} · {team.sportName}{team.isClubTeam ? "" : " · externí"}</option>)}</SelectField>
    <SelectField name="seasonId" label="Sezóna pro tým" required defaultValue={openSeasons.length === 1 ? openSeasons[0].id : ""} disabled={pending} error={errors.seasonId}><option value="">Vyberte sezónu</option>{openSeasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</SelectField>
    <FormField name="displayName" label="Název týmu v sezóně" maxLength={120} defaultValue={initialTeam?.name} required disabled={pending} error={errors.displayName} />
    <FormError error={error} fieldErrors={errors} />
    {!teams.length && <p><a href="#novy-tym">Nejprve vytvořte tým</a>.</p>}
    {!openSeasons.length && <p><Link href="/admin/seasons#nova-sezona">Založit sezónu</Link></p>}
    <button className="button" disabled={pending || !teams.length || !openSeasons.length}>{pending ? "Ukládám…" : "Zařadit tým do sezóny"}</button>
  </form>;
}

function TeamSeasonCard({ team, onSaved }: { team: TeamSeasonResponse; onSaved: () => void }) {
  const [editing, setEditing] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState<unknown>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const name = String(new FormData(event.currentTarget).get("displayName") ?? "").trim();
    if (!name) return; setPending(true); setError(null);
    try { if (name !== team.displayName) await renameTeamSeason(team.id, name); onSaved(); }
    catch (caught: unknown) { setError(caught); } finally { setPending(false); }
  };
  return <article className="detail-card" aria-label={team.displayName}><h3>{team.displayName}</h3><p>{team.sportName} · {team.seasonName} · {team.isClubTeam ? "Klubový tým" : "Externí soupeř"}{team.archived ? " · archiv" : ""}</p><div className="actions"><Link className="button button-secondary button-small" href={`/teams/${team.id}`}>Zobrazit soupisku</Link>{team.isClubTeam && <Link className="button button-small" href={`/admin/teams/${team.id}`}>Spravovat členství</Link>}{!team.archived && <button className="text-button" onClick={() => setEditing(true)}>Upravit sezónní název</button>}</div>
    {editing && !team.archived && <form className="club-form" onSubmit={submit}><FormField name="displayName" label="Nový sezónní název" defaultValue={team.displayName} maxLength={120} required disabled={pending} /><FormError error={error} /><button className="button button-small" disabled={pending}>Uložit sezónní název</button><button className="text-button" type="button" disabled={pending} onClick={() => setEditing(false)}>Zrušit úpravy</button></form>}
  </article>;
}

function TeamsContent({ sportId }: { sportId?: string }) {
  const [page, setPage] = useState(0); const [teamPage, setTeamPage] = useState(0); const [notice, setNotice] = useState<string | null>(null);
  const [created, setCreated] = useState<TeamResponse | null>(null);
  const [enrolled, setEnrolled] = useState<TeamSeasonResponse | null>(null);
  const load = useCallback(async () => {
    const [sports, seasons, allTeams, teams, teamSeasons] = await Promise.all([allPages(getSports), allPages(getSeasons), allPages(getTeams), getTeams(teamPage), getTeamSeasons(page)]);
    return { sports, seasons, allTeams, teams, teamSeasons };
  }, [page, teamPage]);
  const { resource, reload } = useResource(load);
  const saved = (team?: TeamResponse) => {
    setCreated(team ?? null);
    setEnrolled(null);
    setNotice(team ? `Tým ${team.name} je založený.` : "Týmové údaje byly uloženy.");
    reload();
  };
  const assigned = (team: TeamSeasonResponse) => {
    setCreated(null);
    setEnrolled(team);
    setNotice(`Tým ${team.displayName} je zařazený do sezóny.`);
    reload();
  };
  return (
    <section className="club-page">
      <AdminPageHeader title="Správa týmů a členství" actions={[{ id: "novy-tym", label: "Nový tým" }, { id: "zaradit-tym", label: "Zařadit do sezóny" }]} />
      {notice && <div className="message message-success" role="status">
        <p>{notice}</p>
        {created && <a className="text-button" href="#zaradit-tym">Zařadit nový tým do sezóny</a>}
        {enrolled?.isClubTeam && <Link className="text-button" href={{ pathname: "/calendar/new", query: { team: enrolled.id } }}>Naplánovat akci pro tým</Link>}
      </div>}
      <ResourceView resource={resource} reload={reload}>{(data) => (
        <>
          <section className="club-section" aria-label="Týmy">
            <h2>Základní týmy</h2>
            <div className="admin-split">
              <div className="club-stack">
                {data.teams.items.length ? data.teams.items.map((team) => <TeamCard key={team.id} team={team} sports={data.sports} onSaved={saved} />) : <EmptyState>Zatím nejsou vytvořené žádné týmy.</EmptyState>}
                <Pagination page={teamPage} result={data.teams} changePage={setTeamPage} />
              </div>
              <div id="novy-tym" className="detail-card admin-editor">
                <h3>Nový tým</h3>
                {!data.sports.some((sport) => sport.active) && <p><Link href="/admin/sports#novy-sport">Nejprve přidejte nebo aktivujte sport</Link>.</p>}
                <TeamForm sports={data.sports} sportId={data.sports.find((sport) => sport.active && sport.id === sportId)?.id} onSaved={saved} />
              </div>
            </div>
          </section>
          <section className="club-section" aria-label="Týmy v sezónách">
            <h2>Týmy v sezónách</h2>
            <div className="admin-split">
              <div className="club-stack">
                {data.teamSeasons.items.length ? data.teamSeasons.items.map((team) => <TeamSeasonCard key={team.id} team={team} onSaved={saved} />) : <EmptyState>Zatím není žádný tým zařazený do sezóny.</EmptyState>}
                <Pagination page={page} result={data.teamSeasons} changePage={setPage} />
              </div>
              <TeamSeasonForm teams={data.allTeams} seasons={data.seasons} initialTeam={created} onSaved={assigned} />
            </div>
          </section>
        </>
      )}</ResourceView>
    </section>
  );
}

export function TeamsManager({ sportId }: { sportId?: string }) {
  return <AccessGate completeProfile capability="MANAGE_TEAMS"><TeamsContent key={sportId} sportId={sportId} /></AccessGate>;
}
