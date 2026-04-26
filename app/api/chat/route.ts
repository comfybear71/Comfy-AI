import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { messages, model = "llama3.1:8b", stream = true } = await req.json()

    const apiUrl = process.env.OLLAMA_API_URL
    if (!apiUrl) {
      return NextResponse.json(
        { error: "OLLAMA_API_URL not configured" },
        { status: 500 }
      )
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (process.env.OLLAMA_API_KEY) {
      headers.Authorization = `Basic ${Buffer.from(`admin:${process.env.OLLAMA_API_KEY}`).toString("base64")}`
    }

    const response = await fetch(`${apiUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        stream,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `LLM error: ${errorText}` },
        { status: response.status }
      )
    }

    // If streaming, pipe the response through
    if (stream) {
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()

      const readableStream = new ReadableStream({
        async start(controller) {
          if (!response.body) {
            controller.close()
            return
          }

          const reader = response.body.getReader()
          let buffer = ""

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split("\n")
              buffer = lines.pop() || ""

              for (const line of lines) {
                if (!line.trim()) continue
                try {
                  const data = JSON.parse(line)
                  const content = data.message?.content || ""
                  if (content) {
                    controller.enqueue(encoder.encode(content))
                  }
                  if (data.done) {
                    controller.close()
                    return
                  }
                } catch {
                  // Skip malformed lines
                }
              }
            }
          } catch (err) {
            controller.error(err)
          } finally {
            controller.close()
          }
        },
      })

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      })
    }

    // Non-streaming fallback
    const data = await response.json()
    return NextResponse.json({
      content: data.message?.content || "No response",
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    )
  }
}
