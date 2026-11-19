import { AccessGate } from "@/components/AccessGate";
import { NewEvent } from "@/components/events/EventForm";

export const metadata = { title: "Nová akce" };

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ team?: string | string[] }> }) {
  const { team } = await searchParams;
  return <AccessGate completeProfile standardAccount><NewEvent initialTeamId={typeof team === "string" ? team : undefined} /></AccessGate>;
}
