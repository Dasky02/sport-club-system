"use client";

import Link from "next/link";
import { useState } from "react";
import { mapErrorToMessage } from "@/api/errorMapper";
import { getEvents, getUnreadCount, type ClubEvent } from "@/api/events";
import { useAuth } from "@/context/AuthContext";
import { AccessGate } from "./AccessGate";
import { ClubIcon, type ClubIconName } from "./ClubIcon";
import { EmptyState, ResourceView, useResource } from "./club/Resource";
import { displayDateTime } from "./events/clubTime";
import { statusLabels, typeLabels } from "./events/labels";

async function loadAgenda() {
  const now = new Date();
  const until = new Date(now.getTime() + 30 * 86_400_000);
  const events: ClubEvent[] = [];
  for (let page = 0; events.length < 5; page += 1) {
    const result = await getEvents({ from: now.toISOString(), to: until.toISOString(), page, size: 30 });
    events.push(...result.items.filter(({ status }) => status === "PUBLISHED" || status === "DRAFT"));
    if (page + 1 >= result.totalPages) break;
  }
  return events.slice(0, 5);
}

function DashboardOverview({ userId }: { userId: string }) {
  const { user, context } = useAuth();
  const agenda = useResource(loadAgenda, userId);
  const unread = useResource(getUnreadCount, userId);
  const capabilities = context?.capabilities ?? [];
  const shortcuts: { href: string; label: string; icon: ClubIconName; description?: string }[] = [
    {
      href: "/notifications",
      label: "Oznámení",
      icon: "bell",
      description: unread.resource.state === "ready" ? `Nepřečtená: ${unread.resource.data}` : undefined,
    },
  ];

  if (context?.teamContexts.length || capabilities.includes("MANAGE_TEAMS")) {
    shortcuts.push({ href: "/teams", label: "Týmy a soupisky", icon: "team" });
  }
  if (user?.accountType === "STANDARD" && context?.children.length) {
    shortcuts.push({ href: "/my-children", label: "Moje děti", icon: "team" });
  }
  if (context?.ownPlayerId) {
    shortcuts.push({ href: `/players/${context.ownPlayerId}`, label: "Profil a členství", icon: "person" });
  }
  if (capabilities.includes("MANAGE_CLUB")) {
    shortcuts.push({ href: "/admin", label: "Administrace klubu", icon: "settings" });
  } else if (user?.accountType === "STANDARD") {
    shortcuts.push({ href: "/setup", label: "Nastavení klubu", icon: "settings" });
  }

  return (
    <div className="dashboard-grid">
      <section className="detail-card agenda" aria-labelledby="agenda-title">
        <div className="list-heading">
          <h2 id="agenda-title">Nejbližší akce</h2>
          <Link href="/calendar" className="text-button">Otevřít kalendář</Link>
        </div>
        <ResourceView {...agenda}>{(events) => events.length ? (
          <ul className="agenda-list">
            {events.map(({ id, type, status, schedule }) => (
              <li key={id}>
                <Link href={`/events/${id}`}>
                  <span className={`agenda-type agenda-${type.toLowerCase()}`}>{typeLabels[type]}</span>
                  <span className="agenda-info">
                    <strong>{schedule.title}</strong>
                    <small><time dateTime={schedule.startsAt}>{displayDateTime(schedule.startsAt)}</time>{schedule.location && ` · ${schedule.location}`}</small>
                  </span>
                  {status !== "PUBLISHED" && <span className="pill pill-inactive">{statusLabels[status]}</span>}
                  <ClubIcon name="chevron" />
                </Link>
              </li>
            ))}
          </ul>
        ) : <EmptyState>V příštích 30 dnech nemáte naplánované žádné akce.</EmptyState>}</ResourceView>
      </section>
      <section aria-labelledby="shortcut-title">
        <h2 id="shortcut-title">Zkratky</h2>
        <ul className="navigation-list">
          {shortcuts.map(({ href, label, icon, description }) => (
            <li key={href}>
              <Link href={href}>
                <ClubIcon name={icon} />
                <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
                <ClubIcon name="chevron" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return <AccessGate>{null}</AccessGate>;

  const signOut = async () => {
    setLogoutError(null);
    setSigningOut(true);
    try {
      await logout();
    } catch (error) {
      setLogoutError(mapErrorToMessage(error));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <AccessGate>
    <section className="dashboard">
      <div className="dashboard-heading">
        <div><h1>Ahoj, {user.username}.</h1><p>{user.role === "ADMIN" ? "Administrátor" : user.accountType === "CHILD" ? "Dětský účet" : "Běžný uživatel"}</p></div>
        <button type="button" className="button button-secondary" disabled={signingOut} onClick={() => void signOut()}>
          {signingOut ? "Odhlašuji…" : "Odhlásit se"}
        </button>
      </div>
      {logoutError && <div className="message message-error" role="alert"><p>{logoutError} Odhlášení nebylo potvrzeno.</p><button className="text-button" onClick={() => void refreshUser()}>Ověřit přihlášení</button></div>}
      {user.profileState === "PENDING" ? (
        <section className="detail-card next-step">
          <h2>Doplňte osobní údaje</h2>
          <p>Po doplnění profilu se zobrazí kalendář a další funkce dostupné pro váš účet.</p>
          <Link className="button" href="/profile">Doplnit osobní údaje</Link>
        </section>
      ) : <DashboardOverview userId={user.id} />}
    </section>
    </AccessGate>
  );
}
