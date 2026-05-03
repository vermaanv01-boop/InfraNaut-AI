import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import ReactMarkdown from 'react-markdown'
import { useCityStore } from '../stores/cityStore'
import { TOURIST_PLACES, PLACE_CATEGORIES } from '../data/touristPlaces'
import { fetchRoute, getNearbyPlaces, detectIntent } from '../lib/touristAI'
import { chatWithRAG } from '../lib/anythingllm'
import { supabase } from '../lib/supabase'
import {
  MapPin, Navigation, Bot, Send, Loader2, Star, Clock,
  Ticket, Route, X, ChevronRight, Locate, Zap, Leaf,
  Map as MapIcon, Info, MessageCircle
} from 'lucide-react'

// ── Leaflet icon fix ────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function makeIcon(emoji, color = '#06b6d4') {
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;border:2px solid white;box-shadow:0 0 10px ${color}88">${emoji}</div>`,
    iconSize: [34, 34], iconAnchor: [17, 17],
  })
}

function MapFly({ lat, lng }) {
  const map = useMap()
  useEffect(() => { map.flyTo([lat, lng], 14, { duration: 1.2 }) }, [lat, lng, map])
  return null
}

// ── Place Card ──────────────────────────────────────────────
function PlaceCard({ place, selected, onSelect, onRoute, onAsk, userLat, userLng }) {
  const dist = userLat
    ? (() => {
        const R = 6371, dLat = ((place.lat - userLat) * Math.PI) / 180, dLng = ((place.lng - userLng) * Math.PI) / 180
        const a = Math.sin(dLat/2)**2 + Math.cos(userLat*Math.PI/180)*Math.cos(place.lat*Math.PI/180)*Math.sin(dLng/2)**2
        return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1)
      })()
    : null

  const catColor = { Nature:'text-green-400', Heritage:'text-amber-400', Religious:'text-purple-400', Museum:'text-blue-400', Recreation:'text-pink-400', Shopping:'text-rose-400', Education:'text-indigo-400' }

  return (
    <div className={`rounded-xl border overflow-hidden transition-all cursor-pointer hover:scale-[1.01] ${selected ? 'border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.4)]' : 'border-slate-700/60 hover:border-cyan-700/60'} bg-[#0d1b2a]`}
      onClick={() => onSelect(place)}>
      <div className="h-36 relative overflow-hidden bg-slate-800/60">
        <img src={place.image} alt={place.name} className="w-full h-full object-cover"
          onError={e => {
            e.target.style.display = 'none'
            e.target.parentNode.querySelector('.img-fallback').style.display = 'flex'
          }}
        />
        <div className="img-fallback absolute inset-0 items-center justify-center text-5xl hidden">{place.emoji}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2a] via-transparent to-transparent" />
        <div className="absolute top-2 left-2 text-2xl">{place.emoji}</div>
        <div className="absolute top-2 right-2 bg-black/60 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Star size={9} fill="currentColor" />{place.popularity_score}
        </div>
        {dist && <div className="absolute bottom-2 right-2 bg-black/70 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full">{dist} km</div>}
      </div>
      <div className="p-3">
        <div className={`text-[10px] font-bold mb-1 ${catColor[place.category] || 'text-cyan-400'}`}>{place.category.toUpperCase()}</div>
        <h3 className="text-sm font-bold text-white mb-1 leading-tight">{place.name}</h3>
        <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2 mb-3">{place.description}</p>
        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 mb-3">
          <span className="flex items-center gap-1"><Clock size={9}/>{place.timings.split('–')[0].trim()}</span>
          <span className="flex items-center gap-1"><Ticket size={9}/>{place.entry_fee}</span>
        </div>
        <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => onSelect(place)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors">
            <MapIcon size={11}/>View Map
          </button>
          <button onClick={() => onRoute(place)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30 transition-colors">
            <Route size={11}/>Route
          </button>
          <button onClick={() => onAsk(place)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 transition-colors">
            <Bot size={11}/>Ask AI
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Route Info Banner ───────────────────────────────────────
function RouteBanner({ routeInfo, place, onClear }) {
  if (!routeInfo) return null
  return (
    <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2.5 text-sm">
      <Route size={16} className="text-green-400 flex-shrink-0"/>
      <div className="flex-1 min-w-0">
        <span className="text-white font-semibold">{place?.name}</span>
        <span className="text-slate-400 mx-2">·</span>
        <span className="text-green-300">{routeInfo.distKm} km</span>
        <span className="text-slate-400 mx-2">·</span>
        <span className="text-cyan-300">{routeInfo.durMin} min</span>
        <span className="text-slate-400 mx-2">·</span>
        <span className="flex items-center gap-1 inline-flex text-amber-300"><Leaf size={11}/>Eco {routeInfo.ecoScore}/100</span>
      </div>
      <button onClick={onClear} className="text-slate-500 hover:text-red-400 transition-colors"><X size={14}/></button>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════
export default function TourismPage() {
  const weather = useCityStore(s => s.weather)
  const trafficLevel = useCityStore(s => s.trafficLevel)
  const initCity = useCityStore(s => s.initCity)

  // Location
  const [userLat, setUserLat] = useState(null)
  const [userLng, setUserLng] = useState(null)
  const [locError, setLocError] = useState(null)
  const [locLoading, setLocLoading] = useState(false)

  // Places
  const [category, setCategory] = useState('all')
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [mapFly, setMapFly] = useState(null)

  // Route
  const [routeInfo, setRouteInfo] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routePlace, setRoutePlace] = useState(null)

  // AI Chat
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [aiContext, setAiContext] = useState(null) // place context for chat
  const messagesEndRef = useRef(null)
  const abortRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { initCity() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamContent])

  // ── Get user location ─────────────────────────────────────
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported'); return }
    setLocLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocError(null); setLocLoading(false) },
      err => { setLocError('Location denied. Using Bhopal center.'); setUserLat(23.2599); setUserLng(77.4126); setLocLoading(false) },
      { timeout: 8000 }
    )
  }, [])

  useEffect(() => { getLocation() }, [])

  // ── Filter places ─────────────────────────────────────────
  const filtered = category === 'all' ? TOURIST_PLACES : TOURIST_PLACES.filter(p => p.category === category)

  // ── Select place ──────────────────────────────────────────
  const handleSelect = place => {
    setSelectedPlace(place)
    setMapFly({ lat: place.lat, lng: place.lng })
  }

  // ── Generate route ────────────────────────────────────────
  const handleRoute = async place => {
    if (!userLat) { getLocation(); return }
    setRouteLoading(true)
    setRoutePlace(place)
    setSelectedPlace(place)
    setMapFly({ lat: place.lat, lng: place.lng })
    const info = await fetchRoute(userLat, userLng, place.lat, place.lng)
    setRouteInfo(info)
    setRouteLoading(false)
  }

  // ── Ask AI about place ────────────────────────────────────
  const handleAsk = place => {
    setAiContext(place)
    setChatOpen(true)
    setMessages([{
      role: 'assistant',
      content: `Hi! I'm Nexora 🤖 — I have full data on **${place.name}**.\n\nAsk me anything: best time to visit, route tips, what to expect, or nearby places!`
    }])
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Send AI message ───────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return
    const userContent = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user', content: userContent }]
    setMessages(newMessages)
    setStreaming(true)
    setStreamContent('')

    // Always cancel any previous in-flight request
    if (abortRef.current) { try { abortRef.current.abort() } catch {} }
    abortRef.current = new AbortController()

    let fullContent = ''
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await supabase.from("chat_history").insert({
          role: "user",
          content: userContent,
          user_id: user.id
        })
      }

      await chatWithRAG(userContent, (chunk) => {
        fullContent += chunk;
        setStreamContent(fullContent);
      });

      if (user) {
        await supabase.from("chat_history").insert({
          role: "assistant",
          content: fullContent || 'I need more city data to answer that.',
          user_id: user.id
        })
      }

      setMessages(prev => [...prev, { role: 'assistant', content: fullContent || 'I need more city data to answer that.' }])
    } catch (err) {
      console.error('[Tourism AI Error]', err)
      const errMsg = 'Nexora encountered an issue connecting to AnythingLLM. Please try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }])
    } finally {
      setStreamContent('')
      setStreaming(false)
    }
  }, [input, streaming, messages, userLat, userLng, weather, trafficLevel, aiContext, routeInfo])

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  const quickActions = [
    { label: '📍 Nearby places', prompt: 'What are the best tourist places near my current location right now?' },
    { label: '🌿 Eco route', prompt: 'Which tourist place has the most eco-friendly and least congested route from my location?' },
    { label: '⏰ Best time', prompt: aiContext ? `What is the best time to visit ${aiContext.name}?` : 'What is the best time of day to explore tourist places in Bhopal?' },
    { label: '🌤️ Weather impact', prompt: 'How is current weather affecting outdoor tourist places today?' },
  ]

  const mapCenter = selectedPlace ? [selectedPlace.lat, selectedPlace.lng] : [23.2599, 77.4126]

  return (
    <div className="flex -m-4 md:-m-8" style={{ height: 'calc(100vh - 0px)', maxHeight: '100vh', overflow: 'hidden' }}>

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div className="w-80 flex flex-col border-r border-slate-800/60 bg-[#080f1c] flex-shrink-0">

        {/* Header */}
        <div className="p-4 border-b border-slate-800/60">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2"><MapPin size={15} className="text-cyan-400"/>Tourism AI</h1>
              <p className="text-[10px] text-slate-500 mt-0.5">Nexora-powered city explorer</p>
            </div>
            <button
              onClick={() => { setChatOpen(true); setAiContext(null); setMessages([{ role:'assistant', content:"Hi! I'm Nexora 🤖 Ask me anything about Bhopal tourism, routes, or weather!" }]) }}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30 transition-colors"
            ><Bot size={16}/></button>
          </div>

          {/* Location bar */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] ${userLat ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-slate-800/60 border border-slate-700/40 text-slate-400'}`}>
            {locLoading ? <Loader2 size={12} className="animate-spin text-cyan-400"/> : <Locate size={12}/>}
            <span className="flex-1 truncate">{locLoading ? 'Getting location...' : userLat ? `${userLat.toFixed(3)}, ${userLng.toFixed(3)}` : locError || 'Location not set'}</span>
            <button onClick={getLocation} className="text-cyan-400 hover:text-cyan-200 transition-colors font-semibold">Refresh</button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-3 py-2.5 border-b border-slate-800/40 flex gap-1.5 overflow-x-auto scrollbar-none">
          {PLACE_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${category === cat.id ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300' : 'border-slate-700/40 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Place cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          {filtered.map(place => (
            <PlaceCard
              key={place.id}
              place={place}
              selected={selectedPlace?.id === place.id}
              onSelect={handleSelect}
              onRoute={handleRoute}
              onAsk={handleAsk}
              userLat={userLat}
              userLng={userLng}
            />
          ))}
        </div>
      </div>

      {/* ── MAP AREA ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative">

        {/* Route banner */}
        <div className="absolute top-3 left-3 right-3 z-[500] space-y-2">
          {routeLoading && (
            <div className="flex items-center gap-2 bg-[#0b1426]/90 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-sm text-cyan-300">
              <Loader2 size={14} className="animate-spin"/>Calculating best route…
            </div>
          )}
          {routeInfo && !routeLoading && (
            <RouteBanner routeInfo={routeInfo} place={routePlace} onClear={() => { setRouteInfo(null); setRoutePlace(null) }} />
          )}
        </div>

        <MapContainer center={mapCenter} zoom={12} className="flex-1 w-full" zoomControl={false}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {/* Fly to selected */}
          {mapFly && <MapFly lat={mapFly.lat} lng={mapFly.lng} />}

          {/* User location */}
          {userLat && (
            <Marker position={[userLat, userLng]} icon={makeIcon('📍', '#22c55e')}>
              <Popup><strong>Your Location</strong></Popup>
            </Marker>
          )}

          {/* Place markers */}
          {filtered.map(place => (
            <Marker key={place.id} position={[place.lat, place.lng]} icon={makeIcon(place.emoji)}
              eventHandlers={{ click: () => handleSelect(place) }}>
              <Popup maxWidth={220}>
                <div className="p-1">
                  <div className="font-bold text-sm mb-1">{place.emoji} {place.name}</div>
                  <div className="text-xs text-slate-600 mb-2">{place.description.slice(0, 80)}…</div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleRoute(place)} className="flex-1 text-xs bg-green-100 text-green-700 rounded px-2 py-1 hover:bg-green-200 transition-colors">📍 Route</button>
                    <button onClick={() => handleAsk(place)} className="flex-1 text-xs bg-purple-100 text-purple-700 rounded px-2 py-1 hover:bg-purple-200 transition-colors">🤖 Ask AI</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Route polyline */}
          {routeInfo?.coords && (
            <Polyline positions={routeInfo.coords}
              pathOptions={{ color: '#22c55e', weight: 5, opacity: 0.85, dashArray: undefined }}
            />
          )}
        </MapContainer>

        {/* Selected place info bar */}
        {selectedPlace && (
          <div className="absolute bottom-4 left-4 right-4 z-[500] bg-[#0b1426]/95 backdrop-blur-md border border-cyan-500/30 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">{selectedPlace.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{selectedPlace.name}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1"><Clock size={9}/>{selectedPlace.timings}</span>
                <span className="flex items-center gap-1"><Ticket size={9}/>{selectedPlace.entry_fee}</span>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => handleRoute(selectedPlace)} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30 transition-colors">
                {routeLoading ? <Loader2 size={10} className="animate-spin"/> : <Route size={10}/>}Route
              </button>
              <button onClick={() => handleAsk(selectedPlace)} className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30 transition-colors">
                <Bot size={10}/>Ask AI
              </button>
              <button onClick={() => setSelectedPlace(null)} className="p-1.5 text-slate-500 hover:text-white transition-colors"><X size={13}/></button>
            </div>
          </div>
        )}
      </div>

      {/* ── AI CHAT PANEL ───────────────────────────────────── */}
      {chatOpen && (
        <div className="w-80 flex flex-col border-l border-slate-800/60 bg-[#080f1c] flex-shrink-0">
          {/* Chat header */}
          <div className="p-3 border-b border-slate-800/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">N</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">Nexora</div>
              <div className="text-[9px] text-purple-400">{streaming ? 'Thinking…' : 'Tourism AI · Live Context'}</div>
            </div>
            {aiContext && <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">{aiContext.name}</span>}
            <button onClick={() => setChatOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={14}/></button>
          </div>

          {/* Quick actions */}
          <div className="px-3 py-2 border-b border-slate-800/40 flex flex-wrap gap-1">
            {quickActions.map(qa => (
              <button key={qa.label} onClick={() => { setInput(qa.prompt); inputRef.current?.focus() }}
                className="text-[9px] font-medium px-2 py-1 rounded-full bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50 hover:border-cyan-600/40 transition-all">
                {qa.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">N</div>
                )}
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${msg.role === 'user' ? 'bg-cyan-600/20 text-cyan-100 border border-cyan-600/30 ml-auto' : 'bg-slate-800/60 text-slate-200 border border-slate-700/40'}`}>
                  {msg.role === 'assistant'
                    ? <ReactMarkdown components={{ p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>, strong: ({children}) => <strong className="text-cyan-300 font-semibold">{children}</strong> }}>{msg.content}</ReactMarkdown>
                    : msg.content}
                </div>
              </div>
            ))}
            {streaming && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">N</div>
                <div className="max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed bg-slate-800/60 text-slate-200 border border-slate-700/40">
                  {streamContent
                    ? <ReactMarkdown components={{ p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>, strong: ({children}) => <strong className="text-cyan-300">{children}</strong> }}>{streamContent}</ReactMarkdown>
                    : <span className="flex gap-1"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></span>
                  }
                  <span className="inline-block w-0.5 h-3 bg-cyan-400 animate-pulse ml-0.5 align-middle"/>
                </div>
              </div>
            )}
            <div ref={messagesEndRef}/>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-800/60">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 resize-none focus:outline-none focus:border-cyan-500/60 transition-colors"
                placeholder="Ask Nexora about Bhopal…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                style={{ height: 'auto' }}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px' }}
              />
              <button onClick={sendMessage} disabled={!input.trim() || streaming}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-40 transition-all flex-shrink-0">
                {streaming ? <Loader2 size={13} className="animate-spin"/> : <Send size={13}/>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
