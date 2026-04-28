import { NextRequest, NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function GET(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  const { owner, repo } = params
  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path") || ""
  const branch = searchParams.get("branch") || "master"
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 })
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch })
    if (Array.isArray(data)) return NextResponse.json({ error: "Path is a directory" }, { status: 400 })
    const content = Buffer.from((data as any).content.replace(/\n/g, ""), "base64").toString("utf-8")
    return NextResponse.json({ path, content, sha: (data as any).sha, branch })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 404 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  const { owner, repo } = params
  const { path, content, message, branch } = await req.json()
  if (!path || content === undefined || !message || !branch) {
    return NextResponse.json({ error: "path, content, message, branch required" }, { status: 400 })
  }
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
    let sha: string | undefined
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch })
      if (!Array.isArray(data)) sha = (data as any).sha
    } catch {}
    const { data } = await octokit.repos.createOrUpdateFileContents({
      owner, repo, path, message,
      content: Buffer.from(content).toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    })
    return NextResponse.json({ success: true, path, commit: data.commit.sha })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to commit file" }, { status: 500 })
  }
}
