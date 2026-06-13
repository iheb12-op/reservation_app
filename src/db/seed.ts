import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import bcrypt from "bcryptjs";
import { addDays, addMinutes, startOfDay } from "date-fns";

const pool = new Pool({
    connectionString:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
});
const db = drizzle(pool, { schema });

async function main() {
    console.log("🌱 Seed de la base de données...");

    await db.delete(schema.notifications);
    await db.delete(schema.reservations);
    await db.delete(schema.creneaux);
    await db.delete(schema.services);
    await db.delete(schema.etablissements);
    await db.delete(schema.users);
    console.log("  ✓ Tables vidées");

    const hash = async (p: string) => bcrypt.hash(p, 10);

    const [superAdmin] = await db.insert(schema.users).values({
        nom: "Super Admin", email: "super@maweid.tn",
        passwordHash: await hash("super123"), role: "superadmin", telephone: "+21620000000",
    }).returning();

    const admins = await db.insert(schema.users).values([
        { nom: "Admin El Mouradi",        email: "admin1@maweid.tn",  passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000001" },
        { nom: "Admin Clinique Tunis",    email: "admin2@maweid.tn",  passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000002" },
        { nom: "Admin Spa Zen",           email: "admin3@maweid.tn",  passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000003" },
        { nom: "Admin Delphin Beach",     email: "admin4@maweid.tn",  passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000004" },
        { nom: "Admin Dar Zarrouk",       email: "admin5@maweid.tn",  passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000005" },
        { nom: "Admin Clinique Carthage", email: "admin6@maweid.tn",  passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000006" },
        { nom: "Admin Hammam Andalous",   email: "admin7@maweid.tn",  passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000007" },
        { nom: "Admin Salon Prestige",    email: "admin8@maweid.tn",  passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000008" },
        { nom: "Admin Royal Garden",      email: "admin9@maweid.tn",  passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000009" },
        { nom: "Admin Ibn Khaldoun",      email: "admin10@maweid.tn", passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000010" },
        { nom: "Admin Abou Nawas",        email: "admin11@maweid.tn", passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000011" },
        { nom: "Admin Clinique Sfax",     email: "admin12@maweid.tn", passwordHash: await hash("admin123"), role: "admin", telephone: "+21621000012" },
    ]).returning();

    await db.insert(schema.users).values([
        { nom: "Mohamed Ali",      email: "client@maweid.tn",  passwordHash: await hash("client123"), role: "client", telephone: "+21625000001" },
        { nom: "Sarra Ben Salem",  email: "sarra@maweid.tn",   passwordHash: await hash("client123"), role: "client", telephone: "+21625000002" },
        { nom: "Yassine Trabelsi", email: "yassine@maweid.tn", passwordHash: await hash("client123"), role: "client", telephone: "+21625000003" },
    ]);

    console.log("  ✓ Utilisateurs créés");

    const etas = await db.insert(schema.etablissements).values([
        { nom: "Hôtel El Mouradi Palace",        type: "hotel",     description: "Hôtel 5 étoiles au cœur de Tunis avec piscine et spa.",                      adresse: "Avenue Habib Bourguiba",  ville: "Tunis",         telephone: "+21671100000", imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800", adminId: admins[0].id },
        { nom: "Clinique Internationale Tunis",  type: "clinique",  description: "Clinique privée avec cardiologie, dermatologie et pédiatrie.",                adresse: "Rue de Marseille",        ville: "Tunis",         telephone: "+21671200000", imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800", adminId: admins[1].id },
        { nom: "Spa Zen & Bien-être",            type: "spa",       description: "Spa de luxe : massages, hammam et soins visage au lac de Tunis.",             adresse: "Les Berges du Lac",       ville: "Tunis",         telephone: "+21671300000", imageUrl: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800", adminId: admins[2].id },
        { nom: "Delphin Beach Hotel",            type: "hotel",     description: "Hôtel balnéaire 4 étoiles en bord de mer avec sports nautiques.",            adresse: "Zone Touristique",        ville: "Hammamet",      telephone: "+21672100000", imageUrl: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", adminId: admins[3].id },
        { nom: "Restaurant Dar Zarrouk",         type: "restaurant",description: "Restaurant traditionnel tunisien avec vue sur Sidi Bou Saïd.",               adresse: "Route de la Corniche",    ville: "Sidi Bou Saïd", telephone: "+21671400000", imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800", adminId: admins[4].id },
        { nom: "Clinique Carthage Santé",        type: "clinique",  description: "Centre médical : chirurgie esthétique, ophtalmologie et gynécologie.",        adresse: "Avenue de Carthage",      ville: "Carthage",      telephone: "+21671500000", imageUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800", adminId: admins[5].id },
        { nom: "Hammam Andalous",                type: "spa",       description: "Hammam traditionnel en plein cœur de la médina de Tunis.",                   adresse: "Médina de Tunis",         ville: "Tunis",         telephone: "+21671600000", imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800", adminId: admins[6].id },
        { nom: "Salon Prestige Coiffure",        type: "salon",     description: "Salon haut de gamme : coupe, coloration, soin et brushing.",                 adresse: "Avenue Mohamed V",        ville: "Sfax",          telephone: "+21674100000", imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800", adminId: admins[7].id },
        { nom: "Royal Garden Hotel & Spa",       type: "hotel",     description: "Hôtel de luxe avec jardins, piscines et centre de bien-être.",               adresse: "Route Touristique",       ville: "Sousse",        telephone: "+21673100000", imageUrl: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800", adminId: admins[8].id },
        { nom: "Hôtel Ibn Khaldoun",             type: "hotel",     description: "Hôtel 4 étoiles au centre de Tunis, proche des ambassades.",                 adresse: "Rue de Yougoslavie",      ville: "Tunis",         telephone: "+21671700000", imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800", adminId: admins[9].id },
        { nom: "Hôtel Abou Nawas Gammarth",      type: "hotel",     description: "Complexe luxueux en bord de mer avec restaurants et plage privée.",          adresse: "La Marsa",                ville: "Gammarth",      telephone: "+21671800000", imageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800", adminId: admins[10].id },
        { nom: "Clinique Sfax Méditerranée",     type: "clinique",  description: "Clinique multidisciplinaire avec urgences 24h/24 et neurologie.",            adresse: "Avenue Habib Maazoun",    ville: "Sfax",          telephone: "+21674200000", imageUrl: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=800", adminId: admins[11].id },
    ]).returning();

    console.log(`  ✓ ${etas.length} établissements créés`);

    const allServices: { etablissementId: number; nom: string; description: string; dureeMinutes: number; prix: number; capacite: number }[] = [];

    for (const e of etas) {
        if (e.type === "hotel") {
            allServices.push(
                { etablissementId: e.id, nom: "Chambre Standard",     description: "Chambre double confortable, petit-déjeuner inclus.", dureeMinutes: 1440, prix: 150000, capacite: 2 },
                { etablissementId: e.id, nom: "Chambre Supérieure",   description: "Chambre spacieuse avec vue, accès spa offert.",      dureeMinutes: 1440, prix: 220000, capacite: 2 },
                { etablissementId: e.id, nom: "Suite Junior",         description: "Suite avec salon séparé et baignoire balnéo.",       dureeMinutes: 1440, prix: 350000, capacite: 3 },
                { etablissementId: e.id, nom: "Suite Présidentielle", description: "Suite luxueuse avec terrasse panoramique.",          dureeMinutes: 1440, prix: 600000, capacite: 4 },
            );
        } else if (e.type === "clinique") {
            allServices.push(
                { etablissementId: e.id, nom: "Consultation Généraliste",  description: "Consultation médecin généraliste.",        dureeMinutes: 20, prix: 40000,  capacite: 1 },
                { etablissementId: e.id, nom: "Consultation Cardiologue",  description: "Bilan cardiaque complet avec ECG.",        dureeMinutes: 30, prix: 90000,  capacite: 1 },
                { etablissementId: e.id, nom: "Consultation Dermatologue", description: "Soins de peau et traitement acné.",        dureeMinutes: 25, prix: 75000,  capacite: 1 },
                { etablissementId: e.id, nom: "Consultation Pédiatre",     description: "Suivi enfant et vaccination.",             dureeMinutes: 20, prix: 55000,  capacite: 1 },
                { etablissementId: e.id, nom: "Échographie",               description: "Échographie abdominale ou obstétrique.",   dureeMinutes: 30, prix: 120000, capacite: 1 },
            );
        } else if (e.type === "spa") {
            allServices.push(
                { etablissementId: e.id, nom: "Massage Relaxant 60min", description: "Massage corps complet aux huiles essentielles.", dureeMinutes: 60,  prix: 120000, capacite: 1 },
                { etablissementId: e.id, nom: "Massage Sportif",        description: "Massage décontractant muscles.",                 dureeMinutes: 45,  prix: 100000, capacite: 1 },
                { etablissementId: e.id, nom: "Hammam + Gommage",       description: "Hammam traditionnel avec gommage beldi.",        dureeMinutes: 90,  prix: 85000,  capacite: 2 },
                { etablissementId: e.id, nom: "Soin Visage Hydratant",  description: "Masque hydratant et éclat.",                    dureeMinutes: 60,  prix: 95000,  capacite: 1 },
                { etablissementId: e.id, nom: "Forfait Duo Spa",        description: "Massage + hammam pour deux personnes.",          dureeMinutes: 120, prix: 250000, capacite: 2 },
            );
        } else if (e.type === "restaurant") {
            allServices.push(
                { etablissementId: e.id, nom: "Table Déjeuner (2 pers)", description: "Réservation déjeuner pour 2 personnes.", dureeMinutes: 90,  prix: 80000,  capacite: 2 },
                { etablissementId: e.id, nom: "Table Dîner (2 pers)",    description: "Réservation dîner pour 2 personnes.",    dureeMinutes: 120, prix: 100000, capacite: 2 },
                { etablissementId: e.id, nom: "Table Groupe (6 pers)",   description: "Grande table pour 6 personnes.",         dureeMinutes: 150, prix: 250000, capacite: 6 },
            );
        } else if (e.type === "salon") {
            allServices.push(
                { etablissementId: e.id, nom: "Coupe Femme",       description: "Coupe et brushing femme.",               dureeMinutes: 60,  prix: 45000,  capacite: 1 },
                { etablissementId: e.id, nom: "Coupe Homme",       description: "Coupe et finition homme.",               dureeMinutes: 30,  prix: 25000,  capacite: 1 },
                { etablissementId: e.id, nom: "Coloration",        description: "Coloration complète avec soin.",         dureeMinutes: 120, prix: 120000, capacite: 1 },
                { etablissementId: e.id, nom: "Lissage Brésilien", description: "Lissage kératine longue durée.",         dureeMinutes: 180, prix: 200000, capacite: 1 },
                { etablissementId: e.id, nom: "Soin Cheveux",      description: "Masque profond cheveux abîmés.",         dureeMinutes: 45,  prix: 55000,  capacite: 1 },
            );
        }
    }

    const insertedServices = await db.insert(schema.services).values(allServices).returning();
    console.log(`  ✓ ${insertedServices.length} services créés`);

    const today = startOfDay(new Date());
    const creneauxData: { serviceId: number; dateDebut: Date; dateFin: Date; disponible: boolean }[] = [];

    for (const service of insertedServices) {
        const eta = etas.find((e) => e.id === service.etablissementId)!;
        for (let day = 0; day < 21; day++) {
            const date = addDays(today, day);
            const dow = date.getDay();
            if (eta.type === "hotel") {
                const d = new Date(date); d.setHours(14, 0, 0, 0);
                creneauxData.push({ serviceId: service.id, dateDebut: d, dateFin: addMinutes(d, service.dureeMinutes), disponible: true });
            } else if (eta.type === "clinique" && dow !== 0) {
                for (let h = 8; h < 17; h++) {
                    for (let m = 0; m < 60; m += 25) {
                        const d = new Date(date); d.setHours(h, m, 0, 0);
                        creneauxData.push({ serviceId: service.id, dateDebut: d, dateFin: addMinutes(d, service.dureeMinutes), disponible: true });
                    }
                }
            } else if (eta.type === "spa") {
                for (let h = 9; h < 20; h++) {
                    const d = new Date(date); d.setHours(h, 0, 0, 0);
                    creneauxData.push({ serviceId: service.id, dateDebut: d, dateFin: addMinutes(d, service.dureeMinutes), disponible: true });
                }
            } else if (eta.type === "restaurant") {
                for (const h of [12, 13, 14, 19, 20, 21]) {
                    const d = new Date(date); d.setHours(h, 0, 0, 0);
                    creneauxData.push({ serviceId: service.id, dateDebut: d, dateFin: addMinutes(d, service.dureeMinutes), disponible: true });
                }
            } else if (eta.type === "salon" && dow !== 0) {
                for (let h = 9; h < 19; h++) {
                    for (const m of [0, 30]) {
                        const d = new Date(date); d.setHours(h, m, 0, 0);
                        creneauxData.push({ serviceId: service.id, dateDebut: d, dateFin: addMinutes(d, service.dureeMinutes), disponible: true });
                    }
                }
            }
        }
    }

    for (let i = 0; i < creneauxData.length; i += 100) {
        await db.insert(schema.creneaux).values(creneauxData.slice(i, i + 100));
    }

    console.log(`  ✓ ${creneauxData.length} créneaux générés`);
    console.log("\n✅ Seed terminé !\n");
    console.log("  Super Admin : super@maweid.tn  / super123");
    console.log("  Admin       : admin1@maweid.tn / admin123");
    console.log("  Client      : client@maweid.tn / client123");

    await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });