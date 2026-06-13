// Notification dispatcher - logs to console in dev, real send in prod.
// Email via Nodemailer (SMTP_* envs), SMS via Twilio REST API (TWILIO_* envs).
import { db } from "@/db";
import { notifications } from "@/db/schema";

type NotificationInput = {
  userId?: number;
  reservationId?: number;
  message: string;
  type: "email" | "sms" | "systeme";
};

export async function recordNotification(input: NotificationInput) {
  try {
    await db.insert(notifications).values({
      userId: input.userId ?? null,
      reservationId: input.reservationId ?? null,
      message: input.message,
      type: input.type,
    });
  } catch (e) {
    console.error("[notify] failed to persist notification", e);
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log("\n📧 [EMAIL:DRY-RUN]");
    console.log("   To:", to);
    console.log("   Subject:", subject);
    console.log("   Body:", body, "\n");
    return true;
  }
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    await transporter.sendMail({
      from: process.env.FROM_EMAIL || "no-reply@maweid.tn",
      to,
      subject,
      text: body,
    });
    return true;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.log("\n📱 [SMS:DRY-RUN]");
    console.log("   To:", to);
    console.log("   Body:", body, "\n");
    return true;
  }
  try {
    const from = process.env.TWILIO_FROM_NUMBER;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const params = new URLSearchParams({ To: to, From: from || "", Body: body });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      console.error("[sms] twilio error", await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[sms] send failed", e);
    return false;
  }
}

export async function notifyReservationEvent(opts: {
  reservationId: number;
  clientId: number;
  clientEmail: string;
  clientTel?: string | null;
  etablissementNom: string;
  dateDebut: Date;
  dateFin: Date;
  event: "created" | "confirmed" | "cancelled" | "reminder";
  prixTotal?: number;
}) {
  const fmt = (d: Date) =>
    d.toLocaleString("fr-FR", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Africa/Tunis",
    });
  const dateStr = fmt(opts.dateDebut);
  const prix = opts.prixTotal
    ? ` (${(opts.prixTotal / 1000).toFixed(2)} TND)`
    : "";
  let subject = "";
  let body = "";
  let smsBody = "";
  switch (opts.event) {
    case "created":
      subject = `Maweid - Demande reçue`;
      body = `Bonjour,\n\nVotre demande de réservation chez ${opts.etablissementNom} pour le ${dateStr}${prix} est en attente de confirmation.\n\nMerci pour votre confiance.\nL'équipe Maweid`;
      smsBody = `Maweid: demande reçue pour ${opts.etablissementNom} le ${dateStr}.`;
      break;
    case "confirmed":
      subject = `Maweid - Réservation confirmée ✓`;
      body = `Bonjour,\n\nBonne nouvelle ! Votre réservation chez ${opts.etablissementNom} est confirmée pour le ${dateStr}${prix}.\n\nÀ très vite !\nL'équipe Maweid`;
      smsBody = `Maweid: ✅ Réservation confirmée chez ${opts.etablissementNom} le ${dateStr}.`;
      break;
    case "cancelled":
      subject = `Maweid - Réservation annulée`;
      body = `Bonjour,\n\nVotre réservation chez ${opts.etablissementNom} prévue le ${dateStr} a été annulée.\n\nL'équipe Maweid`;
      smsBody = `Maweid: ❌ Réservation annulée chez ${opts.etablissementNom} le ${dateStr}.`;
      break;
    case "reminder":
      subject = `Maweid - Rappel de rendez-vous`;
      body = `Bonjour,\n\nPetit rappel : votre rendez-vous chez ${opts.etablissementNom} est prévu le ${dateStr}${prix}.\n\nÀ demain !\nL'équipe Maweid`;
      smsBody = `Maweid: ⏰ Rappel - RDV chez ${opts.etablissementNom} le ${dateStr}.`;
      break;
  }

  await sendEmail(opts.clientEmail, subject, body);
  await recordNotification({
    userId: opts.clientId,
    reservationId: opts.reservationId,
    message: `📧 ${subject}`,
    type: "email",
  });
  if (opts.clientTel) {
    await sendSms(opts.clientTel, smsBody);
    await recordNotification({
      userId: opts.clientId,
      reservationId: opts.reservationId,
      message: `📱 ${smsBody}`,
      type: "sms",
    });
  }
}
