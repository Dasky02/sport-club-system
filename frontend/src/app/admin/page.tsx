import type { Metadata } from "next";
import { AdminHome } from "@/components/club/AdminHome";
export const metadata: Metadata = { title: "Administrace klubu" };
export default function Page() { return <AdminHome />; }
