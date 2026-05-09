// ============================================================
// InfraNaut AI — AnythingLLM RAG Gateway (Refactored)
// Improved: 8s timeout, scoped fallback context, query cache
// ============================================================

import { streamNexoraResponse } from './openrouter'
import { detectAgentIntent } from './agents/agentConfig'
import { buildScopedContext } from './agents/contextBuilder'

const BASE      = import.meta.env.VITE_ANYLLM_URL || 'http://localhost:3001'
const API_KEY   = import.meta.env.VITE_ANYLLM_KEY
const WORKSPACE = 'hackathon'

// ── Query cache (60s TTL) — avoid duplicate AI calls ─────
const queryCache = new Map()
const CACHE_TTL = 60_000

function getCached(key) {
  const entry = queryCache.get(key)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.value
  return null
}
function setCache(key, value) {
  queryCache.set(key, { value, ts: Date.now() })
  // Limit cache size
  if (queryCache.size > 20) {
    const firstKey = queryCache.keys().next().value
    queryCache.delete(firstKey)
  }
}

// ── Fallback: OpenRouter with scoped context ──────────────
async function streamFromOpenRouter(message, onChunk, cityState = {}, events = []) {
  return new Promise((resolve, reject) => {
    streamNexoraResponse(
      [{ role: 'user', content: message }],
      (token) => onChunk(token),
      () => resolve(),
      null,
      cityState,   // Pass cityState object (new agent routing)
      events
    ).catch(reject)
  })
}

/**
 * Primary RAG gateway: AnythingLLM → OpenRouter fallback.
 * Enhanced with scoped context and query caching.
 *
 * @param {string} message - User query
 * @param {function} onChunk - Streaming token callback
 * @param {object} cityState - Optional cityStore state slice
 * @param {Array}  events    - Optional Bhopal events array
 */
export async function chatWithRAG(message, onChunk, cityState = {}, events = []) {
  // ── Check cache for identical recent query ────────────
  const cacheKey = message.trim().toLowerCase().slice(0, 100)
  const cached = getCached(cacheKey)
  if (cached) {
    // Replay cached response in chunks (feels natural)
    const words = cached.split(' ')
    for (const word of words) {
      onChunk(word + ' ')
      await new Promise(r => setTimeout(r, 8)) // Simulate stream
    }
    return
  }

  // ── Try AnythingLLM (8s timeout) ─────────────────────
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)  // Was 3s — too aggressive

    const res = await fetch(`${BASE}/api/v1/workspace/${WORKSPACE}/stream-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ message, mode: 'chat' }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      console.info(`[InfraNaut] AnythingLLM ${res.status} → OpenRouter`)
      return streamFromOpenRouter(message, onChunk, cityState, events)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let hasContent = false
    let fullResponse = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const rawChunk = decoder.decode(value, { stream: true })
      for (const line of rawChunk.split('\n')) {
        if (!line.trim()) continue
        const jsonStr = line.startsWith('data: ') ? line.slice(6) : line
        if (jsonStr === '[DONE]') {
          if (fullResponse) setCache(cacheKey, fullResponse)
          return
        }
        try {
          const data = JSON.parse(jsonStr)
          if (data.textResponse) {
            hasContent = true
            fullResponse += data.textResponse
            onChunk(data.textResponse)
          }
        } catch { /* skip malformed */ }
      }
    }

    // AnythingLLM returned nothing → fallback
    if (!hasContent) {
      console.info('[InfraNaut] AnythingLLM empty → OpenRouter')
      return streamFromOpenRouter(message, onChunk, cityState, events)
    }

    if (fullResponse) setCache(cacheKey, fullResponse)

  } catch (err) {
    console.info('[InfraNaut] AnythingLLM unreachable →', err.message, '→ OpenRouter')
    return streamFromOpenRouter(message, onChunk, cityState, events)
  }
}