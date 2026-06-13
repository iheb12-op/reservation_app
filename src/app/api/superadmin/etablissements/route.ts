import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { etablissements } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  nom: z.string().min(2).max(160),
  type: z.enum(["hotel", "clinique", "restaurant", "spa", "salon", "autre"]),
  description: z.string().max(2000).optional().nullable(),
  adresse: z.string().max(255).optional().nullable(),
  ville: z.string().max(120).optional().nullable(),
  telephone: z.string().max(30).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  adminId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const u = await getCurrentUser();
  if (!u || u.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const data = schema.parse(await req.json());
    const [row] = await db
      .insert(etablissements)
      .values({
        nom: data.nom,
        type: data.type,
        description: data.description ?? null,
        adresse: data.adresse ?? null,
        ville: data.ville ?? null,
        telephone: data.telephone ?? null,
        imageUrl: data.imageUrl ?? null,
        adminId: data.adminId,
      })
      .returning();
    return NextResponse.json({ etablissement: row });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
