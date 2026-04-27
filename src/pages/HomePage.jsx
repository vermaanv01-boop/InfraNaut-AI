import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Activity, Map, Sun, Wind, BatteryCharging, ShieldCheck } from 'lucide-react'

export default function HomePage() {
  const { user } = useAuthStore()

  if (user) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors">
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white tracking-tight">
            City Intelligence <span className="text-primary-600">Reimagined.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A professional smart city dashboard powered by AI and real-time IoT sensors. 
            Monitor traffic, waste, parking, weather, and energy grids seamlessly.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Link to="/auth" className="btn-primary px-8 py-3 text-base">
            Log In / Sign Up
          </Link>
          <a href="#features" className="btn-secondary px-8 py-3 text-base">
            Learn More
          </a>
        </div>

        <div id="features" className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-16 text-left">
          {[
            { icon: Activity, title: 'Traffic Flow', desc: 'Real-time congestion monitoring.' },
            { icon: ShieldCheck, title: 'Waste Management', desc: 'IoT bin capacity tracking.' },
            { icon: Map, title: 'Smart Parking', desc: 'Live spot availability maps.' },
            { icon: Sun, title: 'Weather Analytics', desc: 'Micro-climate data & forecasts.' },
            { icon: BatteryCharging, title: 'Energy Grids', desc: 'City-wide power consumption.' },
            { icon: Wind, title: 'Air Quality', desc: 'Live AQI & pollution tracking.' }
          ].map((Feature, i) => (
            <div key={i} className="card hover:-translate-y-1 transition-transform">
              <Feature.icon className="w-8 h-8 text-primary-600 mb-3" />
              <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{Feature.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{Feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
