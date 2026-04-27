import { NextRequest, NextResponse } from "next/server"
import { getOctokit } from "@/lib/github"

export async function GET(
  _req: NextRequest,
  { params }: { params: { owner: string; repo: string; number: string } }
) {
  try {
    const octokit = getOctokit()
    const prNumber = parseInt(params.number, 10)

    // Fetch PR details
    const { data: pr } = await octokit.rest.pulls.get({
      owner: params.owner,
      repo: params.repo,
      pull_number: prNumber,
    })

    // Fetch combined check status
    const { data: checkStatus } = await octokit.rest.repos.getCombinedStatusForRef({
      owner: params.owner,
      repo: params.repo,
      ref: pr.head.sha,
    })

    // Fetch check runs (more detailed than status)
    const { data: checkRuns } = await octokit.rest.checks.listForRef({
      owner: params.owner,
      repo: params.repo,
      ref: pr.head.sha,
    })

    return NextResponse.json({
      pr: {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        merged: pr.merged,
        mergeable: pr.mergeable,
        mergeable_state: pr.mergeable_state,
        head_sha: pr.head.sha,
        html_url: pr.html_url,
      },
      status: {
        state: checkStatus.state,
        total_count: checkStatus.total_count,
        statuses: checkStatus.statuses.map((s) => ({
          context: s.context,
          state: s.state,
          description: s.description,
          target_url: s.target_url,
        })),
      },
      checks: checkRuns.check_runs.map((c) => ({
        name: c.name,
        status: c.status,
        conclusion: c.conclusion,
        html_url: c.html_url,
        started_at: c.started_at,
        completed_at: c.completed_at,
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch PR status" },
      { status: 500 }
    )
  }
}
