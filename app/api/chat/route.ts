import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { messages, model = "llama3.1:8b" } = await req.json()

    const apiUrl = process.env.OLLAMA_API_URL
    if (!apiUrl) {
      return NextResponse.json(
        { error: "OLLAMA_API_URL not configured" },
        { status: 500 }
      )
    }

    const response = await fetch(`${apiUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.OLLAMA_API_KEY && {
          Authorization: `Basic ${Buffer.from(`admin:${process.env.OLLAMA_API_KEY}`).toString("base64")}`,
        }),
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `LLM error: ${errorText}` },
        { status: response.status }
      )
    }

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
