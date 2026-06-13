import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  reservations,
  creneaux,
  services,
  etablissements,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { notifyReservationEvent } from "@/lib/notify";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rid = Number(id);
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json();
  const action = body.action as "confirm" | "cancel" | "complete";

  const [row] = await db
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
    .where(eq(reservations.id, rid))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  const isOwner = row.r.clientId === user.id;
  const isAdmin =
    (user.role === "admin" && row.etablissement.adminId === user.id) ||
    user.role === "superadmin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  if (action === "confirm") {
    if (!isAdmin) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    if (row.r.statut !== "en_attente") {
      return NextResponse.json(
        { error: "Cette réservation ne peut pas être confirmée" },
        { status: 400 },
      );
    }
    await db
      .update(reservations)
      .set({ statut: "confirmee", updatedAt: new Date() })
      .where(eq(reservations.id, rid));
    await db
      .update(creneaux)
      .set({ disponible: false })
      .where(eq(creneaux.id, row.c.id));
    notifyReservationEvent({
      reservationId: rid,
      clientId: row.client.id,
      clientEmail: row.client.email,
      clientTel: row.client.telephone,
      etablissementNom: row.etablissement.nom,
      dateDebut: row.c.dateDebut,
      dateFin: row.c.dateFin,
      event: "confirmed",
      prixTotal: row.r.prixTotal,
    }).catch((e) => console.error("[notify confirm]", e));
    return NextResponse.json({ ok: true, statut: "confirmee" });
  }

  if (action === "cancel") {
    if (row.r.statut === "annulee" || row.r.statut === "terminee") {
      return NextResponse.json(
        { error: "Cette réservation ne peut pas être annulée" },
        { status: 400 },
      );
    }
    await db
      .update(reservations)
      .set({ statut: "annulee", updatedAt: new Date() })
      .where(eq(reservations.id, rid));
    await db
      .update(creneaux)
      .set({ disponible: true })
      .where(eq(creneaux.id, row.c.id));
    notifyReservationEvent({
      reservationId: rid,
      clientId: row.client.id,
      clientEmail: row.client.email,
      clientTel: row.client.telephone,
      etablissementNom: row.etablissement.nom,
      dateDebut: row.c.dateDebut,
      dateFin: row.c.dateFin,
      event: "cancelled",
    }).catch((e) => console.error("[notify cancel]", e));
    return NextResponse.json({ ok: true, statut: "annulee" });
  }

  if (action === "complete") {
    if (!isAdmin) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }
    if (row.r.statut !== "confirmee") {
      return NextResponse.json(
        { error: "Réservation doit être confirmée" },
        { status: 400 },
      );
    }
    await db
      .update(reservations)
      .set({ statut: "terminee", updatedAt: new Date() })
      .where(eq(reservations.id, rid));
    return NextResponse.json({ ok: true, statut: "terminee" });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
