// Seed route - creates a superadmin, sample admin, sample client, and a sample
// establishment with services + créneaux + a few reservations. Idempotent.
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  etablissements,
  services,
  creneaux,
  reservations,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Super admin
    const superEmail = "super@maweid.tn";
    let [superAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, superEmail))
      .limit(1);
    if (!superAdmin) {
      const passwordHash = await hashPassword("super1234");
      [superAdmin] = await db
        .insert(users)
        .values({
          nom: "Super Admin",
          email: superEmail,
          passwordHash,
          role: "superadmin",
          telephone: "+216 50 000 000",
        })
        .returning();
    }

    // Admin établissement (Hôtel)
    const adminEmail = "hotel@maweid.tn";
    let [admin] = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);
    if (!admin) {
      const passwordHash = await hashPassword("admin1234");
      [admin] = await db
        .insert(users)
        .values({
          nom: "Hôtel Le Méditerranée",
          email: adminEmail,
          passwordHash,
          role: "admin",
          telephone: "+216 71 000 111",
        })
        .returning();
    }

    // Client démo
    const clientEmail = "client@maweid.tn";
    let [client] = await db
      .select()
      .from(users)
      .where(eq(users.email, clientEmail))
      .limit(1);
    if (!client) {
      const passwordHash = await hashPassword("client1234");
      [client] = await db
        .insert(users)
        .values({
          nom: "Sami Ben Ali",
          email: clientEmail,
          passwordHash,
          role: "client",
          telephone: "+216 22 333 444",
        })
        .returning();
    }

    // Établissement
    const [eta] = await db
      .insert(etablissements)
      .values({
        nom: "Hôtel Le Méditerranée",
        type: "hotel",
        description:
          "Hôtel 4 étoiles en bord de mer à Hammamet, spa, restaurant, vue panoramique.",
        adresse: "Avenue de la République",
        ville: "Hammamet",
        telephone: "+216 71 000 111",
        imageUrl: null,
        adminId: admin.id,
      })
      .onConflictDoNothing()
      .returning();

    // Clinic
    const [admin2] = await db
      .insert(users)
      .values({
        nom: "Clinique Carthage",
        email: "clinique@maweid.tn",
        passwordHash: await hashPassword("admin1234"),
        role: "admin",
        telephone: "+216 71 222 333",
      })
      .onConflictDoNothing()
      .returning();
    const adminClinique =
      admin2 ??
      (
        await db
          .select()
          .from(users)
          .where(eq(users.email, "clinique@maweid.tn"))
          .limit(1)
      )[0];

    const [eta2] = await db
      .insert(etablissements)
      .values({
        nom: "Clinique Carthage",
        type: "clinique",
        description: "Clinique moderne spécialisée en consultations et chirurgie ambulatoire.",
        adresse: "Avenue Habib Bourguiba",
        ville: "Tunis",
        telephone: "+216 71 222 333",
        adminId: adminClinique.id,
      })
      .onConflictDoNothing()
      .returning();

    // If onConflictDoNothing already gave us nothing back, fetch existing
    async function getOrCreateEta(nom: string, adminId: number) {
      const [existing] = await db
        .select()
        .from(etablissements)
        .where(eq(etablissements.nom, nom))
        .limit(1);
      if (existing) return existing;
      const [row] = await db
        .insert(etablissements)
        .values({ nom, type: "hotel", adminId })
        .returning();
      return row;
    }

    const hotel = eta ?? (await getOrCreateEta("Hôtel Le Méditerranée", admin.id));
    const clinique =
      eta2 ?? (await getOrCreateEta("Clinique Carthage", adminClinique.id));

    // Services
    const existingSvc = await db
      .select()
      .from(services)
      .where(eq(services.etablissementId, hotel.id));
    let chambreSvc = existingSvc.find((s) => s.nom === "Chambre double");
    if (!chambreSvc) {
      [chambreSvc] = await db
        .insert(services)
        .values({
          etablissementId: hotel.id,
          nom: "Chambre double",
          description: "Chambre double vue mer, petit-déjeuner inclus.",
          dureeMinutes: 60 * 24,
          prix: 18000,
          capacite: 2,
        })
        .returning();
    }
    let spaSvc = existingSvc.find((s) => s.nom === "Spa & bien-être");
    if (!spaSvc) {
      [spaSvc] = await db
        .insert(services)
        .values({
          etablissementId: hotel.id,
          nom: "Spa & bien-être",
          description: "Massage 1h, hammam, accès piscine.",
          dureeMinutes: 60,
          prix: 9000,
          capacite: 1,
        })
        .returning();
    }
    const existingCliniqueSvc = await db
      .select()
      .from(services)
      .where(eq(services.etablissementId, clinique.id));
    let consultSvc = existingCliniqueSvc.find((s) => s.nom === "Consultation générale");
    if (!consultSvc) {
      [consultSvc] = await db
        .insert(services)
        .values({
          etablissementId: clinique.id,
          nom: "Consultation générale",
          description: "Consultation de médecine générale, 30 min.",
          dureeMinutes: 30,
          prix: 5000,
          capacite: 1,
        })
        .returning();
    }

    // Créneaux: pour les 14 prochains jours, 9h-17h, 30 min
    const existingSlots = await db
      .select()
      .from(creneaux)
      .where(eq(creneaux.serviceId, consultSvc.id));
    if (existingSlots.length === 0) {
      const slots: any[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < 14; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        for (let h = 9; h < 17; h++) {
          for (const m of [0, 30]) {
            const s = new Date(day);
            s.setHours(h, m, 0, 0);
            const e = new Date(s.getTime() + 30 * 60_000);
            slots.push({
              serviceId: consultSvc.id,
              dateDebut: s,
              dateFin: e,
              disponible: true,
            });
          }
        }
      }
      // slots for chambre
      for (let i = 0; i < 14; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        const s = new Date(day);
        s.setHours(15, 0, 0, 0);
        const e = new Date(s.getTime() + 60 * 60_000);
        slots.push({
          serviceId: chambreSvc.id,
          dateDebut: s,
          dateFin: e,
          disponible: true,
        });
      }
      // slots for spa
      for (let i = 0; i < 14; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        for (const h of [10, 14]) {
          const s = new Date(day);
          s.setHours(h, 0, 0, 0);
          const e = new Date(s.getTime() + 60 * 60_000);
          slots.push({
            serviceId: spaSvc.id,
            dateDebut: s,
            dateFin: e,
            disponible: true,
          });
        }
      }
      if (slots.length > 0) {
        await db.insert(creneaux).values(slots);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Données de démonstration prêtes",
      accounts: {
        superadmin: { email: superEmail, password: "super1234" },
        admin: { email: adminEmail, password: "admin1234" },
        client: { email: clientEmail, password: "client1234" },
        clinique: {
          email: "clinique@maweid.tn",
          password: "admin1234",
        },
      },
    });
  } catch (e) {
    console.error("[seed]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
