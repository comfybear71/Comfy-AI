import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { councilLessons } from "@/lib/schema"
import { desc, sql } from "drizzle-orm"

// GET /api/agents/lessons?limit=5
export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "5"), 20)
  try {
    const db = getDb()
    // Create table if it doesn't exist yet (safe idempotent DDL)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS council_lessons (
        id SERIAL PRIMARY KEY,
        task_hash VARCHAR(64) NOT NULL,
        task TEXT NOT NULL,
        lesson TEXT NOT NULL,
        avg_score VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS council_lessons_hash_idx ON council_lessons(task_hash)
    `)
    const rows = await db
      .select()
      .from(councilLessons)
      .orderBy(desc(councilLessons.createdAt))
      .limit(limit)
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
