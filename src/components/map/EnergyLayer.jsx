import { Polygon, Popup } from 'react-leaflet'
import { useCityStore } from '../../stores/cityStore'
import { memo } from 'react'

function getEnergyColor(intensity) {
  if (intensity > 0.8) return { color: '#ef4444', fill: 'rgba(239,68,68,0.2)' }
  if (intensity > 0.5) return { color: '#f59e0b', fill: 'rgba(245,158,11,0.15)' }
  return { color: '#22c55e', fill: 'rgba(34,197,94,0.12)' }
}

function EnergyLayer() {
  const zones = useCityStore(s => s.energyZones)

  return (
    <>
      {zones.map(zone => {
        const { color, fill } = getEnergyColor(zone.intensity)
        return (
          <Polygon
            key={zone.id}
            positions={zone.polygon}
            pathOptions={{ color, fillColor: fill, fillOpacity: 0.5, weight: 2, dashArray: '6 4' }}
          >
            <Popup>
              <div style={{ minWidth: 160, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#0f172a' }}>
                  ⚡ {zone.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#334155' }}>Current Load</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{zone.currentLoad} MW</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#334155' }}>Base Capacity</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{zone.baseLoad} MW</span>
                </div>
                <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
                  <div style={{ height: '100%', width: `${Math.min(100, zone.intensity * 100)}%`, background: color, borderRadius: 3 }} />
                </div>
              </div>
            </Popup>
          </Polygon>
        )
      })}
    </>
  )
}

export default memo(EnergyLayer)
