import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { etablissements, services, creneaux } from "@/db/schema";
import { eq, and, asc, gte } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const updateSchema = z.object({
  nom: z.string().min(2).max(160).optional(),
  type: z.enum(["hotel", "clinique", "restaurant", "spa", "salon", "autre"]).optional(),
  description: z.string().max(2000).optional().nullable(),
  adresse: z.string().max(255).optional().nullable(),
  ville: z.string().max(120).optional().nullable(),
  telephone: z.string().max(30).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const etaId = Number(id);
  if (!Number.isFinite(etaId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }
  const [eta] = await db
    .select()
    .from(etablissements)
    .where(eq(etablissements.id, etaId))
    .limit(1);
  if (!eta) {
    return NextResponse.json({ error: "Établissement introuvable" }, { status: 404 });
  }
  const servicesList = await db
    .select()
    .from(services)
    .where(eq(services.etablissementId, etaId))
    .orderBy(asc(services.id));
  const now = new Date();
  const creneauxList = await db
    .select({
      id: creneaux.id,
      serviceId: creneaux.serviceId,
      dateDebut: creneaux.dateDebut,
      dateFin: creneaux.dateFin,
      disponible: creneaux.disponible,
    })
    .from(creneaux)
    .innerJoin(services, eq(services.id, creneaux.serviceId))
    .where(
      and(
        eq(services.etablissementId, etaId),
        gte(creneaux.dateDebut, new Date()),
      ),
    )
    .orderBy(asc(creneaux.dateDebut));
  return NextResponse.json({
    etablissement: eta,
    services: servicesList,
    creneaux: creneauxList,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const etaId = Number(id);
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [eta] = await db
    .select()
    .from(etablissements)
    .where(eq(etablissements.id, etaId))
    .limit(1);
  if (!eta) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (eta.adminId !== user.id && user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  try {
    const data = updateSchema.parse(await req.json());
    const [row] = await db
      .update(etablissements)
      .set(data)
      .where(eq(etablissements.id, etaId))
      .returning();
    return NextResponse.json({ etablissement: row });
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
  const etaId = Number(id);
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const [eta] = await db
    .select()
    .from(etablissements)
    .where(eq(etablissements.id, etaId))
    .limit(1);
  if (!eta) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  if (eta.adminId !== user.id && user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  await db.delete(etablissements).where(eq(etablissements.id, etaId));
  return NextResponse.json({ ok: true });
}
