"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError } from "@/api/api";
import { mapErrorToMessage, mapFieldErrors } from "@/api/errorMapper";
import { createEvent, editEvent, getEventOptions, type ClubEvent, type EventOptions, type EventSchedule, type EventType } from "@/api/events";
import { ResourceView, useResource } from "@/components/club/Resource";
import { SelectField } from "@/components/club/Fields";
import { FormField } from "@/components/FormField";
import { useAuth } from "@/context/AuthContext";
import { clubDateTimeInput, clubInstant } from "./clubTime";
import { typeLabels } from "./labels";

export function eventError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === "STATE_CONFLICT") return error.message;
    const fields = error.body?.fieldErrors;
    if (fields?.length) return fields.map(({ message }) => message).join(" ");
  }
  return mapErrorToMessage(error);
}

const fields = ["schedule.title", "schedule.description", "schedule.startsAt", "schedule.endsAt", "schedule.location", "schedule.availabilityDeadline", "match.matchFormatId"];

export function EventForm({ options, event, onSaved, initialTeamId }: {
  options?: EventOptions; event?: ClubEvent; onSaved?: () => void; initialTeamId?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const admin = user?.role === "ADMIN";
  const initialTeam = options?.teams.find((team) => team.clubTeam && team.id === initialTeamId);
  const [season, setSeason] = useState(() =>
    initialTeam?.seasonId ?? options?.seasons.find(({ id }) => options.teams.some((team) => team.clubTeam && team.seasonId === id))?.id
      ?? options?.seasons[0]?.id ?? "");
  const [type, setType] = useState<EventType>("TRAINING");
  const [teams, setTeams] = useState(initialTeam ? [initialTeam.id] : []);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [competition, setCompetition] = useState("");
  const [format, setFormat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<Record<string, string>>({});
  const errorSummary = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error, invalid]);
  const seasonTeams = options?.teams.filter((team) => team.seasonId === season) ?? [];
  const clubTeams = seasonTeams.filter((team) => team.clubTeam);
  const selectedSeason = options?.seasons.find(({ id }) => id === season);
  const homeTeam = seasonTeams.find((team) => team.id === home);
  const awayTeam = seasonTeams.find((team) => team.id === away);
  const opponentsFor = (team: NonNullable<typeof homeTeam>) => seasonTeams.filter((option) =>
    option.id !== team.id && option.sportId === team.sportId && (admin || team.clubTeam || option.clubTeam));
  const possibleHome = seasonTeams.filter((team) => opponentsFor(team).length > 0);
  const competitions = options?.competitions.filter((item) => item.teamSeasonIds.includes(home) && item.teamSeasonIds.includes(away)) ?? [];
  const selectedCompetition = competitions.find((item) => item.id === competition);
  const selectedFormat = selectedCompetition?.matchFormatId ?? format;
  const formats = options?.formats.filter((item) => item.sportId === homeTeam?.sportId) ?? [];
  const canPlan = type === "MATCH" ? possibleHome.length > 0 && (!homeTeam || formats.length > 0) : clubTeams.length > 0;
  const previous = event?.schedule;
  const inputTime = (field: keyof EventSchedule) => previous?.[field] ? clubDateTimeInput(previous[field]) : "";

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || (!event && !canPlan)) return;
    setInvalid({});
    const data = new FormData(e.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "");
    const date = (field: "startsAt" | "endsAt" | "availabilityDeadline") => {
      const input = value(field);
      return event?.schedule[field] && input === inputTime(field) ? event.schedule[field] : input ? clubInstant(input) : null;
    };
    let schedule: EventSchedule;
    try {
      const startsAt = date("startsAt");
      const endsAt = date("endsAt");
      if (!startsAt || !endsAt) throw new Error("Vyplňte začátek a konec akce.");
      schedule = { title: value("title"), description: value("description") || null, location: value("location") || null, startsAt, endsAt, availabilityDeadline: date("availabilityDeadline") };
    } catch (error) {
      setError(error instanceof Error ? error.message : "Zkontrolujte termín akce.");
      return;
    }
    if (Date.parse(schedule.endsAt) <= Date.parse(schedule.startsAt)) {
      const message = "Konec musí následovat po začátku.";
      setError(message);
      setInvalid({ "schedule.endsAt": message });
      return;
    }
    if (schedule.availabilityDeadline && Date.parse(schedule.availabilityDeadline) > Date.parse(schedule.startsAt)) {
      const message = "Uzávěrka může být nejpozději při začátku akce.";
      setError(message);
      setInvalid({ "schedule.availabilityDeadline": message });
      return;
    }
    const isMatch = type === "MATCH";
    if (!event && !isMatch && teams.length === 0) { setError("Vyberte alespoň jeden tým."); return; }
    if (!event && isMatch && !(homeTeam && awayTeam && selectedFormat)) { setError("Vyberte strany a formát zápasu."); return; }
    setError(""); setInvalid({}); setBusy(true);
    try {
      if (event) {
        await editEvent(event.id, event.version, schedule);
        onSaved?.();
      } else {
        const result = await createEvent({ seasonId: season, type, schedule,
          teamSeasonIds: isMatch ? [homeTeam, awayTeam].flatMap((team) => team?.clubTeam ? [team.id] : []) : teams,
          match: isMatch ? { competitionSeasonId: competition || null, matchFormatId: selectedFormat, homeTeamSeasonId: home, awayTeamSeasonId: away } : null });
        router.push(`/events/${result.event.id}`);
      }
    } catch (failure) {
      setError(eventError(failure));
      setInvalid(mapFieldErrors(failure, fields));
    } finally { setBusy(false); }
  };
  return <form className="club-form" onSubmit={submit} aria-busy={busy}>
    {error && <p className="message message-error form-error" role="alert" ref={errorSummary} tabIndex={-1}>{error}</p>}
    <fieldset disabled={busy} className="event-fieldset">
      {!event && <section className="event-form-section">
        <h2>Zařazení akce</h2>
        <div className="form-grid">
          <label className="field">Sezóna<select required value={season} onChange={(e) => { setSeason(e.target.value); setTeams([]); setHome(""); setAway(""); setCompetition(""); setFormat(""); }}>
            {options?.seasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label className="field">Typ akce<select value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        </div>
        {type !== "MATCH" ? <fieldset className="event-team-picker"><legend>Klubové týmy</legend>
          {clubTeams.length === 0 && <div className="event-prerequisite">
            <p>V této sezóně není dostupný klubový tým.</p>
            {admin && <Link href="/admin/teams#zaradit-tym">Zařadit klubový tým do sezóny</Link>}
          </div>}
          {clubTeams.map((team) => <label key={team.id} className="checkbox-field"><input type="checkbox" checked={teams.includes(team.id)}
            onChange={(e) => setTeams((current) => e.target.checked ? [...current, team.id] : current.filter((id) => id !== team.id))} />{team.name}</label>)}
        </fieldset> : <><div className="form-grid">
          <label className="field">Domácí tým<select required value={home} onChange={(e) => { setHome(e.target.value); setAway(""); setCompetition(""); setFormat(""); }}>
            <option value="">Vyberte tým</option>{possibleHome.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}
          </select></label>
          <label className="field">Hostující tým<select required value={away} disabled={!home} onChange={(e) => { setAway(e.target.value); setCompetition(""); }}>
            <option value="">Vyberte tým</option>{homeTeam && opponentsFor(homeTeam).map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}
          </select></label>
          <label className="field">Soutěžní ročník<select value={competition} disabled={!away} onChange={(e) => { setCompetition(e.target.value); setFormat(""); }}>
            <option value="">Přátelský zápas</option>{competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <SelectField name="matchFormatId" label="Formát zápasu" required value={selectedFormat} disabled={!home || !formats.length || !!selectedCompetition} error={invalid["match.matchFormatId"]} onChange={(e) => setFormat(e.target.value)}>
            <option value="">Vyberte formát</option>{formats.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </SelectField>
        </div>
          {!possibleHome.length && <div className="event-prerequisite">
            <p>Pro zápas potřebujete v této sezóně dva týmy stejného sportu.</p>
            {admin && <Link href="/admin/teams#zaradit-tym">Spravovat týmy v sezóně</Link>}
          </div>}
          {homeTeam && !formats.length && <div className="event-prerequisite">
            <p>Pro sport domácího týmu chybí formát zápasu.</p>
            {admin && <Link href="/admin/match-formats#novy-format">Vytvořit formát zápasu</Link>}
          </div>}
        </>}
      </section>}
      <section className="event-form-section">
        <h2>Údaje o akci</h2>
        <FormField name="title" label="Název" required maxLength={160} defaultValue={previous?.title} error={invalid["schedule.title"]} />
        <FormField name="location" label="Místo" maxLength={200} defaultValue={previous?.location ?? ""} error={invalid["schedule.location"]} />
        <label className="field">Popis<textarea name="description" rows={3} maxLength={4000} defaultValue={previous?.description ?? ""} aria-invalid={!!invalid["schedule.description"]} /></label>
      </section>
      <section className="event-form-section">
        <h2>Termín</h2>
        <p className="field-hint">Časy zadávejte v českém místním čase.</p>
        <div className="form-grid">
          <FormField name="startsAt" label="Začátek" type="datetime-local" min={selectedSeason && `${selectedSeason.startsOn}T00:00`} max={selectedSeason && `${selectedSeason.endsOn}T00:00`} required defaultValue={inputTime("startsAt")} error={invalid["schedule.startsAt"]} />
          <FormField name="endsAt" label="Konec" type="datetime-local" min={selectedSeason && `${selectedSeason.startsOn}T00:00`} max={selectedSeason && `${selectedSeason.endsOn}T00:00`} required defaultValue={inputTime("endsAt")} error={invalid["schedule.endsAt"]} />
        </div>
        <FormField name="availabilityDeadline" label="Uzávěrka dostupnosti" type="datetime-local" defaultValue={inputTime("availabilityDeadline")} error={invalid["schedule.availabilityDeadline"]} />
      </section>
      <button className="button" type="submit" disabled={!event && !canPlan}>{busy ? "Ukládám…" : event ? "Uložit změny" : "Vytvořit koncept"}</button>
    </fieldset>
  </form>;
}

export function NewEvent({ initialTeamId }: { initialTeamId?: string }) {
  const { user } = useAuth();
  const options = useResource(getEventOptions, user?.id);
  return <section className="club-page event-page">
    <Link className="back-link" href="/calendar">← Kalendář</Link>
    <h1>Nová akce</h1>
    <div className="detail-card">
      <ResourceView {...options}>{(data) => data.seasons.length
        ? <EventForm key={initialTeamId} initialTeamId={initialTeamId} options={data} />
        : <div className="event-prerequisite">
          <p>{user?.role === "ADMIN" ? "K naplánování akce potřebujete otevřenou sezónu a tým zařazený v této sezóně." : "K založení akce potřebujete trenérské přiřazení v sezóně."}</p>
          {user?.role === "ADMIN" && <Link href="/admin/seasons#nova-sezona">Založit sezónu</Link>}
        </div>}
      </ResourceView>
    </div>
  </section>;
}
