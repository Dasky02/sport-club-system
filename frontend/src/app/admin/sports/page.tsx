import type { Metadata } from "next";
import { SportsManager } from "@/components/SportsManager";

export const metadata: Metadata = { title: "Správa sportů" };

export default function SportsPage() {
  return <SportsManager />;
}
