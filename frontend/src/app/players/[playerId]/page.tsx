import { PlayerProfile } from "@/components/club/TeamViews";
export default async function Page({ params }: { params: Promise<{ playerId: string }> }) { const { playerId } = await params; return <PlayerProfile id={playerId} />; }
