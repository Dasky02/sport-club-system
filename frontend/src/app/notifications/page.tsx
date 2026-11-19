import { AccessGate } from "@/components/AccessGate";
import { Notifications } from "@/components/events/Notifications";

export const metadata = { title: "Oznámení" };

export default function NotificationsPage() {
  return <AccessGate completeProfile><Notifications /></AccessGate>;
}
