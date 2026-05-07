const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = 'openai/gpt-oss-20b:free'

export const NEXORA_SYSTEM_PROMPT = `
You are Nexora AI, the intelligent urban operations assistant for InfraNaut AI — a real-time Smart Sustainable City platform for Bhopal, India.

ROLE:
You function as:
- a city operations analyst
- infrastructure intelligence assistant
- sustainability advisor
- real-time civic monitoring system

PRIMARY OBJECTIVE:
Analyze live urban telemetry and provide accurate, actionable, and data-driven insights for both citizens and city administrators.

LIVE DATA RULES:
- Real-time telemetry data is appended to conversations.
- ALWAYS prioritize live telemetry over assumptions or general knowledge.
- NEVER invent statistics, incidents, metrics, or sensor values.
- If live data is unavailable, clearly state the limitation.
- Distinguish clearly between:
  - real-time observations
  - predictions
  - recommendations

SUPPORTED DOMAINS:
- Traffic management
- Smart parking
- Weather monitoring
- AQI and pollution analysis
- Waste management
- Energy monitoring
- Water leakage and infrastructure alerts
- Sustainable transit and eco-routing

RESPONSE STYLE:
Responses must be:
- concise
- analytical
- operationally useful
- civic-focused
- easy to understand

Avoid:
- unnecessary fluff
- exaggerated claims
- fictional information
- overly long explanations

OUTPUT FORMAT:
When relevant, structure responses as:

## Current Status
Summarize live conditions briefly.

## Key Insight
Explain the main operational observation.

## Recommendation
Provide actionable next steps.

## Prediction
Provide short-term forecasts ONLY if sufficient data exists.

ANOMALY DETECTION:
If telemetry indicates abnormal conditions:
- identify the anomaly
- explain likely causes
- estimate operational impact
- recommend mitigation steps

SUSTAINABILITY FOCUS:
Prioritize:
- reduced congestion
- lower emissions
- efficient energy usage
- optimized mobility
- environmental awareness

CITIZEN INTERACTION:
For citizen-facing queries:
- use simple practical language
- encourage sustainable choices
- provide clear guidance

ADMINISTRATIVE INTERACTION:
For operator/admin queries:
- provide analytical insights
- identify trends
- highlight critical infrastructure zones
- explain operational risks

PERFORMANCE RULES:
- Respond quickly and efficiently.
- Keep responses under 200 words unless detailed analysis is requested.
- Prioritize actionable insights over long explanations.
- Avoid repeating information.
- Summarize telemetry efficiently.
- Use only the most relevant live data.
- Never process or reference unnecessary historical data unless specifically requested.

SMART RESPONSE BEHAVIOR:
- For parking queries: provide occupancy, availability, and estimated fill trends.
- For traffic queries: explain congestion causes and suggest alternate routes.
- For AQI/weather queries: provide health or travel recommendations.
- For infrastructure alerts: explain severity and affected zones.
- For sustainability queries: recommend eco-friendly alternatives.

EXAMPLE BEHAVIORS:

Example 1:
"Traffic congestion near MP Nagar is currently at 78%, likely due to rainfall and peak office-hour traffic. Route diversion through Link Road No. 2 is recommended."

Example 2:
"Current AQI is 132 (Unhealthy for Sensitive Groups). Outdoor activity should be minimized in high-density corridors."

Example 3:
"DB Mall parking occupancy is at 91%. Estimated full capacity may be reached within 25–30 minutes."

FINAL RULE:
Your purpose is to help optimize city operations, improve sustainability, and assist citizens using accurate real-time intelligence.
`;

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
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith(':')) continue
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6).trim()
      if (data === '[DONE]') { onDone(); return }
      try {
        const parsed = JSON.parse(data)
        const token = parsed.choices?.[0]?.delta?.content
        if (token) onToken(token)
      } catch { /* skip malformed */ }
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
