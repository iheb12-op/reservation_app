import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Toaster } from "sonner";
import { TopNav } from "@/components/TopNav";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Maweid — Plateforme de réservation en Tunisie",
  description:
    "Réservez vos hôtels, cliniques, restaurants, spas et plus encore partout en Tunisie.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <html lang="fr">
      <body className="text-slate-900 antialiased min-h-screen">
        <TopNav
          user={
            user
              ? {
                  id: user.id,
                  nom: user.nom,
                  email: user.email,
                  role: user.role,
                }
              : null
          }
        />
        <main className="pb-20">{children}</main>
        <Toaster position="top-right" richColors closeButton />
        <footer className="border-t border-white/40 bg-white/40 backdrop-blur">
          <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-slate-600 flex flex-col md:flex-row items-center justify-between gap-3">
            <div>
              <span className="font-semibold gradient-text">Maweid</span>{" "}
              — La plateforme #1 de réservation en Tunisie.
            </div>
            <div>© {new Date().getFullYear()} Maweid. Tous droits réservés.</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
