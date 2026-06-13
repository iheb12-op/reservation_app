import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { services, etablissements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const updateSchema = z.object({
  nom: z.string().min(2).max(160).optional(),
  description: z.string().max(2000).optional().nullable(),
  dureeMinutes: z.number().int().min(5).max(720).optional(),
  prix: z.number().int().min(0).optional(),
  capacite: z.number().int().min(1).max(1000).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sid = Number(id);
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [svc] = await db
    .select({
      service: services,
      eta: etablissements,
    })
    .from(services)
    .innerJoin(etablissements, eq(etablissements.id, services.etablissementId))
    .where(eq(services.id, sid))
    .limit(1);
  if (!svc) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (svc.eta.adminId !== user.id && user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  try {
    const data = updateSchema.parse(await req.json());
    const [row] = await db
      .update(services)
      .set(data)
      .where(eq(services.id, sid))
      .returning();
    return NextResponse.json({ service: row });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sid = Number(id);
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [svc] = await db
    .select({
      service: services,
      eta: etablissements,
    })
    .from(services)
    .innerJoin(etablissements, eq(etablissements.id, services.etablissementId))
    .where(eq(services.id, sid))
    .limit(1);
  if (!svc) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (svc.eta.adminId !== user.id && user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  await db.delete(services).where(eq(services.id, sid));
  return NextResponse.json({ ok: true });
}
