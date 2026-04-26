import { NextRequest, NextResponse } from "next/server"
import { getOctokit } from "@/lib/github"

export async function GET(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get("path") || ""
    const ref = searchParams.get("ref") || "HEAD"

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
