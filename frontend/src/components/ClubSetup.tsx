"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "@/api/api";
import { completeClubSetup, getClubSetupStatus } from "@/api/club";
import { mapErrorToMessage } from "@/api/errorMapper";
import type { ClubSetupStatus } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { AccessGate } from "./AccessGate";
import { FormField } from "./FormField";
import { ResourceError } from "./ResourceError";

type SetupResource = { state: "loading" } | { state: "ready"; status: ClubSetupStatus } | { state: "error"; error: unknown };

function SetupForm({ disabled, onSubmit, pending = false }: {
  disabled: boolean;
  pending?: boolean;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <form className="club-form" onSubmit={onSubmit} aria-busy={pending}>
    <FormField name="token" label="Instalační token" type="password" autoComplete="off" autoCapitalize="off" spellCheck={false} required disabled={disabled || pending} hint="Soukromý jednorázový token poskytne provozovatel instalace." />
    <button className="button" type="submit" disabled={disabled || pending}>{pending ? "Ověřuji…" : "Převzít správu klubu"}</button>
  </form>;
}

function CompleteProfileSetup() {
  const { context, refreshUser } = useAuth();
  const [resource, setResource] = useState<SetupResource>({ state: "loading" });
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getClubSetupStatus().then(
      (status) => { if (active) setResource({ state: "ready", status }); },
      (error: unknown) => { if (active) setResource({ state: "error", error }); },
    );
    return () => { active = false; };
  }, [revision]);
  const retry = () => { setResource({ state: "loading" }); setRevision((value) => value + 1); };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (resource.state !== "ready" || !resource.status.available || resource.status.completed || pending) return;
    const form = event.currentTarget;
    const token = String(new FormData(form).get("token") ?? "");
    // Token je jen lokální hodnota pro tento request. Ihned se odstraní i z pole formuláře.
    form.reset();
    setPending(true);
    setErrorMessage(null);
    try {
      await completeClubSetup(token);
      // Potvrzený setup je jednorázový; aktualizace nesmí záviset na odmountování při refreshi session.
      setResource((current) => current.state === "ready"
        ? { state: "ready", status: { ...current.status, completed: true, available: false } }
        : current);
      await refreshUser();
    } catch (error: unknown) {
      setErrorMessage(error instanceof ApiError && error.status === 403 && error.code === "FORBIDDEN"
        ? "Token nebyl přijat nebo se změnilo oprávnění k převzetí správy. Ověřte token u provozovatele."
        : mapErrorToMessage(error));
      if (error instanceof ApiError && (error.code === "SETUP_ALREADY_COMPLETED" || error.code === "SETUP_UNAVAILABLE")) retry();
    } finally {
      setPending(false);
    }
  };

  return <section className="club-page">
    <p className="eyebrow">Jednorázové nastavení</p><h1>Nastavení klubu</h1>
    {resource.state === "loading" && <p role="status">Načítám stav nastavení…</p>}
    {resource.state === "error" && <ResourceError error={resource.error} onRetry={retry} />}
    {errorMessage && <p className="message message-error" role="alert">{errorMessage}</p>}
    {resource.state === "ready" && <div className="club-two-columns"><article className="detail-card">
      <h2>{resource.status.clubName}</h2>
      {resource.status.completed ? <><p role="status">Správa klubu je již nastavená.</p><p>Jednorázové převzetí nelze zopakovat. Oprávnění dalších účtů tato stránka nepřiděluje.</p></>
        : resource.status.available ? <p>Pokud spravujete tuto instalaci, můžete svůj účet povýšit na administrátora pomocí instalačního tokenu.</p>
          : <p role="status">Převzetí správy není nakonfigurované. Soukromý instalační token musí nastavit provozovatel.</p>}
      <SetupForm disabled={!resource.status.available || resource.status.completed} pending={pending} onSubmit={(event) => void submit(event)} />
      {resource.status.completed && context?.capabilities.includes("MANAGE_SPORTS") && <Link className="button" href="/admin/sports">Otevřít správu sportů</Link>}
    </article><aside className="detail-card planned"><h2>Jeden účet pro správu klubu</h2><p>Veřejná registrace nevytváří administrátora. Úspěšné jednorázové ověření přidělí vašemu účtu ADMIN a umožní správu sportů.</p><p>Token se neukládá do prohlížeče ani do adresy stránky. Po odeslání je potřeba jej při dalším pokusu zadat znovu.</p></aside></div>}
    <Link className="back-link" href="/dashboard">← Zpět na můj účet</Link>
  </section>;
}

function SetupContent() {
  const { user } = useAuth();
  if (user?.accountType !== "STANDARD") {
    return <section className="state-card"><h1>Převzetí správy není pro tento účet povolené.</h1><p>Správu instalace může převzít pouze oprávněný běžný účet.</p><Link className="button" href="/dashboard">Zpět na můj účet</Link></section>;
  }
  if (user.profileState !== "COMPLETE") {
    return <section className="state-card"><h1>Nejprve doplňte osobní údaje.</h1><p>Dokončení profilu je podmínkou převzetí správy klubu.</p><SetupForm disabled /><Link className="button button-secondary" href="/profile">Doplnit osobní údaje</Link></section>;
  }
  return <CompleteProfileSetup />;
}

export function ClubSetup() {
  return <AccessGate><SetupContent /></AccessGate>;
}
