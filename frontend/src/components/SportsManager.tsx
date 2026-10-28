"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/api/api";
import { createSport, getSports, updateSport } from "@/api/club";
import { mapErrorToMessage, mapFieldErrors } from "@/api/errorMapper";
import type { PageResponse, SportResponse, SportUpdateRequest } from "@/api/types";
import { AccessGate } from "./AccessGate";
import { FormField } from "./FormField";
import { ResourceError } from "./ResourceError";
import { AdminNav } from "./club/AdminNav";

function NewSport({ onSaved }: { onSaved: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const code = String(data.get("code") ?? "").trim().toUpperCase();
    const name = String(data.get("name") ?? "").trim();
    const invalid = {
      ...(!/^[A-Z][A-Z0-9_]{0,39}$/.test(code) ? { code: "Použijte písmena bez diakritiky, číslice či podtržítko; začněte písmenem." } : {}),
      ...(!name ? { name: "Vyplňte název sportu." } : {}),
    };
    if (Object.keys(invalid).length) { setFieldErrors(invalid); setError(new Error("Invalid fields")); return; }
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await createSport({ code, name });
      form.reset();
      onSaved();
    } catch (caught: unknown) {
      setError(caught);
      setFieldErrors(mapFieldErrors(caught, ["code", "name"]));
    } finally {
      setPending(false);
    }
  };
  return <form className="detail-card club-form" onSubmit={submit} aria-busy={pending}>
    <h2>Přidat nový sport</h2>
    <FormField name="code" label="Kód sportu" required maxLength={40} autoComplete="off" disabled={pending} hint="Například FOOTBALL nebo BASKETBALL. Nejvýše 40 znaků, začátek písmenem; bez diakritiky, povoleny číslice a podtržítko. Uloží se velkými písmeny a později se nemění." error={fieldErrors.code} />
    <FormField name="name" label="Název sportu" required maxLength={100} disabled={pending} error={fieldErrors.name} />
    {error !== null && <p className="message message-error" role="alert">{Object.keys(fieldErrors).length ? "Zkontrolujte označená pole." : mapErrorToMessage(error)}</p>}
    <button className="button" type="submit" disabled={pending}>{pending ? "Přidávám…" : "Přidat sport"}</button>
  </form>;
}

function SportCard({ sport, onSaved }: { sport: SportResponse; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();

  const save = async (payload: SportUpdateRequest) => {
    setPending(true);
    setError(null);
    setFieldError(undefined);
    try {
      await updateSport(sport.id, payload);
      setEditing(false);
      onSaved();
    } catch (caught: unknown) {
      setError(caught);
      setFieldError(mapFieldErrors(caught, ["name"]).name);
    } finally {
      setPending(false);
    }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("editName") ?? "").trim();
    if (!name) { setFieldError("Vyplňte název sportu."); return; }
    void save({ name });
  };

  return <article className="sport-card" aria-label={sport.name}>
    <div className="sport-card-heading"><div><h3>{sport.name}</h3><p className="sport-code">{sport.code}</p></div><span className={`pill ${sport.active ? "" : "pill-inactive"}`}>{sport.active ? "Aktivní" : "Neaktivní"}</span></div>
    {editing ? <form className="club-form sport-edit" onSubmit={submit} aria-busy={pending}>
      <FormField name="editName" label="Nový název sportu" defaultValue={sport.name} required maxLength={100} disabled={pending} error={fieldError} />
      <p className="field-hint">Kód {sport.code} zůstává stejný.</p>
      <div className="actions"><button className="button button-small" type="submit" disabled={pending}>{pending ? "Ukládám…" : "Uložit změny"}</button><button className="text-button" type="button" disabled={pending} onClick={() => { setEditing(false); setError(null); }}>Zrušit úpravy</button></div>
    </form> : <div className="sport-actions">
      <button className="text-button" disabled={pending} onClick={() => setEditing(true)}>Upravit</button>
      <button className="text-button" disabled={pending} onClick={() => void save({ active: !sport.active })}>{pending ? "Ukládám…" : sport.active ? "Deaktivovat" : "Aktivovat"}</button>
    </div>}
    {error !== null && <ResourceError error={error} onRetry={onSaved} />}
  </article>;
}

type SportsResource = { state: "loading" } | { state: "ready"; page: PageResponse<SportResponse> } | { state: "error"; error: unknown };

function SportsContent() {
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [resource, setResource] = useState<SportsResource>({ state: "loading" });
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getSports(page, 20).then(
      (result) => { if (active) setResource({ state: "ready", page: result }); },
      (error: unknown) => { if (active) setResource({ state: "error", error }); },
    );
    return () => { active = false; };
  }, [page, revision]);
  const reload = () => { setResource({ state: "loading" }); setRevision((value) => value + 1); };
  const added = () => { setNotice("Sport byl přidán."); setPage(0); reload(); };
  const saved = () => { setNotice("Změna sportu byla uložena."); reload(); };
  const changePage = (nextPage: number) => { setResource({ state: "loading" }); setPage(nextPage); setNotice(null); };
  const denied = resource.state === "error" && resource.error instanceof ApiError && (resource.error.status === 401 || resource.error.status === 403);

  return <section className="club-page">
    <AdminNav />
    <p className="eyebrow">Administrace klubu</p><h1>Správa sportů</h1><p className="lead">Sporty jsou společné pro tuto instalaci. Přidání dalšího sportu nevyžaduje změnu kódu. Deaktivace zachová existující záznam.</p>
    {notice && <p className="message message-success" role="status">{notice}</p>}
    {denied ? <ResourceError error={resource.error} onRetry={reload} /> : <div className="club-two-columns sports-layout">
      <NewSport onSaved={added} />
      <div className="sports-list-section"><div className="list-heading"><h2>Evidované sporty</h2>{resource.state === "ready" && <span className="subtle">Celkem {resource.page.totalElements}</span>}</div>
        {resource.state === "loading" && <p role="status">Načítám sporty…</p>}
        {resource.state === "error" && <ResourceError error={resource.error} onRetry={reload} />}
        {resource.state === "ready" && <>
          {resource.page.items.length ? <div className="sports-list">{resource.page.items.map((sport) => <SportCard key={sport.id} sport={sport} onSaved={saved} />)}</div> : <div className="empty-state"><h3>Zatím nejsou evidované žádné sporty.</h3><p>Přidejte první sport pomocí formuláře.</p></div>}
          <nav className="pagination" aria-label="Stránkování sportů"><button className="button button-secondary button-small" disabled={page === 0} onClick={() => changePage(page - 1)}>Předchozí stránka</button><span>Stránka {page + 1}{resource.page.totalPages > 0 ? ` z ${resource.page.totalPages}` : ""}</span><button className="button button-secondary button-small" disabled={page + 1 >= resource.page.totalPages} onClick={() => changePage(page + 1)}>Další stránka</button></nav>
        </>}
      </div>
    </div>}
  </section>;
}

export function SportsManager() {
  return <AccessGate completeProfile capability="MANAGE_SPORTS"><SportsContent /></AccessGate>;
}
