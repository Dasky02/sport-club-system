"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Capability } from "@/api/types";
import { useAuth } from "@/context/AuthContext";

function LoginPrompt() {
  const pathname = usePathname();
  return (
    <section className="state-card">
      <h1>Pro přístup se přihlaste.</h1>
      <Link className="button" href={{ pathname: "/login", query: { next: pathname } }}>Přihlásit se</Link>
    </section>
  );
}

/** Navigační ochrana. Skutečné oprávnění pro každý objekt vyhodnocuje Spring. */
export function AccessGate({ children, completeProfile = false, standardAccount = false, capability }: {
  children: ReactNode;
  completeProfile?: boolean;
  standardAccount?: boolean;
  capability?: Capability;
}) {
  const { user, context, loading, initialized, sessionError, refreshUser } = useAuth();
  if (!initialized || loading) {
    return <section className="state-card"><p role="status">Ověřuji přihlášení…</p></section>;
  }
  if (sessionError) {
    return <section className="state-card"><h1>Session se nepodařilo ověřit.</h1><p className="message message-error" role="alert">{sessionError}</p><button className="button" onClick={() => void refreshUser()}>Zkusit znovu</button></section>;
  }
  if (!user) return <LoginPrompt />;
  if (completeProfile && user.profileState !== "COMPLETE") {
    return <section className="state-card"><h1>Nejprve doplňte osobní údaje.</h1><p>Dokud účet není propojený s osobou, je dostupné pouze dokončení vlastního profilu.</p><Link className="button" href="/profile">Doplnit osobní údaje</Link></section>;
  }
  if (standardAccount && user.accountType !== "STANDARD") return <section className="state-card"><h1>Tato stránka je dostupná pouze běžnému účtu.</h1><Link className="button button-secondary" href="/dashboard">Zpět na můj účet</Link></section>;
  if (capability && (user.accountType !== "STANDARD" || user.role !== "ADMIN" || !context?.capabilities.includes(capability))) {
    return <section className="state-card"><h1>Tato stránka vyžaduje oprávnění správce.</h1><p>Aktuální účet nemá oprávnění k této správní činnosti.</p><Link className="button button-secondary" href="/dashboard">Zpět na můj účet</Link></section>;
  }
  return children;
}
