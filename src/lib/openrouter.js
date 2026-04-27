const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = 'anthropic/claude-3.5-sonnet'

export const NEXORA_SYSTEM_PROMPT = `You are Nexora, the AI assistant for InfraNaut AI — a smart city platform focused on Bhopal, India. You are helpful, concise, civic-minded, and warm. You help citizens with city-related queries, infrastructure issues, eco-friendly routes, and urban analytics. Always frame answers to benefit the community. Keep responses focused and actionable. Use Markdown formatting where helpful.`

/**
 * Stream a chat completion from OpenRouter (Claude model).
 * @param {Array} messages - [{role, content}]
 * @param {function} onToken - called with each text chunk
 * @param {function} onDone - called when stream ends
 * @param {AbortSignal} signal
 */
export async function streamNexoraResponse(messages, onToken, onDone, signal) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://infranaut.ai',
      'X-Title': 'InfraNaut AI - Nexora Assistant',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: NEXORA_SYSTEM_PROMPT },
        ...messages,
      ],
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    }),
    signal,
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error: ${response.status} - ${err}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

    for (const line of lines) {
      const data = line.slice(6).trim()
      if (data === '[DONE]') { onDone(); return }
      try {
        const parsed = JSON.parse(data)
        const token = parsed.choices?.[0]?.delta?.content
        if (token) onToken(token)
      } catch (_) { /* skip malformed */ }
    }
  }
  onDone()
}

/**
 * Single (non-streaming) completion — used for analytics, eco-route, @Nexora chat
 */
export async function nexoraCompletion(messages, maxTokens = 512) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://infranaut.ai',
      'X-Title': 'InfraNaut AI - Nexora Assistant',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: NEXORA_SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    console.warn(`OpenRouter error: ${response.status}. Using fallback response.`)
    return "This is a simulated Nexora AI response because the OpenRouter API key failed or the service is down. Please check your .env configuration."
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content || "No response generated."
}
