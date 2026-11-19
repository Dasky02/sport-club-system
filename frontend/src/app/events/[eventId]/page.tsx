import { notFound } from "next/navigation";
import { AccessGate } from "@/components/AccessGate";
import { EventDetail } from "@/components/events/EventDetail";

export const metadata = { title: "Detail akce" };

export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(eventId)) notFound();
  return <AccessGate completeProfile><EventDetail id={eventId} /></AccessGate>;
}
