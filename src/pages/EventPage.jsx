import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, MapPin, Clock, Users, Send, Loader2, Sparkles,
  X, Filter, Search, ExternalLink, ChevronDown, ChevronUp,
  Bus, Car, Ticket
} from 'lucide-react'
import { BHOPAL_EVENTS, EVENT_CATEGORIES, getEventsByStatus } from '../data/bhopalEvents'
import { BHOPAL_EVENTS as EVENTS_DATA } from '../data/bhopalEvents'
import { agentCompletion, streamNexoraResponse } from '../lib/openrouter'
import { useCityStore } from '../stores/cityStore'
import { buildScopedContext } from '../lib/agents/contextBuilder'
import { AGENT_TYPES } from '../lib/agents/agentConfig'
import ReactMarkdown from 'react-markdown'

// ── Status badge ──────────────────────────────────────────
function StatusBadge({ status }) {
  const config = {
    ongoing:   { label: 'LIVE NOW', bg: 'bg-green-500/15', text: 'text-green-400', dot: 'bg-green-400', pulse: true },
    upcoming:  { label: 'UPCOMING', bg: 'bg-blue-500/15',  text: 'text-blue-400',  dot: 'bg-blue-400',  pulse: false },
    past:      { label: 'ENDED',    bg: 'bg-slate-500/15', text: 'text-slate-500', dot: 'bg-slate-500', pulse: false },
  }
  const c = config[status] || config.upcoming
  return (
    <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.pulse ? 'animate-pulse' : ''}`} />
      {c.label}
    </span>
  )
}

// ── Crowd badge ───────────────────────────────────────────
function CrowdBadge({ level }) {
  const config = {
    'Very High': 'text-red-400 bg-red-500/10',
    'High':      'text-orange-400 bg-orange-500/10',
    'Medium':    'text-amber-400 bg-amber-500/10',
    'Low':       'text-green-400 bg-green-500/10',
  }
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${config[level] || config.Low}`}>
      👥 {level} Crowd
    </span>
  )
}

// ── Event Card ────────────────────────────────────────────
function EventCard({ event, onSelect, isSelected, onViewMap }) {
  const cat = EVENT_CATEGORIES.find(c => c.id === event.category)
  const catColor = cat?.color || '#6366f1'

  return (
    <div
      className={`p-4 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? 'border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-amber-300 dark:hover:border-amber-700/50'
      }`}
      onClick={() => onSelect(event)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={event.status} />
            <CrowdBadge level={event.crowdLevel} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{event.name}</h3>
        </div>
        <span
          className="text-[10px] px-2 py-1 rounded-full font-semibold flex-shrink-0"
          style={{ backgroundColor: catColor + '22', color: catColor, border: `1px solid ${catColor}44` }}
        >
          {cat?.emoji} {event.category.split(' ')[0]}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{event.description}</p>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 mb-3">
        <div className="flex items-center gap-1.5">
          <MapPin size={10} className="text-slate-400 flex-shrink-0" />
          <span className="truncate">{event.venue.split(',')[0]}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar size={10} className="text-slate-400 flex-shrink-0" />
          <span>{event.date}{event.endDate ? ` – ${event.endDate.slice(5)}` : ''}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={10} className="text-slate-400 flex-shrink-0" />
          <span>{event.timeSlot}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Ticket size={10} className="text-slate-400 flex-shrink-0" />
          <span>{event.entryFee}</span>
        </div>
      </div>

      {/* Ward tag */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          📍 {event.ward}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onViewMap(event) }}
          className="text-[10px] text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-1"
        >
          <ExternalLink size={10} />
          View on Map
        </button>
      </div>
    </div>
  )
}

