import type { Metadata } from "next";
import { SeasonsManager } from "@/components/club/SeasonsManager";
export const metadata: Metadata = { title: "Správa sezón" };
export default function Page() { return <SeasonsManager />; }
