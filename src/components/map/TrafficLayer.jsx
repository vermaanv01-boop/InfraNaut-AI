import { Polyline, Popup } from 'react-leaflet'
import { useCityStore } from '../../stores/cityStore'
import { memo } from 'react'

/** Returns weight & opacity based on traffic color (severity hierarchy) */
function getSegmentStyle(color) {
  if (color === '#ef4444') return { weight: 7, opacity: 0.92 }  // Red → Heavy
  if (color === '#eab308') return { weight: 5, opacity: 0.85 }  // Yellow → Moderate
  return { weight: 3.5, opacity: 0.75 }                         // Green → Clear
}

function getTrafficLabel(color) {
  if (color === '#ef4444') return { level: 'Heavy', speed: '< 20 km/h', advice: 'Consider alternate routes' }
  if (color === '#eab308') return { level: 'Moderate', speed: '20–40 km/h', advice: 'Expect some delays' }
  return { level: 'Clear', speed: '> 40 km/h', advice: 'Good to go!' }
}

function TrafficLayer() {
  const segments = useCityStore(s => s.trafficSegments)

  return (
    <>
      {segments.map((seg, i) => {
        const { weight, opacity } = getSegmentStyle(seg.color)
        const { level, speed, advice } = getTrafficLabel(seg.color)

        return (
          <Polyline
            key={`traffic-seg-${i}`}
            positions={seg.positions}
            pathOptions={{
              color: seg.color,
              weight,
              opacity,
              lineCap: 'round',
              lineJoin: 'round',
              smoothFactor: 2,
            }}
          >
            <Popup>
              <div style={{
                fontFamily: 'Inter, system-ui, sans-serif',
                minWidth: 160,
                fontSize: 12,
                lineHeight: 1.5,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginBottom: 8, paddingBottom: 6,
                  borderBottom: '1px solid #e2e8f0',
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: seg.color, flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    Traffic · {level}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>Speed</span>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>{speed}</span>
                </div>
                <div style={{
                  marginTop: 8, padding: '4px 8px',
                  background: seg.color + '18', borderRadius: 6,
                  fontSize: 11, color: '#334155',
                }}>
                  💡 {advice}
                </div>
              </div>
            </Popup>
          </Polyline>
        )
      })}
    </>
  )
}

export default memo(TrafficLayer)
