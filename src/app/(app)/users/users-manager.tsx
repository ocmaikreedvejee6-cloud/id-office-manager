'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createUser, resetPassword, updateUser } from './actions'

type Perms = { adjust_stock: boolean; void_sale: boolean; approve_sale: boolean }
export type UserRow = {
  id: string; email: string; full_name: string; role: 'admin' | 'supervisor'
  is_active: boolean; permissions: Perms; isMe: boolean
}

const input = 'mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900'
const PERM_LABELS: [keyof Perms, string][] = [
  ['approve_sale', 'Can approve other people’s sales'],
  ['void_sale', 'Can void approved sales'],
  ['adjust_stock', 'Can adjust stock'],
]

function makePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (n) => chars[n % chars.length]).join('')
}

export default function UsersManager({ users, canManageLogins }: { users: UserRow[]; canManageLogins: boolean }) {
  const router = useRouter()
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {notice && (
        <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>
      )}
      {canManageLogins && <AddUser onDone={(m) => { setNotice(m); router.refresh() }} />}
      <ul className="space-y-3">
        {users.map((u) => (
          <UserCard key={u.id} u={u} canManageLogins={canManageLogins}
            onDone={(m) => { setNotice(m); router.refresh() }} />
        ))}
      </ul>
    </div>
  )
}

function AddUser({ onDone }: { onDone: (msg: string) => void }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ email: '', fullName: '', role: 'supervisor' as 'admin' | 'supervisor', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const res = await createUser(f)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    onDone(`Created ${f.fullName}. Temporary password: ${f.password} — share it privately and ask them to change it under Change password.`)
    setF({ email: '', fullName: '', role: 'supervisor', password: '' })
    setOpen(false)
  }

  if (!open) {
    return <button onClick={() => { setOpen(true); setF((x) => ({ ...x, password: makePassword() })) }}
      className="rounded-lg bg-green-900 px-5 py-2.5 font-semibold text-white">+ Add user</button>
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-gray-900">Add user</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-medium text-gray-800">Full name
          <input className={input} value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} required />
        </label>
        <label className="block text-sm font-medium text-gray-800">Email
          <input className={input} type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        </label>
        <label className="block text-sm font-medium text-gray-800">Role
          <select className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as 'admin' | 'supervisor' })}>
            <option value="supervisor">Supervisor (records sales)</option>
            <option value="admin">Admin (approves, voids, manages)</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-800">Temporary password
          <span className="flex gap-2">
            <input className={input} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} />
            <button type="button" onClick={() => setF({ ...f, password: makePassword() })}
              className="mt-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-800">New</button>
          </span>
        </label>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-lg bg-green-900 px-5 py-2.5 font-semibold text-white disabled:opacity-60">{busy ? 'Creating…' : 'Create user'}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-gray-800">Cancel</button>
      </div>
    </form>
  )
}

function UserCard({ u, canManageLogins, onDone }: { u: UserRow; canManageLogins: boolean; onDone: (msg: string) => void }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'reset'>('view')
  const [role, setRole] = useState(u.role)
  const [active, setActive] = useState(u.is_active)
  const [perms, setPerms] = useState(u.permissions)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setError(null)
    const res = await updateUser(u.id, { role, is_active: active, permissions: perms })
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setMode('view')
    onDone(`Saved changes for ${u.full_name}.`)
  }

  async function reset() {
    setBusy(true)
    setError(null)
    const res = await resetPassword(u.id, password)
    setBusy(false)
    if (!res.ok) return setError(res.error)
    setMode('view')
    onDone(`New password for ${u.full_name}: ${password} — share it privately and ask them to change it under Change password.`)
    setPassword('')
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{u.full_name}{u.isMe && <span className="ml-2 text-xs font-normal text-gray-600">(you)</span>}</p>
          <p className="text-sm text-gray-600">{u.email || 'Email hidden until the server key is set'}</p>
        </div>
        <span className="flex gap-2 text-xs font-medium">
          <span className="rounded bg-gray-100 px-2 py-1 capitalize text-gray-800">{u.role}</span>
          <span className={`rounded px-2 py-1 ${u.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-200 text-gray-800'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
        </span>
      </div>

      {mode === 'view' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => setMode('edit')} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800">Edit role and access</button>
          {canManageLogins && <button onClick={() => { setMode('reset'); setPassword(makePassword()) }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800">Reset password</button>}
        </div>
      )}

      {mode === 'edit' && (
        <div className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3">
          <label className="block text-sm font-medium text-gray-800">Role
            <select className={input} value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'supervisor')}>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {PERM_LABELS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-3 text-sm text-gray-900">
              <input type="checkbox" className="h-5 w-5" checked={perms[k]} onChange={(e) => setPerms({ ...perms, [k]: e.target.checked })} />
              {label}
            </label>
          ))}
          <label className="flex items-center gap-3 text-sm text-gray-900">
            <input type="checkbox" className="h-5 w-5" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Account is active (inactive people cannot use the app)
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button disabled={busy} onClick={save} className="rounded-lg bg-green-900 px-5 py-2 font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Save'}</button>
            <button onClick={() => { setMode('view'); setError(null) }} className="rounded-lg border border-gray-300 px-5 py-2 text-gray-800">Cancel</button>
          </div>
        </div>
      )}

      {mode === 'reset' && (
        <div className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3">
          <label className="block text-sm font-medium text-gray-800">New temporary password
            <span className="flex gap-2">
              <input className={input} value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
              <button type="button" onClick={() => setPassword(makePassword())} className="mt-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-800">New</button>
            </span>
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button disabled={busy || password.length < 8} onClick={reset} className="rounded-lg bg-green-900 px-5 py-2 font-semibold text-white disabled:opacity-60">{busy ? 'Saving…' : 'Set password'}</button>
            <button onClick={() => { setMode('view'); setError(null) }} className="rounded-lg border border-gray-300 px-5 py-2 text-gray-800">Cancel</button>
          </div>
        </div>
      )}
    </li>
  )
}
