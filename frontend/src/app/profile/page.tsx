import type { Metadata } from "next";
import { PersonProfile } from "@/components/PersonProfile";

export const metadata: Metadata = { title: "Osobní údaje" };

export default function ProfilePage() {
  return <PersonProfile />;
}
