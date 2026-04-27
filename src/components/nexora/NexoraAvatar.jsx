// Nexora's circuit-node constellation avatar SVG
export default function NexoraAvatar({ size = 36, glow = false, className = '' }) {
  return (
    <div
      className={`flex-shrink-0 rounded-full flex items-center justify-center ${glow ? 'nexora-glow animate-pulse-teal' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #0d9488, #0f766e)',
        border: '1.5px solid rgba(20,184,166,0.5)',
      }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Circuit node constellation — Nexora's icon */}
        <circle cx="12" cy="4"  r="2" fill="#5eead4" />
        <circle cx="4"  cy="14" r="2" fill="#5eead4" />
        <circle cx="20" cy="14" r="2" fill="#5eead4" />
        <circle cx="12" cy="20" r="2" fill="#2dd4bf" />
        <circle cx="12" cy="12" r="2.5" fill="#fff" opacity="0.9" />

        {/* Connections */}
        <line x1="12" y1="6"  x2="12" y2="9.5"  stroke="#2dd4bf" strokeWidth="1.2" opacity="0.7" />
        <line x1="6"  y1="14" x2="9.5" y2="12"  stroke="#2dd4bf" strokeWidth="1.2" opacity="0.7" />
        <line x1="18" y1="14" x2="14.5" y2="12" stroke="#2dd4bf" strokeWidth="1.2" opacity="0.7" />
        <line x1="12" y1="14.5" x2="12" y2="18" stroke="#2dd4bf" strokeWidth="1.2" opacity="0.7" />
        <line x1="6"  y1="14" x2="10" y2="5.5"  stroke="#2dd4bf" strokeWidth="0.8" opacity="0.35" strokeDasharray="2 2" />
        <line x1="18" y1="14" x2="14" y2="5.5"  stroke="#2dd4bf" strokeWidth="0.8" opacity="0.35" strokeDasharray="2 2" />
        <line x1="6"  y1="14" x2="12" y2="18"   stroke="#2dd4bf" strokeWidth="0.8" opacity="0.35" strokeDasharray="2 2" />
        <line x1="18" y1="14" x2="12" y2="18"   stroke="#2dd4bf" strokeWidth="0.8" opacity="0.35" strokeDasharray="2 2" />
      </svg>
    </div>
  )
}
