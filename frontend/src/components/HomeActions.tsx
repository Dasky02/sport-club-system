"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function HomeActions() {
  const { user, initialized, sessionError } = useAuth();
  return (
    <div className="actions">
      {initialized && user && !sessionError ? (
        <Link className="button" href="/dashboard">Otevřít přehled</Link>
      ) : (
        <>
          <Link className="button" href="/login">Přihlásit se</Link>
          <Link className="button button-secondary" href="/register">Vytvořit účet</Link>
        </>
      )}
    </div>
  );
}
