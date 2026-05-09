import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Map as MapIcon, MessageSquare, LineChart,
  Trophy, User, LogOut, Sun, Moon, Bot, Leaf, Compass,
  Calendar, Globe, Shield
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import PointsFlash from '../gamification/PointsFlash'
import NotificationCenter from './NotificationCenter'
import { useState, useCallback } from 'react'

const BASE_NAV = [
  { path: '/app',             icon: LayoutDashboard, label: 'Dashboard',   end: true },
  { path: '/app/map',         icon: MapIcon,         label: 'City Map' },
  { path: '/app/chat',        icon: MessageSquare,   label: 'Community' },
  { path: '/app/nexora',      icon: Bot,             label: 'Nexora AI',   badge: 'AI' },
  { path: '/app/analytics',   icon: LineChart,       label: 'Analytics' },
  { path: '/app/eco-route',   icon: Leaf,            label: 'Eco Route' },
  { path: '/app/leaderboard', icon: Trophy,          label: 'Leaderboard' },
  { path: '/app/profile',     icon: User,            label: 'Profile' },
  { path: '/app/tourism',     icon: Compass,         label: 'Tourism AI' },
  { path: '/app/events',      icon: Calendar,        label: 'Events AI',   badge: 'NEW' },
  { path: '/app/digital-twin',icon: Globe,           label: '3D Twin',     badge: '3D' },
]

const ADMIN_NAV = {
  path: '/app/admin', icon: Shield, label: 'Admin Panel', badge: 'ADMIN', adminOnly: true
}

export default function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'))

  const isAdmin = ['super_admin', 'city_operator'].includes(profile?.role)

  const navItems = isAdmin ? [...BASE_NAV, ADMIN_NAV] : BASE_NAV

  const toggleTheme = useCallback(() => {
    const root = document.documentElement
    if (isDark) { root.classList.remove('dark'); localStorage.setItem('theme', 'light') }
    else { root.classList.add('dark'); localStorage.setItem('theme', 'dark') }
    setIsDark(p => !p)
  }, [isDark])

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <PointsFlash />

      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
          <img
            src="/InfraNaut logo.jpeg"
            alt="InfraNaut Logo"
            className="w-10 h-10 rounded-xl shadow-lg object-cover"
          />
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none tracking-tight">InfraNaut</h1>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-widest mt-1">Smart City</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? item.adminOnly
                      ? 'bg-red-500/10 text-red-500 dark:text-red-400'
                      : 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : item.adminOnly
                      ? 'text-red-400/70 hover:bg-red-500/5 hover:text-red-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon size={17} />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                  item.adminOnly
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          {/* User + theme toggle */}
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate block">
                {profile?.display_name || profile?.username || 'User'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-500 font-semibold">
                  {profile?.total_points?.toLocaleString() || 0} pts
                </span>
                {isAdmin && (
                  <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full font-bold capitalize">
                    {profile?.role?.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <NotificationCenter />
              <button
                onClick={toggleTheme}
                className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg w-full transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Mobile top bar — shows bell + theme toggle */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <img src="/InfraNaut logo.jpeg" alt="InfraNaut" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-slate-900 dark:text-white text-sm">InfraNaut</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <button
              onClick={toggleTheme}
              className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8 w-full">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around p-2 z-50">
        {BASE_NAV.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
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
