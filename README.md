# InfraNaut AI 🏙️

**AI-Powered Smart City Platform for Bhopal**

InfraNaut AI is a full-stack civic-tech platform powered by **Nexora**, the city's AI intelligence assistant.

## 🚀 Quick Start

```bash
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## ⚙️ Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENROUTER_API_KEY=your-openrouter-key
VITE_SOCKET_URL=https://your-socket-server.railway.app
```

## 🗄️ Supabase Setup

Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor.

## 🤖 Nexora

Nexora is the AI assistant powered by OpenRouter. She appears in: Chat, Community rooms (`@Nexora`), Analytics prediction cards, Eco-Route advisor, and Dashboard insights.

## 🎮 Points System

| Action | Points |
|--------|--------|
| Report submitted | +10 |
| Report verified | +25 |
| Eco route saved | +15 |
| Chat message | +2 |
| AI turn | +1 |

## 📦 Stack

React 18 + Vite · Tailwind CSS v4 · Zustand · Supabase · OpenRouter (Claude) · Leaflet · Socket.io · Open-Meteo
