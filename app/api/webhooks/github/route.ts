import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { getDb } from "@/lib/db"
import { webhookEvents } from "@/lib/schema"

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET

function verifySignature(body: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false
  const expected = "sha256=" + createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-hub-signature-256")
    const eventType = req.headers.get("x-github-event")
    const body = await req.text()

    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const payload = JSON.parse(body)

    // Extract repo owner/name
    const repoOwner = payload.repository?.owner?.login || "unknown"
    const repoName = payload.repository?.name || "unknown"

    // Extract action and title based on event type
    let action = payload.action || "unknown"
    let title: string | null = null

    if (eventType === "pull_request") {
      title = payload.pull_request?.title || null
      if (payload.pull_request?.merged) {
        action = "merged"
      }
    } else if (eventType === "workflow_run") {
      title = payload.workflow_run?.name || null
      if (action === "completed") {
        action = payload.workflow_run?.conclusion || "completed"
      }
    } else if (eventType === "push") {
      title = payload.ref?.replace("refs/heads/", "") || null
    }

    await getDb().insert(webhookEvents).values({
      eventType: eventType || "unknown",
      action,
      repoOwner,
      repoName,
      title,
      payload,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
