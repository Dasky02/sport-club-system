import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sport Club System", template: "%s | Sport Club System" },
  description: "Informační systém pro správu sportovního klubu. Technický základ ročníkového projektu.",
  icons: { icon: "/club-mark.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <AuthProvider>
          <a className="skip-link" href="#main">Přejít na obsah</a>
          <SiteHeader />
          <main id="main" className="page-shell">{children}</main>
          <footer className="site-footer">
            <span>Sport Club System</span>
            <span>Ročníkový projekt · Technický základ, etapa 1</span>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
