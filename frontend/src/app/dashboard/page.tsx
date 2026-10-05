import type { Metadata } from "next";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = { title: "Můj účet" };

export default function DashboardPage() {
  return <Dashboard />;
}
