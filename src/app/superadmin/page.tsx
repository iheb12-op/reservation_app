import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import {
  etablissements,
  reservations,
  users,
  services,
  creneaux,
} from "@/db/schema";
import { eq, sql, gte, desc } from "drizzle-orm";
import {
  STATUT_LABELS,
  STATUT_COLORS,
  formatPrice,
  TYPE_LABELS,
} from "@/lib/utils";
import { Building2, Users, Calendar as CalIcon, DollarSign, Plus } from "lucide-react";
import { BarChartWrapper, PieChartWrapper } from "@/components/ChartsWrapper";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/superadmin");
  if (user.role !== "superadmin") {
    redirect(user.role === "admin" ? "/admin" : "/dashboard");
  }

  // Global stats
  const allEtas = await db
    .select()
    .from(etablissements)
    .orderBy(desc(etablissements.id));

  const allResas = await db
    .select({
      id: reservations.id,
      statut: reservations.statut,
      prixTotal: reservations.prixTotal,
      createdAt: reservations.createdAt,
      etablissementId: reservations.etablissementId,
      etablissementNom: etablissements.nom,
      clientNom: users.nom,
      clientEmail: users.email,
    })
    .from(reservations)
    .innerJoin(etablissements, eq(etablissements.id, reservations.etablissementId))
    .innerJoin(users, eq(users.id, reservations.clientId))
    .orderBy(desc(reservations.createdAt))
    .limit(200);

  const usersCount = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(users)
    .where(eq(users.role, "client"));
  const adminsCount = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(users)
    .where(eq(users.role, "admin"));

  const totalResa = allResas.length;
  const enAttente = allResas.filter((r) => r.statut === "en_attente").length;
  const confirmees = allResas.filter((r) => r.statut === "confirmee").length;
  const annulees = allResas.filter((r) => r.statut === "annulee").length;
  const revenu = allResas
    .filter((r) => r.statut === "confirmee" || r.statut === "terminee")
    .reduce((s, r) => s + r.prixTotal, 0);

  // 7 derniers jours
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const dailyRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${reservations.createdAt}), 'YYYY-MM-DD')`,
      c: sql<number>`COUNT(*)::int`,
    })
    .from(reservations)
    .where(gte(reservations.createdAt, sevenDaysAgo))
    .groupBy(sql`date_trunc('day', ${reservations.createdAt})`)
    .orderBy(sql`date_trunc('day', ${reservations.createdAt})`);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const r = dailyRows.find((x) => x.day === key);
    return { day: key, count: r?.c ?? 0 };
  });

  // Top etas
  const topEtas = await db
    .select({
      id: etablissements.id,
      nom: etablissements.nom,
      type: etablissements.type,
      count: sql<number>`COUNT(${reservations.id})::int`,
    })
    .from(reservations)
    .innerJoin(etablissements, eq(etablissements.id, reservations.etablissementId))
    .groupBy(etablissements.id, etablissements.nom, etablissements.type)
    .orderBy(desc(sql`COUNT(${reservations.id})`))
    .limit(5);

  // Par type
  const parType = await db
    .select({
      type: etablissements.type,
      c: sql<number>`COUNT(DISTINCT ${etablissements.id})::int`,
    })
    .from(etablissements)
    .groupBy(etablissements.type);

  const chartData = last7.map((d) => ({
    day: new Date(d.day).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
    }),
    count: d.count,
  }));
  const typeData = parType.map((p) => ({
    name: TYPE_LABELS[p.type] ?? p.type,
    value: p.c,
  }));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Tableau de bord Super Admin</h1>
          <p className="text-slate-600 text-sm mt-1">
            Vue d'ensemble de la plateforme Maweid.
          </p>
        </div>
        <Link
          href="/superadmin/etablissements/nouveau"
          className="btn-primary flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Nouvel établissement
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {[
          {
            label: "Établissements",
            value: allEtas.length,
            icon: Building2,
            color: "from-rose-400 to-orange-400",
          },
          {
            label: "Clients",
            value: usersCount[0]?.c ?? 0,
            icon: Users,
            color: "from-sky-400 to-cyan-400",
          },
          {
            label: "Réservations",
            value: totalResa,
            icon: CalIcon,
            color: "from-violet-400 to-fuchsia-400",
          },
          {
            label: "Revenu total",
            value: formatPrice(revenu),
            icon: DollarSign,
            color: "from-emerald-400 to-teal-400",
          },
          {
            label: "Admins",
            value: adminsCount[0]?.c ?? 0,
            icon: Users,
            color: "from-amber-400 to-orange-400",
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

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-1">Activité 7 derniers jours</h2>
          <p className="text-sm text-slate-600 mb-4">Réservations par jour.</p>
          <div className="h-64">
            <BarChartWrapper data={chartData} />
          </div>
        </div>
        <div className="card rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-1">Par type</h2>
          <p className="text-sm text-slate-600 mb-4">Répartition des établissements.</p>
          <div className="h-64">
            <PieChartWrapper data={typeData} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-3">Top établissements</h2>
          {topEtas.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune donnée.</p>
          ) : (
            <div className="space-y-2">
              {topEtas.map((e, i) => (
                <Link
                  key={e.id}
                  href={`/etablissements/${e.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-rose-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-medium text-sm">{e.nom}</div>
                      <div className="text-xs text-slate-500">
                        {TYPE_LABELS[e.type] ?? e.type}
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-rose-600">{e.count}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-3">Statuts des réservations</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "En attente", value: enAttente, color: "bg-amber-100 text-amber-700" },
              { label: "Confirmées", value: confirmees, color: "bg-emerald-100 text-emerald-700" },
              { label: "Annulées", value: annulees, color: "bg-rose-100 text-rose-700" },
              { label: "Total", value: totalResa, color: "bg-sky-100 text-sky-700" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-3">Tous les établissements</h2>
      <div className="card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Ville</th>
              <th className="text-left p-3">Admin</th>
              <th className="text-left p-3">Créé le</th>
              <th className="text-right p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {allEtas.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Aucun établissement.
                </td>
              </tr>
            ) : (
              allEtas.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="p-3 font-medium">{e.nom}</td>
                  <td className="p-3">
                    <span className="badge bg-rose-100 text-rose-700">
                      {TYPE_LABELS[e.type] ?? e.type}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{e.ville ?? "—"}</td>
                  <td className="p-3 text-slate-600">#{e.adminId}</td>
                  <td className="p-3 text-slate-500">
                    {e.createdAt.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/etablissements/${e.id}`}
                      className="text-rose-600 hover:underline"
                    >
                      Gérer →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
