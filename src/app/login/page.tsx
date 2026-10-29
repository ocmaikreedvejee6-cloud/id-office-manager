'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) {
      setError('That email and password do not match. Check them and try again.')
      setBusy(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  const field = 'mt-1.5 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900'

  return (
    <main className="circuit relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-900 p-4">
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-red-600/35 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-44 -right-24 h-[30rem] w-[30rem] rounded-full bg-rose-700/30 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center gap-3 text-white">
          <span className="grad-red flex h-11 w-11 items-center justify-center rounded-xl text-base font-extrabold ring-1 ring-white/25">ID</span>
          <span>
            <span className="block text-lg font-bold leading-tight">ID Office Manager</span>
            <span className="block text-sm text-white/60">Sales and stock for the school ID office</span>
          </span>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-white/10 md:p-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
            <p className="mt-1 text-sm text-gray-600">Use the account your administrator created for you.</p>
          </div>
          <label className="block text-sm font-medium text-gray-800">Email
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          </label>
          <label className="block text-sm font-medium text-gray-800">Password
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button type="submit" disabled={busy}
            className="w-full rounded-lg bg-green-900 p-3.5 font-semibold text-white shadow-md shadow-red-900/25 disabled:opacity-60">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-white/50">Staff access only</p>
      </div>
    </main>
  )
}
