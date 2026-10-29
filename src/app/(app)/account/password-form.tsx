'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const field = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900'

export default function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDone(false)
    if (password.length < 8) return setError('Use at least 8 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    const { error } = await createClient().auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(error.message)
    setPassword('')
    setConfirm('')
    setDone(true)
  }

  return (
    <form onSubmit={submit} className="max-w-md space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <label className="block text-sm font-medium text-gray-800">New password
        <input type="password" autoComplete="new-password" className={field} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </label>
      <label className="block text-sm font-medium text-gray-800">Repeat the new password
        <input type="password" autoComplete="new-password" className={field} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {done && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">Password changed. Use it the next time you sign in.</p>}
      <button disabled={busy} className="rounded-lg bg-green-900 px-6 py-3 font-semibold text-white disabled:opacity-60">
        {busy ? 'Saving…' : 'Change password'}
      </button>
    </form>
  )
}
