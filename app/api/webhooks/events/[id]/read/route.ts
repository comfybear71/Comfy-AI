import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { webhookEvents } from "@/lib/schema"
import { eq } from "drizzle-orm"

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 })
    }

    await getDb()
      .update(webhookEvents)
      .set({ read: true })
      .where(eq(webhookEvents.id, id))

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Failed to mark event as read:", error)
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 })
  }
}
