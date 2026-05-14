import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { task, response } = await req.json()
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ suggestions: [] })

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        stream: false,
        max_tokens: 150,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: `Generate exactly 3 short follow-up questions (max 8 words each) a user might ask next. Return ONLY a valid JSON array of 3 strings, nothing else.\n\nUser asked: ${String(task).slice(0, 250)}\nAI replied: ${String(response).slice(0, 450)}\n\nJSON array:`,
          },
        ],
      }),
    })

    if (!res.ok) return NextResponse.json({ suggestions: [] })

    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ""
    const match = text.match(/\[[\s\S]*?\]/)
    if (!match) return NextResponse.json({ suggestions: [] })

    const arr = JSON.parse(match[0])
    return NextResponse.json({
      suggestions: Array.isArray(arr) ? arr.slice(0, 3).map(String) : [],
    })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
