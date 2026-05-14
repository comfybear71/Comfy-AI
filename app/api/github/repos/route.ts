import { NextResponse } from "next/server"
import { getOctokit } from "@/lib/github"

export async function GET() {
  try {
    const octokit = getOctokit()

    // Paginate through all repos (100 per page max)
    const repos = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
      sort: "updated",
      per_page: 100,
    })

    return NextResponse.json(repos)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch repos" },
      { status: 500 }
    )
  }
}
