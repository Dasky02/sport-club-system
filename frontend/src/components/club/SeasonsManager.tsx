"use client";

import { useCallback, useState, type FormEvent } from "react";
import { archiveSeason, createSeason, getSeasons, updateSeason, type SeasonRequest, type SeasonResponse } from "@/api/teams";
import { mapFieldErrors } from "@/api/errorMapper";
import { AccessGate } from "../AccessGate";
import { FormField } from "../FormField";
import { AdminNav } from "./AdminNav";
import { FormError } from "./Fields";
import { EmptyState, Pagination, ResourceView, useResource } from "./Resource";

function SeasonForm({ initial, onSaved, onCancel }: { initial?: SeasonResponse; onSaved: () => void; onCancel?: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body: SeasonRequest = { name: String(data.get("name") ?? "").trim(), startsOn: String(data.get("startsOn") ?? ""), endsOn: String(data.get("endsOn") ?? "") };
    if (!body.name || !body.startsOn || body.endsOn <= body.startsOn) { setError(new Error("Invalid interval")); setErrors({ ...(!body.name ? { name: "Vyplňte název." } : {}), ...(body.endsOn <= body.startsOn ? { endsOn: "Konec musí následovat po začátku." } : {}) }); return; }
    setPending(true); setError(null); setErrors({});
    try {
      if (initial) {
        const changes: Partial<SeasonRequest> = {};
        if (body.name !== initial.name) changes.name = body.name;
        if (body.startsOn !== initial.startsOn) changes.startsOn = body.startsOn;
        if (body.endsOn !== initial.endsOn) changes.endsOn = body.endsOn;
        if (Object.keys(changes).length) await updateSeason(initial.id, changes);
      } else { await createSeason(body); form.reset(); }
      onSaved();
    } catch (caught: unknown) { setError(caught); setErrors(mapFieldErrors(caught, ["name", "startsOn", "endsOn"])); }
    finally { setPending(false); }
  };
  return <form className="club-form" onSubmit={submit} aria-busy={pending}>
    <h2>{initial ? "Upravit sezónu" : "Nová sezóna"}</h2>
    <FormField name="name" label="Název sezóny" defaultValue={initial?.name} maxLength={100} required disabled={pending} error={errors.name} />
    <div className="form-grid"><FormField name="startsOn" label="Začátek sezóny" type="date" defaultValue={initial?.startsOn} required disabled={pending} error={errors.startsOn} /><FormField name="endsOn" label="Konec sezóny" type="date" defaultValue={initial?.endsOn} required disabled={pending} error={errors.endsOn} /></div>
    <p className="field-hint">Začátek je zahrnutý, konec vyloučený. Sezóna od 1. 7. do 1. 7. dalšího roku končí 30. 6. včetně. Použité hranice již nelze přepsat.</p>
    <FormError error={error} fieldErrors={errors} />
    <div className="actions"><button className="button" disabled={pending}>{pending ? "Ukládám…" : initial ? "Uložit sezónu" : "Vytvořit sezónu"}</button>{onCancel && <button className="text-button" type="button" disabled={pending} onClick={onCancel}>Zrušit úpravy</button>}</div>
  </form>;
}

function SeasonCard({ season, onSaved }: { season: SeasonResponse; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const archive = async () => {
    setPending(true); setError(null);
    try { await archiveSeason(season.id); onSaved(); }
    catch (caught: unknown) { setError(caught); }
    finally { setPending(false); }
  };
  return <article className="detail-card" aria-label={season.name}>
    <div className="list-heading"><h3>{season.name}</h3><span className="pill">{season.archived ? "Archivovaná" : "Otevřená"}</span></div>
    <p>{season.startsOn} → {season.endsOn} <span className="subtle">(konec vyloučen)</span></p>
    {editing && !season.archived && <SeasonForm initial={season} onSaved={onSaved} onCancel={() => setEditing(false)} />}
    {!season.archived && <><div className="sport-actions"><button className="text-button" disabled={pending} onClick={() => setEditing(true)}>Upravit</button><button className="text-button" disabled={pending} onClick={() => setConfirm(true)}>Archivovat sezónu</button></div>
      {confirm && <div className="confirmation"><p>Archivace zachová soupisky a historii a zablokuje běžné změny. Tuto operaci nelze na této stránce vrátit.</p><button className="button button-small" disabled={pending} onClick={() => void archive()}>Potvrdit archivaci</button><button className="text-button" disabled={pending} onClick={() => setConfirm(false)}>Zrušit archivaci</button></div>}</>}
    <FormError error={error} />
  </article>;
}

function SeasonsContent() {
  const [page, setPage] = useState(0);
  const load = useCallback(() => getSeasons(page), [page]);
  const { resource, reload } = useResource(load);
  const [notice, setNotice] = useState<string | null>(null);
  const saved = () => { setNotice("Sezóna byla uložena."); reload(); };
  return <section className="club-page"><AdminNav /><p className="eyebrow">Administrace klubu</p><h1>Správa sezón</h1><p className="lead">Sezóny vymezují intervaly týmů a členství. Archivace historii zachová.</p>{notice && <p className="message message-success" role="status">{notice}</p>}
    <div className="club-two-columns"><div className="detail-card"><SeasonForm onSaved={() => { setPage(0); saved(); }} /></div><ResourceView resource={resource} reload={reload}>{(result) => <div className="club-stack">{result.items.length ? result.items.map((season) => <SeasonCard key={season.id} season={season} onSaved={saved} />) : <EmptyState>Zatím nejsou vytvořené žádné sezóny.</EmptyState>}<Pagination page={page} result={result} changePage={setPage} /></div>}</ResourceView></div>
  </section>;
}

export function SeasonsManager() { return <AccessGate completeProfile capability="MANAGE_SEASONS"><SeasonsContent /></AccessGate>; }
