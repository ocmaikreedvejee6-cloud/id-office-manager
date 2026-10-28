'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PaymentMethods({ methods }: { methods: string[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function save(next: string[]) {
    setError(null)
    const { error } = await createClient().from('system_settings').update({ value: next }).eq('key', 'payment_methods')
    if (error) return setError(error.message)
    setName('')
    router.refresh()
  }

  function add() {
    const n = name.trim()
    if (!n) return
    if (methods.some((m) => m.toLowerCase() === n.toLowerCase())) return setError('That method already exists.')
    save([...methods, n])
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold text-gray-900">Payment methods</h2>
      <ul className="space-y-2">
        {methods.map((m) => (
          <li key={m} className="flex items-center justify-between">
            <span className="text-gray-900">{m}</span>
            <button disabled={methods.length <= 1} onClick={() => save(methods.filter((x) => x !== m))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 disabled:opacity-40">Remove</button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add method (e.g. Maya)"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 p-3 text-gray-900" />
        <button onClick={add} className="rounded-lg bg-green-900 px-4 font-semibold text-white">Add</button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      <p className="mt-3 text-xs text-gray-600">This only records how a customer paid. Nothing is processed.</p>
    </section>
  )
}
