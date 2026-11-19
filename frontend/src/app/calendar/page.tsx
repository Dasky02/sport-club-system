import { Suspense } from "react";
import { AccessGate } from "@/components/AccessGate";
import { Calendar } from "@/components/events/Calendar";

export const metadata = { title: "Kalendář" };

export default function CalendarPage() {
  return <AccessGate completeProfile><Suspense fallback={<p className="state-card" role="status">Načítám kalendář…</p>}><Calendar /></Suspense></AccessGate>;
}
