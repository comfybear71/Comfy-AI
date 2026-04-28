import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { conversations, messages } from "@/lib/schema"
import { and, desc, eq } from "drizzle-orm"

const DEFAULT_USER_ID = "default"

interface PostBody {
  userId?: string
  conversationId?: string | null
  messages: { role: string; content: string; metadata?: any }[]
  repoContext?: { repoOwner?: string; repoName?: string }
}

function deriveTitle(msgs: { role: string; content: string }[]): string {
  const firstUser = msgs.find((m) => m.role === "user" && m.content.trim())
  if (!firstUser) return "New conversation"
  return firstUser.content.trim().slice(0, 80)
}

// GET /api/conversations?userId=X            → list user's conversations
// GET /api/conversations?conversationId=X    → single conversation with messages
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const params = request.nextUrl.searchParams
    const conversationId = params.get("conversationId")
    const userId = params.get("userId") || DEFAULT_USER_ID

    if (conversationId) {
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1)
      if (!conv) return NextResponse.json(null)

      const msgs = await db
        .select({
          role: messages.role,
          content: messages.content,
          metadata: messages.metadata,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt)

      return NextResponse.json({ ...conv, messages: msgs })
    }

    const list = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(50)
    return NextResponse.json(list)
  } catch (error: any) {
    console.error("GET /api/conversations failed:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch" }, { status: 500 })
  }
}

// POST /api/conversations  — append messages, creates conversation on first call
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const body = (await request.json()) as PostBody
    const userId = body.userId || DEFAULT_USER_ID
    let { conversationId } = body
    const newMsgs = body.messages || []

    if (!newMsgs.length) {
      return NextResponse.json({ error: "messages required" }, { status: 400 })
    }

    // Create conversation on first save
    if (!conversationId) {
      const [created] = await db
        .insert(conversations)
        .values({
          userId,
          title: deriveTitle(newMsgs),
          repoOwner: body.repoContext?.repoOwner ?? null,
          repoName: body.repoContext?.repoName ?? null,
        })
        .returning({ id: conversations.id })
      conversationId = created.id
    } else {
      // Update timestamp + repo context on existing conversation
      await db
        .update(conversations)
        .set({
          updatedAt: new Date(),
          ...(body.repoContext?.repoOwner ? { repoOwner: body.repoContext.repoOwner } : {}),
          ...(body.repoContext?.repoName ? { repoName: body.repoContext.repoName } : {}),
        })
        .where(eq(conversations.id, conversationId))
    }

    await db.insert(messages).values(
      newMsgs.map((m) => ({
        conversationId: conversationId as string,
        role: m.role,
        content: m.content,
        metadata: m.metadata || {},
      }))
    )

    return NextResponse.json({ conversationId })
  } catch (error: any) {
    console.error("POST /api/conversations failed:", error)
    return NextResponse.json({ error: error.message || "Failed to save" }, { status: 500 })
  }
}

// DELETE /api/conversations?conversationId=X
export async function DELETE(request: NextRequest) {
  try {
    const db = getDb()
    const conversationId = request.nextUrl.searchParams.get("conversationId")
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 })
    }
    // Cascade delete handles messages
    await db.delete(conversations).where(eq(conversations.id, conversationId))
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("DELETE /api/conversations failed:", error)
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500 })
  }
}
