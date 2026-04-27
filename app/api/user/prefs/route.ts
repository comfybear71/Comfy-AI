import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { userPrefs } from "@/lib/schema"
import { eq } from "drizzle-orm"

// For now, use a default user ID. Will be replaced with Google Auth user ID later.
const DEFAULT_USER_ID = "default"

export async function GET() {
  try {
    const [prefs] = await getDb()
      .select()
      .from(userPrefs)
      .where(eq(userPrefs.userId, DEFAULT_USER_ID))
      .limit(1)

    if (!prefs) {
      // Return defaults
      return NextResponse.json({
        theme: "system",
        pinnedRepos: [],
      })
    }

    return NextResponse.json({
      theme: prefs.theme,
      pinnedRepos: prefs.pinnedRepos as string[],
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch preferences" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { theme, pinnedRepos } = body

    const existing = await getDb()
      .select()
      .from(userPrefs)
      .where(eq(userPrefs.userId, DEFAULT_USER_ID))
      .limit(1)

    if (existing.length > 0) {
      // Update
      await getDb()
        .update(userPrefs)
        .set({
          theme: theme ?? existing[0].theme,
          pinnedRepos: pinnedRepos ?? existing[0].pinnedRepos,
          updatedAt: new Date(),
        })
        .where(eq(userPrefs.userId, DEFAULT_USER_ID))
    } else {
      // Insert
      await getDb().insert(userPrefs).values({
        userId: DEFAULT_USER_ID,
        theme: theme || "system",
        pinnedRepos: pinnedRepos || [],
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save preferences" },
      { status: 500 }
    )
  }
}
