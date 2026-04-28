import { NextRequest, NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

export async function POST(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  const { owner, repo } = params
  const { branch, from_branch = "master" } = await req.json()

  if (!branch || typeof branch !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(branch)) {
    return NextResponse.json({ error: "Invalid branch name" }, { status: 400 })
  }

  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN })
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${from_branch}` })
    await octokit.git.createRef({ owner, repo, ref: `refs/heads/${branch}`, sha: ref.object.sha })
    return NextResponse.json({ success: true, branch, sha: ref.object.sha })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create branch" }, { status: 500 })
  }
}
