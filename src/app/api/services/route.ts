import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { services, etablissements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const createSchema = z.object({
  etablissementId: z.number().int().positive(),
  nom: z.string().min(2).max(160),
  description: z.string().max(2000).optional().nullable(),
  dureeMinutes: z.number().int().min(5).max(720).default(30),
  prix: z.number().int().min(0).default(0),
  capacite: z.number().int().min(1).max(1000).default(1),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const data = createSchema.parse(await req.json());
    const [eta] = await db
      .select()
      .from(etablissements)
      .where(eq(etablissements.id, data.etablissementId))
      .limit(1);
    if (!eta) {
      return NextResponse.json(
        { error: "Établissement introuvable" },
        { status: 404 },
      );
    }
    if (eta.adminId !== user.id && user.role !== "superadmin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    const [row] = await db
      .insert(services)
      .values({
        etablissementId: data.etablissementId,
        nom: data.nom,
        description: data.description ?? null,
        dureeMinutes: data.dureeMinutes,
        prix: data.prix,
        capacite: data.capacite,
      })
      .returning();
    return NextResponse.json({ service: row });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("[services POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
