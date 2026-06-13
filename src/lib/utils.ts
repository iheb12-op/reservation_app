export function formatPrice(millimes: number): string {
  return `${(millimes / 1000).toFixed(2)} TND`;
}

export function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Tunis",
  };
  return `${start.toLocaleString("fr-FR", opts)} → ${end.toLocaleString(
    "fr-FR",
    { timeStyle: "short", timeZone: "Africa/Tunis" },
  )}`;
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Tunis",
  });
}

export function classNames(...arr: Array<string | false | null | undefined>) {
  return arr.filter(Boolean).join(" ");
}

export const TYPE_LABELS: Record<string, string> = {
  hotel: "Hôtel",
  clinique: "Clinique",
  restaurant: "Restaurant",
  spa: "Spa",
  salon: "Salon",
  autre: "Autre",
};

export const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  annulee: "Annulée",
  terminee: "Terminée",
};

export const STATUT_COLORS: Record<string, string> = {
  en_attente: "bg-amber-100 text-amber-800 border-amber-200",
  confirmee: "bg-emerald-100 text-emerald-800 border-emerald-200",
  annulee: "bg-rose-100 text-rose-800 border-rose-200",
  terminee: "bg-slate-100 text-slate-700 border-slate-200",
};
