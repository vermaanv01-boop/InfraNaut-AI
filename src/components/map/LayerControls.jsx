import { useCityStore } from '../../stores/cityStore'
import { Layers, Car, ParkingMeter, Trash2, Zap } from 'lucide-react'

const LAYER_CONFIG = [
  { key: 'traffic', label: 'Traffic',  icon: Car,          color: '#3b82f6' },
  { key: 'parking', label: 'Parking',  icon: ParkingMeter, color: '#22c55e' },
  { key: 'waste',   label: 'Waste',    icon: Trash2,       color: '#8b5cf6' },
  { key: 'energy',  label: 'Energy',   icon: Zap,          color: '#f59e0b' },
]

export default function LayerControls() {
  const layers = useCityStore(s => s.layers)
  const toggleLayer = useCityStore(s => s.toggleLayer)

  return (
    <div className="absolute top-4 left-4 z-[400] pointer-events-auto">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/50 p-2.5 min-w-[150px]">
        <div className="flex items-center gap-1.5 px-2 pb-2 mb-1.5 border-b border-slate-100 dark:border-slate-800">
          <Layers size={13} className="text-slate-500" />
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Layers</span>
        </div>
        <div className="space-y-0.5">
          {LAYER_CONFIG.map(({ key, label, icon: Icon, color }) => {
            const active = layers[key]
            return (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0 transition-all"
                  style={{
                    background: active ? color : 'transparent',
                    border: `2px solid ${active ? color : '#94a3b8'}`,
                  }}
                />
                <Icon size={13} style={{ color: active ? color : undefined }} />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
