import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { creneaux, services, etablissements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cid = Number(id);
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [row] = await db
    .select({ c: creneaux, eta: etablissements })
    .from(creneaux)
    .innerJoin(services, eq(services.id, creneaux.serviceId))
    .innerJoin(etablissements, eq(etablissements.id, services.etablissementId))
    .where(eq(creneaux.id, cid))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (row.eta.adminId !== user.id && user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const body = await req.json();
  const [updated] = await db
    .update(creneaux)
    .set({ disponible: body.disponible ?? row.c.disponible })
    .where(eq(creneaux.id, cid))
    .returning();
  return NextResponse.json({ creneau: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cid = Number(id);
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [row] = await db
    .select({ c: creneaux, eta: etablissements })
    .from(creneaux)
    .innerJoin(services, eq(services.id, creneaux.serviceId))
    .innerJoin(etablissements, eq(etablissements.id, services.etablissementId))
    .where(eq(creneaux.id, cid))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (row.eta.adminId !== user.id && user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  await db.delete(creneaux).where(eq(creneaux.id, cid));
  return NextResponse.json({ ok: true });
}
