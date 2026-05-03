import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { usePointsStore } from '../stores/pointsStore'
import { useCityStore } from '../stores/cityStore'
import { streamNexoraResponse } from '../lib/openrouter'
import { chatWithRAG } from '../lib/anythingllm'
import { supabase } from '../lib/supabase'
import NexoraAvatar from '../components/nexora/NexoraAvatar'
import NexoraMessage from '../components/nexora/NexoraMessage'
import UserMessage from '../components/nexora/UserMessage'
import { Send, Plus, Search, MessageSquare, Loader2 } from 'lucide-react'

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
  const abortRef = useRef(null)
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
    // Ensure city data is loaded for context
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

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return
    const userContent = input.trim()
    setInput('')

    // Optimistically show user message immediately
    const tempUserMsg = { id: `temp-${Date.now()}`, role: 'user', content: userContent, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, tempUserMsg])
    setStreaming(true)
    setStreamContent('')

    // ── 1. Ensure conversation exists ───────────────────────
    let convId = activeConvId
    if (!convId && user) {
      try {
        const { data: conv } = await supabase
          .from('ai_conversations')
          .insert({ user_id: user.id, title: userContent.slice(0, 60) })
          .select().single()
        if (conv) { convId = conv.id; setActiveConvId(convId); setConversations(prev => [conv, ...prev]) }
      } catch (e) { console.warn('Could not create conversation:', e) }
    }

    // ── 2. Persist user message ─────────────────────────────
    if (convId && user) {
      try {
        await supabase.from('ai_messages').insert({ conversation_id: convId, role: 'user', content: userContent })
        await supabase.from('chat_history').insert({ role: 'user', content: userContent, user_id: user.id })
      } catch (e) { console.warn('Could not save user message:', e) }
    }

    // ── 3. Award points ────────────────────────────────────
    if (user) { try { await awardPoints(user.id, 'AI_TURN') } catch {} }

    // ── 4. Stream AI response ──────────────────────────────
    let fullContent = ''
    try {
      await chatWithRAG(userContent, (chunk) => {
        fullContent += chunk
        setStreamContent(fullContent)
      })
    } catch (err) {
      console.error('[Nexora AI Error]', err)
      fullContent = 'I encountered an error. Please try again.'
    }

    // ── 5. Show + persist assistant response ───────────────
    const assistantMsg = { id: `ai-${Date.now()}`, role: 'assistant', content: fullContent, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, assistantMsg])
    setStreamContent('')
    setStreaming(false)

    if (convId && user) {
      try {
        await supabase.from('ai_messages').insert({ conversation_id: convId, role: 'assistant', content: fullContent })
        await supabase.from('chat_history').insert({ role: 'assistant', content: fullContent, user_id: user.id })
        await supabase.from('ai_conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId)
        fetchConversations()
      } catch (e) { console.warn('Could not save assistant message:', e) }
    }
  }, [input, streaming, activeConvId, messages, user, awardPoints, getCityContext, fetchConversations])


  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const filteredConvs = conversations.filter(c =>
    c.title?.toLowerCase().includes(searchQ.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-48px)] -m-4 md:-m-8 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      {/* Sidebar */}
      <div className="w-64 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex-shrink-0 hidden md:flex">
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
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConvs.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 px-3">No conversations yet. Start chatting with Nexora!</p>
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
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950/30">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
          <NexoraAvatar size={34} glow={streaming} />
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Nexora</div>
            <div className="text-[10px] text-slate-500">
              {streaming ? <span className="text-primary-500 animate-pulse">Generating response...</span> : 'City Intelligence Assistant · Context-Aware AI'}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="text-primary-500 animate-spin" />
            </div>
          ) : messages.length === 0 && !streaming ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
              <NexoraAvatar size={56} glow />
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Hi, I'm Nexora</h2>
                <p className="text-slate-500 text-sm max-w-sm">Your city intelligence assistant with real-time Bhopal data. Ask about parking, traffic, weather, or any city query.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm mt-2">
                {[
                  'What is the best parking near DB Mall right now?',
                  'What is the current traffic situation in Bhopal?',
                  'Show me today\'s weather and AQI status',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus() }}
                    className="text-left text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 hover:border-primary-300 dark:hover:border-primary-700/40 rounded-lg px-3 py-2.5 transition-all"
                  >
                    {q}
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

        {/* Input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              className="inp flex-1 resize-none min-h-[44px] max-h-32 py-3"
              placeholder="Ask Nexora anything about Bhopal..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              style={{ height: 'auto' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              className="btn-primary px-4 py-3 flex-shrink-0"
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 text-center">Nexora uses live city data. Verify important information independently.</p>
        </div>
      </div>
    </div>
  )
}
