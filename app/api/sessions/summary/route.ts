import { NextRequest, NextResponse } from "next/server"

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 })
    }

    // Build a condensed transcript (last 10 exchanges, first 200 chars each)
    const transcript = messages
      .slice(-20)
      .map((m: { role: string; content: string }) => {
        const snippet = (m.content || "").slice(0, 200).replace(/\n/g, " ")
        return `${m.role === "user" ? "User" : "AI"}: ${snippet}`
      })
      .join("\n")

    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 80,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "Summarise this conversation in 1-2 sentences. Focus on the topic and outcome. Be specific and concise. Return only the summary, no preamble.",
          },
          { role: "user", content: transcript },
        ],
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Groq error ${res.status}` }, { status: 500 })
    }

    const data = await res.json()
    const summary = data.choices?.[0]?.message?.content?.trim() ?? ""
    return NextResponse.json({ summary })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
