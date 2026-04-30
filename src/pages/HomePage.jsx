import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Sun, Moon, X, ArrowRight, Sparkles, Car, ParkingMeter, Trash2, Zap, Wind } from 'lucide-react'

const FEATURES = [
  {
    icon: Car,
    title: 'Traffic Intelligence',
    desc: 'Real-time congestion monitoring and smart routing.',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    glow: 'group-hover:shadow-orange-500/20',
    detail: {
      heading: 'AI-Powered Traffic Intelligence',
      body: 'Monitor real-time traffic congestion across Bhopal with color-coded road segments. Our system uses time-based simulation to predict traffic patterns — green for clear roads, yellow for moderate, and red for heavy congestion. Receive smart routing suggestions and estimated travel times.',
      useCases: [
        'Commute planning based on live traffic data',
        'Emergency vehicle routing optimization',
        'City-wide congestion pattern analysis',
      ],
    },
  },
  {
    icon: ParkingMeter,
    title: 'Smart Parking',
    desc: 'AI-predicted spot availability across the city.',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    glow: 'group-hover:shadow-blue-500/20',
    detail: {
      heading: 'Smart Parking Prediction System',
      body: 'Track 15+ parking zones across Bhopal with AI-predicted availability. The system considers time-of-day patterns, area type, and current traffic levels to forecast occupancy. Color-coded markers instantly show available (green), limited (orange), and full (red) lots.',
      useCases: [
        'Find nearest available parking to your destination',
        'Predict parking availability for future trips',
        'Reduce urban congestion from parking searches',
      ],
    },
  },
  {
    icon: Trash2,
    title: 'Waste Monitoring',
    desc: 'IoT bin capacity tracking with overflow alerts.',
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-900/20',
    glow: 'group-hover:shadow-green-500/20',
    detail: {
      heading: 'Intelligent Waste Management',
      body: 'Monitor waste bin fill levels in real-time across 18+ locations. Bins approaching overflow trigger automatic alerts, enabling optimized collection routes and preventing unsanitary conditions. Reduce operational costs with data-driven pickup scheduling.',
      useCases: [
        'Automated overflow alerts for sanitation teams',
        'Optimized garbage collection routing',
        'Community cleanliness score tracking',
      ],
    },
  },
  {
    icon: Sun,
    title: 'Weather Analytics',
    desc: 'Micro-climate data & reliable forecasts.',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    glow: 'group-hover:shadow-amber-500/20',
    detail: {
      heading: 'Hyper-Local Weather Intelligence',
      body: 'Access accurate temperature, humidity, wind speed, and precipitation data specific to Bhopal. The system caches and refreshes data every 10 minutes from Open-Meteo, providing reliable forecasts that directly integrate with infrastructure predictions.',
      useCases: [
        'Weather-adjusted traffic and parking predictions',
        'Flood and storm preparedness alerts',
        'Urban planning based on climate patterns',
      ],
    },
  },
  {
    icon: Zap,
    title: 'Energy Insights',
    desc: 'City-wide power consumption zone mapping.',
    color: 'text-teal-500',
    bg: 'bg-teal-50 dark:bg-teal-900/20',
    glow: 'group-hover:shadow-teal-500/20',
    detail: {
      heading: 'Energy Grid Monitoring',
      body: 'Visualize power consumption across 6 energy zones with real-time load tracking. Zone overlays on the map show intensity — from efficient green zones to high-demand red zones. Identify energy peaks and plan load distribution.',
      useCases: [
        'Peak load detection and management',
        'Zone-wise energy efficiency analysis',
        'Renewable energy integration planning',
      ],
    },
  },
  {
    icon: Wind,
    title: 'Air Quality',
    desc: 'Live AQI & pollution tracking across zones.',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    glow: 'group-hover:shadow-indigo-500/20',
    detail: {
      heading: 'Air Quality Intelligence',
      body: 'Track the US AQI index for Bhopal with color-coded health recommendations. The system monitors particulate matter and pollution levels, providing clear Good/Moderate/Unhealthy classifications to help citizens make informed outdoor activity decisions.',
      useCases: [
        'Health advisories for sensitive groups',
        'School and outdoor event planning',
        'Long-term pollution trend analysis',
      ],
    },
  },
]

