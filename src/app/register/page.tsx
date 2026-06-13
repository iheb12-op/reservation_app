"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "admin">("client");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email, telephone, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success("Compte créé !");
      router.push(role === "admin" ? "/admin" : "/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="card rounded-2xl p-8">
        <h1 className="text-2xl font-bold">Créer un compte</h1>
        <p className="text-sm text-slate-600 mt-1">
          Rejoignez Maweid gratuitement.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input
              className="input"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Téléphone (optionnel)</label>
            <input
              className="input"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+216 22 333 444"
            />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="label">Type de compte</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("client")}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  role === "client"
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white"
                }`}
              >
                👤 Client
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  role === "admin"
                    ? "border-rose-500 bg-rose-50 text-rose-700"
                    : "border-slate-200 bg-white"
                }`}
              >
                🏨 Établissement
              </button>
            </div>
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Création…" : "Créer mon compte"}
          </button>
        </form>
        <div className="mt-6 text-sm text-slate-600 text-center">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-rose-600 font-medium">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
