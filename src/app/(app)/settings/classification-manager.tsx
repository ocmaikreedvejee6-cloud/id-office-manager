'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Item = { id: string; name: string; is_active: boolean }

export default function ClassificationManager({
  table, title, items,
}: { table: 'courses' | 'categories'; title: string; items: Item[] }) {
  const router = useRouter()
  const [newName, setNewName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function run(op: PromiseLike<{ error: { message: string } | null }>) {
    setError(null)
    const { error } = await op
    if (error) return setError(error.message.includes('duplicate') ? 'That name already exists.' : error.message)
    setEditing(null)
    setNewName('')
    router.refresh()
  }

  const db = () => createClient().from(table)

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-gray-900">{title}</h2>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2">
            {editing === i.id ? (
              <>
                <input value={text} onChange={(e) => setText(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 p-2 text-gray-900" />
                <button onClick={() => text.trim() && run(db().update({ name: text.trim() }).eq('id', i.id))}
                  className="rounded-lg bg-green-900 px-3 py-2 text-sm text-white">Save</button>
                <button onClick={() => setEditing(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800">Cancel</button>
              </>
            ) : (
              <>
                <span className={i.is_active ? 'text-gray-900' : 'text-gray-500 line-through'}>{i.name}</span>
                <span className="flex gap-2">
                  <button onClick={() => { setEditing(i.id); setText(i.name) }}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800">Rename</button>
                  <button onClick={() => run(db().update({ is_active: !i.is_active }).eq('id', i.id))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800">
                    {i.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add new…"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 p-3 text-gray-900" />
        <button onClick={() => newName.trim() && run(db().insert({ name: newName.trim() }))}
          className="rounded-lg bg-green-900 px-4 font-semibold text-white">Add</button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      <p className="mt-3 text-xs text-gray-600">Renaming or deactivating never changes past sales.</p>
    </section>
  )
}
