import type { Metadata } from "next";
import { TeamList } from "@/components/club/TeamViews";
export const metadata: Metadata = { title: "Týmy a soupisky" };
export default function Page() { return <TeamList />; }
