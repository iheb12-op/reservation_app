// Dev/sandbox-friendly cron tick endpoint: no auth, runs the same logic.
// Useful when no external scheduler is available; safe to call repeatedly.
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  reservations,
  creneaux,
  services,
  etablissements,
  users,
} from "@/db/schema";
import { and, eq, gte, lt, lte } from "drizzle-orm";
import { notifyReservationEvent } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60_000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60_000);

  const upcoming = await db
    .select({
      r: reservations,
      c: creneaux,
      service: services,
      etablissement: etablissements,
      client: users,
    })
    .from(reservations)
    .innerJoin(creneaux, eq(creneaux.id, reservations.creneauId))
    .innerJoin(services, eq(services.id, creneaux.serviceId))
    .innerJoin(etablissements, eq(etablissements.id, services.etablissementId))
    .innerJoin(users, eq(users.id, reservations.clientId))
    .where(
      and(
        eq(reservations.statut, "confirmee"),
        gte(creneaux.dateDebut, in24h),
        lt(creneaux.dateDebut, in25h),
      ),
    );

  let remindersSent = 0;
  for (const row of upcoming) {
    await notifyReservationEvent({
      reservationId: row.r.id,
      clientId: row.client.id,
      clientEmail: row.client.email,
      clientTel: row.client.telephone,
      etablissementNom: row.etablissement.nom,
      dateDebut: row.c.dateDebut,
      dateFin: row.c.dateFin,
      event: "reminder",
      prixTotal: row.r.prixTotal,
    });
    remindersSent++;
  }

  const oneHourAgo = new Date(now.getTime() - 60 * 60_000);
  const toComplete = await db
    .select({ r: reservations })
    .from(reservations)
    .innerJoin(creneaux, eq(creneaux.id, reservations.creneauId))
    .where(
      and(
        eq(reservations.statut, "confirmee"),
        lte(creneaux.dateFin, oneHourAgo),
      ),
    );
  for (const { r } of toComplete) {
    await db
      .update(reservations)
      .set({ statut: "terminee", updatedAt: new Date() })
      .where(eq(reservations.id, r.id));
  }
  await db
    .update(creneaux)
    .set({ disponible: false })
    .where(and(lt(creneaux.dateFin, now)));

  return NextResponse.json({
    ok: true,
    ranAt: now.toISOString(),
    remindersSent,
    autoCompleted: toComplete.length,
  });
}
