import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  if (u.role !== "superadmin") redirect("/");

  const list = await db
    .select({
      id: users.id,
      nom: users.nom,
      email: users.email,
      role: users.role,
      telephone: users.telephone,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-bold mb-1">Utilisateurs</h1>
      <p className="text-slate-600 text-sm mb-6">
        {list.length} compte{list.length > 1 ? "s" : ""} enregistré{list.length > 1 ? "s" : ""}.
      </p>
      <div className="card rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Téléphone</th>
              <th className="text-left p-3">Rôle</th>
              <th className="text-left p-3">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="p-3 font-medium">{u.nom}</td>
                <td className="p-3 text-slate-600">{u.email}</td>
                <td className="p-3 text-slate-600">{u.telephone ?? "—"}</td>
                <td className="p-3">
                  <span
                    className={`badge ${
                      u.role === "superadmin"
                        ? "bg-amber-100 text-amber-700"
                        : u.role === "admin"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-3 text-slate-500">
                  {u.createdAt.toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
