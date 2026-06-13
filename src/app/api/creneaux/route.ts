import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { creneaux, services, etablissements } from "@/db/schema";
import { and, eq, gte, lte, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const createSchema = z.object({
  serviceId: z.number().int().positive(),
  dateDebut: z.string(),
  dateFin: z.string(),
  disponible: z.boolean().optional().default(true),
});

// Generate slots in bulk
const generateSchema = z.object({
  serviceId: z.number().int().positive(),
  dateDebut: z.string(), // ISO date
  dateFin: z.string(), // ISO date
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/),
  heureFin: z.string().regex(/^\d{2}:\d{2}$/),
  intervalleMinutes: z.number().int().min(5).max(240).default(30),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const serviceId = searchParams.get("serviceId");
  const etablissementId = searchParams.get("etablissementId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const conds: any[] = [eq(creneaux.disponible, true)];
  if (serviceId) conds.push(eq(creneaux.serviceId, Number(serviceId)));
  if (etablissementId) {
    conds.push(eq(services.etablissementId, Number(etablissementId)));
  }
  if (from) conds.push(gte(creneaux.dateDebut, new Date(from)));
  if (to) conds.push(lte(creneaux.dateDebut, new Date(to)));
  const rows = await db
    .select({
      id: creneaux.id,
      serviceId: creneaux.serviceId,
      dateDebut: creneaux.dateDebut,
      dateFin: creneaux.dateFin,
      disponible: creneaux.disponible,
      serviceNom: services.nom,
      etablissementId: services.etablissementId,
    })
    .from(creneaux)
    .innerJoin(services, eq(services.id, creneaux.serviceId))
    .where(and(...conds))
    .orderBy(asc(creneaux.dateDebut));
  return NextResponse.json({ creneaux: rows });
}

async function checkOwnership(user: any, serviceId: number) {
  const [row] = await db
    .select({ eta: etablissements })
    .from(services)
    .innerJoin(etablissements, eq(etablissements.id, services.etablissementId))
    .where(eq(services.id, serviceId))
    .limit(1);
  if (!row) return null;
  if (row.eta.adminId !== user.id && user.role !== "superadmin") return null;
  return row.eta;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const data = createSchema.parse(await req.json());
    const eta = await checkOwnership(user, data.serviceId);
    if (!eta) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    const [row] = await db
      .insert(creneaux)
      .values({
        serviceId: data.serviceId,
        dateDebut: new Date(data.dateDebut),
        dateFin: new Date(data.dateFin),
        disponible: data.disponible ?? true,
      })
      .returning();
    return NextResponse.json({ creneau: row });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    const data = generateSchema.parse(await req.json());
    const eta = await checkOwnership(user, data.serviceId);
    if (!eta) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    const start = new Date(data.dateDebut);
    const end = new Date(data.dateFin);
    const [h1, m1] = data.heureDebut.split(":").map(Number);
    const [h2, m2] = data.heureFin.split(":").map(Number);
    const slots: any[] = [];
    for (
      let d = new Date(start);
      d.getTime() <= end.getTime();
      d.setDate(d.getDate() + 1)
    ) {
      const dayStart = new Date(d);
      dayStart.setHours(h1, m1, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(h2, m2, 0, 0);
      for (
        let t = new Date(dayStart);
        t.getTime() + data.intervalleMinutes * 60_000 <= dayEnd.getTime();
        t = new Date(t.getTime() + data.intervalleMinutes * 60_000)
      ) {
        const tEnd = new Date(t.getTime() + data.intervalleMinutes * 60_000);
        slots.push({
          serviceId: data.serviceId,
          dateDebut: new Date(t),
          dateFin: tEnd,
          disponible: true,
        });
      }
    }
    if (slots.length === 0) {
      return NextResponse.json({ count: 0 });
    }
    const inserted = await db
      .insert(creneaux)
      .values(slots)
      .returning({ id: creneaux.id });
    return NextResponse.json({ count: inserted.length });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("[creneaux PUT]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
