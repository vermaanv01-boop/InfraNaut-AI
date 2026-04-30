import { useCityStore } from '../../stores/cityStore'
import { Car, ParkingMeter, Trash2, Zap, Layers } from 'lucide-react'
import { memo } from 'react'

const LAYER_CONFIG = [
  {
    key: 'traffic',
    label: 'Traffic',
    icon: Car,
    color: '#ef4444',
    activeGlow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    activeBg: 'bg-red-500/10 border-red-500/40 text-red-300',
    inactiveBg: 'bg-transparent border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-200',
    dot: 'bg-red-500',
  },
  {
    key: 'parking',
    label: 'Parking',
    icon: ParkingMeter,
    color: '#22c55e',
    activeGlow: 'shadow-[0_0_8px_rgba(34,197,94,0.5)]',
    activeBg: 'bg-green-500/10 border-green-500/40 text-green-300',
    inactiveBg: 'bg-transparent border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-200',
    dot: 'bg-green-500',
  },
  {
    key: 'waste',
    label: 'Waste',
    icon: Trash2,
    color: '#a855f7',
    activeGlow: 'shadow-[0_0_8px_rgba(168,85,247,0.5)]',
    activeBg: 'bg-purple-500/10 border-purple-500/40 text-purple-300',
    inactiveBg: 'bg-transparent border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-200',
    dot: 'bg-purple-500',
  },
  {
    key: 'energy',
    label: 'Energy',
    icon: Zap,
    color: '#f59e0b',
    activeGlow: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    activeBg: 'bg-amber-500/10 border-amber-500/40 text-amber-300',
    inactiveBg: 'bg-transparent border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-200',
    dot: 'bg-amber-500',
  },
]

function LayerControls() {
  const layers = useCityStore(s => s.layers)
  const toggleLayer = useCityStore(s => s.toggleLayer)

  return (
    <div
        className="rounded-xl border border-slate-700/50 overflow-hidden"
        style={{
          background: 'rgba(8, 15, 30, 0.82)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          minWidth: 148,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-700/50">
          <Layers size={12} className="text-cyan-400" />
          <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-widest">Layers</span>
        </div>

        {/* Layer buttons */}
        <div className="p-1.5 space-y-1">
          {LAYER_CONFIG.map(({ key, label, icon: Icon, activeBg, inactiveBg, activeGlow, dot }) => {
            const active = layers[key]
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  active ? `${activeBg} ${activeGlow}` : inactiveBg
                }`}
              >
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-200 ${
                  active ? `${dot} shadow-sm` : 'bg-slate-600'
                }`} />
                <Icon size={13} />
                <span className="flex-1 text-left">{label}</span>
                {/* Active indicator */}
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      </div>
  )
}

export default memo(LayerControls)
