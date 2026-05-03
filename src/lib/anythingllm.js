import { streamNexoraResponse, nexoraCompletion } from './openrouter'

const BASE = import.meta.env.VITE_ANYLLM_URL || "http://localhost:3001";
const API_KEY = import.meta.env.VITE_ANYLLM_KEY;
const WORKSPACE = "hackathon";

// ── Fallback: use the proven streamNexoraResponse from openrouter.js ────────
async function streamFromOpenRouter(message, onChunk) {
  return new Promise((resolve, reject) => {
    streamNexoraResponse(
      [{ role: 'user', content: message }],
      (token) => onChunk(token),   // onToken
      () => resolve(),              // onDone
      null,                         // no abort signal
      ''                            // no city context (already embedded in message)
    ).catch(reject)
  })
}

// ── Primary: AnythingLLM RAG, fallback: OpenRouter ─────────────────────────
export async function chatWithRAG(message, onChunk) {
  // Try AnythingLLM (local RAG) first with 3s timeout
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(`${BASE}/api/v1/workspace/${WORKSPACE}/stream-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ message, mode: "chat" }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[InfraNaut] AnythingLLM returned ${res.status} → OpenRouter`)
      return streamFromOpenRouter(message, onChunk)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let hasContent = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const rawChunk = decoder.decode(value, { stream: true })
      for (const line of rawChunk.split("\n")) {
        if (!line.trim()) continue
        let jsonStr = line.startsWith("data: ") ? line.slice(6) : line
        if (jsonStr === "[DONE]") return
        try {
          const data = JSON.parse(jsonStr)
          if (data.textResponse) {
            hasContent = true
            onChunk(data.textResponse)
          }
        } catch { /* skip malformed lines */ }
      }
    }

    // If AnythingLLM returned nothing, fallback
    if (!hasContent) {
      console.warn("[InfraNaut] AnythingLLM empty response → OpenRouter")
      return streamFromOpenRouter(message, onChunk)
    }

  } catch (err) {
    console.warn("[InfraNaut] AnythingLLM unreachable →", err.message, "→ OpenRouter")
    return streamFromOpenRouter(message, onChunk)
  }
}