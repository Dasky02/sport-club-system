"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { allPages, createPlayer, getPerson, getPersons, getPlayers, getTeamSeasons, updatePerson, type PlayerRequest, type PlayerResponse } from "@/api/teams";
import type { PersonResponse } from "@/api/types";
import { mapFieldErrors } from "@/api/errorMapper";
import { useAuth } from "@/context/AuthContext";
import { AccessGate } from "../AccessGate";
import { FormError, PersonFields, personFromForm, SelectField } from "./Fields";
import { EmptyState, Pagination, ResourceView, useResource } from "./Resource";
import { AdminPageHeader } from "./AdminPageHeader";

const personFields = ["firstName", "lastName", "birthDate", "email", "phone"];

function NewPlayer({ persons, usedPersonIds, onSaved }: { persons: PersonResponse[]; usedPersonIds: Set<string>; onSaved: (player: PlayerResponse) => void }) {
  const [mode, setMode] = useState("new"); const [pending, setPending] = useState(false); const [error, setError] = useState<unknown>(null); const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    let body: PlayerRequest;
    if (mode === "existing") { body = { personId: String(data.get("personId") ?? "") }; }
    else {
      const person = personFromForm(data);
      if (!person.firstName || !person.lastName || !person.birthDate) { setError(new Error("Required fields")); setErrors({ ...(!person.firstName ? { firstName: "Vyplňte jméno." } : {}), ...(!person.lastName ? { lastName: "Vyplňte příjmení." } : {}), ...(!person.birthDate ? { birthDate: "Hráč musí mít datum narození." } : {}) }); return; }
      body = { person: { ...person, birthDate: person.birthDate } };
    }
    setPending(true); setError(null); setErrors({});
    try { const player = await createPlayer(body); form.reset(); onSaved(player); }
    catch (caught: unknown) {
      setError(caught);
      const mapped = mapFieldErrors(caught, [...personFields, ...personFields.map((field) => `person.${field}`), "personId"]);
      setErrors(Object.fromEntries(Object.entries(mapped).map(([key, value]) => [key.replace(/^person\./, ""), value])));
    } finally { setPending(false); }
  };
  return <form id="novy-hrac" className="detail-card club-form admin-editor" aria-label="Nový hráč" onSubmit={submit} aria-busy={pending}><h2>Nový hráč</h2>
    <SelectField name="mode" label="Založení hráče" value={mode} disabled={pending} onChange={(event) => { setMode(event.target.value); setError(null); setErrors({}); }}><option value="new">Nová osoba a hráč společně</option><option value="existing">Již evidovaná osoba</option></SelectField>
    {mode === "new" ? <PersonFields requiredBirthDate disabled={pending} errors={errors} /> : <SelectField name="personId" label="Evidovaná osoba" defaultValue="" required disabled={pending} hint="Osoba musí mít datum narození a nesmí již mít hráčský profil. Chybějící datum doplňte níže v přehledu osob."><option value="">Vyberte osobu</option>{persons.map((person) => <option key={person.id} value={person.id} disabled={!person.birthDate || usedPersonIds.has(person.id)}>{person.firstName} {person.lastName}{usedPersonIds.has(person.id) ? " · již hráč" : !person.birthDate ? " · chybí datum narození" : ` · ${person.birthDate}`}</option>)}</SelectField>}
    <p className="field-hint">Hráč nemusí mít účet ani rodiče. Tato operace nepřiděluje přihlášení ani nevytváří rodičovské vazby.</p><FormError error={error} fieldErrors={errors} /><button className="button" disabled={pending}>{pending ? "Ukládám…" : "Vytvořit hráče"}</button>
  </form>;
}

function PersonEditForm({ person, requiredBirthDate, onSaved, onCancel }: { person: PersonResponse; requiredBirthDate: boolean; onSaved: () => void; onCancel: () => void }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState<unknown>(null); const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const body = personFromForm(new FormData(event.currentTarget));
    if (!body.firstName || !body.lastName || (requiredBirthDate && !body.birthDate)) { setError(new Error("Required fields")); setErrors({ ...(!body.firstName ? { firstName: "Vyplňte jméno." } : {}), ...(!body.lastName ? { lastName: "Vyplňte příjmení." } : {}), ...(requiredBirthDate && !body.birthDate ? { birthDate: "Hráč musí mít datum narození." } : {}) }); return; }
    setPending(true); setError(null); setErrors({});
    try { await updatePerson(person.id, body); onSaved(); }
    catch (caught: unknown) { setError(caught); setErrors(mapFieldErrors(caught, personFields)); } finally { setPending(false); }
  };
  return <form className="club-form" aria-label={`Úprava osoby ${person.firstName} ${person.lastName}`} onSubmit={submit} aria-busy={pending}><PersonFields initial={person} requiredBirthDate={requiredBirthDate} disabled={pending} errors={errors} /><FormError error={error} fieldErrors={errors} /><div className="actions"><button className="button button-small" disabled={pending}>{pending ? "Ukládám…" : "Uložit osobu"}</button><button className="text-button" type="button" disabled={pending} onClick={onCancel}>Zrušit úpravy</button></div></form>;
}

function PersonEditor({ personId, requiredBirthDate, onSaved, onCancel }: { personId: string; requiredBirthDate: boolean; onSaved: () => void; onCancel: () => void }) {
  const load = useCallback(() => getPerson(personId), [personId]); const { resource, reload } = useResource(load);
  return <ResourceView resource={resource} reload={reload}>{(person) => <PersonEditForm person={person} requiredBirthDate={requiredBirthDate} onSaved={onSaved} onCancel={onCancel} />}</ResourceView>;
}

