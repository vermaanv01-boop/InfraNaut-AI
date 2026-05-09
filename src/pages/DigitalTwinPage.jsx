import { useRef, useState, useEffect, useMemo, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Text } from '@react-three/drei'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import { BHOPAL_LANDMARKS } from '../data/bhopalLandmarks'
import { chatWithRAG } from '../lib/anythingllm'
import { supabase } from '../lib/supabase'
import { Send, Loader2, X, Bot, Navigation, Map, ExternalLink, MapPin, Clock, Users } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

function CityCore() {
  const mesh = useRef(); const glow = useRef()
  useFrame((s) => {
    if (mesh.current) { mesh.current.rotation.y += 0.003; mesh.current.position.y = Math.sin(s.clock.elapsedTime * 0.5) * 0.08 }
    if (glow.current) { glow.current.material.opacity = 0.12 + Math.sin(s.clock.elapsedTime * 1.2) * 0.06 }
  })
  return (
    <group>
      <mesh ref={glow}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      <mesh ref={mesh}>
        <sphereGeometry args={[1.0, 64, 64]} />
        <meshStandardMaterial color="#0e7490" emissive="#164e63" emissiveIntensity={0.8} roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.65, 0.008, 16, 100]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} />
      </mesh>
      <Text position={[0, 1.6, 0]} fontSize={0.22} color="#7dd3fc" anchorX="center" anchorY="middle">BHOPAL</Text>
      <Text position={[0, 1.35, 0]} fontSize={0.10} color="#94a3b8" anchorX="center" anchorY="middle">Digital Twin · Smart City</Text>
    </group>
  )
}

function Particles() {
  const ref = useRef()
  const pos = useMemo(() => {
    const a = new Float32Array(300 * 3)
    for (let i = 0; i < 300; i++) { a[i*3]=(Math.random()-.5)*20; a[i*3+1]=(Math.random()-.5)*10; a[i*3+2]=(Math.random()-.5)*20 }
    return a
  }, [])
  useFrame((s) => { if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.02 })
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry>
      <pointsMaterial size={0.035} color="#38bdf8" transparent opacity={0.5} />
    </points>
  )
}

function Ring({ radius, count, color, speed }) {
  const ref = useRef()
  const pos = useMemo(() => {
    const a = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) { const t = (i/count)*Math.PI*2; a[i*3]=Math.cos(t)*radius; a[i*3+1]=0; a[i*3+2]=Math.sin(t)*radius }
    return a
  }, [radius, count])
  useFrame(() => { if (ref.current) ref.current.rotation.y += speed })
  return (
    <points ref={ref}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[pos, 3]} /></bufferGeometry>
      <pointsMaterial size={0.045} color={color} transparent opacity={0.7} />
    </points>
  )
}

function LandmarkNode({ lm, idx, onSelect, isSelected }) {
  const grp = useRef(); const sph = useRef(); const glw = useRef()
  const angle = useRef(lm.angle)
  const col = useMemo(() => new THREE.Color(lm.color), [lm.color])

  useFrame((s) => {
    angle.current += lm.orbitSpeed
    if (grp.current) grp.current.position.set(Math.cos(angle.current)*lm.orbitRadius, Math.sin(s.clock.elapsedTime*.7+idx)*.18, Math.sin(angle.current)*lm.orbitRadius)
    if (sph.current) { sph.current.rotation.y += .012; sph.current.scale.setScalar(isSelected ? 1.35+Math.sin(s.clock.elapsedTime*3)*.08 : 1+Math.sin(s.clock.elapsedTime*1.5+idx)*.04) }
    if (glw.current) glw.current.material.opacity = isSelected ? .4+Math.sin(s.clock.elapsedTime*3)*.15 : .15+Math.sin(s.clock.elapsedTime*1.5+idx)*.08
  })

  return (
    <group ref={grp}>
      <mesh ref={glw}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={lm.glowColor} transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>
      <mesh ref={sph} onClick={(e) => { e.stopPropagation(); onSelect(lm) }} onPointerEnter={() => document.body.style.cursor='pointer'} onPointerLeave={() => document.body.style.cursor='default'}>
        <sphereGeometry args={[0.22, 32, 32]} />
        <meshStandardMaterial color={col} emissive={col} emissiveIntensity={isSelected ? 1.0 : 0.5} roughness={0.2} metalness={0.7} />
      </mesh>
      <Text position={[0, 0.42, 0]} fontSize={0.115} color={lm.glowColor} anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#000">{lm.shortName}</Text>
    </group>
  )
}

