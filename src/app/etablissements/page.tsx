import Link from "next/link";
import { db } from "@/db";
import { etablissements, services, creneaux } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { TYPE_LABELS } from "@/lib/utils";
import {
  Hotel,
  Stethoscope,
  UtensilsCrossed,
  Sparkles,
  Scissors,
  Building2,
  MapPin,
  ArrowRight,
} from "lucide-react";

const ICONS: Record<string, any> = {
  hotel: Hotel,
  clinique: Stethoscope,
  restaurant: UtensilsCrossed,
  spa: Sparkles,
  salon: Scissors,
  autre: Building2,
};

export const dynamic = "force-dynamic";

export default async function EtablissementsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; ville?: string }>;
}) {
  const sp = await searchParams;
  const conds: any[] = [];
  if (sp.type) conds.push(eq(etablissements.type, sp.type as any));
  if (sp.q) {
    conds.push(
      sql`(${etablissements.nom} ILIKE ${"%" + sp.q + "%"} OR ${etablissements.ville} ILIKE ${"%" + sp.q + "%"} OR ${etablissements.description} ILIKE ${"%" + sp.q + "%"})`,
    );
  }
  if (sp.ville) {
    conds.push(sql`${etablissements.ville} ILIKE ${"%" + sp.ville + "%"}`);
  }

  const rows = await db
    .select({
      id: etablissements.id,
      nom: etablissements.nom,
      type: etablissements.type,
      description: etablissements.description,
      adresse: etablissements.adresse,
      ville: etablissements.ville,
      telephone: etablissements.telephone,
      servicesCount: sql<number>`COUNT(DISTINCT ${services.id})::int`,
      creneauxCount: sql<number>`COUNT(DISTINCT ${creneaux.id})::int`,
    })
    .from(etablissements)
    .leftJoin(services, eq(services.etablissementId, etablissements.id))
    .leftJoin(
      creneaux,
      and(
        eq(creneaux.serviceId, services.id),
        eq(creneaux.disponible, true),
        gte(creneaux.dateDebut, new Date()),
      ),
    )
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(etablissements.id)
    .orderBy(sql`${etablissements.id} DESC`);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Établissements</h1>
          <p className="text-slate-600 text-sm mt-1">
            {rows.length} résultat{rows.length > 1 ? "s" : ""}
            {sp.type ? ` · ${TYPE_LABELS[sp.type]}` : ""}
            {sp.q ? ` · "${sp.q}"` : ""}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "hotel", "clinique", "restaurant", "spa", "salon"].map((t) => {
            const label = t === "" ? "Tous" : TYPE_LABELS[t];
            const params = new URLSearchParams();
            if (t) params.set("type", t);
            if (sp.q) params.set("q", sp.q);
            return (
              <Link
                key={t}
                href={`/etablissements${params.toString() ? "?" + params : ""}`}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                  (sp.type || "") === t
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-white border-slate-200 text-slate-700 hover:border-rose-300"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="card rounded-2xl p-10 text-center text-slate-600">
          Aucun établissement ne correspond à votre recherche.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((e) => {
            const Icon = ICONS[e.type] ?? Building2;
            return (
              <Link
                key={e.id}
                href={`/etablissements/${e.id}`}
                className="card rounded-2xl overflow-hidden hover:scale-[1.01] transition-transform"
              >
                <div className="aspect-[16/9] bg-gradient-to-br from-rose-200 via-orange-100 to-amber-100 grid place-items-center">
                  <Icon className="h-16 w-16 text-rose-400/50" />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg">{e.nom}</h3>
                    <span className="badge bg-rose-100 text-rose-700">
                      {TYPE_LABELS[e.type] ?? e.type}
                    </span>
                  </div>
                  {e.ville && (
                    <div className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                      <MapPin className="h-3.5 w-3.5" /> {e.ville}
                    </div>
                  )}
                  {e.description && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                      {e.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {e.servicesCount} service{e.servicesCount > 1 ? "s" : ""}
                    </span>
                    <span className="text-rose-600 font-medium flex items-center gap-1">
                      {e.creneauxCount} créneau{e.creneauxCount > 1 ? "x" : ""}{" "}
                      libre{e.creneauxCount > 1 ? "s" : ""}{" "}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
