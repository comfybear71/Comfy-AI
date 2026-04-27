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

    // Debug: log table count
    const countResult = await getDb().select({ count: sql`count(*)` }).from(webhookEvents)
    console.log("Webhook events count:", countResult)

    if (repoOwner && repoName) {
      const events = await getDb()
        .select()
        .from(webhookEvents)
        .where(and(eq(webhookEvents.repoOwner, repoOwner), eq(webhookEvents.repoName, repoName)))
        .orderBy(desc(webhookEvents.createdAt))
        .limit(limit)
      return NextResponse.json(events)
    }

    if (repoOwner) {
      const events = await getDb()
        .select()
        .from(webhookEvents)
        .where(eq(webhookEvents.repoOwner, repoOwner))
        .orderBy(desc(webhookEvents.createdAt))
        .limit(limit)
      return NextResponse.json(events)
    }

    const events = await getDb()
      .select()
      .from(webhookEvents)
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit)
    return NextResponse.json(events)
  } catch (error: any) {
    console.error("Failed to fetch webhook events:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}
