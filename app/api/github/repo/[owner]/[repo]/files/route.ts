import { NextRequest, NextResponse } from "next/server"
import { getOctokit } from "@/lib/github"

function isSafePath(p: string): boolean {
  return !p.includes("..") && !p.startsWith("/")
}

function isSafeParam(s: string): boolean {
  return /^[a-zA-Z0-9_.\-]+$/.test(s)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  if (!isSafeParam(params.owner) || !isSafeParam(params.repo)) {
    return NextResponse.json({ error: "Invalid repository" }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path") || ""
    const ref = searchParams.get("ref") || "HEAD"

    if (path && !isSafePath(path)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    const octokit = getOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner: params.owner,
      repo: params.repo,
      path,
      ref,
    })

    if (Array.isArray(data)) {
      return NextResponse.json(
        data.map((item) => ({
          name: item.name,
          path: item.path,
          sha: item.sha,
          size: item.size,
          type: item.type,
          html_url: item.html_url,
          download_url: item.download_url,
        }))
      )
    }

    return NextResponse.json({ error: "Path is not a directory" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch files" },
      { status: 500 }
    )
  }
}
