"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Capability } from "@/api/types";
import { useAuth } from "@/context/AuthContext";

/** Navigační ochrana. Skutečné oprávnění pro každý objekt vyhodnocuje Spring. */
export function AccessGate({ children, completeProfile = false, capability }: {
  children: ReactNode;
  completeProfile?: boolean;
  capability?: Capability;
}) {
  const { user, context, loading, initialized, sessionError, refreshUser } = useAuth();
  if (!initialized || loading) {
    return <section className="state-card"><p role="status">Ověřuji vaši session…</p></section>;
  }
  if (sessionError) {
    return <section className="state-card"><p className="eyebrow">Spojení se serverem</p><h1>Session se nepodařilo ověřit.</h1><p className="message message-error" role="alert">{sessionError}</p><button className="button" onClick={() => void refreshUser()}>Zkusit znovu</button></section>;
  }
  if (!user) {
    return <section className="state-card"><p className="eyebrow">Můj účet</p><h1>Pro přístup se přihlaste.</h1><p>Vaše session není aktivní. Po přihlášení můžete pokračovat.</p><Link className="button" href="/login">Přihlásit se</Link></section>;
  }
  if (completeProfile && user.profileState !== "COMPLETE") {
    return <section className="state-card"><p className="eyebrow">Dokončení účtu</p><h1>Nejprve doplňte osobní údaje.</h1><p>Dokud účet není propojený s osobou, je dostupné pouze dokončení vlastního profilu.</p><Link className="button" href="/profile">Doplnit osobní údaje</Link></section>;
  }
  if (capability && (user.accountType !== "STANDARD" || user.role !== "ADMIN" || !context?.capabilities.includes(capability))) {
    return <section className="state-card"><p className="eyebrow">Omezený přístup</p><h1>Tato stránka vyžaduje oprávnění správce.</h1><p>Aktuální účet nemá oprávnění ke správě sportů.</p><Link className="button button-secondary" href="/dashboard">Zpět na můj účet</Link></section>;
  }
  return children;
}
