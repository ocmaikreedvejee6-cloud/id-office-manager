'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type Row = {
  id: string; label: string; message: string; actor: string | null
  when: string; read: boolean; href: string | null
}

export default function NotificationList({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const unread = rows.filter((r) => !r.read).length

  async function open(r: Row) {
    if (!r.read) {
      const { error } = await createClient()
        .from('notifications').update({ read_at: new Date().toISOString() }).eq('id', r.id)
      if (error) return setError(error.message)
    }
    if (r.href) router.push(r.href)
    router.refresh()
  }

  async function markAll() {
    const { error } = await createClient()
      .from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null)
    if (error) return setError(error.message)
    router.refresh()
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
        No notifications yet.
      </div>
    )
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-gray-700">{unread} unread</p>
        {unread > 0 && (
          <button onClick={markAll} className="rounded-lg border border-green-900 px-3 py-2 text-sm font-medium text-green-900">
            Mark all as read
          </button>
        )}
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id}>
            <button onClick={() => open(r)}
              className={`w-full rounded-xl border p-4 text-left shadow-sm ${r.read ? 'border-gray-200 bg-white' : 'border-green-300 bg-green-50'}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-green-900">{r.label}</span>
                {!r.read && <span className="h-2 w-2 rounded-full bg-green-700" aria-label="Unread" />}
              </span>
              <span className="mt-1 block text-gray-900">{r.message}</span>
              <span className="mt-1 block text-xs text-gray-600">
                {r.when}{r.actor ? ` · ${r.actor}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
