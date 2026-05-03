// ============================================================
// Tourist AI Service — Full RAG Pipeline
// Retrieval-Augmented Generation for Bhopal Tourism
// ============================================================
// Architecture:
//  Query → Intent Detection → Keyword Retrieval → BM25 Ranking
//       → Context Builder → OpenRouter LLM → Streaming Response
// ============================================================

import { TOURIST_PLACES } from '../data/touristPlaces'

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = 'openai/gpt-oss-20b:free'

// ─────────────────────────────────────────────────────────────
// 1. UTILITY — Haversine distance (km)
// ─────────────────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ─────────────────────────────────────────────────────────────
// 2. ROUTE — OSRM live road routing
// ─────────────────────────────────────────────────────────────
export async function fetchRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&steps=true`
    const res = await fetch(url)
    if (!res.ok) throw new Error('OSRM failed')
    const data = await res.json()
    if (!data.routes?.[0]) return null
    const route = data.routes[0]
    const coords = route.geometry.coordinates.map(c => [c[1], c[0]])
    const distKm = (route.distance / 1000).toFixed(1)
    const durMin = Math.round(route.duration / 60)
    const ecoScore = Math.max(20, 100 - Math.round((route.distance / 1000) * 5))
    return { coords, distKm, durMin, ecoScore }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// 3. INTENT DETECTION — classify user query
// ─────────────────────────────────────────────────────────────
export function detectIntent(query) {
  const q = query.toLowerCase()
  if (/route|how to reach|navigate|direction|get to|path|road/.test(q)) return 'route'
  if (/weather|rain|temperature|hot|cold|humid|wind/.test(q)) return 'weather'
  if (/traffic|congestion|jam|busy|crowd/.test(q)) return 'traffic'
  if (/heritage|history|historical|ancient|temple|mosque|palace|fort/.test(q)) return 'heritage'
  if (/nature|lake|park|garden|outdoor|wildlife|forest/.test(q)) return 'nature'
  if (/museum|art|culture|exhibit/.test(q)) return 'museum'
  if (/shop|mall|market|buy|food|eat/.test(q)) return 'shopping'
  if (/best|visit|nearby|recommend|suggest|explore|what to see|where to go/.test(q)) return 'recommend'
  if (/time|when|hour|open|close|timing/.test(q)) return 'timing'
  if (/fee|price|cost|entry|ticket|free/.test(q)) return 'pricing'
  if (/eco|green|sustainable|environment/.test(q)) return 'eco'
  return 'general'
}

// ─────────────────────────────────────────────────────────────
// 4. BM25-INSPIRED RETRIEVAL — keyword scoring over documents
// ─────────────────────────────────────────────────────────────
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2)
}

function buildTermFrequency(tokens) {
  const tf = {}
  tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1 })
  return tf
}

// Compute a relevance score for a place given a query
function scorePlace(place, queryTokens, userLat, userLng) {
  const docText = [
    place.name,
    place.description,
    place.category,
    ...(place.tags || []),
    ...(place.nearby || []),
    place.best_time,
  ].join(' ')

  const docTokens = tokenize(docText)
  const tf = buildTermFrequency(docTokens)
  const docLen = docTokens.length

  // BM25 parameters
  const k1 = 1.5, b = 0.75, avgDocLen = 40
  let score = 0

  for (const qToken of queryTokens) {
    const termFreq = tf[qToken] || 0
    if (termFreq === 0) continue
    const idf = Math.log(1 + (TOURIST_PLACES.length - 1) / (1 + 1))
    const bm25 = idf * ((termFreq * (k1 + 1)) / (termFreq + k1 * (1 - b + b * (docLen / avgDocLen))))
    score += bm25
  }

  // Boost by popularity
  score += place.popularity_score * 0.02

  // Boost by proximity (closer = higher score)
  if (userLat && userLng) {
    const dist = haversine(userLat, userLng, place.lat, place.lng)
    score += Math.max(0, 10 - dist) * 0.3 // up to 3 points for very close places
  }

  return score
}

// ─────────────────────────────────────────────────────────────
// 5. RETRIEVE — fetch top-K relevant places for query
// ─────────────────────────────────────────────────────────────
export function retrieveRelevantPlaces(query, userLat, userLng, intent, topK = 4) {
  const queryTokens = tokenize(query)

  // Category filter boost based on intent
  const intentCategoryMap = {
    heritage: ['Heritage', 'Religious'],
    nature: ['Nature', 'Recreation'],
    museum: ['Museum', 'Education'],
    shopping: ['Shopping', 'Recreation'],
    eco: ['Nature'],
  }

  const preferredCategories = intentCategoryMap[intent] || []

  const scored = TOURIST_PLACES.map(place => {
    let score = scorePlace(place, queryTokens, userLat, userLng)

    // Boost if category matches intent
    if (preferredCategories.includes(place.category)) score += 2.5

    // For 'recommend' / 'general', weight nearby places more
    if (intent === 'recommend' || intent === 'general') {
      if (userLat && userLng) {
        const dist = haversine(userLat, userLng, place.lat, place.lng)
        score += Math.max(0, 5 - dist) * 0.5
      }
    }

    return { place, score }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.place)
}

// ─────────────────────────────────────────────────────────────
// 6. CONTEXT BUILDER — structured RAG context string
// ─────────────────────────────────────────────────────────────
function buildRAGContext({ query, intent, retrievedPlaces, userLat, userLng, weather, trafficLevel, targetPlace, routeInfo }) {
  let ctx = ''

  // ── Live City Telemetry ──
  ctx += '=== LIVE BHOPAL CITY DATA ===\n'
  if (userLat && userLng) {
    ctx += `User GPS: ${userLat.toFixed(4)}°N, ${userLng.toFixed(4)}°E\n`
  }
  if (weather?.current) {
    const w = weather.current
    ctx += `Weather: ${w.temperature_2m}°C | Humidity: ${w.relative_humidity_2m}% | Wind: ${w.wind_speed_10m}km/h`
    if (w.precipitation > 0) ctx += ` | Rain: ${w.precipitation}mm`
    ctx += '\n'
  }
  ctx += `City Traffic Load: ${trafficLevel ?? 0}% (${(trafficLevel ?? 0) > 70 ? 'HIGH' : (trafficLevel ?? 0) > 40 ? 'MODERATE' : 'LOW'})\n`

  // ── Selected Place (if user clicked "Ask AI" on a card) ──
  if (targetPlace) {
    ctx += `\n=== FOCUSED PLACE ===\n`
    ctx += `Name: ${targetPlace.name}\n`
    ctx += `Category: ${targetPlace.category}\n`
    ctx += `Description: ${targetPlace.description}\n`
    ctx += `Timings: ${targetPlace.timings}\n`
    ctx += `Entry Fee: ${targetPlace.entry_fee}\n`
    ctx += `Best Time: ${targetPlace.best_time}\n`
    ctx += `Tags: ${targetPlace.tags?.join(', ')}\n`
    if (targetPlace.nearby?.length) ctx += `Nearby Places: ${targetPlace.nearby.join(', ')}\n`
    if (userLat && userLng) {
      const dist = haversine(userLat, userLng, targetPlace.lat, targetPlace.lng).toFixed(1)
      ctx += `Distance from you: ${dist} km\n`
    }
  }

  // ── Route (if computed) ──
  if (routeInfo) {
    ctx += `\n=== LIVE ROUTE DATA (OSRM) ===\n`
    ctx += `Distance: ${routeInfo.distKm} km | Travel Time: ${routeInfo.durMin} min | Eco Score: ${routeInfo.ecoScore}/100\n`
  }

  // ── RAG Retrieved Documents ──
  if (retrievedPlaces?.length) {
    ctx += `\n=== RETRIEVED TOURIST PLACES (ranked by relevance to query) ===\n`
    retrievedPlaces.forEach((p, i) => {
      const dist = userLat ? haversine(userLat, userLng, p.lat, p.lng).toFixed(1) : null
      ctx += `\n[${i + 1}] ${p.name} (${p.category})\n`
      ctx += `  Description: ${p.description}\n`
      ctx += `  Timings: ${p.timings} | Entry: ${p.entry_fee}\n`
      ctx += `  Best Season: ${p.best_time}\n`
      if (dist) ctx += `  Distance from you: ${dist} km\n`
      ctx += `  Popularity: ${p.popularity_score}/100\n`
      if (p.tags?.length) ctx += `  Tags: ${p.tags.join(', ')}\n`
    })
  }

  // ── Intent annotation ──
  ctx += `\n=== QUERY METADATA ===\n`
  ctx += `User Query: "${query}"\n`
  ctx += `Detected Intent: ${intent}\n`

  return ctx
}

// ─────────────────────────────────────────────────────────────
// 7. SYSTEM PROMPT — Nexora identity + RAG instructions
// ─────────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are Nexora — a custom-trained AI built exclusively for Bhopal's InfraNaut Smart City platform. You were trained on real city data, tourist databases, traffic sensors, and environmental readings.

CRITICAL RULES:
- You ONLY answer using the RETRIEVED DOCUMENTS and LIVE DATA provided above.
- NEVER hallucinate places, distances, fees, or timings not in the context.
- If a place is not in the retrieved documents, say "I don't have data on that location."
- Keep responses SHORT (under 200 words), practical, and actionable.
- Use Markdown: **bold** for place names, bullet points for lists.
- Always reference specific places by their exact names from the data.
- For route queries: include distance and travel time from context.
- For weather: reference current live readings.
- For "best time to visit": use the Best Season field.

PERSONA:
- You are knowledgeable, precise, and civic-minded.
- You love Bhopal's rich heritage and natural beauty.
- You actively promote eco-friendly travel choices.
- Never break character or say you are a generic AI model.`
}

