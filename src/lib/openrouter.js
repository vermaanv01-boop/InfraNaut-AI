const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = 'google/gemini-2.0-flash-exp:free'

export const NEXORA_SYSTEM_PROMPT = `You are Nexora, the AI assistant for InfraNaut AI — a smart city platform focused on Bhopal, India.

CAPABILITIES:
- You have REAL-TIME access to city data (traffic, parking, weather, AQI, waste, energy) that is appended to each conversation.
- When asked about parking, traffic, weather, or city status, use the LIVE DATA provided — do NOT make up numbers.
- Provide specific, actionable answers based on the data.

PERSONALITY:
- Helpful, concise, civic-minded, and warm
- Always frame answers to benefit the community
- Use Markdown formatting where helpful
- Keep responses focused and under 300 words unless detail is needed

EXAMPLES OF GOOD ANSWERS:
- "Based on current data, DB Mall Parking has 120/450 spots available (73% full). I'd recommend going now as it typically fills up by 6 PM."
- "Traffic congestion is at 35% right now. The Hoshangabad Road corridor is showing green, so it's a good time to commute."
- "Current AQI is 42 (Good). Safe for outdoor activities today."`

/**
 * Stream a chat completion from OpenRouter.
 * @param {Array} messages - [{role, content}]
 * @param {function} onToken - called with each text chunk
 * @param {function} onDone - called when stream ends
 * @param {AbortSignal} signal
 * @param {string} cityContext - live city data string
 */
export async function streamNexoraResponse(messages, onToken, onDone, signal, cityContext = '') {
  const systemContent = NEXORA_SYSTEM_PROMPT + (cityContext ? `\n\n${cityContext}` : '')

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
        { role: 'system', content: systemContent },
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
 * @param {string} cityContext - live city data string
 */
export async function nexoraCompletion(messages, maxTokens = 512, cityContext = '') {
  const systemContent = NEXORA_SYSTEM_PROMPT + (cityContext ? `\n\n${cityContext}` : '')

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
        { role: 'system', content: systemContent },
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    console.warn(`OpenRouter error: ${response.status}. Using fallback response.`)
    return "I'm having trouble connecting to the AI service right now. Please check your OpenRouter API key in the .env file or try again in a moment."
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content || "No response generated."
}