function Scene({ selectedId, onSelect }) {
  return (
    <>
      <color attach="background" args={['#020617']} />
      <fog attach="fog" args={['#020617', 18, 40]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 6, 0]} intensity={3} color="#06b6d4" />
      <pointLight position={[-6, 2, -6]} intensity={1.5} color="#4ade80" />
      <pointLight position={[6, 2, 6]} intensity={1.5} color="#818cf8" />
      <Stars radius={80} depth={60} count={4000} factor={3} saturation={0} fade speed={1} />
      <Particles />
      <Ring radius={2.2} count={60} color="#06b6d4" speed={0.005} />
      <Ring radius={4.6} count={100} color="#22c55e" speed={0.003} />
      <Ring radius={6.2} count={130} color="#6366f1" speed={0.002} />
      <mesh position={[0, -2.5, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[40, 40, 40, 40]} />
        <meshBasicMaterial color="#0f172a" wireframe transparent opacity={0.25} />
      </mesh>
      <CityCore />
      {BHOPAL_LANDMARKS.map((lm, i) => <LandmarkNode key={lm.id} lm={lm} idx={i} onSelect={onSelect} isSelected={selectedId === lm.id} />)}
      <OrbitControls enablePan={false} minDistance={4} maxDistance={14} maxPolarAngle={Math.PI/1.8} autoRotate autoRotateSpeed={0.5} />
    </>
  )
}

