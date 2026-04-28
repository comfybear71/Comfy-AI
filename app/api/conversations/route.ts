import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// POST: create or append messages to a conversation
// Body: { userId, conversationId?, messages: [{role, content}], repoContext? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, conversationId, messages, repoContext } = body

    if (!userId || !Array.isArray(messages)) {
      return NextResponse.json({ error: "userId and messages[] required" }, { status: 400 })
    }

    let convId = conversationId

    // Create conversation if none provided
    if (!convId) {
      const rows = await sql`
        INSERT INTO conversations (user_id, created_at, updated_at)
        VALUES (${userId}, NOW(), NOW())
        RETURNING id
      `
      convId = rows[0].id
    } else {
      await sql`UPDATE conversations SET updated_at = NOW() WHERE id = ${convId}`
    }

    // Insert messages
    for (const m of messages) {
      if (!m.role || !m.content) continue
      await sql`
        INSERT INTO messages (conversation_id, role, content, created_at)
        VALUES (${convId}, ${m.role}, ${m.content}, NOW())
      `
    }

    return NextResponse.json({ success: true, conversationId: convId })
  } catch (err: any) {
    console.error("POST /api/conversations error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET: list user conversations OR fetch single conversation with messages
// ?userId=...           → list (most recent first, with first user message preview)
// ?conversationId=...   → full conversation with all messages
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const conversationId = searchParams.get("conversationId")

    if (conversationId) {
      const conv = await sql`SELECT * FROM conversations WHERE id = ${conversationId}`
      if (conv.length === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      const msgs = await sql`
        SELECT id, role, content, created_at
        FROM messages
        WHERE conversation_id = ${conversationId}
        ORDER BY created_at ASC
      `
      return NextResponse.json({ ...conv[0], messages: msgs })
    }

    if (userId) {
      const rows = await sql`
        SELECT
          c.id,
          c.created_at,
          c.updated_at,
          (
            SELECT content FROM messages
            WHERE conversation_id = c.id AND role = 'user'
            ORDER BY created_at ASC LIMIT 1
          ) AS preview,
          (
            SELECT COUNT(*) FROM messages WHERE conversation_id = c.id
          ) AS message_count
        FROM conversations c
        WHERE c.user_id = ${userId}
        ORDER BY c.updated_at DESC
        LIMIT 50
      `
      return NextResponse.json(rows)
    }

    return NextResponse.json({ error: "userId or conversationId required" }, { status: 400 })
  } catch (err: any) {
    console.error("GET /api/conversations error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
