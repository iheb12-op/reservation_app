import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  nom: z.string().min(2).max(120),
  email: z.string().email().max(180),
  password: z.string().min(6).max(200),
  telephone: z.string().max(30).optional().nullable(),
  role: z.enum(["client", "admin"]).optional().default("client"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);
    if (existing) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email." },
        { status: 409 },
      );
    }
    const passwordHash = await hashPassword(data.password);
    const [user] = await db
      .insert(users)
      .values({
        nom: data.nom,
        email: data.email,
        passwordHash,
        role: data.role,
        telephone: data.telephone ?? null,
      })
      .returning();
    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
    });
    return NextResponse.json({
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        telephone: user.telephone,
      },
    });
  } catch (e: any) {
    if (e?.issues) {
      return NextResponse.json(
        { error: "Données invalides", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[register]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
