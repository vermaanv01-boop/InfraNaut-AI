import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import AppLayout from './components/layout/AppLayout'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import MapPage from './pages/MapPage'
import ChatPage from './pages/ChatPage'
import AnalyticsPage from './pages/AnalyticsPage'
import NexoraPage from './pages/NexoraPage'
import EcoRoutePage from './pages/EcoRoutePage'
import LeaderboardPage from './pages/LeaderboardPage'
import ProfilePage from './pages/ProfilePage'
import TourismPage from './pages/TourismPage'
import EventPage from './pages/EventPage'
import DigitalTwinPage from './pages/DigitalTwinPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
  const { initialize } = useAuthStore()
  
  useEffect(() => { 
    initialize()
    // Default to light mode if not set
    if (!localStorage.getItem('theme')) {
      document.documentElement.classList.remove('dark')
    } else if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark')
    }
  }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="map" element={<MapPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="nexora" element={<NexoraPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="eco-route" element={<EcoRoutePage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="tourism" element={<TourismPage />} />
          <Route path="events" element={<EventPage />} />
          <Route path="digital-twin" element={<DigitalTwinPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
