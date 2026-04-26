import { NextRequest, NextResponse } from "next/server"
import { getOctokit } from "@/lib/github"

export async function POST(
  req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const { title, body, head, base, files } = await req.json()
    const octokit = getOctokit()

    // 1. Get the base branch SHA
    const { data: baseRef } = await octokit.rest.git.getRef({
      owner: params.owner,
      repo: params.repo,
      ref: `heads/${base}`,
    })

    // 2. Create a new branch
    await octokit.rest.git.createRef({
      owner: params.owner,
      repo: params.repo,
      ref: `refs/heads/${head}`,
      sha: baseRef.object.sha,
    })

    // 3. Commit each file change
    for (const file of files) {
      // Get current file (if it exists) to get its SHA for updating
      let currentSha: string | undefined
      try {
        const { data: currentFile } = await octokit.rest.repos.getContent({
          owner: params.owner,
          repo: params.repo,
          path: file.path,
          ref: base,
        })
        if (!Array.isArray(currentFile) && currentFile.type === "file") {
          currentSha = currentFile.sha
        }
      } catch {
        // File doesn't exist yet, that's fine
      }

      await octokit.rest.repos.createOrUpdateFileContents({
        owner: params.owner,
        repo: params.repo,
        path: file.path,
        message: file.message || `Update ${file.path}`,
        content: Buffer.from(file.content).toString("base64"),
        sha: currentSha,
        branch: head,
      })
    }

    // 4. Create the PR
    const { data: pr } = await octokit.rest.pulls.create({
      owner: params.owner,
      repo: params.repo,
      title,
      body,
      head,
      base,
    })

    return NextResponse.json({ url: pr.html_url, number: pr.number })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create PR" },
      { status: 500 }
    )
  }
}
