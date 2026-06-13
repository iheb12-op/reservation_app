"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import { formatPrice, formatDateTime } from "@/lib/utils";

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
};

type Props = {
  etablissementNom: string;
  services: Service[];
  creneaux: Creneau[];
  isLoggedIn: boolean;
  userNom: string;
  userEmail: string;
};

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
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const MOIS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function ReservationFlow({
  etablissementNom,
  services,
  creneaux,
  isLoggedIn,
}: Props) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState<number | null>(
    services[0]?.id ?? null,
  );
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Creneau | null>(null);
  const [nombrePersonnes, setNombrePersonnes] = useState(1);
  const [noteClient, setNoteClient] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const today = startOfDay(new Date());
  const maxDay = addDays(today, 60);
  const minDay = today;

  const filtered = useMemo(
    () => creneaux.filter((c) => c.serviceId === serviceId),
    [creneaux, serviceId],
  );

  const slotsByDay = useMemo(() => {
    const m = new Map<string, Creneau[]>();
    for (const c of filtered) {
      const d = new Date(c.dateDebut);
      const key = d.toDateString();
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(c);
    }
    return m;
  }, [filtered]);

  // Calendar grid
  const viewMonth = addDays(today, monthOffset * 30);
  viewMonth.setDate(1);
  const firstDay = new Date(viewMonth);
  // Monday-based: 0=Mon, 6=Sun
  const wd = (firstDay.getDay() + 6) % 7;
  firstDay.setDate(firstDay.getDate() - wd);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(firstDay, i));
  }

  const daySlots = selectedDay
    ? (slotsByDay.get(selectedDay.toDateString()) ?? [])
    : [];

  async function book() {
    if (!selectedSlot) return;
    if (!isLoggedIn) {
      toast.error("Veuillez vous connecter pour réserver");
      router.push(`/login?next=/etablissements`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creneauId: selectedSlot.id,
          noteClient: noteClient || null,
          nombrePersonnes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success("🎉 Réservation créée ! En attente de confirmation.");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Services */}
      <div className="lg:col-span-1 space-y-3">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
          1. Choisissez un service
        </h3>
        {services.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setServiceId(s.id);
              setSelectedDay(null);
              setSelectedSlot(null);
            }}
            className={`w-full text-left card rounded-xl p-4 transition ${
              serviceId === s.id
                ? "ring-2 ring-rose-500 border-transparent"
                : "hover:border-rose-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{s.nom}</div>
                {s.description && (
                  <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {s.description}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> {s.dureeMinutes} min
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-rose-600">
                  {formatPrice(s.prix)}
                </div>
                {s.capacite > 1 && (
                  <div className="text-xs text-slate-500">
                    ×{s.capacite} max
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="lg:col-span-2 space-y-4">
        <div className="card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              2. Sélectionnez une date
            </h3>
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
              <div
                key={j}
                className="text-center text-xs font-medium text-slate-500"
              >
                {j}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const isPast = d < minDay;
              const isFuture = d > maxDay;
              const disabled = !inMonth || isPast || isFuture;
              const isToday = sameDay(d, today);
              const isSelected = selectedDay && sameDay(d, selectedDay);
              const hasSlots = (slotsByDay.get(d.toDateString()) ?? []).length > 0;
              return (
                <button
                  key={d.toISOString()}
                  disabled={disabled}
                  onClick={() => {
                    setSelectedDay(new Date(d));
                    setSelectedSlot(null);
                  }}
                  className={`calendar-day text-sm ${
                    disabled ? "disabled" : ""
                  } ${isSelected ? "selected" : ""} ${
                    hasSlots && !disabled ? "has-slots" : ""
                  } ${isToday && !isSelected ? "ring-1 ring-rose-300" : ""}`}
                >
                  <span className="font-medium">{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedDay && (
          <div className="card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
              3. Choisissez un horaire
            </h3>
            {daySlots.length === 0 ? (
              <div className="text-sm text-slate-600 text-center py-6">
                Aucun créneau disponible ce jour.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {daySlots.map((c) => {
                  const t = new Date(c.dateDebut).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const sel = selectedSlot?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedSlot(c)}
                      className={`slot-btn ${sel ? "selected" : ""}`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedSlot && service && (
          <div className="card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
              4. Confirmez votre réservation
            </h3>
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 mb-4">
              <div className="text-sm text-slate-600">
                {etablissementNom} · {service.nom}
              </div>
              <div className="font-semibold mt-1">
                {formatDateTime(new Date(selectedSlot.dateDebut))}
              </div>
              <div className="text-sm text-rose-700 mt-1 font-semibold">
                Total : {formatPrice(service.prix * nombrePersonnes)}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre de personnes</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setNombrePersonnes((n) => Math.max(1, n - 1))}
                    className="btn-secondary px-3"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center font-semibold flex items-center justify-center gap-1">
                    <Users className="h-4 w-4" /> {nombrePersonnes}
                  </div>
                  <button
                    onClick={() =>
                      setNombrePersonnes((n) =>
                        Math.min(service.capacite, n + 1),
                      )
                    }
                    className="btn-secondary px-3"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Note (optionnel)</label>
                <input
                  className="input"
                  value={noteClient}
                  onChange={(e) => setNoteClient(e.target.value)}
                  placeholder="Allergies, demandes…"
                />
              </div>
            </div>
            <button
              onClick={book}
              disabled={submitting}
              className="btn-primary w-full mt-4"
            >
              {submitting ? "Envoi…" : "Confirmer la réservation"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
