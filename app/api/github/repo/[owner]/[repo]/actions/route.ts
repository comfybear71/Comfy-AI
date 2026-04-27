import { NextRequest, NextResponse } from "next/server"
import { getOctokit } from "@/lib/github"

export async function GET(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const { searchParams } = new URL(req.url)
    const branch = searchParams.get("branch")
    const event = searchParams.get("event")

    const octokit = getOctokit()
    const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner: params.owner,
      repo: params.repo,
      branch: branch || undefined,
      event: (event as any) || undefined,
      per_page: 20,
    })

    return NextResponse.json(data.workflow_runs)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch workflow runs" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const { workflow_id, ref, inputs } = await req.json()
    const octokit = getOctokit()

    await octokit.rest.actions.createWorkflowDispatch({
      owner: params.owner,
      repo: params.repo,
      workflow_id,
      ref: ref || "master",
      inputs,
    })

    return NextResponse.json({ triggered: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to trigger workflow" },
      { status: 500 }
    )
  }
}
