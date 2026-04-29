import { Polyline } from 'react-leaflet'
import { useCityStore } from '../../stores/cityStore'
import { memo } from 'react'

/**
 * TrafficLayer — renders colored route segments on the map.
 * Each segment is a multi-point Polyline (grouped by route chunk)
 * for smoother rendering vs individual coordinate pairs.
 */
function TrafficLayer() {
  const segments = useCityStore(s => s.trafficSegments)

  return (
    <>
      {segments.map((seg, i) => (
        <Polyline
          key={`traffic-seg-${i}`}
          positions={seg.positions}
          pathOptions={{
            color: seg.color,
            weight: 5,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
            smoothFactor: 1.5,
          }}
        />
      ))}
    </>
  )
}

export default memo(TrafficLayer)
