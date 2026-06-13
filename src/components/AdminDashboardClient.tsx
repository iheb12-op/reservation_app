"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  STATUT_LABELS,
  STATUT_COLORS,
  formatDateTime,
  formatPrice,
} from "@/lib/utils";
import { CheckCircle2, XCircle, Check, Eye } from "lucide-react";

type Resa = {
  id: number;
  statut: "en_attente" | "confirmee" | "annulee" | "terminee";
  noteClient: string | null;
  nombrePersonnes: number;
  prixTotal: number;
  createdAt: string;
  creneauDebut: string;
  creneauFin: string;
  creneauId: number;
  creneauDispo: boolean;
  serviceId: number;
  serviceNom: string;
  serviceDuree: number;
  etablissementId: number;
  etablissementNom: string;
  etablissementVille: string | null;
  clientId: number;
  clientNom: string;
  clientEmail: string;
  clientTel: string | null;
};

export function AdminDashboardClient({
  reservations,
  last7,
}: {
  reservations: Resa[];
  last7: { day: string; count: number }[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "en_attente" | "confirmee" | "annulee" | "terminee">("en_attente");
  const [busy, setBusy] = useState<number | null>(null);

  const list = reservations.filter((r) =>
    filter === "all" ? true : r.statut === filter,
  );

  async function action(id: number, a: "confirm" | "cancel" | "complete") {
    if (
      a === "cancel" &&
      !confirm("Annuler cette réservation ? Le créneau sera libéré.")
    )
      return;
    setBusy(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: a }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success(
        a === "confirm"
          ? "✅ Réservation confirmée"
          : a === "cancel"
            ? "❌ Réservation annulée"
            : "Réservation terminée",
      );
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const chartData = last7.map((d) => ({
    day: new Date(d.day).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
    }),
    count: d.count,
  }));

  return (
    <div>
      <div className="card rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-bold mb-1">Activité des 7 derniers jours</h2>
        <p className="text-sm text-slate-600 mb-4">
          Nombre de réservations reçues par jour.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.5rem",
                  border: "1px solid #e2e8f0",
                }}
              />
              <Bar dataKey="count" fill="#e11d48" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card rounded-2xl p-4 mb-4">
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["en_attente", `En attente (${reservations.filter((r) => r.statut === "en_attente").length})`],
              ["confirmee", `Confirmées (${reservations.filter((r) => r.statut === "confirmee").length})`],
              ["terminee", `Terminées (${reservations.filter((r) => r.statut === "terminee").length})`],
              ["annulee", `Annulées (${reservations.filter((r) => r.statut === "annulee").length})`],
              ["all", `Toutes (${reservations.length})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === k
                  ? "bg-rose-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card rounded-2xl p-10 text-center text-slate-600">
          Aucune réservation dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="card rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`badge border ${STATUT_COLORS[r.statut]}`}
                    >
                      {STATUT_LABELS[r.statut]}
                    </span>
                    <span className="text-xs text-slate-500">
                      #{r.id} · {r.etablissementNom}
                    </span>
                  </div>
                  <div className="font-semibold">
                    {r.clientNom}{" "}
                    <span className="text-sm text-slate-500 font-normal">
                      · {r.clientEmail}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {r.serviceNom} · {r.serviceDuree} min · {r.nombrePersonnes} pers.
                  </div>
                  <div className="text-sm mt-1">
                    📅 {formatDateTime(new Date(r.creneauDebut))}
                  </div>
                  {r.noteClient && (
                    <div className="text-xs text-slate-500 mt-1 italic">
                      💬 “{r.noteClient}”
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-rose-600">
                    {formatPrice(r.prixTotal)}
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {r.statut === "en_attente" && (
                      <>
                        <button
                          onClick={() => action(r.id, "confirm")}
                          disabled={busy === r.id}
                          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" /> Confirmer
                        </button>
                        <button
                          onClick={() => action(r.id, "cancel")}
                          disabled={busy === r.id}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          Refuser
                        </button>
                      </>
                    )}
                    {r.statut === "confirmee" && (
                      <>
                        <button
                          onClick={() => action(r.id, "complete")}
                          disabled={busy === r.id}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          Terminer
                        </button>
                        <button
                          onClick={() => action(r.id, "cancel")}
                          disabled={busy === r.id}
                          className="btn-secondary text-xs px-3 py-1.5"
                        >
                          Annuler
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
