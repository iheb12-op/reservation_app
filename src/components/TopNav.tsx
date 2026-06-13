"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar, User as UserIcon, LogOut, LayoutDashboard, Bell, Hotel, Plus } from "lucide-react";
import { toast } from "sonner";

type Props = {
  user: {
    id: number;
    nom: string;
    email: string;
    role: "client" | "admin" | "superadmin";
  } | null;
};

export function TopNav({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("À bientôt !");
    router.refresh();
    router.push("/");
  }

  const dashboardLink =
    user?.role === "superadmin"
      ? "/superadmin"
      : user?.role === "admin"
        ? "/admin"
        : "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/70 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg tracking-tight"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-rose-600 to-orange-500 text-white shadow-md">
            <Hotel className="h-5 w-5" />
          </span>
          <span className="gradient-text">Maweid</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <Link
            href="/"
            className={`btn-ghost ${pathname === "/" ? "bg-rose-50 text-rose-700" : ""}`}
          >
            Accueil
          </Link>
          <Link
            href="/etablissements"
            className={`btn-ghost ${pathname.startsWith("/etablissements") ? "bg-rose-50 text-rose-700" : ""}`}
          >
            Établissements
          </Link>
          {user && (
            <Link
              href={dashboardLink}
              className={`btn-ghost ${pathname.startsWith(dashboardLink) ? "bg-rose-50 text-rose-700" : ""}`}
            >
              <LayoutDashboard className="inline h-4 w-4 mr-1" />
              Tableau de bord
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 btn-secondary"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-white text-xs font-bold">
                  {user.nom.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden sm:inline text-sm">{user.nom}</span>
              </button>
              {open && (
                <div
                  className="absolute right-0 mt-2 w-56 card rounded-xl p-2 z-50"
                  onMouseLeave={() => setOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="font-semibold text-sm">{user.nom}</div>
                    <div className="text-xs text-slate-500 truncate">
                      {user.email}
                    </div>
                    <div className="mt-1">
                      <span className="badge bg-rose-100 text-rose-700">
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={dashboardLink}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-50 text-sm"
                    onClick={() => setOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Mon tableau de bord
                  </Link>
                  {user.role === "client" && (
                    <Link
                      href="/dashboard/notifications"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-50 text-sm"
                      onClick={() => setOpen(false)}
                    >
                      <Bell className="h-4 w-4" />
                      Notifications
                    </Link>
                  )}
                  {user.role === "superadmin" && (
                    <Link
                      href="/superadmin/utilisateurs"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-50 text-sm"
                      onClick={() => setOpen(false)}
                    >
                      <UserIcon className="h-4 w-4" />
                      Utilisateurs
                    </Link>
                  )}
                  {user.role !== "client" && (
                    <Link
                      href={
                        user.role === "superadmin"
                          ? "/superadmin/etablissements/nouveau"
                          : "/admin/etablissements/nouveau"
                      }
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-50 text-sm"
                      onClick={() => setOpen(false)}
                    >
                      <Plus className="h-4 w-4" />
                      Nouvel établissement
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-50 text-sm text-rose-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn-ghost hidden sm:inline-flex">
                <UserIcon className="h-4 w-4 mr-1" />
                Connexion
              </Link>
              <Link href="/register" className="btn-primary">
                Inscription
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
