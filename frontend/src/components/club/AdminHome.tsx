"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AccessGate } from "../AccessGate";
import { ClubIcon } from "../ClubIcon";
import { adminSections } from "./AdminNav";

const groups = [
  { title: "Klub a sezóna", paths: ["/admin/sports", "/admin/seasons", "/admin/teams"] },
  { title: "Lidé a přístupy", paths: ["/admin/players", "/admin/accounts"] },
  { title: "Soutěžní nastavení", paths: ["/admin/match-formats", "/admin/competitions"] },
];

function AdminContent() {
  const { context } = useAuth();
  return (
    <section className="club-page">
      <header className="admin-page-heading"><h1>Administrace</h1><Link className="button" href="/calendar/new">Naplánovat akci</Link></header>
      <div className="admin-overview">
        {groups.map(({ title, paths }) => {
          const sections = adminSections.filter(({ href, capability }) => paths.includes(href) && context?.capabilities.includes(capability));
          if (!sections.length) return null;
          return <section key={title}>
            <h2>{title}</h2>
            <ul className="navigation-list">
              {sections.map(({ href, name, description }) => (
                <li key={href}>
                  <Link href={href}>
                    <span><strong>{name}</strong><small>{description}</small></span>
                    <ClubIcon name="chevron" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>;
        })}
      </div>
    </section>
  );
}

export function AdminHome() {
  return <AccessGate completeProfile standardAccount capability="MANAGE_CLUB"><AdminContent /></AccessGate>;
}
