// Cron job: runs reminders + auto-completes past reservations.
// Triggered by an external scheduler hitting this route (e.g. Vercel Cron, EasyCron)
// with the CRON_SECRET in the Authorization header.
// Also runs on app startup if CRON_RUN_ON_START=true (handy in dev/sandbox).
import { NextRequest, NextResponse } from "next/server";
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

async function runCron() {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60_000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60_000);

  // 1) Reminders: confirmed reservations starting in ~24h
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
    .innerJoin(etablissements, eq(etablissements.id, reservations.etablissementId))
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

  // 2) Auto-complete: confirmed reservations whose creneau ended more than 1h ago
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

  // 3) Free expired pending slots (creneaux in the past, still dispo)
  await db
    .update(creneaux)
    .set({ disponible: false })
    .where(and(lt(creneaux.dateFin, now)));

  return {
    ranAt: now.toISOString(),
    remindersSent,
    autoCompleted: toComplete.length,
  };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runCron();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
