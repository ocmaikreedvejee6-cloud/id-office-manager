'use client'

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white">
      Print receipt
    </button>
  )
}
