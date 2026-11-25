import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";
import "./club.css";
import "./events.css";

export const metadata: Metadata = {
  title: { default: "Sport Club System", template: "%s | Sport Club System" },
  description: "Kalendář, soupisky, oznámení a správa sportovního klubu.",
  icons: { icon: "/club-mark.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <AuthProvider>
          <a className="skip-link" href="#main">Přejít na obsah</a>
          <SiteHeader />
          <main id="main" className="page-shell" tabIndex={-1}>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
