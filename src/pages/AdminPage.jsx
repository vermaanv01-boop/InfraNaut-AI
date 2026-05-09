import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, ROLES } from '../stores/authStore'
import { useCityStore } from '../stores/cityStore'
import { supabase } from '../lib/supabase'
import AdminEmailPanel from '../components/email/AdminEmailPanel'
import {
  Shield, BarChart2, FileText, Calendar, Users,
  Bot, RefreshCw, Loader2, AlertTriangle, CheckCircle,
  XCircle, Clock, Zap, Car, Trash2, Leaf, MapPin,
  ChevronDown, Eye, Edit2, Activity, TrendingUp, Mail
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { REPORT_CATEGORIES } from '../utils/constants'

// ── Access Guard ─────────────────────────────────────────
function AccessDenied() {
  const navigate = useNavigate()
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <Shield size={32} className="text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Restricted</h2>
      <p className="text-slate-500 text-sm mb-6 max-w-sm">
        The Admin Control Center requires <strong>City Operator</strong> or <strong>Super Admin</strong> privileges.
        Contact your city administrator to request elevated access.
      </p>
      <button onClick={() => navigate('/app')} className="btn-primary text-sm">
        Return to Dashboard
      </button>
    </div>
  )
}

// ── Stat Card ────────────────────────────────────────────
function AdminStatCard({ icon: Icon, label, value, sub, color = 'text-teal-500', accent }) {
  return (
    <div className={`card border-l-2 ${accent || 'border-l-teal-500'}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon size={16} className={color} />
        <span className="text-[10px] text-slate-400">{sub}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

// ── Report Row ────────────────────────────────────────────
function ReportRow({ report, onStatusChange }) {
  const [loading, setLoading] = useState(false)
  const cat = REPORT_CATEGORIES.find(c => c.id === report.category)

  const STATUS_OPTIONS = ['pending', 'verified', 'in_progress', 'resolved', 'rejected']
  const STATUS_COLORS = {
    pending: 'text-amber-400 bg-amber-500/10',
    verified: 'text-teal-400 bg-teal-500/10',
    in_progress: 'text-blue-400 bg-blue-500/10',
    resolved: 'text-green-400 bg-green-500/10',
    rejected: 'text-red-400 bg-red-500/10',
  }

  const handleChange = async (newStatus) => {
    setLoading(true)
    try {
      await supabase.from('reports').update({ status: newStatus }).eq('id', report.id)
      onStatusChange(report.id, newStatus)
    } catch (err) {
      console.error('Status update failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{cat?.icon || '📋'}</span>
          <div>
            <div className="text-xs font-medium text-slate-900 dark:text-white truncate max-w-[200px]">{report.description || 'No description'}</div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin size={8} />
              {report.zone || 'Unknown zone'}
            </div>
          </div>
        </div>
      </td>
      <td className="py-2.5 px-3">
        <span className="text-[10px] text-slate-500 font-medium">{cat?.label || report.category}</span>
      </td>
      <td className="py-2.5 px-3">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[report.status] || STATUS_COLORS.pending}`}>
          {report.status || 'pending'}
        </span>
      </td>
      <td className="py-2.5 px-3">
        <div className="text-[10px] text-slate-400">{new Date(report.created_at).toLocaleDateString()}</div>
      </td>
      <td className="py-2.5 px-3">
        {loading ? (
          <Loader2 size={12} className="animate-spin text-slate-400" />
        ) : (
          <select
            value={report.status || 'pending'}
            onChange={e => handleChange(e.target.value)}
            className="text-[10px] bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-slate-600 dark:text-slate-400 focus:outline-none"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        )}
      </td>
    </tr>
  )
}

