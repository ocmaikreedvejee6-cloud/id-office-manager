'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ApprovalButtons({ saleId, isOwn }: { saleId: string; isOwn: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function run(fn: 'approve_sale' | 'reject_sale', args: object) {
    setBusy(true)
    setError(null)
    const { error } = await createClient().rpc(fn, args)
    setBusy(false)
    if (error) return setError(error.message)
    router.refresh()
  }

  if (isOwn) {
    return (
      <div>
        <p className="mb-2 text-sm text-gray-600">You submitted this sale, so another account must approve it.</p>
        <button disabled={busy} onClick={() => run('reject_sale', { p_sale: saleId, p_reason: 'Withdrawn by submitter' })}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800 disabled:opacity-50">Withdraw</button>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {rejecting && (
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejecting"
          className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900" />
      )}
      <div className="flex gap-2">
        {!rejecting && (
          <button disabled={busy} onClick={() => run('approve_sale', { p_sale: saleId })}
            className="rounded-lg bg-green-900 px-5 py-2 font-semibold text-white disabled:opacity-50">
            {busy ? 'Working…' : 'Approve'}
          </button>
        )}
        {rejecting ? (
          <>
            <button disabled={busy || !reason.trim()} onClick={() => run('reject_sale', { p_sale: saleId, p_reason: reason })}
              className="rounded-lg bg-red-700 px-5 py-2 font-semibold text-white disabled:opacity-50">Confirm reject</button>
            <button onClick={() => setRejecting(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-800">Cancel</button>
          </>
        ) : (
          <button onClick={() => setRejecting(true)} className="rounded-lg border border-red-700 px-5 py-2 text-red-700">Reject</button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
