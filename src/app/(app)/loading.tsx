export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Loading">
      <div className="h-8 w-56 rounded-lg bg-gray-200" />
      <div className="h-28 rounded-2xl bg-gray-200" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-200" />)}
      </div>
      <div className="h-48 rounded-xl bg-gray-200" />
    </div>
  )
}
