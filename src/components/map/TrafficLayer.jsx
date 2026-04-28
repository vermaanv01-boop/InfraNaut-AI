import { Polyline } from 'react-leaflet'
import { useCityStore } from '../../stores/cityStore'

export default function TrafficLayer() {
  const segments = useCityStore(s => s.trafficSegments)

  return (
    <>
      {segments.map((seg, i) => (
        <Polyline
          key={i}
          positions={seg.positions}
          pathOptions={{ color: seg.color, weight: 5, opacity: 0.8, lineCap: 'round' }}
        />
      ))}
    </>
  )
}