// ── IOC Overview Tab ─────────────────────────────────────
function IOCOverview() {
  const trafficLevel = useCityStore(s => s.trafficLevel)
  const parkingSpots = useCityStore(s => s.parkingSpots)
  const wasteBins = useCityStore(s => s.wasteBins)
  const weather = useCityStore(s => s.weather)
  const aqi = useCityStore(s => s.aqi)

  const totalAvail = parkingSpots.reduce((s, p) => s + p.available, 0)
  const totalCap = parkingSpots.reduce((s, p) => s + p.capacity, 0)
  const overflows = wasteBins.filter(b => b.status === 'overflow').length
  const w = weather?.current

  const trafficChart = ['MP Nagar', 'Old City', 'Habibganj', 'Kolar', 'Piplani'].map((name, i) => ({
    name, Traffic: Math.max(5, Math.round(trafficLevel + Math.sin(i * 1.7) * 18)),
  }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AdminStatCard icon={Car} label="City Congestion" value={`${trafficLevel}%`}
          sub="Live" color="text-blue-400" accent={trafficLevel > 60 ? 'border-l-red-500' : 'border-l-blue-500'} />
        <AdminStatCard icon={Leaf} label="Air Quality" value={aqi?.label || '—'}
          sub={`AQI ${aqi?.value || '—'}`} color="text-green-400" accent="border-l-green-500" />
        <AdminStatCard icon={Trash2} label="Bin Overflows" value={overflows}
          sub="Active alerts" color={overflows > 0 ? 'text-red-400' : 'text-green-400'}
          accent={overflows > 0 ? 'border-l-red-500' : 'border-l-green-500'} />
        <AdminStatCard icon={Zap} label="Parking Available" value={totalAvail}
          sub={`of ${totalCap} total`} color="text-amber-400" accent="border-l-amber-500" />
      </div>

      {w && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Activity size={14} className="text-teal-500" /> Live Weather — Bhopal
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Temperature', value: `${w.temperature_2m}°C` },
              { label: 'Humidity', value: `${w.relative_humidity_2m}%` },
              { label: 'Wind', value: `${w.wind_speed_10m} km/h` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-0.5">{label}</div>
                <div className="text-base font-bold text-slate-900 dark:text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-teal-500" /> Zone Traffic Levels
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trafficChart} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#64748b" />
            <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="Traffic" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Parking Zone Status</h3>
        <div className="space-y-2">
          {parkingSpots.slice(0, 6).map(p => (
            <div key={p.id || p.name} className="flex items-center gap-3">
              <div className="text-xs text-slate-600 dark:text-slate-400 w-40 truncate">{p.name}</div>
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${p.occupancy}%`,
                    background: p.occupancy > 85 ? '#ef4444' : p.occupancy > 60 ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
              <div className="text-[10px] text-slate-500 w-12 text-right">{p.occupancy}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Report Management Tab ────────────────────────────────
function ReportManagement() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const fetchReports = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setReports(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleStatusChange = (id, newStatus) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
  }

  const filtered = filter === 'all' ? reports : reports.filter(r => (r.status || 'pending') === filter)

  const counts = reports.reduce((acc, r) => {
    const s = r.status || 'pending'; acc[s] = (acc[s] || 0) + 1; return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Citizen Reports</h2>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="inp text-xs py-1.5 w-auto"
          >
            <option value="all">All ({reports.length})</option>
            <option value="pending">Pending ({counts.pending || 0})</option>
            <option value="verified">Verified ({counts.verified || 0})</option>
            <option value="in_progress">In Progress ({counts.in_progress || 0})</option>
            <option value="resolved">Resolved ({counts.resolved || 0})</option>
            <option value="rejected">Rejected ({counts.rejected || 0})</option>
          </select>
          <button onClick={fetchReports} className="btn-secondary text-xs py-1.5 px-3">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <th className="py-2.5 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Report</th>
                <th className="py-2.5 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="py-2.5 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="py-2.5 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="py-2.5 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm"><Loader2 size={20} className="animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">No reports found.</td></tr>
              ) : filtered.map(r => (
                <ReportRow key={r.id} report={r} onStatusChange={handleStatusChange} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── User Management Tab ──────────────────────────────────
function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => { setUsers(data || []); setLoading(false) })
  }, [])

  const handleRoleChange = async (userId, newRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  const ROLE_COLORS = {
    super_admin: 'text-red-400 bg-red-500/10',
    city_operator: 'text-amber-400 bg-amber-500/10',
    traffic_manager: 'text-blue-400 bg-blue-500/10',
    waste_officer: 'text-green-400 bg-green-500/10',
    citizen: 'text-slate-400 bg-slate-500/10',
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">User Management</h2>
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              {['User', 'Zone', 'Points', 'Current Role', 'Assign Role'].map(h => (
                <th key={h} className="py-2.5 px-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center"><Loader2 size={20} className="animate-spin mx-auto text-slate-400" /></td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-slate-600 flex items-center justify-center text-[10px] font-bold text-white">
                      {u.display_name?.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-900 dark:text-white">{u.display_name || u.username}</div>
                      <div className="text-[10px] text-slate-400">{u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-xs text-slate-500">{u.zone || '—'}</td>
                <td className="py-2.5 px-3 text-xs font-semibold text-amber-500">{u.total_points?.toLocaleString() || 0}</td>
                <td className="py-2.5 px-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role || 'citizen']}`}>
                    {u.role || 'citizen'}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <select
                    value={u.role || 'citizen'}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    className="text-[10px] bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-1 text-slate-600 dark:text-slate-400 focus:outline-none"
                  >
                    {Object.values(ROLES).map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── AI Control Center ────────────────────────────────────
function AIControlCenter() {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Bot size={16} className="text-teal-500" /> AI Control Center
      </h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Active Agents</h3>
          <div className="space-y-2">
            {[
              { name: 'Traffic Agent', status: 'Active', color: 'text-green-400' },
              { name: 'Parking Agent', status: 'Active', color: 'text-green-400' },
              { name: 'Weather Agent', status: 'Active', color: 'text-green-400' },
              { name: 'AQI Agent', status: 'Active', color: 'text-green-400' },
              { name: 'Waste Agent', status: 'Active', color: 'text-green-400' },
              { name: 'Event Agent', status: 'Active', color: 'text-green-400' },
              { name: 'Eco-Route Agent', status: 'Active', color: 'text-green-400' },
              { name: 'Citizen Assistant', status: 'Active', color: 'text-green-400' },
            ].map(agent => (
              <div key={agent.name} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className="text-xs text-slate-700 dark:text-slate-300">{agent.name}</span>
                <span className={`text-[10px] font-semibold flex items-center gap-1 ${agent.color}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {agent.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Model Configuration</h3>
          <div className="space-y-3">
            {[
              { label: 'Primary Model', value: 'openai/gpt-oss-20b:free', hint: 'Via OpenRouter' },
              { label: 'RAG Backend', value: 'AnythingLLM (local)', hint: 'Port 3001 → OpenRouter fallback' },
              { label: 'Max Tokens', value: '512 tokens/response', hint: 'Reduced for speed' },
              { label: 'Temperature', value: '0.4 (factual mode)', hint: 'Lower = more grounded' },
              { label: 'Context Strategy', value: 'Scoped per agent', hint: '~70% fewer tokens vs full dump' },
            ].map(({ label, value, hint }) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5">
                <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">{value}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">{hint}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700/30">
        <div className="flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">API Key Notice</div>
            <p className="text-[11px] text-amber-600 dark:text-amber-500 leading-relaxed">
              Ensure <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">VITE_OPENROUTER_API_KEY</code> is set in your <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">.env</code> file.
              The Nexora AI system uses the free tier <strong>gpt-oss-20b</strong> model via OpenRouter.
              Upgrade to a paid key for Claude 3.5 or GPT-4o.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TABS ─────────────────────────────────────────────────
const TABS = [
  { id: 'ioc',     label: 'IOC Overview', Icon: Activity },
  { id: 'reports', label: 'Reports',      Icon: FileText },
  { id: 'users',   label: 'Users',        Icon: Users },
  { id: 'ai',      label: 'AI Control',   Icon: Bot },
  { id: 'email',   label: 'Email',        Icon: Mail },
]

// ── Main Admin Page ───────────────────────────────────────
export default function AdminPage() {
  const { profile } = useAuthStore()
  const initCity = useCityStore(s => s.initCity)
  const destroyCity = useCityStore(s => s.destroyCity)
  const [tab, setTab] = useState('ioc')

  const isAdmin = ['super_admin', 'city_operator'].includes(profile?.role)

  useEffect(() => {
    if (isAdmin) { initCity(); return () => destroyCity() }
  }, [isAdmin])

  if (!isAdmin) return <AccessDenied />

  const roleLabel = profile?.role?.replace('_', ' ') || 'operator'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield size={22} className="text-red-400" />
            Admin Control Center
          </h1>
          <p className="text-slate-500 text-xs mt-0.5 capitalize">
            Logged in as <strong className="text-teal-500">{roleLabel}</strong> · Bhopal IOC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
            ADMIN MODE
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === id
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {tab === 'ioc'     && <IOCOverview />}
        {tab === 'reports' && <ReportManagement />}
        {tab === 'users'   && <UserManagement />}
        {tab === 'ai'      && <AIControlCenter />}
        {tab === 'email'   && (
          <div className="card">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-5">
              <Mail size={16} className="text-teal-500" /> Email Control Center
            </h2>
            <AdminEmailPanel />
          </div>
        )}
      </div>
    </div>
  )
}
