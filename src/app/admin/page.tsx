import { redirect } from "next/navigation";
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
import { eq, and, sql, gte, desc, inArray } from "drizzle-orm";
import { STATUT_LABELS, STATUT_COLORS, formatPrice, TYPE_LABELS } from "@/lib/utils";
import { AdminDashboardClient } from "@/components/AdminDashboardClient";
import { Building2, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

async function getLast7Days(etaIds: number[]) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  let dailyRows: { day: string; c: number }[] = [];
  if (etaIds.length > 0) {
    dailyRows = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${reservations.createdAt}), 'YYYY-MM-DD')`,
        c: sql<number>`COUNT(*)::int`,
      })
      .from(reservations)
      .where(
        and(
          sql`${reservations.etablissementId} IN (${sql.join(etaIds, sql`, `)})`,
          gte(reservations.createdAt, sevenDaysAgo),
        ),
      )
      .groupBy(sql`date_trunc('day', ${reservations.createdAt})`)
      .orderBy(sql`date_trunc('day', ${reservations.createdAt})`);
  }
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const r = dailyRows.find((x) => x.day === key);
    return { day: key, count: r?.c ?? 0 };
  });
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role === "client") redirect("/dashboard");
  if (user.role === "superadmin") redirect("/superadmin");

  const myEtas = await db
    .select()
    .from(etablissements)
    .where(eq(etablissements.adminId, user.id))
    .orderBy(desc(etablissements.id));

  let reservationsList: any[] = [];
  if (myEtas.length > 0) {
    const ids = myEtas.map((e) => e.id);
    reservationsList = await db
      .select({
        id: reservations.id,
        statut: reservations.statut,
        noteClient: reservations.noteClient,
        nombrePersonnes: reservations.nombrePersonnes,
        prixTotal: reservations.prixTotal,
        createdAt: reservations.createdAt,
        creneauDebut: creneaux.dateDebut,
        creneauFin: creneaux.dateFin,
        creneauId: creneaux.id,
        creneauDispo: creneaux.disponible,
        serviceId: services.id,
        serviceNom: services.nom,
        serviceDuree: services.dureeMinutes,
        etablissementId: etablissements.id,
        etablissementNom: etablissements.nom,
        etablissementVille: etablissements.ville,
        clientId: users.id,
        clientNom: users.nom,
        clientEmail: users.email,
        clientTel: users.telephone,
      })
      .from(reservations)
      .innerJoin(creneaux, eq(creneaux.id, reservations.creneauId))
      .innerJoin(services, eq(services.id, creneaux.serviceId))
      .innerJoin(etablissements, eq(etablissements.id, services.etablissementId))
      .innerJoin(users, eq(users.id, reservations.clientId))
      .where(
        sql`${reservations.etablissementId} IN (${sql.join(ids, sql`, `)})`,
      )
      .orderBy(desc(creneaux.dateDebut));
  }

  // 7 derniers jours
  const last7 = await getLast7Days(myEtas.map((e) => e.id));
  // Compute stats
  const totalResa = reservationsList.length;
  const enAttente = reservationsList.filter((r) => r.statut === "en_attente").length;
  const confirmees = reservationsList.filter((r) => r.statut === "confirmee").length;
  const annulees = reservationsList.filter((r) => r.statut === "annulee").length;
  const revenu = reservationsList
    .filter((r) => r.statut === "confirmee" || r.statut === "terminee")
    .reduce((s, r) => s + r.prixTotal, 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Espace établissement</h1>
          <p className="text-slate-600 text-sm mt-1">
            Bienvenue, {user.nom}. Gérez vos créneaux, services et réservations.
          </p>
        </div>
        <Link
          href="/admin/etablissements/nouveau"
          className="btn-primary flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Nouvel établissement
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Réservations", value: totalResa, color: "from-rose-400 to-orange-400" },
          { label: "En attente", value: enAttente, color: "from-amber-400 to-orange-400" },
          { label: "Confirmées", value: confirmees, color: "from-emerald-400 to-teal-400" },
          { label: "Revenu", value: formatPrice(revenu), color: "from-sky-400 to-cyan-400" },
        ].map((s) => (
          <div key={s.label} className="card rounded-2xl p-4">
            <div
              className={`h-1 w-12 rounded-full bg-gradient-to-r ${s.color} mb-3`}
            />
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-slate-600">{s.label}</div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-3">Vos établissements</h2>
      {myEtas.length === 0 ? (
        <div className="card rounded-2xl p-10 text-center">
          <Building2 className="h-10 w-10 mx-auto text-slate-300" />
          <p className="mt-3 text-slate-600">
            Vous n'avez pas encore d'établissement.
          </p>
          <Link
            href="/admin/etablissements/nouveau"
            className="btn-primary inline-block mt-4"
          >
            Créer mon premier établissement
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {myEtas.map((e) => (
            <Link
              key={e.id}
              href={`/admin/etablissements/${e.id}`}
              className="card rounded-2xl p-5 hover:border-rose-300 transition"
            >
              <span className="badge bg-rose-100 text-rose-700">
                {TYPE_LABELS[e.type] ?? e.type}
              </span>
              <h3 className="font-semibold text-lg mt-2">{e.nom}</h3>
              {e.ville && (
                <p className="text-sm text-slate-600">📍 {e.ville}</p>
              )}
            </Link>
          ))}
        </div>
      )}

      <AdminDashboardClient
        reservations={reservationsList.map((r) => ({
          ...r,
          creneauDebut: r.creneauDebut.toISOString(),
          creneauFin: r.creneauFin.toISOString(),
          createdAt: r.createdAt.toISOString(),
        }))}
        last7={last7}
      />
    </div>
  );
}
