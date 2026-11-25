"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Capability } from "@/api/types";
import { useAuth } from "@/context/AuthContext";

export const adminSections: { href: string; name: string; capability: Capability; description: string }[] = [
  { href: "/admin/sports", name: "Sporty", capability: "MANAGE_SPORTS", description: "Založení, přejmenování a deaktivace sportů" },
  { href: "/admin/seasons", name: "Sezóny", capability: "MANAGE_SEASONS", description: "Termíny sezón a archivace" },
  { href: "/admin/teams", name: "Týmy a členství", capability: "MANAGE_TEAMS", description: "Týmy, soupisky a přiřazení trenérů" },
  { href: "/admin/players", name: "Hráči a osoby", capability: "MANAGE_PLAYERS", description: "Hráčské profily, osoby a rodičovské vazby" },
  { href: "/admin/accounts", name: "Přístupové účty", capability: "MANAGE_ACCOUNTS", description: "Oprávnění, propojení osob a aktivace dětských účtů" },
  { href: "/admin/match-formats", name: "Formáty zápasu", capability: "MANAGE_CLUB", description: "Hrací části, vyhodnocení a přátelské kontumace" },
  { href: "/admin/competitions", name: "Soutěže a ročníky", capability: "MANAGE_CLUB", description: "Pravidla bodování a přihlášky týmů" },
];

export function AdminNav() {
  const { context } = useAuth();
  const pathname = usePathname();
  const sections = adminSections.filter(({ capability }) => context?.capabilities.includes(capability));
  if (!sections.length) return null;

  return (
    <nav className="club-admin-nav" aria-label="Administrace klubu">
      {sections.map(({ href, name }) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : pathname.startsWith(href + "/") ? "location" : undefined}>
          {name}
        </Link>
      ))}
    </nav>
  );
}
