import { MembershipsManager } from "@/components/club/MembershipsManager";
export default async function Page({ params, searchParams }: {
  params: Promise<{ teamSeasonId: string }>;
  searchParams: Promise<{ player?: string | string[] }>;
}) {
  const [{ teamSeasonId }, { player }] = await Promise.all([params, searchParams]);
  return <MembershipsManager key={teamSeasonId} id={teamSeasonId} playerId={typeof player === "string" ? player : undefined} />;
}
