// ============================================================
// InfraNaut AI — OpenRouter LLM Service (Refactored)
// Uses specialized agent system with scoped context injection
// instead of the previous monolithic full-dump approach.
// ============================================================

import { detectAgentIntent, AGENT_PROMPTS, AGENT_TYPES } from './agents/agentConfig'
import { buildScopedContext } from './agents/contextBuilder'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = 'openai/gpt-oss-20b:free'

// ── Exported for backward compatibility (used in analytics, eco-route) ──
export const NEXORA_SYSTEM_PROMPT = AGENT_PROMPTS[AGENT_TYPES.GENERAL]

// ── Internal: build per-query prompt with agent routing ──
function buildAgentPrompt(messages, cityState = {}, events = []) {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  const query = lastUserMsg?.content || ''

  const intent = detectAgentIntent(query)
  const systemPrompt = AGENT_PROMPTS[intent] || AGENT_PROMPTS[AGENT_TYPES.GENERAL]
  const context = buildScopedContext(intent, cityState, { events, query })

  return `${systemPrompt}\n\n${context}`
}

/**
 * Stream a chat completion from OpenRouter with agent routing.
 * @param {Array} messages - [{role, content}]
 * @param {function} onToken - called with each text chunk
 * @param {function} onDone - called when stream ends
 * @param {AbortSignal} signal
 * @param {string|object} cityContextOrState - legacy string OR cityStore state object
 * @param {Array} events - Bhopal events array (optional)
 */
export async function streamNexoraResponse(messages, onToken, onDone, signal, cityContextOrState = '', events = []) {
  // Support both legacy string context and new state object
  let systemContent
  if (typeof cityContextOrState === 'string') {
    // Legacy path: called from NexoraPage with string context
    systemContent = NEXORA_SYSTEM_PROMPT + (cityContextOrState ? `\n\n${cityContextOrState}` : '')
  } else {
    // New path: full agent routing with scoped context
    systemContent = buildAgentPrompt(messages, cityContextOrState, events)
  }

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
      max_tokens: 512,          // reduced from 1024
      temperature: 0.4,          // reduced from 0.7 for more factual responses
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
 * Single (non-streaming) completion with agent routing.
 * Used for analytics, eco-route, predictive insights.
 * @param {Array} messages
 * @param {number} maxTokens
 * @param {string|object} cityContextOrState - legacy string OR cityStore state
 * @param {Array} events - optional events array
 */
export async function nexoraCompletion(messages, maxTokens = 400, cityContextOrState = '', events = []) {
  let systemContent
  if (typeof cityContextOrState === 'string') {
    systemContent = NEXORA_SYSTEM_PROMPT + (cityContextOrState ? `\n\n${cityContextOrState}` : '')
  } else {
    systemContent = buildAgentPrompt(messages, cityContextOrState, events)
  }

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
      temperature: 0.4,
    }),
  })

  if (!response.ok) {
    console.warn(`OpenRouter error: ${response.status}. Using fallback response.`)
    return "I'm having trouble connecting to the AI service right now. Please check your OpenRouter API key in the .env file or try again in a moment."
  }
  const data = await response.json()
  return data.choices?.[0]?.message?.content || "No response generated."
}

/**
 * Quick agent-routed completion (exported for convenience).
 * Automatically detects intent from the query and routes to the right agent.
 * @param {string} query - User query
 * @param {object} cityState - cityStore state
 * @param {object} opts - { maxTokens, events }
 */
export async function agentCompletion(query, cityState = {}, opts = {}) {
  const { maxTokens = 300, events = [] } = opts
  const intent = detectAgentIntent(query)
  const systemPrompt = AGENT_PROMPTS[intent]
  const context = buildScopedContext(intent, cityState, { events, query })

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://infranaut.ai',
      'X-Title': `InfraNaut AI - ${intent} Agent`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: `${systemPrompt}\n\n${context}` },
        { role: 'user', content: query },
      ],
      max_tokens: maxTokens,
      temperature: 0.35,
    }),
  })

  if (!response.ok) return "AI service unavailable. Please try again."
  const data = await response.json()
  return data.choices?.[0]?.message?.content || "No response generated."
}

/**
 * Export detect intent helper for use in UI components
 */
export { detectAgentIntent }
