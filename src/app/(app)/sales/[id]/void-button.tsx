'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VoidButton({ saleId }: { saleId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    const { error } = await createClient().rpc('void_sale', { p_sale: saleId, p_reason: reason })
    setBusy(false)
    if (error) return setError(error.message)
    router.refresh()
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="rounded-lg border border-red-700 px-4 py-2 text-red-700">Void this sale</button>
  }
  return (
    <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-900">Voiding returns the items to stock and cannot be undone.</p>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)"
        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900" />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button disabled={busy || !reason.trim()} onClick={confirm}
          className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Voiding…' : 'Confirm void'}</button>
        <button onClick={() => setOpen(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800">Cancel</button>
      </div>
    </div>
  )
}
