import type { Metadata } from "next";
import { MyChildren } from "@/components/club/ChildrenViews";
export const metadata: Metadata = { title: "Moje děti" };
export default function Page() { return <MyChildren />; }
