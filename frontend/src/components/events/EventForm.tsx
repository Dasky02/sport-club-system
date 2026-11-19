"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/api/api";
import { mapErrorToMessage, mapFieldErrors } from "@/api/errorMapper";
import { createEvent, editEvent, getEventOptions, type ClubEvent, type EventOptions, type EventSchedule, type EventType } from "@/api/events";
import { ResourceView, useResource } from "@/components/club/Resource";
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

export function EventForm({ options, event, onSaved }: { options?: EventOptions; event?: ClubEvent; onSaved?: () => void }) {
  const router = useRouter();
  const [season, setSeason] = useState(options?.seasons[0]?.id ?? "");
  const [type, setType] = useState<EventType>("TRAINING");
  const [teams, setTeams] = useState<string[]>([]);
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [competition, setCompetition] = useState("");
  const [format, setFormat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<Record<string, string>>({});
  const seasonTeams = options?.teams.filter((team) => team.seasonId === season) ?? [];
  const clubTeams = seasonTeams.filter((team) => team.clubTeam);
  const homeTeam = seasonTeams.find((team) => team.id === home);
  const awayTeam = seasonTeams.find((team) => team.id === away);
  const competitions = options?.competitions.filter((item) => item.teamSeasonIds.includes(home) && item.teamSeasonIds.includes(away)) ?? [];
  const selectedCompetition = competitions.find((item) => item.id === competition);
  const selectedFormat = selectedCompetition?.matchFormatId ?? format;
  const formats = options?.formats.filter((item) => item.sportId === homeTeam?.sportId) ?? [];
  const previous = event?.schedule;
  const inputTime = (field: keyof EventSchedule) => previous?.[field] ? clubDateTimeInput(previous[field]) : "";

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
  return <form className="club-form" onSubmit={submit}>
    <fieldset disabled={busy} className="event-fieldset">
      {!event && <>
        <div className="form-grid">
          <label className="field">Sezóna<select required value={season} onChange={(e) => { setSeason(e.target.value); setTeams([]); setHome(""); setAway(""); setCompetition(""); setFormat(""); }}>
            {options?.seasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label className="field">Typ akce<select value={type} onChange={(e) => setType(e.target.value as EventType)}>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        </div>
        {type !== "MATCH" ? <fieldset className="event-team-picker"><legend>Klubové týmy</legend>
          {clubTeams.length === 0 && <p>V této sezóně nemáte k dispozici žádný klubový tým.</p>}
          {clubTeams.map((team) => <label key={team.id} className="checkbox-field"><input type="checkbox" checked={teams.includes(team.id)}
            onChange={(e) => setTeams((current) => e.target.checked ? [...current, team.id] : current.filter((id) => id !== team.id))} />{team.name}</label>)}
        </fieldset> : <div className="form-grid">
          <label className="field">Domácí tým<select required value={home} onChange={(e) => { setHome(e.target.value); setAway(""); setCompetition(""); setFormat(""); }}>
            <option value="">Vyberte tým</option>{seasonTeams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}
          </select></label>
          <label className="field">Hostující tým<select required value={away} disabled={!home} onChange={(e) => { setAway(e.target.value); setCompetition(""); }}>
            <option value="">Vyberte tým</option>{seasonTeams.filter((team) => team.id !== home && team.sportId === homeTeam?.sportId).map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}
          </select></label>
          <label className="field">Soutěžní ročník<select value={competition} disabled={!away} onChange={(e) => { setCompetition(e.target.value); setFormat(""); }}>
            <option value="">Přátelský zápas</option>{competitions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label className="field">Formát zápasu<select required value={selectedFormat} disabled={!home || !!selectedCompetition} aria-invalid={!!invalid["match.matchFormatId"]} onChange={(e) => setFormat(e.target.value)}>
            <option value="">Vyberte formát</option>{formats.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
        </div>}
      </>}
      <label className="field">Název<input name="title" required maxLength={160} defaultValue={previous?.title} aria-invalid={!!invalid["schedule.title"]} /></label>
      <div className="form-grid">
        <label className="field">Začátek (Praha)<input name="startsAt" type="datetime-local" required defaultValue={inputTime("startsAt")} aria-invalid={!!invalid["schedule.startsAt"]} /></label>
        <label className="field">Konec (Praha)<input name="endsAt" type="datetime-local" required defaultValue={inputTime("endsAt")} aria-invalid={!!invalid["schedule.endsAt"]} /></label>
        <label className="field">Uzávěrka dostupnosti (Praha)<input name="availabilityDeadline" type="datetime-local" defaultValue={inputTime("availabilityDeadline")} aria-invalid={!!invalid["schedule.availabilityDeadline"]} /></label>
        <label className="field">Místo<input name="location" maxLength={200} defaultValue={previous?.location ?? ""} aria-invalid={!!invalid["schedule.location"]} /></label>
      </div>
      <label className="field">Popis<textarea name="description" rows={3} maxLength={4000} defaultValue={previous?.description ?? ""} aria-invalid={!!invalid["schedule.description"]} /></label>
      {error && <p className="message message-error" role="alert">{error}</p>}
      <button className="button" type="submit">{busy ? "Ukládám…" : event ? "Uložit změny" : "Vytvořit koncept"}</button>
    </fieldset>
  </form>;
}

export function NewEvent() {
  const { user } = useAuth();
  const options = useResource(getEventOptions, user?.id);
  return <section className="club-page event-page">
    <Link className="back-link" href="/calendar">← Kalendář</Link>
    <h1>Nová akce</h1>
    <div className="detail-card">
      <ResourceView {...options}>{(data) => data.seasons.length
        ? <EventForm options={data} />
        : <p>{user?.role === "ADMIN" ? "Nejprve založte sezónu a přiřaďte k ní týmy." : "K založení akce potřebujete trenérské přiřazení v sezóně."}</p>}
      </ResourceView>
    </div>
  </section>;
}
