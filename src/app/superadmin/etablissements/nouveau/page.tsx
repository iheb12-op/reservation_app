"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TYPE_LABELS } from "@/lib/utils";

type Admin = { id: number; nom: string; email: string };

export default function SuperNewEtablissementPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    type: "hotel",
    description: "",
    adresse: "",
    ville: "",
    telephone: "",
    imageUrl: "",
    adminId: 0,
  });

  useEffect(() => {
    fetch("/api/superadmin/admins")
      .then((r) => r.json())
      .then((d) => {
        setAdmins(d.admins || []);
        if (d.admins?.[0]) setForm((f) => ({ ...f, adminId: d.admins[0].id }));
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/etablissements", {
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
      <h1 className="text-2xl font-bold mb-6">Nouvel établissement (superadmin)</h1>
      <form onSubmit={submit} className="card rounded-2xl p-6 space-y-4">
        <div>
          <label className="label">Admin (propriétaire) *</label>
          <select
            className="input"
            value={form.adminId}
            onChange={(e) => setForm({ ...form, adminId: Number(e.target.value) })}
            required
          >
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nom} ({a.email})
              </option>
            ))}
          </select>
        </div>
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
            <label className="label">URL image</label>
            <input
              className="input"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={loading}>
            {loading ? "Création…" : "Créer"}
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
