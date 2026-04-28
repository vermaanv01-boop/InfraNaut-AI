import { useState } from 'react'
import { Navigate, Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { BHOPAL_WARDS } from '../utils/constants'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState(searchParams.get('mode') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [zone, setZone] = useState(BHOPAL_WARDS[0])
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, signIn, signUp } = useAuthStore()

  if (user) {
    return <Navigate to="/app" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        if (!username.trim()) throw new Error('Username is required')
        await signUp(email, password, username.trim(), zone)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6">
          <ArrowLeft size={16} className="mr-1" /> Back to Home
        </Link>
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-slate-200 dark:border-slate-800">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                <div className="mt-1">
                  <input className="inp" required value={username} onChange={e => setUsername(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email address</label>
              <div className="mt-1">
                <input type="email" required className="inp" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <div className="mt-1 relative">
                <input type={showPass ? 'text' : 'password'} required className="inp pr-10" value={password} onChange={e => setPassword(e.target.value)} minLength={6} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Zone</label>
                <div className="mt-1">
                  <select className="inp" value={zone} onChange={e => setZone(e.target.value)}>
                    {BHOPAL_WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-md text-sm border border-red-200 dark:border-red-800/30">
                {error}
              </div>
            )}

            <div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }} className="text-sm font-medium text-primary-600 hover:text-primary-500">
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
