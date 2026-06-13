"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { STATUT_LABELS, STATUT_COLORS, formatDateTime, formatPrice } from "@/lib/utils";
import { Bell, Calendar as CalIcon, X } from "lucide-react";

type Reservation = {
  id: number;
  statut: "en_attente" | "confirmee" | "annulee" | "terminee";
  noteClient: string | null;
  nombrePersonnes: number;
  prixTotal: number;
  createdAt: string;
  creneauDebut: string;
  creneauFin: string;
  serviceNom: string;
  etablissementNom: string;
  etablissementId: number;
  etablissementVille: string | null;
};

type Notification = {
  id: number;
  message: string;
  type: "email" | "sms" | "systeme";
  lu: boolean;
  createdAt: string;
};

export function ClientDashboardClient({
  reservations,
  notifications,
}: {
  reservations: Reservation[];
  notifications: Notification[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"upcoming" | "past" | "all" | "notifs">("upcoming");
  const [busy, setBusy] = useState<number | null>(null);

  const now = Date.now();
  const upcoming = reservations.filter(
    (r) =>
      new Date(r.creneauDebut).getTime() > now &&
      r.statut !== "annulee",
  );
  const past = reservations.filter(
    (r) =>
      new Date(r.creneauDebut).getTime() <= now || r.statut === "annulee",
  );

  async function cancel(id: number) {
    if (!confirm("Annuler cette réservation ?")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success("Réservation annulée");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const list =
    tab === "upcoming" ? upcoming : tab === "past" ? past : reservations;

  return (
    <div>
      <div className="card rounded-2xl p-2 flex gap-1 mb-4 w-fit">
        {[
          { k: "upcoming", label: `À venir (${upcoming.length})` },
          { k: "past", label: `Passées (${past.length})` },
          { k: "all", label: `Toutes (${reservations.length})` },
          { k: "notifs", label: `🔔 (${notifications.filter((n) => !n.lu).length})` },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k as any)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              tab === t.k
                ? "bg-rose-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "notifs" ? (
        list.length === 0 ? (
          <div className="card rounded-2xl p-10 text-center">
            <CalIcon className="h-10 w-10 mx-auto text-slate-300" />
            <p className="mt-3 text-slate-600">Aucune réservation.</p>
            <a href="/etablissements" className="btn-primary inline-block mt-4">
              Découvrir les établissements
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((r) => (
              <div key={r.id} className="card rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`badge border ${STATUT_COLORS[r.statut]}`}
                      >
                        {STATUT_LABELS[r.statut]}
                      </span>
                    </div>
                    <div className="font-semibold text-lg">
                      {r.etablissementNom}
                    </div>
                    <div className="text-sm text-slate-600">
                      {r.serviceNom} · {r.nombrePersonnes} pers.
                    </div>
                    <div className="text-sm mt-1">
                      📅 {formatDateTime(new Date(r.creneauDebut))}
                    </div>
                    {r.noteClient && (
                      <div className="text-xs text-slate-500 mt-1 italic">
                        “{r.noteClient}”
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-rose-600">
                      {formatPrice(r.prixTotal)}
                    </div>
                    {r.statut === "en_attente" && (
                      <button
                        onClick={() => cancel(r.id)}
                        disabled={busy === r.id}
                        className="mt-2 text-xs text-rose-600 hover:underline"
                      >
                        {busy === r.id ? "Annulation…" : "Annuler"}
                      </button>
                    )}
                    {r.statut === "confirmee" &&
                      new Date(r.creneauDebut).getTime() > now && (
                        <button
                          onClick={() => cancel(r.id)}
                          disabled={busy === r.id}
                          className="mt-2 text-xs text-rose-600 hover:underline"
                        >
                          {busy === r.id ? "Annulation…" : "Annuler"}
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <div className="card rounded-2xl p-8 text-center text-slate-600">
              <Bell className="h-10 w-10 mx-auto text-slate-300" />
              <p className="mt-3">Aucune notification pour l'instant.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`card rounded-xl p-4 ${!n.lu ? "border-l-4 border-l-rose-500" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">
                    {n.type === "email" ? "📧" : n.type === "sms" ? "📱" : "🔔"}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm">{n.message}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(n.createdAt).toLocaleString("fr-FR")}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
