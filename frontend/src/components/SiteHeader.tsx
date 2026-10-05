"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function SiteHeader() {
  const pathname = usePathname();
  const { user, initialized, sessionError } = useAuth();
  const signedIn = initialized && user && !sessionError;
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Sport Club System – úvod">
        <span className="brand-mark" aria-hidden="true">S<span>•</span>C</span>
        <span>Sport Club <strong>System</strong></span>
      </Link>
      <nav aria-label="Hlavní navigace">
        <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>Úvod</Link>
        <Link href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}>Můj účet</Link>
        {signedIn ? (
          <span className="nav-user">{user.username}</span>
        ) : (
          <Link className="button button-small" href="/login" aria-current={pathname === "/login" ? "page" : undefined}>Přihlásit se</Link>
        )}
      </nav>
    </header>
  );
}
