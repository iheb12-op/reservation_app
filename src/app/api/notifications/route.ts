import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  const unread = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, user.id), eq(notifications.lu, false)),
    );
  return NextResponse.json({
    notifications: rows,
    unread: unread[0]?.c ?? 0,
  });
}
