import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  reservations,
  creneaux,
  services,
  etablissements,
  users,
} from "@/db/schema";
import { eq, sql, and, gte, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  if (user.role === "client") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const isSuper = user.role === "superadmin";
  let etaFilter: any = sql`TRUE`;
  if (!isSuper) {
    const myEtas = await db
      .select({ id: etablissements.id })
      .from(etablissements)
      .where(eq(etablissements.adminId, user.id));
    const ids = myEtas.map((e) => e.id);
    if (ids.length === 0) {
      return NextResponse.json({
        totalReservations: 0,
        confirmees: 0,
        enAttente: 0,
        annulees: 0,
        terminees: 0,
        revenuTotal: 0,
        etablissementsCount: 0,
        creneauxFuturs: 0,
        derniers7Jours: [],
        topEtablissements: [],
        topServices: [],
      });
    }
    etaFilter = sql`${reservations.etablissementId} IN (${sql.join(ids, sql`, `)})`;
  }

  const counts = await db
    .select({
      statut: reservations.statut,
      c: sql<number>`COUNT(*)::int`,
    })
    .from(reservations)
    .where(etaFilter)
    .groupBy(reservations.statut);
  const map: Record<string, number> = {
    en_attente: 0,
    confirmee: 0,
    annulee: 0,
    terminee: 0,
  };
  counts.forEach((r) => (map[r.statut] = r.c));

  const revenuRow = await db
    .select({
      total: sql<number>`COALESCE(SUM(${reservations.prixTotal}), 0)::int`,
    })
    .from(reservations)
    .where(
      and(
        etaFilter,
        sql`${reservations.statut} IN ('confirmee', 'terminee')`,
      ),
    );

  const etaCountRow = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(etablissements)
    .where(isSuper ? sql`TRUE` : eq(etablissements.adminId, user.id));
  const etasForSlots = isSuper
    ? null
    : (
        await db
          .select({ id: etablissements.id })
          .from(etablissements)
          .where(eq(etablissements.adminId, user.id))
      ).map((e) => e.id);

  let creneauxFuturs = 0;
  if (isSuper) {
    const r = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(creneaux)
      .where(and(gte(creneaux.dateDebut, new Date()), eq(creneaux.disponible, true)));
    creneauxFuturs = r[0]?.c ?? 0;
  } else if (etasForSlots && etasForSlots.length > 0) {
    const r = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(creneaux)
      .innerJoin(services, eq(services.id, creneaux.serviceId))
      .where(
        and(
          sql`${services.etablissementId} IN (${sql.join(etasForSlots, sql`, `)})`,
          gte(creneaux.dateDebut, new Date()),
          eq(creneaux.disponible, true),
        ),
      );
    creneauxFuturs = r[0]?.c ?? 0;
  }

  // 7 derniers jours
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const dailyRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${reservations.createdAt}), 'YYYY-MM-DD')`,
      c: sql<number>`COUNT(*)::int`,
    })
    .from(reservations)
    .where(and(etaFilter, gte(reservations.createdAt, sevenDaysAgo)))
    .groupBy(sql`date_trunc('day', ${reservations.createdAt})`)
    .orderBy(sql`date_trunc('day', ${reservations.createdAt})`);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    const r = dailyRows.find((x) => x.day === key);
    return { day: key, count: r?.c ?? 0 };
  });

  // Top établissements
  const topEtas = await db
    .select({
      id: etablissements.id,
      nom: etablissements.nom,
      count: sql<number>`COUNT(${reservations.id})::int`,
    })
    .from(reservations)
    .innerJoin(etablissements, eq(etablissements.id, reservations.etablissementId))
    .where(etaFilter)
    .groupBy(etablissements.id, etablissements.nom)
    .orderBy(desc(sql`COUNT(${reservations.id})`))
    .limit(5);

  // Top services
  const topSvcs = await db
    .select({
      id: services.id,
      nom: services.nom,
      count: sql<number>`COUNT(${reservations.id})::int`,
    })
    .from(reservations)
    .innerJoin(creneaux, eq(creneaux.id, reservations.creneauId))
    .innerJoin(services, eq(services.id, creneaux.serviceId))
    .innerJoin(etablissements, eq(etablissements.id, services.etablissementId))
    .where(etaFilter)
    .groupBy(services.id, services.nom)
    .orderBy(desc(sql`COUNT(${reservations.id})`))
    .limit(5);

  let userCount = 0;
  if (isSuper) {
    const r = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(users)
      .where(eq(users.role, "client"));
    userCount = r[0]?.c ?? 0;
  }

  return NextResponse.json({
    totalReservations:
      map.en_attente + map.confirmee + map.annulee + map.terminee,
    enAttente: map.en_attente,
    confirmees: map.confirmee,
    annulees: map.annulee,
    terminees: map.terminee,
    revenuTotal: revenuRow[0]?.total ?? 0,
    etablissementsCount: etaCountRow[0]?.c ?? 0,
    creneauxFuturs,
    clientsCount: isSuper ? userCount : undefined,
    derniers7Jours: last7,
    topEtablissements: topEtas,
    topServices: topSvcs,
  });
}
