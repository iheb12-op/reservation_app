import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- Enums ----------
export const userRoleEnum = pgEnum("user_role", [
  "client",
  "admin",
  "superadmin",
]);

export const etablissementTypeEnum = pgEnum("etablissement_type", [
  "hotel",
  "clinique",
  "restaurant",
  "spa",
  "salon",
  "autre",
]);

export const reservationStatutEnum = pgEnum("reservation_statut", [
  "en_attente",
  "confirmee",
  "annulee",
  "terminee",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "email",
  "sms",
  "systeme",
]);

// ---------- Tables ----------
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    nom: varchar("nom", { length: 120 }).notNull(),
    email: varchar("email", { length: 180 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("client"),
    telephone: varchar("telephone", { length: 30 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  }),
);

export const etablissements = pgTable(
  "etablissements",
  {
    id: serial("id").primaryKey(),
    nom: varchar("nom", { length: 160 }).notNull(),
    type: etablissementTypeEnum("type").notNull().default("hotel"),
    description: text("description"),
    adresse: varchar("adresse", { length: 255 }),
    ville: varchar("ville", { length: 120 }),
    telephone: varchar("telephone", { length: 30 }),
    imageUrl: text("image_url"),
    adminId: integer("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    adminIdx: index("etablissements_admin_idx").on(t.adminId),
  }),
);

export const services = pgTable(
  "services",
  {
    id: serial("id").primaryKey(),
    etablissementId: integer("etablissement_id")
      .notNull()
      .references(() => etablissements.id, { onDelete: "cascade" }),
    nom: varchar("nom", { length: 160 }).notNull(),
    description: text("description"),
    dureeMinutes: integer("duree_minutes").notNull().default(30),
    prix: integer("prix").notNull().default(0), // en millimes tunisiens
    capacite: integer("capacite").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    etaIdx: index("services_etablissement_idx").on(t.etablissementId),
  }),
);

export const creneaux = pgTable(
  "creneaux",
  {
    id: serial("id").primaryKey(),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    dateDebut: timestamp("date_debut", { withTimezone: true }).notNull(),
    dateFin: timestamp("date_fin", { withTimezone: true }).notNull(),
    disponible: boolean("disponible").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    serviceIdx: index("creneaux_service_idx").on(t.serviceId),
    dateIdx: index("creneaux_date_idx").on(t.dateDebut),
  }),
);

export const reservations = pgTable(
  "reservations",
  {
    id: serial("id").primaryKey(),
    creneauId: integer("creneau_id")
      .notNull()
      .references(() => creneaux.id, { onDelete: "cascade" }),
    clientId: integer("client_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    etablissementId: integer("etablissement_id")
      .notNull()
      .references(() => etablissements.id, { onDelete: "cascade" }),
    statut: reservationStatutEnum("statut").notNull().default("en_attente"),
    noteClient: text("note_client"),
    nombrePersonnes: integer("nombre_personnes").notNull().default(1),
    prixTotal: integer("prix_total").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    creneauIdx: index("reservations_creneau_idx").on(t.creneauId),
    clientIdx: index("reservations_client_idx").on(t.clientId),
    etaIdx: index("reservations_etablissement_idx").on(t.etablissementId),
  }),
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    reservationId: integer("reservation_id").references(() => reservations.id, {
      onDelete: "cascade",
    }),
    message: text("message").notNull(),
    type: notificationTypeEnum("type").notNull().default("systeme"),
    lu: boolean("lu").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("notifications_user_idx").on(t.userId),
  }),
);

// ---------- Relations ----------
export const usersRelations = relations(users, ({ many }) => ({
  etablissements: many(etablissements),
  reservations: many(reservations),
  notifications: many(notifications),
}));

export const etablissementsRelations = relations(
  etablissements,
  ({ one, many }) => ({
    admin: one(users, {
      fields: [etablissements.adminId],
      references: [users.id],
    }),
    services: many(services),
    reservations: many(reservations),
  }),
);

export const servicesRelations = relations(services, ({ one, many }) => ({
  etablissement: one(etablissements, {
    fields: [services.etablissementId],
    references: [etablissements.id],
  }),
  creneaux: many(creneaux),
}));

export const creneauxRelations = relations(creneaux, ({ one, many }) => ({
  service: one(services, {
    fields: [creneaux.serviceId],
    references: [services.id],
  }),
  reservations: many(reservations),
}));

export const reservationsRelations = relations(
  reservations,
  ({ one }) => ({
    creneau: one(creneaux, {
      fields: [reservations.creneauId],
      references: [creneaux.id],
    }),
    client: one(users, {
      fields: [reservations.clientId],
      references: [users.id],
    }),
    etablissement: one(etablissements, {
      fields: [reservations.etablissementId],
      references: [etablissements.id],
    }),
  }),
);
