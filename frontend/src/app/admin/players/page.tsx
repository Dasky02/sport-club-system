import type { Metadata } from "next";
import { PlayersManager } from "@/components/club/PlayersManager";
export const metadata: Metadata = { title: "Správa hráčů" };
export default function Page() { return <PlayersManager />; }
