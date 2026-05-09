import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { usePointsStore } from '../stores/pointsStore'
import { useCityStore } from '../stores/cityStore'
import { streamNexoraResponse } from '../lib/openrouter'
import { supabase } from '../lib/supabase'
import NexoraAvatar from '../components/nexora/NexoraAvatar'
import NexoraMessage from '../components/nexora/NexoraMessage'
import UserMessage from '../components/nexora/UserMessage'
import { Send, Plus, Search, MessageSquare, Loader2, Bot, Zap } from 'lucide-react'

// ── Suggested quick-start prompts ────────────────────────
const QUICK_PROMPTS = [
  { icon: '🚗', text: 'What is the current traffic situation in Bhopal?' },
  { icon: '🅿️', text: 'Best parking near DB Mall right now?' },
  { icon: '🌤️', text: "What's today's weather and AQI in Bhopal?" },
  { icon: '🗑️', text: 'Are there any waste overflow alerts active?' },
  { icon: '🗺️', text: 'Suggest an eco-friendly route from Habibganj to TT Nagar' },
  { icon: '📅', text: 'What events are happening in Bhopal this month?' },
]

export default function NexoraPage() {
  const { user, profile } = useAuthStore()
  const { awardPoints } = usePointsStore()
  const getCityContext = useCityStore(s => s.getCityContext)
  const initCity = useCityStore(s => s.initCity)
  const weather = useCityStore(s => s.weather)

  const [conversations, setConversations] = useState([])
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const fetchConversations = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    setConversations(data || [])
  }, [user])

  useEffect(() => {
    fetchConversations()
    // Ensure live city data is loaded for AI context
    if (!weather) initCity()
  }, [user, fetchConversations, weather, initCity])

  useEffect(() => { scrollToBottom() }, [messages, streamContent, scrollToBottom])

  const loadConversation = async (convId) => {
    setActiveConvId(convId)
    setLoading(true)
    const { data } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setLoading(false)
  }

  const newConversation = () => {
    setActiveConvId(null)
    setMessages([])
    inputRef.current?.focus()
  }

  const sendMessage = useCallback(async (overrideText) => {
    const userContent = (overrideText || input).trim()
    if (!userContent || streaming) return
    setInput('')

    // Optimistically show user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userContent,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMsg])
    setStreaming(true)
    setStreamContent('')

    // ── 1. Ensure conversation exists ─────────────────────
    let convId = activeConvId
    if (!convId && user) {
      try {
        const { data: conv } = await supabase
          .from('ai_conversations')
          .insert({ user_id: user.id, title: userContent.slice(0, 60) })
          .select().single()
        if (conv) {
          convId = conv.id
          setActiveConvId(convId)
          setConversations(prev => [conv, ...prev])
        }
      } catch (e) { console.warn('Could not create conversation:', e) }
    }

    // ── 2. Persist user message ───────────────────────────
    if (convId && user) {
      try {
        await Promise.all([
          supabase.from('ai_messages').insert({ conversation_id: convId, role: 'user', content: userContent }),
          supabase.from('chat_history').insert({ role: 'user', content: userContent, user_id: user.id }),
        ])
      } catch (e) { console.warn('Could not save user message:', e) }
    }

    // ── 3. Award points ───────────────────────────────────
    if (user) { try { await awardPoints(user.id, 'AI_TURN') } catch {} }

    // ── 4. Build history for context ──────────────────────
    const history = messages
      .filter(m => m.role !== 'system')
      .slice(-8)  // last 4 turns (8 messages)
      .map(m => ({ role: m.role, content: m.content }))

    // ── 5. Stream via Nexora agent pipeline ───────────────
    let fullContent = ''
    try {
      const cityState = {
        weather: useCityStore.getState().weather,
        aqi: useCityStore.getState().aqi,
        trafficLevel: useCityStore.getState().trafficLevel,
        parkingSpots: useCityStore.getState().parkingSpots,
        wasteBins: useCityStore.getState().wasteBins,
        energyZones: useCityStore.getState().energyZones,
      }

      await streamNexoraResponse(
        [...history, { role: 'user', content: userContent }],
        (chunk) => {
          fullContent += chunk
          setStreamContent(fullContent)
        },
        () => {},     // onDone
        null,         // signal (no abort controller needed)
        cityState     // cityStore state object → triggers agent routing
      )
    } catch (err) {
      console.error('[Nexora stream error]', err)
      fullContent = '⚠️ I encountered an error connecting to the AI service. Please check your OpenRouter API key and try again.'
    }

    // ── 6. Finalize & persist response ────────────────────
    const assistantMsg = {
      id: `ai-${Date.now()}`,
      role: 'assistant',
      content: fullContent || 'I was unable to generate a response. Please try again.',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMsg])
    setStreamContent('')
    setStreaming(false)

    if (convId && user) {
      try {
        await Promise.all([
          supabase.from('ai_messages').insert({ conversation_id: convId, role: 'assistant', content: fullContent }),
          supabase.from('chat_history').insert({ role: 'assistant', content: fullContent, user_id: user.id }),
          supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId),
        ])
        fetchConversations()
      } catch (e) { console.warn('Could not save assistant message:', e) }
    }
  }, [input, streaming, activeConvId, messages, user, awardPoints, fetchConversations])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const filteredConvs = conversations.filter(c =>
    c.title?.toLowerCase().includes(searchQ.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-48px)] -m-4 md:-m-8 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">

      {/* ── Sidebar ──────────────────────────────────────── */}
      <div className="w-64 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex-shrink-0 hidden md:flex">
        {/* Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <button onClick={newConversation} className="btn-primary w-full justify-center text-xs py-2">
            <Plus size={14} /> New Chat
          </button>
          <div className="relative mt-2">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="inp pl-8 text-xs py-2"
              placeholder="Search conversations..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConvs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 px-3">
              No conversations yet. Start chatting with Nexora!
            </p>
          ) : filteredConvs.map(conv => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${
                activeConvId === conv.id
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/30'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare size={11} className="mt-0.5 flex-shrink-0 opacity-60" />
                <span className="truncate leading-relaxed">{conv.title || 'Untitled'}</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-1 ml-4">
                {new Date(conv.updated_at || conv.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>

        {/* Agent info footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 mb-2">
            <Bot size={12} className="text-teal-500" />
            <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Active Agents</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {['Traffic', 'Parking', 'Weather', 'AQI', 'Waste', 'Events'].map(a => (
              <span key={a} className="text-[8px] bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                <span className="w-1 h-1 bg-teal-400 rounded-full" />
                {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chat Area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950/30 min-w-0">

        {/* Header bar */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex-shrink-0">
          <NexoraAvatar size={34} glow={streaming} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Nexora AI</div>
            <div className="text-[10px] text-slate-500">
              {streaming
                ? <span className="text-teal-500 animate-pulse flex items-center gap-1"><Zap size={9} />Generating response...</span>
                : 'Multi-Agent City Intelligence · Live Bhopal Telemetry'}
            </div>
          </div>
          <div className="text-[9px] text-slate-400 hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Live data active
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="text-primary-500 animate-spin" />
            </div>
          ) : messages.length === 0 && !streaming ? (
            // Welcome screen
            <div className="flex flex-col items-center justify-center h-full text-center gap-5 py-8">
              <NexoraAvatar size={60} glow />
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                  Hi{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}! I'm Nexora
                </h2>
                <p className="text-slate-500 text-sm max-w-sm">
                  Your multi-agent city intelligence assistant with live Bhopal IoT data.
                  I can help with traffic, parking, weather, AQI, waste, events, and more.
                </p>
              </div>

              {/* Quick prompts grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {QUICK_PROMPTS.map(({ icon, text }) => (
                  <button
                    key={text}
                    onClick={() => sendMessage(text)}
                    className="text-left text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 hover:border-primary-300 dark:hover:border-primary-700/40 rounded-xl px-3 py-2.5 transition-all flex items-start gap-2"
                  >
                    <span className="text-base flex-shrink-0">{icon}</span>
                    <span>{text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(msg =>
                msg.role === 'assistant'
                  ? <NexoraMessage key={msg.id} content={msg.content} timestamp={msg.created_at} />
                  : <UserMessage key={msg.id} content={msg.content} timestamp={msg.created_at} username={profile?.display_name} />
              )}
              {streaming && <NexoraMessage content={streamContent} isStreaming />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 flex-shrink-0">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              className="inp flex-1 resize-none min-h-[44px] max-h-36 py-3 text-sm"
              placeholder="Ask Nexora anything about Bhopal..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 144) + 'px'
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || streaming}
              className="btn-primary px-4 py-3 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">
            Nexora uses live city telemetry via scoped AI agents · OpenRouter → AnythingLLM fallback
          </p>
        </div>
      </div>
    </div>
  )
}
