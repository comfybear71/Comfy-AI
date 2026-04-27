import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { webhookEvents } from "@/lib/schema"
import { desc, eq, and, sql } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const repoOwner = searchParams.get("repo_owner")
    const repoName = searchParams.get("repo_name")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)

    // Debug: get current database name
    const dbNameResult = await getDb().execute(sql`SELECT current_database() as db`)
    const rawCount = await getDb().execute(sql`SELECT COUNT(*)::int as count FROM webhook_events`)

    const dbName = (dbNameResult.rows[0] as any)?.db || "unknown"
    const count = (rawCount.rows[0] as any)?.count || 0

    if (repoOwner && repoName) {
      const events = await getDb()
        .select()
        .from(webhookEvents)
        .where(and(eq(webhookEvents.repoOwner, repoOwner), eq(webhookEvents.repoName, repoName)))
        .orderBy(desc(webhookEvents.createdAt))
        .limit(limit)
      return NextResponse.json({ db: dbName, count, events })
    }

    if (repoOwner) {
      const events = await getDb()
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.repoOwner, repoOwner))
        .orderBy(desc(webhookEvents.createdAt))
        .limit(limit)
      return NextResponse.json({ db: dbName, count, events })
    }

    const events = await getDb()
      .select()
      .from(webhookEvents)
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit)
    return NextResponse.json({ db: dbName, count, events })
  } catch (error: any) {
    console.error("Failed to fetch webhook events:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}
