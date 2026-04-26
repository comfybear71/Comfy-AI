import { Octokit } from "@octokit/rest"

export function getOctokit() {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN not configured")
  return new Octokit({ auth: token })
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  default_branch: string
  owner: { login: string; avatar_url: string }
}

export interface GitHubBranch {
  name: string
  commit: { sha: string; url: string }
}

export interface GitHubFile {
  name: string
  path: string
  sha: string
  size: number
  type: "file" | "dir"
  html_url: string
  download_url: string | null
}

export interface GitHubFileContent {
  content: string
  sha: string
  name: string
  path: string
  html_url: string
}
