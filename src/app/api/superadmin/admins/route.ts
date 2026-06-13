import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, ne, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const u = await getCurrentUser();
  if (!u || u.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const rows = await db
    .select({ id: users.id, nom: users.nom, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(asc(users.nom));
  return NextResponse.json({ admins: rows });
}