const loadTeamChoices = () => allPages(getTeamSeasons);

function PlayerTeamPicker({ player, close }: { player: PlayerResponse; close: () => void }) {
  const teams = useResource(loadTeamChoices);
  const [selected, setSelected] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return (
    <section className="detail-card admin-editor" aria-label="Vybrat tým pro hráče">
      <h2 ref={heading} tabIndex={-1}>Přiřadit do týmu</h2>
      <p>{player.firstName} {player.lastName}</p>
      <ResourceView {...teams}>{(data) => {
        const available = data.filter((team) => team.isClubTeam && !team.archived);
        if (!available.length) return <p>Nejprve <Link href="/admin/teams#zaradit-tym">zařaďte klubový tým do sezóny</Link>.</p>;
        const team = available.find(({ id }) => id === selected);
        return <>
          <SelectField name="teamForPlayer" label="Klubový tým v sezóně" value={selected} onChange={(event) => setSelected(event.target.value)}>
            <option value="">Vyberte tým</option>
            {available.map(({ id, displayName, seasonName, sportName }) => (
              <option key={id} value={id}>{displayName} · {sportName} · {seasonName}</option>
            ))}
          </SelectField>
          {team && <Link className="button" href={{ pathname: `/admin/teams/${team.id}`, query: { player: player.id }, hash: "pridat-hrace" }}>Nastavit členství</Link>}
        </>;
      }}</ResourceView>
      <div className="actions"><button type="button" className="text-button" onClick={close}>Zavřít výběr týmu</button></div>
    </section>
  );
}

function PlayersContent() {
  const { user, context, refreshUser } = useAuth();
  const [assigning, setAssigning] = useState<PlayerResponse | null>(null);
  const canAssign = context?.capabilities.includes("MANAGE_MEMBERSHIPS");
  const [page, setPage] = useState(0); const [personPage, setPersonPage] = useState(0); const [editing, setEditing] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [players, persons, allPersons, allPlayers] = await Promise.all([getPlayers(page), getPersons(personPage), allPages(getPersons), allPages(getPlayers)]);
    return { players, persons, allPersons, usedPersonIds: new Set(allPlayers.map((player) => player.personId)) };
  }, [page, personPage]);
  const { resource, reload } = useResource(load);
  const saved = () => { setNotice("Hráčské a osobní údaje byly uloženy."); setEditing(null); reload(); void refreshUser(); };
  const created = (player: PlayerResponse) => {
    setNotice(`Hráč ${player.firstName} ${player.lastName} je založený.`);
    setAssigning(canAssign ? player : null);
    setPage(0);
    reload();
    if (player.personId === user?.personId) void refreshUser();
  };
  return <section className="club-page">
    <AdminPageHeader title="Správa hráčů a osob" actions={[{ id: "novy-hrac", label: "Přidat hráče" }]} />
    {notice && <p className="message message-success" role="status">{notice}</p>}
    {canAssign && assigning && <div className="section-space"><PlayerTeamPicker key={assigning.id} player={assigning} close={() => setAssigning(null)} /></div>}
    <ResourceView resource={resource} reload={reload}>{(data) => <>
    <section className="club-section" aria-label="Hráči"><div className="admin-split"><div className="club-stack"><h2>Evidovaní hráči</h2>{data.players.items.length ? data.players.items.map((player) => <article className="detail-card" key={player.id} aria-label={`${player.firstName} ${player.lastName}`}><h3>{player.firstName} {player.lastName}</h3><p>Datum narození: {player.birthDate}</p><div className="actions">{canAssign && <button className="button button-secondary button-small" type="button" onClick={() => setAssigning(player)}>Přiřadit do týmu</button>}<Link className="text-button" href={`/players/${player.id}`}>Profil a členství</Link><button className="text-button" onClick={() => setEditing(`player:${player.personId}`)}>Upravit údaje hráče</button><Link className="text-button" href={`/admin/players/${player.id}/guardians`}>Rodiče a zástupci</Link></div>{editing === `player:${player.personId}` && <PersonEditor personId={player.personId} requiredBirthDate onSaved={saved} onCancel={() => setEditing(null)} />}</article>) : <EmptyState>Zatím nejsou evidovaní žádní hráči.</EmptyState>}<Pagination page={page} result={data.players} changePage={setPage} /></div><NewPlayer persons={data.allPersons} usedPersonIds={data.usedPersonIds} onSaved={created} /></div></section>
    <section className="club-section" aria-label="Osoby"><h2>Evidované osoby</h2><p className="subtle">Kontaktní údaje jsou pouze v této administraci. Obecná soupiska je nezobrazuje.</p><div className="club-cards">{data.persons.items.map((person) => <article className="detail-card" key={person.id} aria-label={`${person.firstName} ${person.lastName}`}><h3>{person.firstName} {person.lastName}</h3><p>Datum narození: {person.birthDate ?? "neuvedeno"}</p><button className="text-button" onClick={() => setEditing(`person:${person.id}`)}>Upravit osobu</button>{editing === `person:${person.id}` && <PersonEditor personId={person.id} requiredBirthDate={data.usedPersonIds.has(person.id)} onSaved={saved} onCancel={() => setEditing(null)} />}</article>)}</div>{!data.persons.items.length && <EmptyState>Zatím nejsou evidované žádné osoby.</EmptyState>}<Pagination page={personPage} result={data.persons} changePage={setPersonPage} /></section>
  </>}</ResourceView></section>;
}

export function PlayersManager() { return <AccessGate completeProfile capability="MANAGE_PLAYERS"><PlayersContent /></AccessGate>; }
