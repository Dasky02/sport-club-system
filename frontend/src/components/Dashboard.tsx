"use client";

import Link from "next/link";
import { useState } from "react";
import { mapErrorToMessage } from "@/api/errorMapper";
import type { UserRole } from "@/api/types";
import { useAuth } from "@/context/AuthContext";

const roleNames: Record<UserRole, string> = {
  ADMIN: "Administrátor", USER: "Uživatel bez klubových oprávnění", COACH: "Trenér", PLAYER: "Hráč", PARENT: "Rodič / zákonný zástupce",
};

export function Dashboard() {
  const { user, loading, initialized, sessionError, logout, refreshUser } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const signOut = async () => {
    setLogoutError(null);
    try { await logout(); } catch (error: unknown) { setLogoutError(mapErrorToMessage(error)); }
  };

  if (!initialized || loading) {
    return <section className="state-card"><p role="status">Ověřuji vaši session…</p></section>;
  }
  if (sessionError) {
    return <section className="state-card"><p className="eyebrow">Spojení se serverem</p><h1>Session se nepodařilo ověřit.</h1><p className="message message-error" role="alert">{sessionError}</p><button className="button" onClick={() => void refreshUser()}>Zkusit znovu</button></section>;
  }
  if (!user) {
    return <section className="state-card"><p className="eyebrow">Můj účet</p><h1>Pro přístup se přihlaste.</h1><p>Vaše session není aktivní. Po přihlášení zde najdete údaje svého účtu.</p><Link className="button" href="/login">Přihlásit se</Link></section>;
  }

  return (
    <section className="dashboard">
      <div className="dashboard-heading"><div><p className="eyebrow">Můj účet</p><h1>Ahoj, {user.username}.</h1><p className="lead">Vaše session je aktivní a účet byl ověřen backendem.</p></div><button className="button button-secondary" onClick={() => void signOut()}>Odhlásit se <span aria-hidden="true">↗</span></button></div>
      {logoutError && <div className="message message-error" role="alert"><p>{logoutError} Odhlášení nebylo potvrzeno.</p><button className="text-button" onClick={() => void refreshUser()}>Ověřit session</button></div>}
      <div className="dashboard-grid">
        <article className="detail-card"><p className="eyebrow">Údaje účtu</p><h2>Váš profil přihlášení</h2><dl><div><dt>Uživatelské jméno</dt><dd>{user.username}</dd></div><div><dt>Role</dt><dd>{roleNames[user.role]}</dd></div><div><dt>Účet vytvořen</dt><dd>{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "long", timeZone: "Europe/Prague" }).format(new Date(user.createdAt))}</dd></div><div><dt>Identifikátor účtu</dt><dd className="identifier">{user.id}</dd></div></dl></article>
        <article className="detail-card planned"><span className="pill">Navazující etapy</span><h2>Klubové funkce připravujeme</h2><p>Týmy, kalendář událostí, nominace, docházka, výsledky, statistiky, příspěvky a komunikace zatím nejsou dostupné.</p><p>Uživatelský účet je oddělený od profilu hráče. Nová registrace sama o sobě nezakládá členství v týmu ani vazbu na dítě.</p></article>
      </div>
    </section>
  );
}
