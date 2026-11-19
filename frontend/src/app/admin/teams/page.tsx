import type { Metadata } from "next";
import { TeamsManager } from "@/components/club/TeamsManager";
export const metadata: Metadata = { title: "Správa týmů" };
export default async function Page({ searchParams }: { searchParams: Promise<{ sport?: string | string[] }> }) {
  const { sport } = await searchParams;
  return <TeamsManager sportId={typeof sport === "string" ? sport : undefined} />;
}
