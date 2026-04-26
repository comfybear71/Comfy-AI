import { NextRequest, NextResponse } from "next/server"
import { getOctokit } from "@/lib/github"

export async function GET(
  _req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const octokit = getOctokit()
    const { data } = await octokit.rest.repos.listBranches({
      owner: params.owner,
      repo: params.repo,
      per_page: 100,
    })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch branches" },
      { status: 500 }
    )
  }
}
