import { NextRequest, NextResponse } from "next/server"

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false
    }
    // Block internal IPs
    const hostname = parsed.hostname
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.17.") ||
      hostname.startsWith("172.18.") ||
      hostname.startsWith("172.19.") ||
      hostname.startsWith("172.2") ||
      hostname.startsWith("172.30.") ||
      hostname.startsWith("172.31.") ||
      hostname.startsWith("169.254.") ||
      hostname.startsWith("[::1]") ||
      hostname.startsWith("[fc00:") ||
      hostname.startsWith("[fe80:")
    ) {
      return false
    }
    return true
  } catch {
    return false
  }
}

function htmlToText(html: string): { title: string; text: string } {
  let title = ""
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]+>/g, "").trim()
  }

  // Remove script and style tags + contents
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")

  // Extract main or article content if present
  const mainMatch = cleaned.match(/<main[\s\S]*?<\/main>/i)
  const articleMatch = cleaned.match(/<article[\s\S]*?<\/article>/i)
  const bodyMatch = cleaned.match(/<body[\s\S]*?<\/body>/i)

  if (mainMatch) {
    cleaned = mainMatch[0]
  } else if (articleMatch) {
    cleaned = articleMatch[0]
  } else if (bodyMatch) {
    cleaned = bodyMatch[0]
  }

  // Convert remaining HTML tags to whitespace
  let text = cleaned
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&#\d+;/g, (match) => {
      try {
        return String.fromCharCode(parseInt(match.slice(2, -1), 10))
      } catch {
        return match
      }
    })
    .replace(/&#x[0-9a-f]+;/gi, (match) => {
      try {
        return String.fromCharCode(parseInt(match.slice(3, -1), 16))
      } catch {
        return match
      }
    })

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim()

  return { title, text }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!isValidUrl(url)) {
      return NextResponse.json({ error: "Invalid or blocked URL" }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Comfy-AI/0.7.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      // Cap response body at ~1 MB
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: HTTP ${res.status}` },
        { status: 502 }
      )
    }

    const contentType = res.headers.get("content-type") || ""
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      // Try to read anyway if it's text-like
      if (!contentType.includes("text/") && !contentType.includes("application/json")) {
        return NextResponse.json(
          { error: "URL returned non-text content" },
          { status: 400 }
        )
      }
    }

    // Read up to 1 MB
    const MAX_HTML_BYTES = 1 * 1024 * 1024
    const buffer = await res.arrayBuffer()
    const truncated = buffer.slice(0, MAX_HTML_BYTES)
    const html = new TextDecoder("utf-8", { fatal: false }).decode(truncated)

    const { title, text } = htmlToText(html)

    // Cap extracted text to ~4000 chars
    const MAX_EXTRACT_LENGTH = 4000
    const excerpt = text.length > MAX_EXTRACT_LENGTH ? text.slice(0, MAX_EXTRACT_LENGTH) + "\n..." : text

    return NextResponse.json({ title, content: excerpt, url })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch URL" },
      { status: 500 }
    )
  }
}
