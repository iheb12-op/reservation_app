"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TYPE_LABELS } from "@/lib/utils";

export default function NewEtablissementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    type: "hotel",
    description: "",
    adresse: "",
    ville: "",
    telephone: "",
    imageUrl: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/etablissements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          description: form.description || null,
          adresse: form.adresse || null,
          ville: form.ville || null,
          telephone: form.telephone || null,
          imageUrl: form.imageUrl || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success("Établissement créé !");
      router.push(`/admin/etablissements/${data.etablissement.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">Nouvel établissement</h1>
      <form onSubmit={submit} className="card rounded-2xl p-6 space-y-4">
        <div>
          <label className="label">Nom *</label>
          <input
            className="input"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            required
            minLength={2}
          />
        </div>
        <div>
          <label className="label">Type *</label>
          <select
            className="input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Adresse</label>
            <input
              className="input"
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Ville</label>
            <input
              className="input"
              value={form.ville}
              onChange={(e) => setForm({ ...form, ville: e.target.value })}
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Téléphone</label>
            <input
              className="input"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
            />
          </div>
          <div>
            <label className="label">URL image (optionnel)</label>
            <input
              className="input"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://…"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={loading}>
            {loading ? "Création…" : "Créer l'établissement"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
