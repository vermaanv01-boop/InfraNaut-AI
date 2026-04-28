import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Activity, Map, Sun, Wind, BatteryCharging, ShieldCheck, Globe } from 'lucide-react'

export default function HomePage() {
  const { user } = useAuthStore()

  if (user) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors font-sans">
      {/* Header with Logo */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          {/* Logo Placeholder (Replace with your actual image if uploaded) */}
          <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white shadow-lg">
            <Globe size={24} />
          </div>
          <span className="text-2xl font-bold text-white tracking-wide shadow-sm">InfraNaut AI</span>
        </div>
        <div className="flex gap-4">
          <Link to="/auth" className="text-white font-medium hover:text-teal-300 transition-colors px-4 py-2">
            Log In
          </Link>
          <Link to="/auth?mode=signup" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold px-5 py-2 rounded-lg transition-colors shadow-lg">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero Section with Premium Background */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden min-h-[80vh]">
        {/* Background Image with slow zoom animation */}
        <div 
          className="absolute inset-0 z-0 animate-slow-zoom"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=2000&auto=format&fit=crop')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* Warm Gradient Overlay */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-50/90 dark:to-slate-950/90" />
        
        <div className="relative z-20 max-w-4xl w-full text-center space-y-8 px-6 mt-16">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight drop-shadow-md">
            Pathways to <br />
            <span className="text-teal-300">Sustainable Cities</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-100 max-w-2xl mx-auto leading-relaxed drop-shadow">
            A professional smart city dashboard powered by AI and real-time IoT sensors. 
            Monitor traffic, waste, parking, weather, and energy grids seamlessly.
          </p>

          <div className="flex items-center justify-center gap-4 pt-8">
            <a href="#features" className="bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-md px-8 py-3 rounded-lg font-medium transition-colors">
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* Features Section - Warm Professional Colors */}
      <div id="features" className="relative z-20 bg-slate-50 dark:bg-slate-950 py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Core Intelligence</h2>
            <p className="text-slate-600 dark:text-slate-400">Everything you need to monitor and improve urban living.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {[
              { icon: Activity, title: 'Traffic Flow', desc: 'Real-time congestion monitoring and routing.', color: 'text-orange-500', bg: 'bg-orange-50' },
              { icon: ShieldCheck, title: 'Waste Management', desc: 'IoT bin capacity tracking and predictions.', color: 'text-green-600', bg: 'bg-green-50' },
              { icon: Map, title: 'Smart Parking', desc: 'Live spot availability maps for the city.', color: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: Sun, title: 'Weather Analytics', desc: 'Micro-climate data & reliable forecasts.', color: 'text-amber-500', bg: 'bg-amber-50' },
              { icon: BatteryCharging, title: 'Energy Grids', desc: 'City-wide power consumption metrics.', color: 'text-teal-600', bg: 'bg-teal-50' },
              { icon: Wind, title: 'Air Quality', desc: 'Live AQI & comprehensive pollution tracking.', color: 'text-indigo-500', bg: 'bg-indigo-50' }
            ].map((Feature, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:-translate-y-1 hover:shadow-md transition-all">
                <div className={`w-12 h-12 ${Feature.bg} dark:bg-slate-800 rounded-xl flex items-center justify-center mb-4`}>
                  <Feature.icon className={`w-6 h-6 ${Feature.color}`} />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-lg mb-2">{Feature.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{Feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
