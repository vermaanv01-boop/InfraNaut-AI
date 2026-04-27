import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Map, MessageSquare, Bot, Trophy } from 'lucide-react'

const TABS = [
  { path: '/',        label: 'Home',    Icon: LayoutDashboard },
  { path: '/map',     label: 'Map',     Icon: Map },
  { path: '/chat',    label: 'Chat',    Icon: MessageSquare },
  { path: '/nexora',  label: 'Nexora',  Icon: Bot },
  { path: '/leaderboard', label: 'Ranks', Icon: Trophy },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-50 px-2 pb-1"
      style={{
        background: 'rgba(4,47,46,0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(20,184,166,0.15)',
      }}
    >
      <div className="flex items-center justify-around">
        {TABS.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all ${
                isActive ? 'text-teal-400' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-teal-500/15' : ''}`}>
                  <Icon size={18} />
                </div>
                <span className="text-[9px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
