import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Map as MapIcon, MessageSquare, LineChart, Route, Trophy, User, LogOut, Sun, Moon, Bot, Leaf } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { usePointsStore } from '../../stores/pointsStore'
import PointsFlash from '../gamification/PointsFlash'
import { useState } from 'react'

const NAV_ITEMS = [
  { path: '/app',            icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/app/map',        icon: MapIcon,         label: 'City Map' },
  { path: '/app/chat',       icon: MessageSquare,   label: 'Community' },
  { path: '/app/nexora',     icon: Bot,             label: 'Nexora AI', badge: 'AI' },
  { path: '/app/analytics',  icon: LineChart,       label: 'Analytics' },
  { path: '/app/eco-route',  icon: Leaf,            label: 'Eco Route' },
  { path: '/app/leaderboard',icon: Trophy,          label: 'Leaderboard' },
  { path: '/app/profile',    icon: User,            label: 'Profile' },
]

export default function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'))

  const toggleTheme = () => {
    const root = document.documentElement
    if (isDark) { root.classList.remove('dark'); localStorage.setItem('theme', 'light') }
    else { root.classList.add('dark'); localStorage.setItem('theme', 'dark') }
    setIsDark(!isDark)
  }

  const handleSignOut = async () => { await signOut() }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <PointsFlash />

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <div className="p-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">InfraNaut AI</h1>
          <p className="text-xs text-slate-500 mt-1">Smart City Platform</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/app'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon size={18} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4 px-3">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate block">
                {profile?.display_name || profile?.username}
              </span>
              <span className="text-xs text-amber-500 font-semibold">{profile?.total_points?.toLocaleString() || 0} pts</span>
            </div>
            <button onClick={toggleTheme} className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg w-full transition-colors">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around p-2 z-50">
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/app'}
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-lg text-[10px] font-medium transition-colors ${
                isActive 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <item.icon size={20} className="mb-1" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
