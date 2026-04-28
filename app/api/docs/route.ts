import { NextRequest, NextResponse } from "next/server"
import { readdir, readFile } from "fs/promises"
import { join } from "path"

const DOCS_DIR = join(process.cwd(), "docs")
const ALLOWED_EXTENSIONS = [".md", ".txt"]

function isSafeFilename(name: string): boolean {
  return /^[a-zA-Z0-9_\-\.]+$/.test(name) && !name.includes("..")
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const file = searchParams.get("file")

    if (file) {
      if (!isSafeFilename(file)) {
        return NextResponse.json({ error: "Invalid filename" }, { status: 400 })
      }
      const ext = "." + file.split(".").pop()
      if (!ALLOWED_EXTENSIONS.includes(ext.toLowerCase())) {
        return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
      }
      const content = await readFile(join(DOCS_DIR, file), "utf-8")
      return NextResponse.json({ name: file, content })
    }

    // List all docs
    const entries = await readdir(DOCS_DIR)
    const docs = entries.filter((name) => {
      const ext = "." + name.split(".").pop()
      return ALLOWED_EXTENSIONS.includes(ext.toLowerCase()) && isSafeFilename(name)
    })
    return NextResponse.json(docs)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to read docs" },
      { status: 500 }
    )
  }
}