function FeatureModal({ feature, onClose }) {
  if (!feature) return null
  const Icon = feature.icon
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/50 max-w-lg w-full animate-fade-in-up overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${feature.color === 'text-orange-500' ? 'from-orange-400 to-orange-600' : feature.color === 'text-blue-500' ? 'from-blue-400 to-blue-600' : feature.color === 'text-green-600' ? 'from-green-400 to-green-600' : feature.color === 'text-amber-500' ? 'from-amber-400 to-amber-600' : feature.color === 'text-teal-500' ? 'from-teal-400 to-teal-600' : 'from-indigo-400 to-indigo-600'}`} />

        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <X size={18} />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-xl ${feature.bg}`}>
              <Icon size={24} className={feature.color} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{feature.detail.heading}</h3>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">{feature.detail.body}</p>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Use Cases</h4>
            <ul className="space-y-2.5">
              {feature.detail.useCases.map((uc, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
                  <ArrowRight size={14} className={`mt-0.5 flex-shrink-0 ${feature.color}`} />
                  {uc}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex justify-end">
            <Link to="/auth?mode=signup" className="btn-primary text-sm py-2.5 px-5">
              <Sparkles size={14} /> Get Started
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { user } = useAuthStore()
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    const dark = saved === 'dark'
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    return dark
  })
  const [activeFeature, setActiveFeature] = useState(null)

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    if (next) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark') }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light') }
  }

  if (user) return <Navigate to="/app" replace />

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors font-sans">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-8 py-5">
        <div className="flex items-center gap-2 relative z-10">
          <img src="/InfraNaut logo.jpeg" alt="InfraNaut Logo" className="w-10 h-10 rounded-xl shadow-lg object-cover border border-slate-200 dark:border-slate-800" />
          <span className="text-xl font-bold text-slate-900 dark:text-white">InfraNaut AI</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-all"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/auth" className="hidden sm:inline-flex text-white/90 font-medium hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/10">
            Log In
          </Link>
          <Link to="/auth?mode=signup" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-teal-500/25">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden min-h-[85vh]">
        <div
          className="absolute inset-0 z-0 animate-slow-zoom"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=2000&auto=format&fit=crop')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-50 dark:to-slate-950" />

        <div className="relative z-20 max-w-4xl w-full text-center space-y-8 px-6 mt-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm text-white/90 mb-4">
            <Sparkles size={14} className="text-teal-300" />
            AI-Powered Smart City Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight">
            Pathways to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-300">Sustainable Cities</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed drop-shadow">
            Monitor traffic, parking, waste, weather, and energy grids in real-time. Powered by AI predictions and citizen engagement.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/auth?mode=signup" className="bg-teal-500 hover:bg-teal-400 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-teal-500/30 text-base">
              Start For Free
            </Link>
            <a href="#features" className="bg-white/10 hover:bg-white/20 text-white border border-white/30 backdrop-blur-md px-8 py-3.5 rounded-xl font-medium transition-all text-base">
              Explore Features
            </a>
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="relative z-20 bg-slate-50 dark:bg-slate-950 py-24 px-6 transition-colors">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Core Intelligence</h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg max-w-xl mx-auto">Everything you need to monitor and improve urban living — click any card to learn more.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <button
                key={i}
                onClick={() => setActiveFeature(f)}
                className={`group text-left bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:-translate-y-1.5 hover:shadow-xl ${f.glow} transition-all duration-300 cursor-pointer`}
              >
                <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{f.desc}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Learn more <ArrowRight size={12} />
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 px-6 text-center transition-colors">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} InfraNaut AI — Smart City Digital Twin Platform · Bhopal, India
        </p>
      </footer>

      {/* Feature Detail Modal */}
      <FeatureModal feature={activeFeature} onClose={() => setActiveFeature(null)} />
    </div>
  )
}
