import Link from "next/link";
import { db } from "@/db";
import { etablissements } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
import { TYPE_LABELS } from "@/lib/utils";
import { Hotel, Stethoscope, UtensilsCrossed, Sparkles, Scissors, Building2, ArrowRight, Star, MapPin, Search } from "lucide-react";
import { SearchForm } from "@/components/SearchForm";

const ICONS: Record<string, any> = {
  hotel: Hotel,
  clinique: Stethoscope,
  restaurant: UtensilsCrossed,
  spa: Sparkles,
  salon: Scissors,
  autre: Building2,
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const populaires = await db
    .select({
      id: etablissements.id,
      nom: etablissements.nom,
      type: etablissements.type,
      description: etablissements.description,
      ville: etablissements.ville,
      imageUrl: etablissements.imageUrl,
    })
    .from(etablissements)
    .orderBy(desc(etablissements.id))
    .limit(6);

  const totalRow = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(etablissements);
  const total = totalRow[0]?.c ?? 0;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-60">
          <div className="absolute top-20 -left-20 h-72 w-72 rounded-full bg-rose-300 blur-3xl" />
          <div className="absolute top-40 right-0 h-96 w-96 rounded-full bg-orange-200 blur-3xl" />
          <div className="absolute -bottom-10 left-1/3 h-72 w-72 rounded-full bg-sky-200 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <span className="badge bg-rose-100 text-rose-700 mb-4">
              🇹🇳 Fait en Tunisie · Pour la Tunisie
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Réservez en quelques clics,{" "}
              <span className="gradient-text">partout en Tunisie</span>
            </h1>
            <p className="mt-5 text-lg text-slate-700 max-w-2xl mx-auto">
              Hôtels, cliniques, restaurants, spas, salons — trouvez et réservez
              le créneau parfait, recevez vos confirmations par email & SMS.
            </p>
            <div className="mt-10">
              <SearchForm />
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span><strong>{total}+</strong> établissements partenaires</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-emerald-500" />
                <span>Confirmations instantanées</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📱</span>
                <span>Notifications SMS & email</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catégories */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h2 className="text-2xl font-bold mb-6">Explorez par catégorie</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(TYPE_LABELS).map(([k, label]) => {
            const Icon = ICONS[k] ?? Building2;
            return (
              <Link
                key={k}
                href={`/etablissements?type=${k}`}
                className="card rounded-2xl p-5 text-center hover:scale-[1.02] transition-transform"
              >
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-rose-100 to-orange-100 text-rose-600">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-3 font-medium text-sm">{label}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Populaires */}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-2xl font-bold">Établissements populaires</h2>
          <Link
            href="/etablissements"
            className="text-rose-600 hover:underline text-sm font-medium flex items-center gap-1"
          >
            Tout voir <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {populaires.length === 0 ? (
          <div className="card rounded-2xl p-10 text-center">
            <p className="text-slate-600">
              Aucun établissement pour l'instant. Visitez{" "}
              <Link
                href="/api/seed"
                className="text-rose-600 underline"
              >
                /api/seed
              </Link>{" "}
              pour initialiser la démo.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {populaires.map((e) => {
              const Icon = ICONS[e.type] ?? Building2;
              return (
                <Link
                  key={e.id}
                  href={`/etablissements/${e.id}`}
                  className="card rounded-2xl overflow-hidden hover:scale-[1.01] transition-transform"
                >
                  <div className="aspect-[16/9] bg-gradient-to-br from-rose-200 via-orange-100 to-amber-100 relative">
                    {e.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.imageUrl}
                        alt={e.nom}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center">
                        <Icon className="h-16 w-16 text-rose-400/50" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="badge bg-white/90 text-slate-700">
                        {TYPE_LABELS[e.type] ?? e.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg">{e.nom}</h3>
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
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Avantages */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: "⚡",
              title: "Réservation en 30 secondes",
              desc: "Choisissez une date, un créneau, et validez. C'est fait.",
            },
            {
              icon: "📧",
              title: "Email + SMS automatiques",
              desc: "Confirmation, rappel J-1, et annulation — tout est géré.",
            },
            {
              icon: "🛡️",
              title: "Données sécurisées",
              desc: "Authentification chiffrée, JWT, et conformité RGPD.",
            },
          ].map((b) => (
            <div key={b.title} className="card rounded-2xl p-6">
              <div className="text-4xl">{b.icon}</div>
              <h3 className="font-bold mt-3">{b.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
