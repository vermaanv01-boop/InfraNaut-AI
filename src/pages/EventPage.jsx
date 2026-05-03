import { useState, useRef, useEffect } from 'react'
import { Calendar, MapPin, Clock, Users, Send, Loader2, Sparkles } from 'lucide-react'
import { chatWithRAG } from '../lib/anythingllm'
import { supabase } from '../lib/supabase'
import ReactMarkdown from 'react-markdown'

const DUMMY_EVENTS = [
  {
    id: 1,
    name: 'Bhojpal Mahotsav',
    location: 'BHEL Dussehra Maidan',
    date: 'Nov 15 - Nov 25',
    time: '6:00 PM - 10:00 PM',
    status: 'Upcoming',
    category: 'Cultural',
    description: 'A grand celebration of Bhopal\'s culture, food, and handlooms.',
    crowdLevel: 'High',
    distance: '3.2 km'
  },
  {
    id: 2,
    name: 'Lake City Music Fest',
    location: 'Upper Lake Promenade',
    date: 'Dec 02',
    time: '7:00 PM - 11:00 PM',
    status: 'Upcoming',
    category: 'Music',
    description: 'Live bands and electronic music by the beautiful Bhojtal.',
    crowdLevel: 'Medium',
    distance: '1.5 km'
  },
  {
    id: 3,
    name: 'Heritage Walk',
    location: 'Taj-ul-Masajid',
    date: 'Every Sunday',
    time: '7:00 AM - 9:00 AM',
    status: 'Ongoing',
    category: 'Heritage',
    description: 'Guided morning walk through the historic mosques and gates of Bhopal.',
    crowdLevel: 'Low',
    distance: '4.1 km'
  }
]

const EVENT_SYSTEM_PROMPT = `
You are an AI Event Intelligence Agent for a Smart City platform called InfraNaut AI.

Your task is to provide accurate, structured, and context-aware information about events happening:
- Near the user
- In a city
- Around a specific location

You MUST follow these rules:

1. For EVERY event, ALWAYS include:
   • Event Name
   • Location
   • Date
   • Start Time and End Time
   • Status (Ongoing / Upcoming)
   • Category (festival, cultural, music, etc.)
   • Short Description
   • Crowd Level (Low / Medium / High – estimated)
   • Distance (if location-based)

2. Crowd Intelligence (VERY IMPORTANT):
   - Predict crowd level based on:
     • time of day
     • event popularity
     • location type
   - ALWAYS add:
     • Best time to visit
     • How to avoid crowd (early visit, alternate timing, etc.)

3. Smart Suggestions:
   - If crowd is HIGH:
     • Suggest less crowded alternatives nearby
     • Suggest better time slots
   - If multiple events exist:
     • Rank them by relevance (time + distance + crowd)

4. Query Handling:
   - "Events near me" → show closest events
   - "Events in [city]" → show major city events
   - "Events near [place]" → prioritize nearby events

5. Response Style:
   - Structured (bullet points)
   - Clear and concise
   - Professional tone

6. DO NOT:
   - Mention human guides
   - Give vague or generic answers

Goal:
Help users discover relevant events and make smart decisions by understanding time, location, and crowd conditions.
`

export default function EventPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am the InfraNaut Event Intelligence Agent. Ask me about upcoming events, crowd levels, or the best time to visit festivals in Bhopal!' }
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent])

  const sendMessage = async () => {
    if (!input.trim() || streaming) return
    const userContent = input.trim()
    setInput('')
    
    setMessages(prev => [...prev, { role: 'user', content: userContent }])
    setStreaming(true)
    setStreamContent('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await supabase.from("chat_history").insert({ role: "user", content: userContent, user_id: user.id })
      }

      let fullContent = ''
      
      // Prepend system prompt to enforce rules
      const ragInput = `SYSTEM COMMAND: ${EVENT_SYSTEM_PROMPT}\n\nUSER QUERY: ${userContent}`

      await chatWithRAG(ragInput, (chunk) => {
        fullContent += chunk
        setStreamContent(fullContent)
      })

      if (user) {
        await supabase.from("chat_history").insert({ role: "assistant", content: fullContent, user_id: user.id })
      }

      setMessages(prev => [...prev, { role: 'assistant', content: fullContent }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, { role: 'assistant', content: 'I encountered an error connecting to the Event Database. Please try again.' }])
    } finally {
      setStreamContent('')
      setStreaming(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-100px)]">
      {/* Events List Panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="text-amber-500" />
            Live City Events
          </h2>
          <p className="text-xs text-slate-500">Real-time event tracking and crowd predictions</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {DUMMY_EVENTS.map(event => (
            <div key={event.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 hover:border-amber-500/30 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{event.name}</h3>
                <span className="text-[10px] px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-semibold">
                  {event.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">{event.description}</p>
              
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-400"/> {event.location} ({event.distance})</div>
                <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400"/> {event.date}</div>
                <div className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400"/> {event.time}</div>
                <div className="flex items-center gap-1.5">
                  <Users size={12} className={event.crowdLevel === 'High' ? 'text-red-400' : 'text-green-400'}/> 
                  Crowd: {event.crowdLevel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Agent Chat Panel */}
      <div className="w-full md:w-96 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
            <Sparkles size={14} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Event Agent</h2>
            <p className="text-[10px] text-slate-500">Powered by InfraNaut AI</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-amber-500 text-white ml-auto' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                {msg.role === 'assistant' 
                  ? <ReactMarkdown components={{ p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>, strong: ({children}) => <strong className="text-amber-500 font-semibold">{children}</strong> }}>{msg.content}</ReactMarkdown>
                  : msg.content
                }
              </div>
            </div>
          ))}
          {streaming && (
            <div className="flex gap-2">
               <div className="max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {streamContent ? <ReactMarkdown components={{ p: ({children}) => <p className="mb-1 last:mb-0">{children}</p>, strong: ({children}) => <strong className="text-amber-500 font-semibold">{children}</strong> }}>{streamContent}</ReactMarkdown> : 'Thinking...'}
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex gap-2">
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about events or crowds..."
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 dark:text-white"
            />
            <button 
              onClick={sendMessage}
              disabled={!input.trim() || streaming}
              className="w-10 h-10 flex items-center justify-center bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
