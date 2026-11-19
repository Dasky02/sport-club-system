import { AccessGate } from "@/components/AccessGate";
import { Calendar } from "@/components/events/Calendar";

export const metadata = { title: "Kalendář" };

export default function CalendarPage() {
  return <AccessGate completeProfile><Calendar /></AccessGate>;
}
