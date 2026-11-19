"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { getEventOptions, getEvents, type ClubEvent, type EventType, type EventOptions } from "@/api/events";
import { allPages, getTeamSeasons } from "@/api/teams";
import { useAuth } from "@/context/AuthContext";
import { EmptyState, Pagination, ResourceView, useResource } from "@/components/club/Resource";
import { clubDateKey, changeMonth, currentMonth, displayMonth, displayTime, monthDays, monthRange } from "./clubTime";
import { statusLabels, typeLabels } from "./labels";

const weekdays = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
const noOptions = async (): Promise<Pick<EventOptions, "seasons">> => ({ seasons: [] });

function MonthGrid({ month, events }: { month: string; events: ClubEvent[] }) {
  const { blank, dates } = monthDays(month);
  const today = clubDateKey(new Date());
  const byDate = new Map<string, ClubEvent[]>();
  dates.forEach((date) => byDate.set(date, events.filter(({ schedule }) =>
    clubDateKey(schedule.startsAt) <= date && clubDateKey(new Date(Date.parse(schedule.endsAt) - 1)) >= date)));
  return <>
    <div className="calendar-week" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
    <ol className="calendar-grid" aria-label={displayMonth(month)}>
      {Array.from({ length: blank }, (_, i) => <li key={`blank-${i}`} className="calendar-blank" aria-hidden="true" />)}
      {dates.map((date) => {
        const daily = byDate.get(date) ?? [];
        return <li key={date} className={`calendar-day ${daily.length ? "has-events" : ""}`}>
          <time className={date === today ? "calendar-today" : ""} dateTime={date} aria-current={date === today ? "date" : undefined}>{Number(date.slice(-2))}.</time>
          {daily.map(({ id, type, status, schedule }) => <Link key={id} href={`/events/${id}`} className={`calendar-event calendar-${type.toLowerCase()}`}
            title={`${typeLabels[type]} · ${schedule.title} · ${statusLabels[status]}`}>
            <span>{clubDateKey(schedule.startsAt) === date ? displayTime(schedule.startsAt) : "Pokračuje"} · {typeLabels[type]}</span>
            <strong>{schedule.title}</strong>
            {status !== "PUBLISHED" && <span>{statusLabels[status]}</span>}
          </Link>)}
        </li>;
      })}
    </ol>
  </>;
}

export function Calendar() {
  const { user, context } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [type, setType] = useState<EventType | "">("");
  const [teamSeasonId, setTeam] = useState("");
  const [page, setPage] = useState(0);
  const standard = user?.accountType === "STANDARD";
  const canListTeams = user?.role === "ADMIN" || !!context?.teamContexts.length;
  const options = useResource(standard ? getEventOptions : noOptions, user?.id);
  const loadTeams = useCallback(() => canListTeams ? allPages(getTeamSeasons) : Promise.resolve([]), [canListTeams]);
  const teams = useResource(loadTeams, user?.id);
  const loadEvents = useCallback(() => getEvents({ ...monthRange(month), type: type || undefined, teamSeasonId: teamSeasonId || undefined, page, size: 60 }), [month, page, teamSeasonId, type]);
  const events = useResource(loadEvents, user?.id);
  const setVisibleMonth = (value: string) => { setMonth(value); setPage(0); };
  return <section className="club-page event-page">
    <div className="event-heading">
      <h1>Kalendář</h1>
      {(user?.role === "ADMIN" || (options.resource.state === "ready" && options.resource.data.seasons.length > 0)) &&
        <Link className="button" href="/calendar/new">Vytvořit akci</Link>}
    </div>
    <div className="detail-card">
      <div className="calendar-controls">
        <div className="event-actions">
          <button type="button" className="button button-secondary button-small" aria-label="Předchozí měsíc" onClick={() => setVisibleMonth(changeMonth(month, -1))}>←</button>
          <h2 aria-live="polite">{displayMonth(month)}</h2>
          <button type="button" className="button button-secondary button-small" aria-label="Další měsíc" onClick={() => setVisibleMonth(changeMonth(month, 1))}>→</button>
          <button type="button" className="text-button" onClick={() => setVisibleMonth(currentMonth())}>Aktuální měsíc</button>
        </div>
        <div className="event-actions">
          {teams.resource.state === "ready" && teams.resource.data.length > 0 && <label className="field">
            Tým<select value={teamSeasonId} onChange={(e) => { setTeam(e.target.value); setPage(0); }}>
              <option value="">Všechny týmy</option>
              {teams.resource.data.map((team) => <option key={team.id} value={team.id}>{team.displayName} · {team.seasonName}</option>)}
            </select>
          </label>}
          <label className="field">Typ akce<select value={type} onChange={(e) => { setType(e.target.value as EventType | ""); setPage(0); }}>
            <option value="">Všechny typy</option>
            {Object.entries(typeLabels).map(([value, title]) => <option value={value} key={value}>{title}</option>)}
          </select></label>
        </div>
      </div>
      <ResourceView {...events}>{(result) => <>
        <MonthGrid month={month} events={result.items} />
        {!result.items.length && <EmptyState>V tomto měsíci nejsou dostupné žádné akce.</EmptyState>}
        {result.totalPages > 1 && <Pagination page={page} result={result} changePage={setPage} />}
      </>}</ResourceView>
    </div>
  </section>;
}
