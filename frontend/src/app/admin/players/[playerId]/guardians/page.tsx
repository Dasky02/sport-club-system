import type { Metadata } from "next";
import { GuardiansManager } from "@/components/club/GuardiansManager";
export const metadata: Metadata = { title: "Rodiče a zákonní zástupci" };
export default async function Page({ params }: { params: Promise<{ playerId: string }> }) { const { playerId } = await params; return <GuardiansManager playerId={playerId} />; }
