import { AccessGate } from "@/components/AccessGate";
import { NewEvent } from "@/components/events/EventForm";

export const metadata = { title: "Nová akce" };

export default function NewEventPage() {
  return <AccessGate completeProfile standardAccount><NewEvent /></AccessGate>;
}
