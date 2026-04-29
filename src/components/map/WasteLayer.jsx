import { CircleMarker, Popup } from 'react-leaflet'
import { useCityStore } from '../../stores/cityStore'
import { memo } from 'react'

function getBinColor(status) {
  if (status === 'overflow') return '#ef4444'
  if (status === 'high') return '#f97316'
  return '#22c55e'
}

function WasteLayer() {
  const bins = useCityStore(s => s.wasteBins)

  return (
    <>
      {bins.map(bin => {
        const color = getBinColor(bin.status)
        return (
          <CircleMarker
            key={bin.id}
            center={[bin.lat, bin.lng]}
            radius={7}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.7, weight: 2 }}
          >
            <Popup>
              <div style={{ minWidth: 150, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#0f172a' }}>
                  🗑️ {bin.name}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#334155' }}>Fill Level</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{bin.fillLevel}%</span>
                </div>
                <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${bin.fillLevel}%`, background: color, borderRadius: 3 }} />
                </div>
                {bin.status === 'overflow' && (
                  <div style={{ marginTop: 6, fontSize: 10, color: '#ef4444', fontWeight: 600 }}>⚠️ OVERFLOW — Pickup needed</div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}

export default memo(WasteLayer)
