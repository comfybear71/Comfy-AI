import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { userPrefs } from "@/lib/schema"
import { eq } from "drizzle-orm"

// Placeholder until auth is added
const DEFAULT_USER_ID = "default"

export interface UserSettings {
  selectedRepo?: string | null       // full_name e.g. "owner/repo"
  selectedModel?: string | null      // model id
  activeDocFiles?: string[]          // docs to include as context
}

export async function GET() {
  try {
    const db = getDb()
    const [prefs] = await db
      .select()
      .from(userPrefs)
      .where(eq(userPrefs.userId, DEFAULT_USER_ID))
      .limit(1)

    if (!prefs) {
      return NextResponse.json({
        theme: "system",
        pinnedRepos: [] as string[],
        settings: {} as UserSettings,
      })
    }

    return NextResponse.json({
      theme: prefs.theme,
      pinnedRepos: prefs.pinnedRepos as string[],
      settings: (prefs.settings ?? {}) as UserSettings,
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
    const { theme, pinnedRepos, settings } = body
    const db = getDb()

    const [existing] = await db
      .select()
      .from(userPrefs)
      .where(eq(userPrefs.userId, DEFAULT_USER_ID))
      .limit(1)

    if (existing) {
      await db
        .update(userPrefs)
        .set({
          theme: theme ?? existing.theme,
          pinnedRepos: pinnedRepos ?? existing.pinnedRepos,
          settings: settings !== undefined
            ? { ...(existing.settings as object), ...settings }
            : existing.settings,
          updatedAt: new Date(),
        })
        .where(eq(userPrefs.userId, DEFAULT_USER_ID))
    } else {
      await db.insert(userPrefs).values({
        userId: DEFAULT_USER_ID,
        theme: theme || "system",
        pinnedRepos: pinnedRepos || [],
        settings: settings || {},
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
