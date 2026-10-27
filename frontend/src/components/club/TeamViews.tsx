"use client";

import Link from "next/link";
import { useCallback, useState, type FormEvent } from "react";
import { getPlayer, getPlayerHistory, getRoster, getTeamSeason, getTeamSeasons } from "@/api/teams";
import { useAuth } from "@/context/AuthContext";
import { AccessGate } from "../AccessGate";
import { FormField } from "../FormField";
import { clubToday, intervalLabel } from "./Fields";
import { EmptyState, Pagination, ResourceView, useResource } from "./Resource";

function TeamListContent() {
  const { context } = useAuth();
  const [page, setPage] = useState(0); const load = useCallback(() => getTeamSeasons(page), [page]); const { resource, reload } = useResource(load, context);
  return <section className="club-page"><p className="eyebrow">Klubové týmy</p><h1>Týmy a soupisky</h1><p className="lead">Zobrazují se pouze týmy a sezóny dostupné pro váš účet. Členství v minulosti nebo v budoucnosti samo o sobě nedává aktuální týmový přístup.</p>{context?.capabilities.includes("MANAGE_TEAMS") && <div className="actions"><Link className="button" href="/admin/teams">Správa týmů</Link></div>}<ResourceView resource={resource} reload={reload}>{(result) => <>{result.items.length ? <div className="club-cards">{result.items.map((team) => <article className="detail-card" key={team.id} aria-label={team.displayName}><h2>{team.displayName}</h2><p>{team.sportName} · {team.seasonName}{team.archived ? " · archiv" : ""}{team.isClubTeam ? "" : " · externí soupeř"}</p><Link className="button button-secondary" href={`/teams/${team.id}`}>Zobrazit soupisku</Link></article>)}</div> : <EmptyState>Zatím nejsou k dispozici žádné sezónní týmy.</EmptyState>}<Pagination page={page} result={result} changePage={setPage} /></>}</ResourceView></section>;
}

export function TeamList() { return <AccessGate completeProfile><TeamListContent /></AccessGate>; }

function RosterContent({ id }: { id: string }) {
  const { user, context } = useAuth(); const admin = user?.role === "ADMIN";
  const [page, setPage] = useState(0); const [on, setOn] = useState(clubToday());
  const load = useCallback(async () => { const [team, roster] = await Promise.all([getTeamSeason(id), getRoster(id, page, 20, admin ? on : undefined)]); return { team, roster }; }, [id, page, admin, on]);
  const { resource, reload } = useResource(load, context);
  const filterDate = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setOn(String(new FormData(event.currentTarget).get("on") ?? "")); setPage(0); };
  return <section className="club-page"><p className="eyebrow">Tým v sezóně</p><h1>Soupiska týmu</h1><ResourceView resource={resource} reload={reload}>{({ team, roster }) => <><h2>{team.displayName}</h2><p>{team.sportName} · {team.seasonName}{team.archived ? " · archivovaná sezóna" : ""}</p><p className="subtle">Soupiska obsahuje jména a intervaly členství. Kontakty, datum narození a další osobní údaje se zde nezobrazují.</p>{admin && <form className="inline-filter" aria-label="Datum soupisky" onSubmit={filterDate}><FormField name="on" label="Soupiska ke dni" type="date" defaultValue={on} required /><button className="button button-small">Zobrazit soupisku</button></form>}{roster.items.length ? <div className="club-cards">{roster.items.map((player) => <article className="detail-card" key={player.membershipId} aria-label={`${player.firstName} ${player.lastName}`}><h3>{player.firstName} {player.lastName}</h3><p>{intervalLabel(player.validFrom, player.validTo)}</p><Link className="text-button" href={`/players/${player.playerId}`}>Profil a členství</Link></article>)}</div> : <EmptyState>{team.isClubTeam ? "Ke zvolenému dni není na soupisce žádný hráč." : "Externí soupeř nemá klubovou soupisku."}</EmptyState>}<Pagination page={page} result={roster} changePage={setPage} /><div className="actions"><Link className="button button-secondary" href="/teams">Zpět na týmy</Link>{team.isClubTeam && context?.capabilities.includes("MANAGE_MEMBERSHIPS") && <Link className="button" href={`/admin/teams/${team.id}`}>Spravovat členství</Link>}</div></>}</ResourceView></section>;
}

export function TeamRoster({ id }: { id: string }) { return <AccessGate completeProfile><RosterContent id={id} /></AccessGate>; }

function PlayerContent({ id }: { id: string }) {
  const { user, context } = useAuth(); const [page, setPage] = useState(0);
  const load = useCallback(async () => { const [player, history] = await Promise.all([getPlayer(id), getPlayerHistory(id, page)]); return { player, history }; }, [id, page]);
  const { resource, reload } = useResource(load, context);
  return <section className="club-page"><p className="eyebrow">Hráčský profil</p><h1>Profil a členství hráče</h1><ResourceView resource={resource} reload={reload}>{({ player, history }) => <><h2>{player.firstName} {player.lastName}</h2><p className="lead">Přehled zachovává povolenou historii členství. Kontaktní ani finanční údaje nejsou součástí tohoto základního profilu.</p><section className="club-stack" aria-label="Historie členství"><h2>Historie členství</h2>{history.items.length ? history.items.map((membership) => <article className="detail-card" key={membership.membershipId}><h3>{membership.displayName}</h3><p>{membership.sportName} · {membership.seasonName}</p><p>{intervalLabel(membership.validFrom, membership.validTo)}</p>{(user?.role === "ADMIN" || context?.teamContexts.some((team) => team.teamSeasonId === membership.teamSeasonId)) && <Link className="text-button" href={`/teams/${membership.teamSeasonId}`}>Zobrazit tým</Link>}</article>) : <EmptyState>V povoleném rozsahu nejsou evidovaná žádná členství.</EmptyState>}<Pagination page={page} result={history} changePage={setPage} /></section><div className="actions"><Link className="button button-secondary" href="/teams">Týmy a soupisky</Link>{context?.capabilities.includes("MANAGE_PLAYERS") && <Link className="text-button" href="/admin/players">Správa hráčů</Link>}</div></>}</ResourceView></section>;
}

export function PlayerProfile({ id }: { id: string }) { return <AccessGate completeProfile><PlayerContent id={id} /></AccessGate>; }
