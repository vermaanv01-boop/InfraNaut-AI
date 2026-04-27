import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Map, MessageSquare, Bot,
  BarChart2, Leaf, Trophy, User, LogOut
} from 'lucide-react'
import NexoraAvatar from '../nexora/NexoraAvatar'
import { useAuthStore } from '../../stores/authStore'

const NAV = [
  { path: '/',            label: 'Dashboard',   Icon: LayoutDashboard },
  { path: '/map',         label: 'City Map',    Icon: Map },
  { path: '/chat',        label: 'Community',   Icon: MessageSquare },
  { path: '/nexora',      label: 'Nexora AI',   Icon: Bot },
  { path: '/analytics',   label: 'Analytics',   Icon: BarChart2 },
  { path: '/eco-route',   label: 'Eco Route',   Icon: Leaf },
  { path: '/leaderboard', label: 'Leaderboard', Icon: Trophy },
  { path: '/profile',     label: 'Profile',     Icon: User },
]

export default function Sidebar() {
  const { profile, signOut } = useAuthStore()

  return (
    <aside className="sidebar fixed left-0 top-0 h-screen w-60 flex flex-col z-40"
      style={{ background: 'linear-gradient(180deg, #042f2e 0%, #0a0f1a 100%)', borderRight: '1px solid rgba(20,184,166,0.1)' }}
    >
      {/* Logo */}
      <div className="p-5 pb-4 flex items-center gap-3 border-b border-teal-900/40">
        <NexoraAvatar size={36} />
        <div>
          <div className="font-bold text-white text-sm leading-tight">InfraNaut AI</div>
          <div className="text-[10px] text-teal-400 font-medium">Smart City Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `nav-link flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'active text-teal-400 bg-teal-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Icon size={17} />
            <span>{label}</span>
            {label === 'Nexora AI' && (
              <span className="ml-auto text-[9px] font-bold bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full">AI</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      {profile && (
        <div className="p-3 border-t border-teal-900/40">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-teal-900/20 transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-700 to-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {profile.display_name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">{profile.display_name}</div>
              <div className="text-[10px] text-amber-400 font-medium">{profile.total_points?.toLocaleString() || 0} pts</div>
            </div>
            <button onClick={signOut} className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