function Panel({ lm, onClose, onAskNexora, onViewMap }) {
  if (!lm) return null
  const cc = { High: 'text-red-400', Medium: 'text-yellow-400', Low: 'text-green-400' }

  const handleNavigate = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lm.lat},${lm.lng}&destination_place_id=${encodeURIComponent(lm.name)}`, '_blank')
  }

  return (
    <div className="absolute top-4 right-4 w-80 bg-slate-900/96 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl z-10 animate-fade-in-up">
      {/* Image header */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={lm.image} alt={lm.name} className="w-full h-full object-cover"
          onError={e => { e.target.src = `https://placehold.co/320x176/${lm.color.slice(1)}/fff?text=${encodeURIComponent(lm.shortName)}` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-2.5 right-2.5 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-black/80 transition-colors"
        >
          <X size={14} />
        </button>
        <span
          className="absolute top-2.5 left-2.5 text-[10px] px-2 py-0.5 rounded-full font-semibold"
          style={{ backgroundColor: lm.color + '33', color: lm.glowColor, border: `1px solid ${lm.color}55` }}
        >
          {lm.emoji} {lm.category}
        </span>
        {/* Landmark name over image */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-bold text-sm leading-tight drop-shadow-lg">{lm.name}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={9} className="text-cyan-400" />
            <span className="text-[10px] text-slate-300">{lm.period}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { label: 'Daily', value: lm.visitors, color: 'text-cyan-400' },
            { label: 'Crowd', value: lm.crowdLevel, color: cc[lm.crowdLevel] },
            { label: 'Peak', value: lm.peakTime.split('–')[0], color: 'text-white' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800/60 rounded-lg p-2 text-center">
              <div className="text-[9px] text-slate-500 mb-0.5">{label}</div>
              <span className={`text-[10px] font-bold ${color}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        <p className="text-slate-400 text-[11px] leading-relaxed mb-3">{lm.description}</p>

        {/* Facts */}
        <div className="space-y-1 mb-3">
          {lm.facts.slice(0, 3).map((f, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span style={{ color: lm.glowColor }} className="text-[10px] mt-0.5 flex-shrink-0">●</span>
              <span className="text-[10px] text-slate-400">{f}</span>
            </div>
          ))}
        </div>

        {/* Best time */}
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-2.5 py-1.5 mb-3">
          <span className="text-[9px] text-slate-500">🗓️ Best Time: </span>
          <span className="text-[10px] font-semibold text-green-400">{lm.bestTime}</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={handleNavigate}
            className="flex flex-col items-center gap-1 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-xl transition-colors text-blue-400 hover:text-blue-300"
          >
            <Navigation size={14} />
            <span className="text-[9px] font-semibold">Navigate</span>
          </button>
          <button
            onClick={() => onViewMap(lm)}
            className="flex flex-col items-center gap-1 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 rounded-xl transition-colors text-cyan-400 hover:text-cyan-300"
          >
            <Map size={14} />
            <span className="text-[9px] font-semibold">City Map</span>
          </button>
          <button
            onClick={() => onAskNexora(lm)}
            className="flex flex-col items-center gap-1 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-xl transition-colors text-purple-400 hover:text-purple-300"
          >
            <Bot size={14} />
            <span className="text-[9px] font-semibold">Ask AI</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function NexoraChat({ trigger }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([{role:'assistant',content:"🏙️ Hi! I'm **Nexora**. Click any orbiting landmark or ask me anything about Bhopal!"}])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  const endRef = useRef(); const lastTrigger = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({behavior:'smooth'}) }, [msgs, streamContent])
  useEffect(() => {
    if (trigger && trigger._t !== lastTrigger.current) {
      lastTrigger.current = trigger._t
      setOpen(true)
      doSend(`Tell me about ${trigger.name} in Bhopal — its history, best time to visit, and crowd tips.`)
    }
  }, [trigger])

  const doSend = async (content) => {
    if (!content || streaming) return
    setInput('')
    setMsgs(p => [...p, {role:'user', content}])
    setStreaming(true); setStreamContent('')
    try {
      const {data:{user}} = await supabase.auth.getUser()
      if (user) await supabase.from('chat_history').insert({role:'user',content,user_id:user.id})
      let full = ''
      await chatWithRAG(content, chunk => { full += chunk; setStreamContent(full) })
      if (user) await supabase.from('chat_history').insert({role:'assistant',content:full,user_id:user.id})
      setMsgs(p => [...p, {role:'assistant', content:full}])
    } catch { setMsgs(p => [...p, {role:'assistant', content:'⚠️ Connection error. Please try again.'}]) }
    finally { setStreamContent(''); setStreaming(false) }
  }

  const MD = ({content}) => (
    <ReactMarkdown components={{p:({children})=><p className="mb-0.5 last:mb-0">{children}</p>, strong:({children})=><strong className="text-cyan-400">{children}</strong>}}>
      {content}
    </ReactMarkdown>
  )

  return (
    <div className="absolute bottom-12 left-4 z-10 flex flex-col items-start gap-2">
      {open && (
        <div className="w-72 h-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
          <div className="p-3 border-b border-slate-800 flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center"><Bot size={13} className="text-white"/></div>
            <div className="flex-1"><div className="text-xs font-bold text-white">Nexora AI</div><div className="text-[9px] text-slate-500">Digital Twin Intelligence</div></div>
            <button onClick={()=>setOpen(false)} className="text-slate-500 hover:text-white"><X size={14}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {msgs.map((m,i)=>(
              <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
                <div className={`max-w-[90%] px-2.5 py-1.5 rounded-xl text-[11px] leading-relaxed ${m.role==='user'?'bg-cyan-600 text-white':'bg-slate-800 text-slate-200'}`}>
                  {m.role==='assistant'?<MD content={m.content}/>:m.content}
                </div>
              </div>
            ))}
            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-[90%] px-2.5 py-1.5 rounded-xl text-[11px] bg-slate-800 text-slate-200">
                  {streamContent?<MD content={streamContent}/>:<span className="flex gap-1 items-center py-0.5">{[0,100,200].map(d=><span key={d} className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}</span>}
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>
          <div className="p-2 border-t border-slate-800 flex gap-2 flex-shrink-0">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSend(input.trim())} placeholder="Ask about Bhopal..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"/>
            <button onClick={()=>doSend(input.trim())} disabled={!input.trim()||streaming} className="w-8 h-8 flex items-center justify-center bg-cyan-600 rounded-lg disabled:opacity-40 hover:bg-cyan-500 flex-shrink-0">
              {streaming?<Loader2 size={13} className="animate-spin text-white"/>:<Send size={13} className="text-white"/>}
            </button>
          </div>
        </div>
      )}
      <button onClick={()=>setOpen(!open)} className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/40 hover:scale-110 transition-transform border-2 border-cyan-400/30">
        <Bot size={20} className="text-white"/>
      </button>
    </div>
  )
}

function StatsOverlay() {
  const totalVisitors = BHOPAL_LANDMARKS.reduce((s, lm) => {
    const n = parseInt(lm.visitors.replace(/[^\d]/g, '')) || 0
    return s + n
  }, 0)
  const highCount = BHOPAL_LANDMARKS.filter(lm => lm.crowdLevel === 'High').length

  return (
    <div className="absolute top-4 left-4 z-10 space-y-3 pointer-events-none">
      {/* IOC header stats */}
      <div className="bg-slate-900/92 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Bhopal Digital Twin</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: 'Landmarks', value: String(BHOPAL_LANDMARKS.length), color: 'text-cyan-400' },
            { label: 'Daily Visitors', value: `${Math.round(totalVisitors / 1000)}K+`, color: 'text-green-400' },
            { label: 'High Crowd', value: `${highCount} sites`, color: 'text-red-400' },
            { label: 'Best Season', value: 'Oct–Mar', color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/60 rounded-lg p-2">
              <div className={`text-sm font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Landmark list — scrollable if many */}
      <div className="bg-slate-900/92 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 max-h-56 overflow-y-auto">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Active Landmarks</p>
        {BHOPAL_LANDMARKS.map(lm => (
          <div key={lm.id} className="flex items-center gap-2 mb-1.5">
            <span className="text-xs flex-shrink-0">{lm.emoji}</span>
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: lm.color }} />
            <span className="text-[10px] text-slate-300 flex-1 truncate">{lm.shortName}</span>
            <span className={`text-[9px] font-semibold flex-shrink-0 ${
              lm.crowdLevel === 'High' ? 'text-red-400' :
              lm.crowdLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'
            }`}>{lm.crowdLevel}</span>
          </div>
        ))}
      </div>

      {/* Instruction hint */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/30 rounded-lg px-3 py-2">
        <p className="text-[9px] text-slate-500">💡 Click a landmark for details & navigation</p>
      </div>
    </div>
  )
}

export default function DigitalTwinPage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [aiTrigger, setAiTrigger] = useState(null)

  const handleSelect = (lm) => {
    setSelected(lm)
    setAiTrigger({ ...lm, _t: Date.now() })
  }

  const handleViewMap = () => {
    navigate('/app/map')
  }

  const handleAskNexora = (lm) => {
    setAiTrigger({ ...lm, _t: Date.now() })
    setSelected(null)
  }

  return (
    <div className="relative bg-slate-950 overflow-hidden" style={{ margin: '-1rem', height: 'calc(100vh - 48px)' }}>
      <Canvas camera={{ position: [0, 3, 9], fov: 60 }} dpr={[1, Math.min(window.devicePixelRatio, 1.5)]} gl={{ antialias: true }}>
        <Suspense fallback={null}>
          <Scene selectedId={selected?.id} onSelect={handleSelect} />
        </Suspense>
      </Canvas>

      <StatsOverlay />
      <Panel
        lm={selected}
        onClose={() => setSelected(null)}
        onAskNexora={handleAskNexora}
        onViewMap={handleViewMap}
      />
      <NexoraChat trigger={aiTrigger} />
    </div>
  )
}
