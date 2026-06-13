import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { etablissements, services, creneaux } from "@/db/schema";
import { eq, sql, and, gte } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const createSchema = z.object({
  nom: z.string().min(2).max(160),
  type: z.enum(["hotel", "clinique", "restaurant", "spa", "salon", "autre"]),
  description: z.string().max(2000).optional().nullable(),
  adresse: z.string().max(255).optional().nullable(),
  ville: z.string().max(120).optional().nullable(),
  telephone: z.string().max(30).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const ville = searchParams.get("ville");
  const conds: any[] = [];
  if (type) conds.push(eq(etablissements.type, type as any));
  if (ville) conds.push(sql`${etablissements.ville} ILIKE ${"%" + ville + "%"}`);

  const rows = await db
    .select({
      id: etablissements.id,
      nom: etablissements.nom,
      type: etablissements.type,
      description: etablissements.description,
      adresse: etablissements.adresse,
      ville: etablissements.ville,
      telephone: etablissements.telephone,
      imageUrl: etablissements.imageUrl,
      createdAt: etablissements.createdAt,
      servicesCount: sql<number>`COUNT(DISTINCT ${services.id})::int`,
      creneauxCount: sql<number>`COUNT(DISTINCT ${creneaux.id})::int`,
    })
    .from(etablissements)
    .leftJoin(services, eq(services.etablissementId, etablissements.id))
    .leftJoin(
      creneaux,
      and(
        eq(creneaux.serviceId, services.id),
        eq(creneaux.disponible, true),
        gte(creneaux.dateDebut, new Date()),
      ),
    )
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(etablissements.id)
    .orderBy(sql`${etablissements.id} DESC`);
  return NextResponse.json({ etablissements: rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const data = createSchema.parse(await req.json());
    const [row] = await db
      .insert(etablissements)
      .values({
        ...data,
        adminId: user.id,
        description: data.description ?? null,
        adresse: data.adresse ?? null,
        ville: data.ville ?? null,
        telephone: data.telephone ?? null,
        imageUrl: data.imageUrl ?? null,
      })
      .returning();
    return NextResponse.json({ etablissement: row });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("[etablissements POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
