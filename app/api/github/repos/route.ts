import { NextResponse } from "next/server"
import { getOctokit } from "@/lib/github"

export async function GET() {
  try {
    const octokit = getOctokit()
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 50,
    })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch repos" },
      { status: 500 }
    )
  }
}
