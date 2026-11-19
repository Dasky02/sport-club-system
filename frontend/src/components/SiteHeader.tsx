"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AdminNav } from "./club/AdminNav";
import { ClubIcon, type ClubIconName } from "./ClubIcon";

type NavItem = { href: string; label: string; icon: ClubIconName; related?: string };

function WorkspaceNav({ pathname }: { pathname: string }) {
  const { user, context } = useAuth();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const complete = user?.profileState === "COMPLETE";
  const capabilities = context?.capabilities ?? [];
  const items: NavItem[] = [{ href: "/dashboard", label: "Přehled", icon: "home" }];

  if (complete) {
    items.push(
      { href: "/calendar", label: "Kalendář", icon: "calendar", related: "/events/" },
      { href: "/notifications", label: "Oznámení", icon: "bell" },
    );
    if (context?.teamContexts.length || capabilities.includes("MANAGE_TEAMS")) {
      items.push({ href: "/teams", label: "Týmy", icon: "team" });
    }
    if (user.accountType === "STANDARD" && context?.children.length) {
      items.push({ href: "/my-children", label: "Moje děti", icon: "team" });
    }
    if (capabilities.includes("MANAGE_CLUB")) {
      items.push({ href: "/admin", label: "Administrace", icon: "settings" });
    }
  }

  return (
    <header className="site-header site-header--app" onKeyDown={(event) => {
      if (open && event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    }}>
      <div className="site-header-bar">
        <Brand href="/dashboard" />
        <button ref={toggle} type="button" className="menu-toggle" aria-expanded={open} aria-controls="workspace-navigation"
          onClick={() => setOpen((value) => !value)}>
          <ClubIcon name={open ? "close" : "menu"} /> Menu
        </button>
      </div>
      <div className="workspace-navigation" id="workspace-navigation" data-open={open}>
        <nav aria-label="Hlavní navigace" className="workspace-links">
          {items.map(({ href, label, icon, related }) => {
            const active = pathname === href || pathname.startsWith(href + "/") || (related && pathname.startsWith(related));
            return <Link key={href} href={href} aria-current={active ? (pathname === href ? "page" : "location") : undefined}>
              <ClubIcon name={icon} /> {label}
            </Link>;
          })}
        </nav>
        {complete && pathname.startsWith("/admin") && <AdminNav />}
        <nav className="workspace-account" aria-label="Účet">
          <Link href="/profile" aria-label="Osobní údaje" aria-current={pathname === "/profile" ? "page" : undefined}>
            <ClubIcon name="person" />
            <span>{user?.username}<small>Osobní údaje</small></span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Brand({ href }: { href: string }) {
  return (
    <Link href={href} className="brand" translate="no">
      <span className="brand-mark" aria-hidden="true"><ClubIcon name="field" /></span>
      <span>Sport Club <strong>System</strong></span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, initialized, sessionError } = useAuth();
  if (initialized && user && !sessionError) {
    return <WorkspaceNav key={pathname} pathname={pathname} />;
  }

  return (
    <header className="site-header site-header--public">
      <Brand href="/" />
      <nav aria-label="Hlavní navigace">
        <Link href="/register" aria-current={pathname === "/register" ? "page" : undefined}>Registrace</Link>
        <Link className="button button-small" href="/login" aria-current={pathname === "/login" ? "page" : undefined}>Přihlásit se</Link>
      </nav>
    </header>
  );
}
