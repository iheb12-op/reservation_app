"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  STATUT_LABELS,
  STATUT_COLORS,
  formatDateTime,
  formatPrice,
} from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, Trash2, Power, PowerOff, Check, X } from "lucide-react";

type Service = {
  id: number;
  nom: string;
  description: string | null;
  dureeMinutes: number;
  prix: number;
  capacite: number;
};

type Creneau = {
  id: number;
  serviceId: number;
  dateDebut: string;
  dateFin: string;
  disponible: boolean;
};

type Resa = {
  id: number;
  statut: "en_attente" | "confirmee" | "annulee" | "terminee";
  noteClient: string | null;
  nombrePersonnes: number;
  prixTotal: number;
  creneauDebut: string;
  creneauFin: string;
  creneauId: number;
  serviceNom: string;
  serviceId: number;
  clientNom: string;
  clientEmail: string;
  clientTel: string | null;
};

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function AdminEtablissementClient({
  etablissementId,
  etablissementNom,
  services,
  creneaux,
  reservations,
}: {
  etablissementId: number;
  etablissementNom: string;
  services: Service[];
  creneaux: Creneau[];
  reservations: Resa[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"calendar" | "services" | "reservations">("calendar");
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  // Service form
  const [svcForm, setSvcForm] = useState({
    nom: "",
    description: "",
    dureeMinutes: 30,
    prix: 0,
    capacite: 1,
  });

  // Generate form
  const [genForm, setGenForm] = useState({
    serviceId: services[0]?.id ?? 0,
    dateDebut: new Date().toISOString().slice(0, 10),
    dateFin: addDays(new Date(), 7).toISOString().slice(0, 10),
    heureDebut: "09:00",
    heureFin: "17:00",
    intervalleMinutes: 30,
  });

  // Calendar logic
  const today = startOfDay(new Date());
  const viewMonth = addDays(today, monthOffset * 30);
  viewMonth.setDate(1);
  const firstDay = new Date(viewMonth);
  const wd = (firstDay.getDay() + 6) % 7;
  firstDay.setDate(firstDay.getDate() - wd);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(addDays(firstDay, i));

  const slotsByDay = useMemo(() => {
    const m = new Map<string, Creneau[]>();
    for (const c of creneaux) {
      const d = new Date(c.dateDebut);
      const key = d.toDateString();
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(c);
    }
    return m;
  }, [creneaux]);

  async function createService(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etablissementId, ...svcForm }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Erreur");
      return;
    }
    toast.success("Service créé");
    setSvcForm({ nom: "", description: "", dureeMinutes: 30, prix: 0, capacite: 1 });
    router.refresh();
  }

  async function deleteService(id: number) {
    if (!confirm("Supprimer ce service et tous ses créneaux ?")) return;
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Erreur");
      return;
    }
    toast.success("Service supprimé");
    router.refresh();
  }

  async function toggleCreneau(c: Creneau) {
    setBusy(c.id);
    try {
      const res = await fetch(`/api/creneaux/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disponible: !c.disponible }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur");
        return;
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function deleteCreneau(c: Creneau) {
    if (!confirm("Supprimer ce créneau ?")) return;
    setBusy(c.id);
    try {
      const res = await fetch(`/api/creneaux/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success("Créneau supprimé");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function generateSlots(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/creneaux", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...genForm,
        dateDebut: new Date(genForm.dateDebut).toISOString(),
        dateFin: new Date(genForm.dateFin).toISOString(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Erreur");
      return;
    }
    toast.success(`${data.count} créneaux générés !`);
    router.refresh();
  }

  async function reservationAction(id: number, a: "confirm" | "cancel" | "complete") {
    if (a === "cancel" && !confirm("Annuler cette réservation ?")) return;
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
      toast.success("Action effectuée");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="card rounded-2xl p-2 flex gap-1 mb-6 w-fit">
        {(
          [
            ["calendar", "📅 Calendrier & créneaux"],
            ["services", `🧩 Services (${services.length})`],
            ["reservations", `📋 Réservations (${reservations.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              tab === k
                ? "bg-rose-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "calendar" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">Calendrier des créneaux</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMonthOffset((v) => Math.max(0, v - 1))}
                  disabled={monthOffset === 0}
                  className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="font-semibold text-sm min-w-[140px] text-center">
                  {MOIS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </div>
                <button
                  onClick={() => setMonthOffset((v) => v + 1)}
                  className="p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {JOURS.map((j) => (
                <div key={j} className="text-center text-xs font-medium text-slate-500">
                  {j}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d) => {
                const inMonth = d.getMonth() === viewMonth.getMonth();
                const isPast = d < today;
                const disabled = !inMonth || isPast;
                const isSelected = selectedDay && selectedDay.toDateString() === d.toDateString();
                const slots = slotsByDay.get(d.toDateString()) ?? [];
                const hasSlots = slots.length > 0;
                return (
                  <button
                    key={d.toISOString()}
                    disabled={disabled}
                    onClick={() => setSelectedDay(new Date(d))}
                    className={`calendar-day text-sm ${disabled ? "disabled" : ""} ${
                      isSelected ? "selected" : ""
                    } ${hasSlots && !disabled ? "has-slots" : ""}`}
                  >
                    <span className="font-medium">{d.getDate()}</span>
                    {hasSlots && !disabled && (
                      <span className="text-[10px] mt-0.5 text-slate-500">
                        {slots.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="card rounded-2xl p-5">
              <h3 className="font-bold mb-3 text-sm uppercase tracking-wider text-slate-600">
                Générer des créneaux en masse
              </h3>
              <form onSubmit={generateSlots} className="space-y-3 text-sm">
                <div>
                  <label className="label">Service</label>
                  <select
                    className="input"
                    value={genForm.serviceId}
                    onChange={(e) =>
                      setGenForm({ ...genForm, serviceId: Number(e.target.value) })
                    }
                    required
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Du</label>
                    <input
                      type="date"
                      className="input"
                      value={genForm.dateDebut}
                      onChange={(e) =>
                        setGenForm({ ...genForm, dateDebut: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">Au</label>
                    <input
                      type="date"
                      className="input"
                      value={genForm.dateFin}
                      onChange={(e) =>
                        setGenForm({ ...genForm, dateFin: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">De</label>
                    <input
                      type="time"
                      className="input"
                      value={genForm.heureDebut}
                      onChange={(e) =>
                        setGenForm({ ...genForm, heureDebut: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="label">À</label>
                    <input
                      type="time"
                      className="input"
                      value={genForm.heureFin}
                      onChange={(e) =>
                        setGenForm({ ...genForm, heureFin: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Intervalle (minutes)</label>
                  <select
                    className="input"
                    value={genForm.intervalleMinutes}
                    onChange={(e) =>
                      setGenForm({
                        ...genForm,
                        intervalleMinutes: Number(e.target.value),
                      })
                    }
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                </div>
                <button className="btn-primary w-full">Générer</button>
              </form>
            </div>

            {selectedDay && (
              <div className="card rounded-2xl p-5">
                <h3 className="font-bold mb-2 text-sm">
                  {selectedDay.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </h3>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {(slotsByDay.get(selectedDay.toDateString()) ?? []).map((c) => {
                    const t = new Date(c.dateDebut).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const svc = services.find((s) => s.id === c.serviceId);
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between text-sm p-2 rounded-lg border border-slate-100"
                      >
                        <div>
                          <div className="font-medium">
                            {t} — {new Date(c.dateFin).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-xs text-slate-500">
                            {svc?.nom ?? "Service"}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => toggleCreneau(c)}
                            disabled={busy === c.id}
                            className="p-1.5 rounded hover:bg-slate-100"
                            title={c.disponible ? "Désactiver" : "Activer"}
                          >
                            {c.disponible ? (
                              <Power className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <PowerOff className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteCreneau(c)}
                            disabled={busy === c.id}
                            className="p-1.5 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(slotsByDay.get(selectedDay.toDateString()) ?? []).length === 0 && (
                    <div className="text-xs text-slate-500 text-center py-4">
                      Aucun créneau ce jour.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "services" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card rounded-2xl p-5 lg:col-span-1">
            <h3 className="font-bold mb-3">Nouveau service</h3>
            <form onSubmit={createService} className="space-y-3 text-sm">
              <div>
                <label className="label">Nom *</label>
                <input
                  className="input"
                  value={svcForm.nom}
                  onChange={(e) => setSvcForm({ ...svcForm, nom: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={2}
                  value={svcForm.description}
                  onChange={(e) => setSvcForm({ ...svcForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Durée (min)</label>
                  <input
                    type="number"
                    className="input"
                    value={svcForm.dureeMinutes}
                    min={5}
                    onChange={(e) =>
                      setSvcForm({ ...svcForm, dureeMinutes: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <label className="label">Capacité</label>
                  <input
                    type="number"
                    className="input"
                    value={svcForm.capacite}
                    min={1}
                    onChange={(e) =>
                      setSvcForm({ ...svcForm, capacite: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="label">Prix (en millimes)</label>
                <input
                  type="number"
                  className="input"
                  value={svcForm.prix}
                  min={0}
                  onChange={(e) => setSvcForm({ ...svcForm, prix: Number(e.target.value) })}
                />
                <p className="text-xs text-slate-500 mt-1">
                  = {formatPrice(svcForm.prix)}
                </p>
              </div>
              <button className="btn-primary w-full">
                <Plus className="inline h-4 w-4 mr-1" /> Créer
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {services.length === 0 ? (
              <div className="card rounded-2xl p-8 text-center text-slate-600">
                Aucun service. Créez-en un pour commencer.
              </div>
            ) : (
              services.map((s) => (
                <div key={s.id} className="card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{s.nom}</div>
                      {s.description && (
                        <div className="text-sm text-slate-600 mt-0.5">
                          {s.description}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1">
                        ⏱ {s.dureeMinutes} min · 👥 {s.capacite} pers. max
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="text-lg font-bold text-rose-600">
                        {formatPrice(s.prix)}
                      </div>
                      <button
                        onClick={() => deleteService(s.id)}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "reservations" && (
        <div className="space-y-3">
          {reservations.length === 0 ? (
            <div className="card rounded-2xl p-8 text-center text-slate-600">
              Aucune réservation pour le moment.
            </div>
          ) : (
            reservations.map((r) => (
              <div key={r.id} className="card rounded-2xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge border ${STATUT_COLORS[r.statut]}`}>
                        {STATUT_LABELS[r.statut]}
                      </span>
                    </div>
                    <div className="font-semibold">
                      {r.clientNom} · {r.clientEmail}
                    </div>
                    {r.clientTel && (
                      <div className="text-xs text-slate-500">📱 {r.clientTel}</div>
                    )}
                    <div className="text-sm text-slate-600 mt-1">
                      {r.serviceNom} · {r.nombrePersonnes} pers.
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
                            onClick={() => reservationAction(r.id, "confirm")}
                            disabled={busy === r.id}
                            className="btn-primary text-xs px-3 py-1.5"
                          >
                            <Check className="inline h-3.5 w-3.5 mr-1" /> Confirmer
                          </button>
                          <button
                            onClick={() => reservationAction(r.id, "cancel")}
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
                            onClick={() => reservationAction(r.id, "complete")}
                            disabled={busy === r.id}
                            className="btn-primary text-xs px-3 py-1.5"
                          >
                            Terminer
                          </button>
                          <button
                            onClick={() => reservationAction(r.id, "cancel")}
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
            ))
          )}
        </div>
      )}
    </div>
  );
}
