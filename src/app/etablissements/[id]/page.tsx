import { notFound } from "next/navigation";
import { db } from "@/db";
import { etablissements, services, creneaux } from "@/db/schema";
import { eq, asc, and, gte, ne, isNotNull } from "drizzle-orm";
import { TYPE_LABELS, formatPrice } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { ReservationFlow } from "@/components/ReservationFlow";
import { Hotel, Stethoscope, UtensilsCrossed, Sparkles, Scissors, Building2, MapPin, Phone } from "lucide-react";

const ICONS: Record<string, any> = {
  hotel: Hotel,
  clinique: Stethoscope,
  restaurant: UtensilsCrossed,
  spa: Sparkles,
  salon: Scissors,
  autre: Building2,
};

export const dynamic = "force-dynamic";

export default async function EtablissementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const etaId = Number(id);
  if (!Number.isFinite(etaId)) notFound();

  const [eta] = await db
    .select()
    .from(etablissements)
    .where(eq(etablissements.id, etaId))
    .limit(1);
  if (!eta) notFound();

  const servicesList = await db
    .select()
    .from(services)
    .where(eq(services.etablissementId, etaId))
    .orderBy(asc(services.id));

  const creneauxList = await db
    .select({
      id: creneaux.id,
      serviceId: creneaux.serviceId,
      dateDebut: creneaux.dateDebut,
      dateFin: creneaux.dateFin,
      disponible: creneaux.disponible,
    })
    .from(creneaux)
    .innerJoin(services, eq(services.id, creneaux.serviceId))
    .where(
      and(
        eq(services.etablissementId, etaId),
        gte(creneaux.dateDebut, new Date()),
      ),
    )
    .orderBy(asc(creneaux.dateDebut));

  const user = await getCurrentUser();
  const Icon = ICONS[eta.type] ?? Building2;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="card rounded-2xl overflow-hidden">
        <div className="aspect-[21/9] bg-gradient-to-br from-rose-200 via-orange-100 to-amber-100 relative">
          {eta.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={eta.imageUrl}
              alt={eta.nom}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full grid place-items-center">
              <Icon className="h-32 w-32 text-rose-300" />
            </div>
          )}
        </div>
        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="badge bg-rose-100 text-rose-700 mb-2">
                {TYPE_LABELS[eta.type] ?? eta.type}
              </span>
              <h1 className="text-3xl font-bold">{eta.nom}</h1>
              {eta.description && (
                <p className="text-slate-700 mt-2 max-w-2xl">
                  {eta.description}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
            {eta.adresse && <div>📍 {eta.adresse}</div>}
            {eta.ville && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {eta.ville}
              </div>
            )}
            {eta.telephone && (
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" /> {eta.telephone}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Services proposés</h2>
        {servicesList.length === 0 ? (
          <div className="card rounded-2xl p-8 text-center text-slate-600">
            Aucun service n'est encore disponible.
          </div>
        ) : (
          <ReservationFlow
            etablissementNom={eta.nom}
            services={servicesList.map((s) => ({
              id: s.id,
              nom: s.nom,
              description: s.description,
              dureeMinutes: s.dureeMinutes,
              prix: s.prix,
              capacite: s.capacite,
            }))}
            creneaux={creneauxList
              .filter((c) => c.disponible)
              .map((c) => ({
                id: c.id,
                serviceId: c.serviceId,
                dateDebut: c.dateDebut.toISOString(),
                dateFin: c.dateFin.toISOString(),
              }))}
            isLoggedIn={!!user}
            userNom={user?.nom ?? ""}
            userEmail={user?.email ?? ""}
          />
        )}
      </div>
    </div>
  );
}

