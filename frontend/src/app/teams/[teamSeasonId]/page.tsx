import { TeamRoster } from "@/components/club/TeamViews";
export default async function Page({ params }: { params: Promise<{ teamSeasonId: string }> }) { const { teamSeasonId } = await params; return <TeamRoster id={teamSeasonId} />; }