// ─────────────────────────────────────────────────────────────
// 8. MAIN STREAMING CALL — RAG pipeline entry point
// ─────────────────────────────────────────────────────────────
export async function streamTouristAI({
  messages,
  userLat, userLng,
  weather, trafficLevel,
  targetPlace = null,
  routeInfo = null,
  onToken, onDone,
  signal,
}) {
  // Get current query from last user message
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
  const query = lastUserMsg?.content || ''

  // Step 1: Detect intent
  const intent = detectIntent(query)

  // Step 2: Retrieve top-K relevant places via BM25
  const retrievedPlaces = retrieveRelevantPlaces(query, userLat, userLng, intent, 4)

  // Step 3: Build structured RAG context
  const ragContext = buildRAGContext({
    query, intent, retrievedPlaces,
    userLat, userLng, weather, trafficLevel,
    targetPlace, routeInfo,
  })

  // Step 4: Compose prompt
  const systemContent = buildSystemPrompt() + '\n\n' + ragContext

  // Step 5: Filter UI-only greeting from history
  const apiMessages = messages.filter((m, i) => {
    if (m.role === 'assistant' && i === 0) return false
    return true
  })

  if (!apiMessages.length || apiMessages[apiMessages.length - 1].role !== 'user') {
    onDone()
    return
  }

  // Step 6: Call OpenRouter with streaming
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://infranaut.ai',
      'X-Title': 'InfraNaut AI — Nexora RAG Tourism',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: systemContent }, ...apiMessages],
      stream: true,
      max_tokens: 512,
      temperature: 0.55, // lower = more grounded, less hallucination
    }),
    signal,
  })

  if (!response.ok) {
    const err = await response.text()
    console.error('[OpenRouter RAG Error]', response.status, err)
    throw new Error(`OpenRouter: ${response.status} — ${err}`)
  }

  // Step 7: Stream token-by-token
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
      } catch { /* skip malformed chunks */ }
    }
  }
  onDone()
}

