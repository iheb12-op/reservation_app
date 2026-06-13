"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Hotel } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur de connexion");
        return;
      }
      toast.success("Bienvenue !");
      const target =
        next ||
        (data.user.role === "superadmin"
          ? "/superadmin"
          : data.user.role === "admin"
            ? "/admin"
            : "/dashboard");
      router.push(target);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function fill(e: string, p: string) {
    setEmail(e);
    setPassword(p);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="card rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-600 to-orange-500 text-white">
            <Hotel className="h-5 w-5" />
          </span>
          <span className="font-bold text-lg gradient-text">Maweid</span>
        </div>
        <h1 className="text-2xl font-bold">Connexion</h1>
        <p className="text-sm text-slate-600 mt-1">
          Heureux de vous revoir 👋
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
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
              autoComplete="current-password"
            />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <div className="mt-6 text-sm text-slate-600 text-center">
          Pas de compte ?{" "}
          <Link href="/register" className="text-rose-600 font-medium">
            S'inscrire
          </Link>
        </div>
        <div className="mt-6 border-t border-slate-200 pt-4">
          <div className="text-xs text-slate-500 mb-2 text-center">
            Comptes de démonstration :
          </div>
          <div className="grid grid-cols-1 gap-1 text-xs">
            <button
              type="button"
              onClick={() => fill("super@maweid.tn", "super1234")}
              className="text-left px-2 py-1 rounded hover:bg-rose-50"
            >
              🔑 Super Admin · super@maweid.tn / super1234
            </button>
            <button
              type="button"
              onClick={() => fill("hotel@maweid.tn", "admin1234")}
              className="text-left px-2 py-1 rounded hover:bg-rose-50"
            >
              🏨 Admin Hôtel · hotel@maweid.tn / admin1234
            </button>
            <button
              type="button"
              onClick={() => fill("client@maweid.tn", "client1234")}
              className="text-left px-2 py-1 rounded hover:bg-rose-50"
            >
              👤 Client · client@maweid.tn / client1234
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
