import { NextRequest, NextResponse } from "next/server"
import { getOctokit } from "@/lib/github"

export async function GET(
  _req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const octokit = getOctokit()
    const { data } = await octokit.rest.repos.listReleases({
      owner: params.owner,
      repo: params.repo,
      per_page: 100,
    })
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch releases" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const { tag_name, target_commitish, name, body, draft, prerelease } = await req.json()
    const octokit = getOctokit()

    const { data: release } = await octokit.rest.repos.createRelease({
      owner: params.owner,
      repo: params.repo,
      tag_name,
      target_commitish,
      name,
      body,
      draft: draft ?? false,
      prerelease: prerelease ?? false,
    })

    return NextResponse.json({ url: release.html_url, id: release.id, tag_name: release.tag_name })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create release" },
      { status: 500 }
    )
  }
}
