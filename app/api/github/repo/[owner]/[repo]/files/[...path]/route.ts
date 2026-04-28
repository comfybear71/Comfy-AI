import { NextRequest, NextResponse } from "next/server"
import { getOctokit } from "@/lib/github"

function isSafeParam(s: string): boolean {
  return /^[a-zA-Z0-9_.\-]+$/.test(s)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string; path: string[] } }
) {
  if (!isSafeParam(params.owner) || !isSafeParam(params.repo)) {
    return NextResponse.json({ error: "Invalid repository" }, { status: 400 })
  }
  if (params.path.some((segment) => segment === ".." || segment === "")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const ref = searchParams.get("ref") || "HEAD"
    const filePath = params.path.join("/")

    const octokit = getOctokit()
    const { data } = await octokit.rest.repos.getContent({
      owner: params.owner,
      repo: params.repo,
      path: filePath,
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

    if (data.type === "file") {
      const content = Buffer.from(data.content, "base64").toString("utf-8")
      return NextResponse.json({
        name: data.name,
        path: data.path,
        sha: data.sha,
        content,
        html_url: data.html_url,
        download_url: data.download_url,
      })
    }

    return NextResponse.json({ error: "Unsupported content type" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch file" },
      { status: 500 }
    )
  }
}
