"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export function SearchForm() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    router.push(`/etablissements${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <form
      onSubmit={submit}
      className="card rounded-2xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto"
    >
      <div className="flex-1 flex items-center gap-2 px-3">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un établissement, une ville…"
          className="w-full bg-transparent border-0 outline-none py-3"
        />
      </div>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm sm:max-w-[180px]"
      >
        <option value="">Toutes catégories</option>
        <option value="hotel">Hôtels</option>
        <option value="clinique">Cliniques</option>
        <option value="restaurant">Restaurants</option>
        <option value="spa">Spas</option>
        <option value="salon">Salons</option>
      </select>
      <button type="submit" className="btn-primary whitespace-nowrap">
        Rechercher
      </button>
    </form>
  );
}
