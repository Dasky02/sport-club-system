import type { Metadata } from "next";
import { ChildProfile } from "@/components/club/ChildrenViews";
export const metadata: Metadata = { title: "Profil dítěte" };
export default async function Page({ params }: { params: Promise<{ playerId: string }> }) { const { playerId } = await params; return <ChildProfile playerId={playerId} />; }