// ── Event Detail Panel ────────────────────────────────────
function EventDetailPanel({ event, onClose, onAskAI }) {
  if (!event) return null
  const cat = EVENT_CATEGORIES.find(c => c.id === event.category)

  return (
    <div className="card animate-fade-in border-amber-500/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{event.name}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3">
        {/* Status + Category */}
        <div className="flex gap-2 flex-wrap">
          <StatusBadge status={event.status} />
          <CrowdBadge level={event.crowdLevel} />
          <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold"
            style={{ backgroundColor: (cat?.color || '#6366f1') + '22', color: cat?.color || '#6366f1' }}>
            {cat?.emoji} {event.category}
          </span>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { icon: MapPin, label: 'Venue', value: event.venue },
            { icon: Calendar, label: 'Date', value: event.date + (event.endDate ? ` – ${event.endDate}` : '') },
            { icon: Clock, label: 'Time', value: event.timeSlot },
            { icon: Ticket, label: 'Entry', value: event.entryFee },
            { icon: Users, label: 'Expected', value: event.expectedAttendance?.toLocaleString() + ' attendees' },
            { icon: MapPin, label: 'Ward', value: event.ward },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-0.5">
                <Icon size={9} className="text-slate-400" />
                <span className="text-[9px] text-slate-400">{label}</span>
              </div>
              <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300">{value}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{event.description}</p>

        {/* Highlights */}
        {event.highlights?.length > 0 && (
          <div>
            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Highlights</div>
            <div className="flex flex-wrap gap-1.5">
              {event.highlights.map(h => (
                <span key={h} className="text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                  {h}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Transport Advice */}
        {event.transportAdvice && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Bus size={11} className="text-blue-400" />
              <span className="text-[9px] font-semibold text-blue-400 uppercase tracking-wide">Transport Advice</span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">{event.transportAdvice}</p>
          </div>
        )}

        {/* Parking */}
        {event.parkingNearby?.length > 0 && (
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Car size={11} className="text-green-400" />
              <span className="text-[9px] font-semibold text-green-400 uppercase tracking-wide">Nearby Parking</span>
            </div>
            {event.parkingNearby.map(p => (
              <p key={p} className="text-[10px] text-slate-600 dark:text-slate-400">• {p}</p>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onAskAI(event)}
            className="flex-1 btn-primary text-xs py-2"
          >
            <Sparkles size={12} />
            Ask Event AI
          </button>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs py-2 px-3"
          >
            <ExternalLink size={12} />
            Maps
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Main EventPage ────────────────────────────────────────
export default function EventPage() {
  const navigate = useNavigate()
  const trafficLevel = useCityStore(s => s.trafficLevel)
  const parkingSpots = useCityStore(s => s.parkingSpots)
  const weather = useCityStore(s => s.weather)

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // AI Chat
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: '🗓️ Hello! I\'m the **Event Intelligence Agent** for InfraNaut AI.\n\nI have real-time data on **15 Bhopal events** including crowd levels, transport advice, and parking recommendations.\n\nAsk me:\n- *"What events are happening this week?"*\n- *"Tell me about Bhojpal Mahotsav crowd levels"*\n- *"Best time to visit Lake City Music Fest?"*'
  }])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent])

  // ── Filtered events ───────────────────────────────────
  const filteredEvents = useMemo(() => {
    let events = BHOPAL_EVENTS
    if (selectedCategory !== 'all') events = events.filter(e => e.category === selectedCategory)
    if (selectedStatus !== 'all') events = events.filter(e => e.status === selectedStatus)
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase()
      events = events.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.ward.toLowerCase().includes(q) ||
        e.tags.some(t => t.includes(q))
      )
    }
    // Sort: ongoing first, then upcoming by date, past last
    return events.sort((a, b) => {
      const order = { ongoing: 0, upcoming: 1, past: 2 }
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return new Date(a.date) - new Date(b.date)
    })
  }, [selectedCategory, selectedStatus, searchQ])

  const ongoingCount = getEventsByStatus('ongoing').length
  const upcomingCount = getEventsByStatus('upcoming').length

  // ── Send message to Event Agent ───────────────────────
  const sendMessage = async (content = null) => {
    const userContent = content || input.trim()
    if (!userContent || streaming) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userContent }])
    setStreaming(true)
    setStreamContent('')

    try {
      // Build event context for the agent
      const cityState = { trafficLevel, parkingSpots, weather }
      const eventContext = buildScopedContext(AGENT_TYPES.EVENT, cityState, {
        events: filteredEvents.slice(0, 10),
        query: userContent
      })

      // Use streaming for better UX
      let fullContent = ''
      await streamNexoraResponse(
        [{ role: 'user', content: userContent }],
        (token) => { fullContent += token; setStreamContent(fullContent) },
        () => {},
        null,
        cityState,
        BHOPAL_EVENTS
      )
      setMessages(prev => [...prev, { role: 'assistant', content: fullContent }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error reaching the AI service. Please try again.'
      }])
    } finally {
      setStreamContent('')
      setStreaming(false)
    }
  }

  const askAboutEvent = (event) => {
    const q = `Tell me about "${event.name}": crowd levels, best time to visit, transport options, and parking recommendations.`
    sendMessage(q)
    inputRef.current?.focus()
  }

  const handleViewMap = (event) => {
    // Navigate to map page — could pass event coords via state
    navigate('/app/map')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const mdComponents = {
    p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
    strong: ({ children }) => <strong className="text-amber-500 font-semibold">{children}</strong>,
    ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
    li: ({ children }) => <li className="text-xs">{children}</li>,
    h2: ({ children }) => <h2 className="text-xs font-bold text-amber-400 mt-2 mb-1">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xs font-semibold text-amber-300 mt-1.5 mb-0.5">{children}</h3>,
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="text-amber-500" size={22} />
            Bhopal Event Intelligence
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {ongoingCount} live · {upcomingCount} upcoming · AI-powered crowd & transport insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-full font-medium">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              {ongoingCount} Live
            </span>
            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full font-medium">
              📅 {upcomingCount} Upcoming
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* LEFT: Events List */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* Search + Filter */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="inp pl-9 text-xs py-2"
                placeholder="Search events, venues, tags..."
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
              />
            </div>
            <select
              className="inp text-xs py-2 w-auto"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="ongoing">🔴 Live Now</option>
              <option value="upcoming">📅 Upcoming</option>
              <option value="past">⏸ Past</option>
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary text-xs py-2 px-3 ${showFilters ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
            >
              <Filter size={12} />
              Category
              {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {/* Category Filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-1.5 animate-fade-in">
              {EVENT_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                  style={selectedCategory === cat.id ? { background: cat.color } : {}}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Events count */}
          <div className="text-xs text-slate-400">
            Showing {filteredEvents.length} of {BHOPAL_EVENTS.length} events
          </div>

          {/* Events Grid */}
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
            {filteredEvents.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-3xl mb-2">🔍</div>
                <p className="text-slate-500 text-sm">No events match your filters.</p>
              </div>
            ) : filteredEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={setSelectedEvent}
                isSelected={selectedEvent?.id === event.id}
                onViewMap={handleViewMap}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: AI Chat + Event Detail */}
        <div className="w-full lg:w-96 flex flex-col gap-3">
          {/* Event Detail (when selected) */}
          {selectedEvent && (
            <EventDetailPanel
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
              onAskAI={askAboutEvent}
            />
          )}

          {/* AI Event Agent Chat */}
          <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
            style={{ height: selectedEvent ? 'calc(50vh - 120px)' : 'calc(100vh - 200px)' }}>
            {/* Chat Header */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white flex-shrink-0">
                <Sparkles size={14} />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Event Intelligence Agent</div>
                <div className="text-[10px] text-slate-400">
                  {streaming
                    ? <span className="text-amber-400 animate-pulse">Analyzing event data...</span>
                    : `${BHOPAL_EVENTS.length} events · Real-time crowd intelligence`}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                      <Sparkles size={10} />
                    </div>
                  )}
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-white rounded-tr-sm ml-auto'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                  }`}>
                    {msg.role === 'assistant'
                      ? <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
                      : msg.content}
                  </div>
                </div>
              ))}
              {streaming && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                    <Sparkles size={10} />
                  </div>
                  <div className="max-w-[85%] px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm">
                    {streamContent
                      ? <ReactMarkdown components={mdComponents}>{streamContent}</ReactMarkdown>
                      : (
                        <div className="flex gap-1 items-center py-0.5">
                          {[0, 100, 200].map(d => (
                            <span key={d} className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 flex flex-col gap-1">
                {[
                  'What events are happening this week?',
                  'Tell me about Bhojpal Mahotsav crowds',
                  'Best eco-route to Lake City Music Fest?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700/50 rounded-lg px-2.5 py-1.5 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask about events, crowd levels, transport..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-amber-500 dark:text-white placeholder:text-slate-400"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || streaming}
                  className="w-9 h-9 flex items-center justify-center bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
