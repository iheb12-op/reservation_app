import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  etablissements,
  services,
  creneaux,
  reservations,
  users,
} from "@/db/schema";
import { eq, and, asc, gte, desc, sql } from "drizzle-orm";
import {
  STATUT_LABELS,
  STATUT_COLORS,
  formatDateTime,
  formatPrice,
  TYPE_LABELS,
} from "@/lib/utils";
import { AdminEtablissementClient } from "@/components/AdminEtablissementClient";
import { Calendar, Plus, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminEtablissementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const etaId = Number(id);
  if (!Number.isFinite(etaId)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [eta] = await db
    .select()
    .from(etablissements)
    .where(eq(etablissements.id, etaId))
    .limit(1);
  if (!eta) notFound();
  if (eta.adminId !== user.id && user.role !== "superadmin") {
    redirect("/admin");
  }

  const servicesList = await db
    .select()
    .from(services)
    .where(eq(services.etablissementId, etaId))
    .orderBy(asc(services.id));

  // Future slots grouped by service
  const slotsAll = await db
    .select()
    .from(creneaux)
    .innerJoin(services, eq(services.id, creneaux.serviceId))
    .where(
      and(
        eq(services.etablissementId, etaId),
        gte(creneaux.dateDebut, new Date()),
      ),
    )
    .orderBy(asc(creneaux.dateDebut))
    .limit(500);

  const reservationsList = await db
    .select({
      id: reservations.id,
      statut: reservations.statut,
      noteClient: reservations.noteClient,
      nombrePersonnes: reservations.nombrePersonnes,
      prixTotal: reservations.prixTotal,
      creneauDebut: creneaux.dateDebut,
      creneauFin: creneaux.dateFin,
      creneauId: creneaux.id,
      serviceNom: services.nom,
      serviceId: services.id,
      clientNom: users.nom,
      clientEmail: users.email,
      clientTel: users.telephone,
    })
    .from(reservations)
    .innerJoin(creneaux, eq(creneaux.id, reservations.creneauId))
    .innerJoin(services, eq(services.id, creneaux.serviceId))
    .innerJoin(users, eq(users.id, reservations.clientId))
    .where(eq(reservations.etablissementId, etaId))
    .orderBy(desc(creneaux.dateDebut))
    .limit(100);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link
        href="/admin"
        className="text-sm text-slate-600 hover:text-rose-600 flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <span className="badge bg-rose-100 text-rose-700 mb-1">
            {TYPE_LABELS[eta.type] ?? eta.type}
          </span>
          <h1 className="text-3xl font-bold">{eta.nom}</h1>
          {eta.ville && (
            <p className="text-slate-600 text-sm">📍 {eta.ville}</p>
          )}
        </div>
      </div>

      <AdminEtablissementClient
        etablissementId={eta.id}
        etablissementNom={eta.nom}
        services={servicesList.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
        }))}
        creneaux={slotsAll.map((row) => ({
          id: row.creneaux.id,
          serviceId: row.creneaux.serviceId,
          dateDebut: row.creneaux.dateDebut.toISOString(),
          dateFin: row.creneaux.dateFin.toISOString(),
          disponible: row.creneaux.disponible,
        }))}
        reservations={reservationsList.map((r) => ({
          ...r,
          creneauDebut: r.creneauDebut.toISOString(),
          creneauFin: r.creneauFin.toISOString(),
        }))}
      />
    </div>
  );
}
