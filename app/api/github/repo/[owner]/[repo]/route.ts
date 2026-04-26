import { NextRequest, NextResponse } from "next/server"
import { getOctokit } from "@/lib/github"

export async function GET(
  _req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const octokit = getOctokit()
    const { data } = await octokit.rest.repos.get({
      owner: params.owner,
      repo: params.repo,
    })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch repo" },
      { status: 500 }
    )
  }
}
