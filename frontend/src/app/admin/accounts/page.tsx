import type { Metadata } from "next";
import { AccountsManager } from "@/components/club/AccountsManager";
export const metadata: Metadata = { title: "Správa přístupových účtů" };
export default function Page() { return <AccountsManager />; }
