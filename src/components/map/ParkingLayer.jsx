import { CircleMarker, Popup } from 'react-leaflet'
import { useCityStore } from '../../stores/cityStore'

function getParkingColor(available, capacity) {
  const ratio = available / capacity
  if (ratio > 0.3) return '#22c55e'   // Green - available
  if (ratio > 0.1) return '#f97316'   // Orange - limited
  return '#ef4444'                     // Red - full
}

export default function ParkingLayer() {
  const spots = useCityStore(s => s.parkingSpots)

  return (
    <>
      {spots.map(spot => {
        const color = getParkingColor(spot.available, spot.capacity)
        return (
          <CircleMarker
            key={spot.id}
            center={[spot.lat, spot.lng]}
            radius={10}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.75,
              weight: 2.5,
              opacity: 1,
            }}
          >
            <Popup>
              <div style={{ minWidth: 180, fontFamily: 'Inter, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#0f172a' }}>
                  🅿️ {spot.name}
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{spot.area} · {spot.type}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#334155' }}>Available</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>
                    {spot.available} / {spot.capacity}
                  </span>
                </div>

                {/* Capacity bar */}
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: `${spot.occupancy}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
                </div>

                <div style={{ fontSize: 10, color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
                  🤖 AI Predicted (next hr): <b style={{ color: '#0d9488' }}>{spot.predicted} spots</b>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </>
  )
}