// ─────────────────────────────────────────────────────────────
// 9. QUICK (NON-STREAMING) — single RAG call for cards/widgets
// ─────────────────────────────────────────────────────────────
export async function quickTouristAI({ prompt, userLat, userLng, weather, trafficLevel, targetPlace }) {
  const intent = detectIntent(prompt)
  const retrievedPlaces = retrieveRelevantPlaces(prompt, userLat, userLng, intent, 3)
  const ragContext = buildRAGContext({
    query: prompt, intent, retrievedPlaces,
    userLat, userLng, weather, trafficLevel, targetPlace,
  })
  const systemContent = buildSystemPrompt() + '\n\n' + ragContext

  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://infranaut.ai',
        'X-Title': 'InfraNaut AI — Nexora RAG Quick',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemContent },
          { role: 'user', content: prompt },
        ],
        max_tokens: 256,
        temperature: 0.55,
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'I need more city data to answer that.'
  } catch {
    return 'Unable to reach Nexora right now. Please try again.'
  }
}

// ─────────────────────────────────────────────────────────────
// 10. EXPORT HELPERS
// ─────────────────────────────────────────────────────────────
export function getNearbyPlaces(userLat, userLng, limit = 5) {
  if (!userLat || !userLng) return TOURIST_PLACES.slice(0, limit)
  return [...TOURIST_PLACES]
    .map(p => ({ ...p, _dist: haversine(userLat, userLng, p.lat, p.lng) }))
    .sort((a, b) => a._dist - b._dist)
    .slice(0, limit)
}
