import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { usePointsStore } from '../stores/pointsStore'
import { streamNexoraResponse } from '../lib/openrouter'
import { supabase } from '../lib/supabase'
import NexoraAvatar from '../components/nexora/NexoraAvatar'
import NexoraMessage from '../components/nexora/NexoraMessage'
import UserMessage from '../components/nexora/UserMessage'
import { Send, Plus, Search, MessageSquare, Loader2, X } from 'lucide-react'

export default function NexoraPage() {
  const { user, profile } = useAuthStore()
  const { awardPoints } = usePointsStore()

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

  useEffect(() => { fetchConversations() }, [user])
  useEffect(() => { scrollToBottom() }, [messages, streamContent])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async () => {
    if (!user) return
    const { data } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    setConversations(data || [])
  }

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

    // Create conversation if needed
    let convId = activeConvId
    if (!convId) {
      const title = userContent.slice(0, 60)
      const { data: conv } = await supabase
        .from('ai_conversations')
        .insert({ user_id: user.id, title })
        .select()
        .single()
      convId = conv.id
      setActiveConvId(convId)
      setConversations(prev => [conv, ...prev])
    }

    // Save user message
    const { data: userMsg } = await supabase
      .from('ai_messages')
      .insert({ conversation_id: convId, role: 'user', content: userContent })
      .select().single()

    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    // Award AI turn point
    await awardPoints(user.id, 'AI_TURN')

    // Build history for API
    const history = newMessages.map(m => ({ role: m.role, content: m.content }))

    // Stream response
    setStreaming(true)
    setStreamContent('')
    abortRef.current = new AbortController()

    let fullContent = ''
    try {
      await streamNexoraResponse(
        history,
        (token) => {
          fullContent += token
          setStreamContent(fullContent)
        },
        async () => {
          // Save assistant message
          const { data: assistantMsg } = await supabase
            .from('ai_messages')
            .insert({ conversation_id: convId, role: 'assistant', content: fullContent })
            .select().single()

          setMessages(prev => [...prev, assistantMsg])
          setStreamContent('')
          setStreaming(false)

          // Update conversation timestamp
          await supabase
            .from('ai_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', convId)

          fetchConversations()
        },
        abortRef.current.signal
      )
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, {
          id: 'err-' + Date.now(), role: 'assistant',
          content: 'I encountered an error. Please try again.',
          created_at: new Date().toISOString()
        }])
      }
      setStreamContent('')
      setStreaming(false)
    }
  }, [input, streaming, activeConvId, messages, user, awardPoints])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const filteredConvs = conversations.filter(c =>
    c.title?.toLowerCase().includes(searchQ.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-48px)] -m-6 overflow-hidden rounded-xl" style={{ border: '1px solid rgba(20,184,166,0.1)' }}>
      {/* Sidebar */}
      <div className="w-64 flex flex-col border-r border-slate-800/60 bg-slate-900/50 flex-shrink-0">
        <div className="p-3 border-b border-slate-800/60">
          <button onClick={newConversation} className="btn-primary w-full justify-center text-xs py-2">
            <Plus size={14} /> New Chat
          </button>
          <div className="relative mt-2">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
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
            <p className="text-xs text-slate-500 text-center py-8 px-3">No conversations yet. Start chatting with Nexora!</p>
          ) : filteredConvs.map(conv => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${
                activeConvId === conv.id
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-start gap-2">
                <MessageSquare size={11} className="mt-0.5 flex-shrink-0 opacity-60" />
                <span className="truncate leading-relaxed">{conv.title || 'Untitled'}</span>
              </div>
              <div className="text-[9px] text-slate-600 mt-1 ml-4">
                {new Date(conv.updated_at || conv.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-slate-950/30">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800/60 bg-slate-900/30">
          <NexoraAvatar size={34} glow={streaming} />
          <div>
            <div className="text-sm font-semibold text-white">Nexora</div>
            <div className="text-[10px] text-slate-500">
              {streaming ? <span className="text-teal-400 animate-pulse">Generating response...</span> : 'City Intelligence Assistant · Powered by Claude'}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="text-teal-500 animate-spin" />
            </div>
          ) : messages.length === 0 && !streaming ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
              <NexoraAvatar size={56} glow />
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Hi, I'm Nexora</h2>
                <p className="text-slate-400 text-sm max-w-sm">Your city intelligence assistant. Ask me about Bhopal's infrastructure, eco-friendly routes, or any city-related queries.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm mt-2">
                {[
                  'What are the top reported issues in Bhopal this week?',
                  'Suggest an eco-friendly route from New Market to Arera Colony',
                  'What does the garbage collection schedule look like?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus() }}
                    className="text-left text-xs text-slate-400 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-teal-700/40 rounded-lg px-3 py-2.5 transition-all"
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
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/30">
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
          <p className="text-[10px] text-slate-600 mt-2 text-center">Nexora may make mistakes. Verify important city information.</p>
        </div>
      </div>
    </div>
  )
}
