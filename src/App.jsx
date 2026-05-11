import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'

// ── Lazy load all heavy pages ─────────────────────────────
const Dashboard      = lazy(() => import('./pages/Dashboard'))
const MapPage        = lazy(() => import('./pages/MapPage'))
const ChatPage       = lazy(() => import('./pages/ChatPage'))
const AnalyticsPage  = lazy(() => import('./pages/AnalyticsPage'))
const NexoraPage     = lazy(() => import('./pages/NexoraPage'))
const EcoRoutePage   = lazy(() => import('./pages/EcoRoutePage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const ProfilePage    = lazy(() => import('./pages/ProfilePage'))
const TourismPage    = lazy(() => import('./pages/TourismPage'))
const EventPage      = lazy(() => import('./pages/EventPage'))
const DigitalTwinPage = lazy(() => import('./pages/DigitalTwinPage'))
const AdminPage      = lazy(() => import('./pages/AdminPage'))

// ── Loading fallback ──────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-xs text-slate-400 font-medium">Loading module...</div>
      </div>
    </div>
  )
}

// ── Auth guard ────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  // If user is authenticated, render immediately regardless of loading state
  if (user) return children
  // Still initializing - show spinner (but don't block if user is already set)
  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-xs text-slate-400">Initializing InfraNaut AI...</div>
      </div>
    </div>
  )
  // Not authenticated - redirect to login
  return <Navigate to="/auth" replace />
}

export default function App() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
    // Apply saved theme
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
          <Route path="map"         element={<Suspense fallback={<PageLoader />}><MapPage /></Suspense>} />
          <Route path="chat"        element={<Suspense fallback={<PageLoader />}><ChatPage /></Suspense>} />
          <Route path="nexora"      element={<Suspense fallback={<PageLoader />}><NexoraPage /></Suspense>} />
          <Route path="analytics"   element={<Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>} />
          <Route path="eco-route"   element={<Suspense fallback={<PageLoader />}><EcoRoutePage /></Suspense>} />
          <Route path="leaderboard" element={<Suspense fallback={<PageLoader />}><LeaderboardPage /></Suspense>} />
          <Route path="profile"     element={<Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>} />
          <Route path="tourism"     element={<Suspense fallback={<PageLoader />}><TourismPage /></Suspense>} />
          <Route path="events"      element={<Suspense fallback={<PageLoader />}><EventPage /></Suspense>} />
          <Route path="digital-twin" element={<Suspense fallback={<PageLoader />}><DigitalTwinPage /></Suspense>} />
          <Route path="admin"       element={<Suspense fallback={<PageLoader />}><AdminPage /></Suspense>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
