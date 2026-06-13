import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  reservations,
  creneaux,
  services,
  etablissements,
  notifications,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { STATUT_LABELS, STATUT_COLORS, formatDateTime, formatPrice } from "@/lib/utils";
import { ClientDashboardClient } from "@/components/ClientDashboardClient";
import { Calendar, CheckCircle2, Clock, XCircle, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "client") {
    redirect(user.role === "superadmin" ? "/superadmin" : "/admin");
  }

  const reservationsList = await db
    .select({
      id: reservations.id,
      statut: reservations.statut,
      noteClient: reservations.noteClient,
      nombrePersonnes: reservations.nombrePersonnes,
      prixTotal: reservations.prixTotal,
      createdAt: reservations.createdAt,
      creneauDebut: creneaux.dateDebut,
      creneauFin: creneaux.dateFin,
      serviceNom: services.nom,
      etablissementNom: etablissements.nom,
      etablissementId: etablissements.id,
      etablissementVille: etablissements.ville,
    })
    .from(reservations)
    .innerJoin(creneaux, eq(creneaux.id, reservations.creneauId))
    .innerJoin(services, eq(services.id, creneaux.serviceId))
    .innerJoin(etablissements, eq(etablissements.id, services.etablissementId))
    .where(eq(reservations.clientId, user.id))
    .orderBy(desc(creneaux.dateDebut));

  const notifs = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(20);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Bonjour, {user.nom} 👋</h1>
          <p className="text-slate-600 text-sm mt-1">
            Suivez toutes vos réservations en un coup d'œil.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/etablissements" className="btn-primary">
            Réserver
          </a>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Total",
            value: reservationsList.length,
            color: "from-rose-400 to-orange-400",
            icon: Calendar,
          },
          {
            label: "En attente",
            value: reservationsList.filter((r) => r.statut === "en_attente").length,
            color: "from-amber-400 to-orange-400",
            icon: Clock,
          },
          {
            label: "Confirmées",
            value: reservationsList.filter((r) => r.statut === "confirmee").length,
            color: "from-emerald-400 to-teal-400",
            icon: CheckCircle2,
          },
          {
            label: "Annulées",
            value: reservationsList.filter((r) => r.statut === "annulee").length,
            color: "from-rose-500 to-pink-500",
            icon: XCircle,
          },
        ].map((s) => (
          <div key={s.label} className="card rounded-2xl p-4">
            <div
              className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${s.color} text-white`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-slate-600">{s.label}</div>
          </div>
        ))}
      </div>

      <ClientDashboardClient
        reservations={reservationsList.map((r) => ({
          ...r,
          creneauDebut: r.creneauDebut.toISOString(),
          creneauFin: r.creneauFin.toISOString(),
          createdAt: r.createdAt.toISOString(),
        }))}
        notifications={notifs.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
