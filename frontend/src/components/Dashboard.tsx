"use client";

import Link from "next/link";
import { useState } from "react";
import { mapErrorToMessage } from "@/api/errorMapper";
import type { UserRole } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { AccessGate } from "./AccessGate";

const roleNames: Record<UserRole, string> = {
  ADMIN: "Administrátor", USER: "Běžný uživatel",
};

function DashboardContent() {
  const { user, context, logout, refreshUser } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const signOut = async () => {
    setLogoutError(null);
    try { await logout(); } catch (error: unknown) { setLogoutError(mapErrorToMessage(error)); }
  };

  if (!user) return null;

  return (
    <section className="dashboard">
      <div className="dashboard-heading"><div><p className="eyebrow">Můj účet</p><h1>Ahoj, {user.username}.</h1><p className="lead">Vaše session je aktivní a účet byl ověřen backendem.</p></div><button className="button button-secondary" onClick={() => void signOut()}>Odhlásit se <span aria-hidden="true">↗</span></button></div>
      {logoutError && <div className="message message-error" role="alert"><p>{logoutError} Odhlášení nebylo potvrzeno.</p><button className="text-button" onClick={() => void refreshUser()}>Ověřit session</button></div>}
      <div className="dashboard-grid">
        <article className="detail-card"><p className="eyebrow">Údaje účtu</p><h2>Váš profil přihlášení</h2><dl><div><dt>Uživatelské jméno</dt><dd>{user.username}</dd></div><div><dt>Systémová role</dt><dd>{roleNames[user.role]}</dd></div><div><dt>Typ účtu</dt><dd>{user.accountType === "CHILD" ? "Dětský účet" : "Běžný účet"}</dd></div><div><dt>Osobní údaje</dt><dd>{user.profileState === "COMPLETE" ? "Dokončené" : "Čekají na doplnění"}</dd></div><div><dt>Účet vytvořen</dt><dd>{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "long", timeZone: "Europe/Prague" }).format(new Date(user.createdAt))}</dd></div><div><dt>Identifikátor účtu</dt><dd className="identifier">{user.id}</dd></div></dl></article>
        <article className="detail-card next-step"><p className="eyebrow">Další krok</p>
          {user.profileState === "PENDING" ? <><h2>Doplňte osobní údaje</h2><p>Účet zatím není propojený s osobou. Po dokončení vlastních údajů můžete pokračovat k dostupným klubovým funkcím.</p><Link className="button" href="/profile">Doplnit osobní údaje</Link></>
            : context?.capabilities.includes("MANAGE_SPORTS") ? <><h2>Sporty vašeho klubu</h2><p>Jako administrátor můžete přidávat, přejmenovávat a deaktivovat sporty. Kód sportu zůstává stabilní.</p><Link className="button" href="/admin/sports">Správa sportů</Link></>
              : user.accountType === "STANDARD" ? <><h2>Váš profil je připravený</h2><p>Pokud jste provozovatel nové instalace, ověřte stav jednorázového převzetí správy. Běžný účet správní oprávnění nezískává automaticky.</p><Link className="button" href="/setup">Nastavení klubu</Link></>
                : <><h2>Váš osobní profil</h2><p>Údaje tohoto účtu můžete prohlédnout v osobním profilu.</p><Link className="button" href="/profile">Osobní údaje</Link></>}
        </article>
      </div>
      <p className="subtle dashboard-scope">Týmy, rodičovské vazby, sportovní události, výsledky, příspěvky a komunikace jsou součástí dalších pracovních balíčků.</p>
    </section>
  );
}

export function Dashboard() {
  return <AccessGate><DashboardContent /></AccessGate>;
}
