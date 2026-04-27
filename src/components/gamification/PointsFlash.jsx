import { usePointsStore } from '../../stores/pointsStore'

export default function PointsFlash() {
  const flash = usePointsStore(s => s.flash)
  if (!flash) return null

  return (
    <div
      key={flash.id}
      className="fixed top-20 right-6 z-[9999] point-flash pointer-events-none"
      style={{ fontSize: '15px', fontWeight: 700 }}
    >
      <span className="bg-amber-500/90 text-slate-900 px-3 py-1.5 rounded-full shadow-lg">
        +{flash.points} pts ⚡
      </span>
    </div>
  )
}
