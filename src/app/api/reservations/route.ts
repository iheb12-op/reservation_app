import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  reservations,
  creneaux,
  services,
  etablissements,
  users,
  notifications,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { notifyReservationEvent } from "@/lib/notify";

const createSchema = z.object({
  creneauId: z.number().int().positive(),
  noteClient: z.string().max(500).optional().nullable(),
  nombrePersonnes: z.number().int().min(1).max(100).default(1),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") || "me"; // me | etablissement | all

  let whereClause: any = undefined;
  if (scope === "me") {
    whereClause = eq(reservations.clientId, user.id);
  } else if (scope === "etablissement") {
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    const etablissementId = searchParams.get("etablissementId");
    if (etablissementId) {
      whereClause = eq(reservations.etablissementId, Number(etablissementId));
    } else if (user.role === "admin") {
      const myEtas = await db
        .select({ id: etablissements.id })
        .from(etablissements)
        .where(eq(etablissements.adminId, user.id));
      const ids = myEtas.map((e) => e.id);
      if (ids.length === 0) {
        return NextResponse.json({ reservations: [] });
      }
      whereClause = sql`${reservations.etablissementId} IN (${sql.join(ids, sql`, `)})`;
    }
  } else if (scope === "all") {
    if (user.role !== "superadmin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
  }

  const rows = await db
    .select({
      id: reservations.id,
      statut: reservations.statut,
      noteClient: reservations.noteClient,
      nombrePersonnes: reservations.nombrePersonnes,
      prixTotal: reservations.prixTotal,
      createdAt: reservations.createdAt,
      creneauId: reservations.creneauId,
      creneauDebut: creneaux.dateDebut,
      creneauFin: creneaux.dateFin,
      serviceId: services.id,
      serviceNom: services.nom,
      serviceDuree: services.dureeMinutes,
      etablissementId: etablissements.id,
      etablissementNom: etablissements.nom,
      etablissementVille: etablissements.ville,
      clientId: users.id,
      clientNom: users.nom,
      clientEmail: users.email,
      clientTel: users.telephone,
    })
    .from(reservations)
    .innerJoin(creneaux, eq(creneaux.id, reservations.creneauId))
    .innerJoin(services, eq(services.id, creneaux.serviceId))
    .innerJoin(etablissements, eq(etablissements.id, services.etablissementId))
    .innerJoin(users, eq(users.id, reservations.clientId))
    .where(whereClause)
    .orderBy(desc(creneaux.dateDebut));

  return NextResponse.json({ reservations: rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Veuillez vous connecter" }, { status: 401 });
  }
  try {
    const data = createSchema.parse(await req.json());

    // Get creneau + service + etablissement
    const [row] = await db
      .select({
        creneau: creneaux,
        service: services,
        etablissement: etablissements,
      })
      .from(creneaux)
      .innerJoin(services, eq(services.id, creneaux.serviceId))
      .innerJoin(etablissements, eq(etablissements.id, services.etablissementId))
      .where(eq(creneaux.id, data.creneauId))
      .limit(1);
    if (!row) {
      return NextResponse.json(
        { error: "Créneau introuvable" },
        { status: 404 },
      );
    }
    if (!row.creneau.disponible) {
      return NextResponse.json(
        { error: "Ce créneau n'est plus disponible" },
        { status: 409 },
      );
    }
    if (row.creneau.dateDebut.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Ce créneau est déjà passé" },
        { status: 400 },
      );
    }

    // Check if already reserved
    const [existing] = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.creneauId, data.creneauId),
          eq(reservations.statut, "confirmee"),
        ),
      )
      .limit(1);
    const [pending] = await db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.creneauId, data.creneauId),
          eq(reservations.statut, "en_attente"),
        ),
      )
      .limit(1);
    if (existing || pending) {
      return NextResponse.json(
        { error: "Une réservation existe déjà sur ce créneau" },
        { status: 409 },
      );
    }

    const prixTotal = row.service.prix * data.nombrePersonnes;

    const [created] = await db
      .insert(reservations)
      .values({
        creneauId: data.creneauId,
        clientId: user.id,
        etablissementId: row.etablissement.id,
        statut: "en_attente",
        noteClient: data.noteClient ?? null,
        nombrePersonnes: data.nombrePersonnes,
        prixTotal,
      })
      .returning();

    await db.insert(notifications).values({
      userId: row.etablissement.adminId,
      reservationId: created.id,
      type: "systeme",
      message: `Nouvelle demande de réservation de ${user.nom} pour ${row.service.nom}`,
    });

    // Fire-and-forget email + SMS to client
    notifyReservationEvent({
      reservationId: created.id,
      clientId: user.id,
      clientEmail: user.email,
      clientTel: user.telephone,
      etablissementNom: row.etablissement.nom,
      dateDebut: row.creneau.dateDebut,
      dateFin: row.creneau.dateFin,
      event: "created",
      prixTotal,
    }).catch((e) => console.error("[notify created]", e));

    return NextResponse.json({ reservation: created });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("[reservations POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
