"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { getMyChild, getMyChildren } from "@/api/accounts";
import { getPlayerHistory } from "@/api/teams";
import { useAuth } from "@/context/AuthContext";
import { AccessGate } from "../AccessGate";
import { intervalLabel } from "./Fields";
import { EmptyState, Pagination, ResourceView, useResource } from "./Resource";

function ChildrenContent() {
  const { context } = useAuth(); const [page, setPage] = useState(0);
  const load = useCallback(() => getMyChildren(page), [page]); const { resource, reload } = useResource(load, context);
  return <section className="club-page"><p className="eyebrow">Rodina v klubu</p><h1>Moje děti</h1><p className="lead">Zobrazují se pouze hráči, ke kterým máte schválenou rodičovskou vazbu. Dítě nemusí mít vlastní přihlášení.</p><ResourceView resource={resource} reload={reload}>{result => <>{result.items.length ? <div className="club-cards">{result.items.map(child => <article className="detail-card" key={child.playerId} aria-label={child.displayName}><h2>{child.displayName}</h2><Link className="button button-secondary" href={`/my-children/${child.playerId}`}>Profil dítěte</Link></article>)}</div> : <EmptyState>Nemáte žádnou schválenou vazbu na hráče. Pokud má být dítě dostupné, obraťte se na administrátora.</EmptyState>}<Pagination page={page} result={result} changePage={setPage} /></>}</ResourceView></section>;
}
export function MyChildren() { return <AccessGate completeProfile standardAccount><ChildrenContent /></AccessGate>; }

function ChildContent({ playerId }: { playerId: string }) {
  const { context } = useAuth(); const [page, setPage] = useState(0);
  const load = useCallback(async () => { const [child, history] = await Promise.all([getMyChild(playerId), getPlayerHistory(playerId, page)]); return { child, history }; }, [playerId, page]);
  const { resource, reload } = useResource(load, context);
  return <section className="club-page"><p className="eyebrow">Schválené dítě</p><h1>Profil dítěte</h1><ResourceView resource={resource} reload={reload}>{({ child, history }) => <><h2>{child.displayName}</h2><p className="lead">Přehled povolené sportovní historie. Osobní kontakty ani finanční údaje se zde nezobrazují.</p><section className="club-section" aria-label="Členství dítěte"><h2>Historie členství</h2><div className="club-cards">{history.items.map(membership => <article className="detail-card" key={membership.membershipId}><h3>{membership.displayName}</h3><p>{membership.sportName} · {membership.seasonName}</p><p>{intervalLabel(membership.validFrom, membership.validTo)}</p>{context?.teamContexts.some(team => team.teamSeasonId === membership.teamSeasonId) && <Link className="text-button" href={`/teams/${membership.teamSeasonId}`}>Zobrazit tým</Link>}</article>)}</div>{!history.items.length && <EmptyState>Pro dítě zatím nejsou evidovaná žádná členství.</EmptyState>}<Pagination page={page} result={history} changePage={setPage} /></section><div className="actions"><Link className="button button-secondary" href="/my-children">Zpět na moje děti</Link><Link className="text-button" href="/teams">Týmy a soupisky</Link></div></>}</ResourceView></section>;
}
export function ChildProfile({ playerId }: { playerId: string }) { return <AccessGate completeProfile standardAccount><ChildContent playerId={playerId} /></AccessGate>; }
