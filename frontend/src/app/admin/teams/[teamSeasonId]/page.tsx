import { MembershipsManager } from "@/components/club/MembershipsManager";
export default async function Page({ params }: { params: Promise<{ teamSeasonId: string }> }) { const { teamSeasonId } = await params; return <MembershipsManager id={teamSeasonId} />; }
