"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createMyPerson, getMyPerson } from "@/api/club";
import { mapErrorToMessage, mapFieldErrors } from "@/api/errorMapper";
import type { PersonResponse } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { AccessGate } from "./AccessGate";
import { FormField } from "./FormField";
import { ResourceError } from "./ResourceError";

const fields = ["firstName", "lastName", "birthDate", "email", "phone"] as const;

function OnboardingForm() {
  const { user, refreshUser } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(new Date());

  if (user?.accountType !== "STANDARD") {
    return <section className="state-card"><h1>Osobní údaje spravuje administrátor.</h1><p>Dokončení tohoto účtu vyžaduje ověření administrátorem.</p><Link className="button" href="/dashboard">Zpět na můj účet</Link></section>;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const birthDate = String(form.get("birthDate") ?? "") || null;
    if (!firstName || !lastName) {
      setError(new Error("Required fields"));
      setFieldErrors({ ...(!firstName ? { firstName: "Vyplňte jméno." } : {}), ...(!lastName ? { lastName: "Vyplňte příjmení." } : {}) });
      return;
    }
    if (birthDate && birthDate > today) {
      setError(new Error("Invalid date"));
      setFieldErrors({ birthDate: "Datum narození nemůže být v budoucnosti." });
      return;
    }
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      await createMyPerson({
        firstName, lastName, birthDate,
        email: String(form.get("email") ?? "").trim() || null,
        phone: String(form.get("phone") ?? "").trim() || null,
      });
      await refreshUser();
    } catch (caught: unknown) {
      setError(caught);
      setFieldErrors(mapFieldErrors(caught, fields));
    } finally {
      setPending(false);
    }
  };

  return <section className="club-page">
    <div className="section-heading"><p className="eyebrow">Dokončení účtu</p><h1>Vaše osobní údaje</h1><p className="lead">Doplňte skutečné údaje, se kterými bude účet propojený. Tento krok nevytváří hráčský profil, členství ani rodičovskou vazbu.</p></div>
    <div className="club-two-columns">
      <form className="detail-card club-form" onSubmit={submit} aria-busy={pending}>
        <h2>Dokončit profil</h2>
        <div className="form-grid">
          <FormField name="firstName" label="Jméno" autoComplete="given-name" maxLength={100} required disabled={pending} error={fieldErrors.firstName} />
          <FormField name="lastName" label="Příjmení" autoComplete="family-name" maxLength={100} required disabled={pending} error={fieldErrors.lastName} />
        </div>
        <FormField name="birthDate" label="Datum narození" type="date" autoComplete="bday" max={today} disabled={pending} hint="Nepovinné; potřebné při pozdějším založení hráčského profilu." error={fieldErrors.birthDate} />
        <FormField name="email" label="E-mail" type="email" autoComplete="email" maxLength={254} disabled={pending} hint="Nepovinné." error={fieldErrors.email} />
        <FormField name="phone" label="Telefon" type="tel" autoComplete="tel" maxLength={40} disabled={pending} hint="Nepovinné." error={fieldErrors.phone} />
        {error !== null && <div className="message message-error" role="alert">{Object.keys(fieldErrors).length ? "Zkontrolujte označená pole." : mapErrorToMessage(error)}</div>}
        <button className="button" type="submit" disabled={pending}>{pending ? "Ukládám…" : "Uložit osobní údaje"}</button>
        {error !== null && <button className="text-button" type="button" onClick={() => void refreshUser()}>Ověřit aktuální profil</button>}
      </form>
      <aside className="detail-card planned"><p className="eyebrow">Propojení s osobou</p><h2>Máte už v klubu záznam?</h2><p>Pokud již klub eviduje vaši osobu, před vyplněním požádejte administrátora o ověřené propojení účtu. Shodné jméno ani e-mail osoby automaticky neslučují.</p><p>Uložené propojení v této etapě nelze samostatně měnit.</p></aside>
    </div>
  </section>;
}

type PersonState = { state: "loading" } | { state: "ready"; person: PersonResponse } | { state: "error"; error: unknown };

function ExistingPerson() {
  const [resource, setResource] = useState<PersonState>({ state: "loading" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void getMyPerson().then(
      (person) => { if (active) setResource({ state: "ready", person }); },
      (error: unknown) => { if (active) setResource({ state: "error", error }); },
    );
    return () => { active = false; };
  }, [revision]);
  const retry = () => { setResource({ state: "loading" }); setRevision((value) => value + 1); };

  return <section className="club-page">
    <p className="eyebrow">Osobní údaje</p><h1>Váš profil je dokončený.</h1>
    {resource.state === "loading" && <p role="status">Načítám osobní údaje…</p>}
    {resource.state === "error" && <ResourceError error={resource.error} onRetry={retry} />}
    {resource.state === "ready" && <article className="detail-card profile-details"><h2>{resource.person.firstName} {resource.person.lastName}</h2><dl>
      <div><dt>Datum narození</dt><dd>{resource.person.birthDate ? new Intl.DateTimeFormat("cs-CZ", { timeZone: "Europe/Prague" }).format(new Date(`${resource.person.birthDate}T12:00:00Z`)) : "Neuvedeno"}</dd></div>
      <div><dt>E-mail</dt><dd>{resource.person.email ?? "Neuvedeno"}</dd></div>
      <div><dt>Telefon</dt><dd>{resource.person.phone ?? "Neuvedeno"}</dd></div>
    </dl><p className="subtle">Údaje jsou načtené ze serveru. Jejich změna není součástí této etapy.</p></article>}
    <div className="actions"><Link className="button button-secondary" href="/dashboard">Zpět na můj účet</Link><Link className="text-button" href="/setup">Nastavení klubu</Link></div>
  </section>;
}

function ProfileContent() {
  const { user } = useAuth();
  return user?.profileState === "COMPLETE" ? <ExistingPerson /> : <OnboardingForm />;
}

export function PersonProfile() {
  return <AccessGate><ProfileContent /></AccessGate>;
}
