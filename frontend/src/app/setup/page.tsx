import type { Metadata } from "next";
import { ClubSetup } from "@/components/ClubSetup";

export const metadata: Metadata = { title: "Nastavení klubu" };

export default function SetupPage() {
  return <ClubSetup />;
}
