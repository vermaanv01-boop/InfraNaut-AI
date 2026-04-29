import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../stores/authStore'
import { usePointsStore } from '../stores/pointsStore'
import { useCityStore } from '../stores/cityStore'
import { supabase } from '../lib/supabase'
import { nexoraCompletion } from '../lib/openrouter'
import NexoraAvatar from '../components/nexora/NexoraAvatar'
import { Send, Hash, Users, Loader2 } from 'lucide-react'

const DEFAULT_ROOMS = [
  { id: 'general', name: 'General', description: 'City-wide discussions' },
  { id: 'traffic', name: 'Traffic', description: 'Road & transport updates' },
  { id: 'garbage', name: 'Garbage', description: 'Waste management' },
  { id: 'water', name: 'Water', description: 'Water supply issues' },
  { id: 'arera', name: 'Arera Colony', description: 'Ward discussions' },
  { id: 'habibganj', name: 'Habibganj', description: 'Ward discussions' },
]

function ChatMessage({ msg, currentUserId }) {
  const isOwn = msg.user_id === currentUserId
  const isNexora = msg.is_nexora
  if (isNexora) {
    return (
      <div className="flex gap-2.5 animate-fade-in-up">
        <NexoraAvatar size={30} />
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-semibold text-teal-400">Nexora</span>
            <span className="text-[9px] text-slate-500">AI · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="nexora-message p-2.5 text-xs text-slate-700 dark:text-slate-200 leading-relaxed max-w-sm">{msg.content}</div>
        </div>
      </div>
    )
  }
  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 ${isOwn ? 'bg-teal-600' : 'bg-slate-400 dark:bg-slate-700'}`}>
        {(msg.profiles?.display_name || 'U').slice(0, 2).toUpperCase()}
      </div>
      <div className={isOwn ? 'items-end flex flex-col' : ''}>
        <div className="flex items-center gap-1.5 mb-1">
          {!isOwn && <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">{msg.profiles?.display_name || 'User'}</span>}
          <span className="text-[9px] text-slate-500">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className={`p-2.5 text-xs leading-relaxed max-w-xs ${isOwn ? 'user-message' : 'bg-slate-100 dark:bg-slate-800/60 rounded-lg text-slate-700 dark:text-slate-200'}`}>
          {msg.content}
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const { user, profile } = useAuthStore()
  const { awardPoints } = usePointsStore()
  const getCityContext = useCityStore(s => s.getCityContext)
  const [rooms, setRooms] = useState(DEFAULT_ROOMS)
  const [activeRoom, setActiveRoom] = useState(DEFAULT_ROOMS[0].id)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [nexoraTyping, setNexoraTyping] = useState(false)
  const [onlineCount, setOnlineCount] = useState(Math.floor(Math.random() * 15) + 3)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadMessages(activeRoom)
    const channel = supabase
      .channel(`room:${activeRoom}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${activeRoom}` },
        (payload) => setMessages(prev => [...prev, payload.new])
      ).subscribe()
    return () => supabase.removeChannel(channel)
  }, [activeRoom])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadMessages = async (roomId) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, profiles(display_name, username)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(50)
    setMessages(data || [])
  }

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const content = input.trim()
    setInput(''); setSending(true)
    try {
      await supabase.from('chat_messages').insert({ room_id: activeRoom, user_id: user.id, content, is_nexora: false })
      await awardPoints(user.id, 'CHAT_MESSAGE')
      if (content.toLowerCase().includes('@nexora')) {
        setNexoraTyping(true)
        const contextMsg = messages.slice(-5).map(m => `${m.is_nexora ? 'Nexora' : m.profiles?.display_name || 'User'}: ${m.content}`).join('\n')
        const cityContext = getCityContext()
        const reply = await nexoraCompletion([{ role: 'user', content: `You are in the "${activeRoom}" community chat room in Bhopal. Recent chat:\n${contextMsg}\nUser asked: ${content.replace('@nexora', '').trim()}\nRespond briefly and helpfully using the live city data provided.` }], 300, cityContext)
        await supabase.from('chat_messages').insert({ room_id: activeRoom, user_id: null, content: reply, is_nexora: true })
        setNexoraTyping(false)
      }
    } catch (err) { console.error(err) }
    finally { setSending(false) }
  }

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  return (
    <div className="flex h-[calc(100vh-48px)] -m-6 overflow-hidden rounded-xl border border-slate-200 dark:border-teal-900/20">
      {/* Room list */}
      <div className="w-56 flex flex-col border-r border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800/60">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Community Chat</div>
          <div className="text-[10px] text-teal-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />{onlineCount} online</div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {rooms.map(room => (
            <button key={room.id} onClick={() => setActiveRoom(room.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all ${activeRoom === room.id ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}`}>
              <div className="flex items-center gap-2"><Hash size={11} className="opacity-60" /><span className="font-medium">{room.name}</span></div>
              <div className="text-[9px] text-slate-600 mt-0.5 ml-5">{room.description}</div>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/60 text-[10px] text-slate-500">
          Tip: Type <span className="text-teal-600 dark:text-teal-400 font-medium">@Nexora</span> to ask Nexora
        </div>
      </div>
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2">
            <Hash size={14} className="text-teal-500" />
            <span className="text-sm font-semibold text-slate-900 dark:text-white">{rooms.find(r => r.id === activeRoom)?.name}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Users size={11} /> {onlineCount} members
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => <ChatMessage key={msg.id} msg={msg} currentUserId={user?.id} />)}
          {nexoraTyping && (
            <div className="flex gap-2.5">
              <NexoraAvatar size={30} glow />
              <div className="nexora-message p-2.5 flex gap-1 items-center">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30">
          <div className="flex gap-2 items-end">
            <input className="inp flex-1 text-sm py-2.5" placeholder={`Message #${rooms.find(r => r.id === activeRoom)?.name}... (use @Nexora to ask AI)`}
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} />
            <button onClick={sendMessage} disabled={!input.trim() || sending} className="btn-primary px-3 py-2.5">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
