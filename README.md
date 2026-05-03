# InfraNaut AI 🏙️🤖

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-DB-3ECF8E.svg)](https://supabase.com/)
[![Three.js](https://img.shields.io/badge/Three.js-3D-black.svg)](https://threejs.org/)

**InfraNaut AI** is a professional, high-fidelity Intelligent Operations Center (IOC) and Smart Sustainable City AI Platform built for Bhopal. It acts as a comprehensive digital twin and civic-tech solution, empowering both city administrators and citizens to monitor, analyze, and improve urban infrastructure in real-time.

---

## 🌟 Key Features

*   **Intelligent Operations Center (IOC) Dashboard**: A sci-fi inspired, professional dark-themed dashboard displaying real-time telemetry across urban sectors (traffic flow, energy consumption, waste management, parking availability, and environmental data) using high-performance charts and glassmorphism UI.
*   **3D Digital Twin**: Immersive 3D visualization of the city's infrastructure and sensor networks built with React Three Fiber and Drei, offering an unprecedented operational view.
*   **Nexora AI Assistant**: A pervasive AI intelligence assistant powered by OpenRouter (Claude/Gemini/Llama). Nexora provides contextual RAG-based insights in the IOC, answers citizen queries, predicts infrastructure anomalies, and guides users on eco-friendly routes.
*   **Real-time GIS Mapping**: Interactive city maps featuring heatmap layers, marker clustering, and live IoT sensor overlays via Leaflet and React-Leaflet.
*   **Citizen Issue Reporting & Gamification**: A robust pipeline for citizens to snap photos of infrastructure issues (potholes, water leaks), which are locally compressed and uploaded to Supabase. Users earn points for verified reports, participating in a city-wide Leaderboard.
*   **Eco-Routes**: AI-suggested sustainable transit routes that minimize carbon footprint based on real-time traffic and weather conditions via Open-Meteo.
*   **Real-time Synchronization**: Powered by Socket.io, reflecting instantaneous updates to telemetry and citizen reports across all active dashboards.

## 📦 Tech Stack

**Frontend Framework:**
*   React 19 & Vite 8
*   Tailwind CSS v4 (Styling & Design System)
*   Zustand (Global State Management)
*   React Router DOM (Routing)

**Visualization & 3D:**
*   Three.js & React Three Fiber / Drei
*   Recharts (Telemetry Data Visualization)
*   Leaflet, React-Leaflet, Leaflet.heat (GIS Mapping)
*   Lucide React & React Icons

**Backend & AI Integration:**
*   Supabase (PostgreSQL, Auth, Storage)
*   OpenRouter API (Nexora AI inference)
*   Socket.io-client (Real-time events)
*   Browser Image Compression (Optimized media uploads)

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/infranaut-ai.git
cd infranaut-ai
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory and populate it with your keys (use `.env.example` as a template if available):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_OPENROUTER_API_KEY=your-openrouter-key
VITE_SOCKET_URL=https://your-socket-server.railway.app
```

### 3. Database Initialization

Run the initial schema migration in your Supabase SQL Editor:
`supabase/migrations/001_initial_schema.sql`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🎮 Gamification & Points System

To encourage civic engagement, InfraNaut AI implements a reputation system.

| Action | Reward |
| :--- | :--- |
| **Verified Infrastructure Report** | +25 pts |
| **Eco Route Saved/Completed** | +15 pts |
| **Report Submitted** | +10 pts |
| **Community Chat Message** | +2 pts |
| **AI Interaction (Nexora)** | +1 pt |

## 🏗️ Project Structure

```text
src/
├── components/   # Reusable UI, Map layers, 3D Canvas elements
├── data/         # Static configuration, mock fallbacks
├── lib/          # Service integrations (Supabase, OpenRouter, Socket)
├── pages/        # Route views (Dashboard, Analytics, Leaderboard, etc.)
├── stores/       # Zustand state slices (cityStore, authStore)
└── index.css     # Tailwind entry and global CSS vars
```

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.
