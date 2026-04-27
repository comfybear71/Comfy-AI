import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { webhookEvents } from "@/lib/schema"
import { desc, eq, and, SQL } from "drizzle-orm"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const repoOwner = searchParams.get("repo_owner")
    const repoName = searchParams.get("repo_name")
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)

    const conditions: SQL[] = []
    if (repoOwner && repoName) {
      conditions.push(eq(webhookEvents.repoOwner, repoOwner))
      conditions.push(eq(webhookEvents.repoName, repoName))
    } else if (repoOwner) {
      conditions.push(eq(webhookEvents.repoOwner, repoOwner))
    }

    const query = getDb()
      .select()
      .from(webhookEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(webhookEvents.createdAt))
      .limit(limit)

    const events = await query
    return NextResponse.json(events)
  } catch (error: any) {
    console.error("Failed to fetch webhook events:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}
