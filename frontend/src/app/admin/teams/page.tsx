import type { Metadata } from "next";
import { TeamsManager } from "@/components/club/TeamsManager";
export const metadata: Metadata = { title: "Správa týmů" };
export default function Page() { return <TeamsManager />; }
