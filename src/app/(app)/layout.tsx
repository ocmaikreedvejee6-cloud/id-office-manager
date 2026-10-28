import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role, is_active').eq('id', user.id).single()

  // Signed in to Supabase but not an active staff member: no access.
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  const { count: unread } = await supabase
    .from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null)

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/pos', label: 'Record Sale' },
    { href: '/approvals', label: 'Approvals' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/sales', label: 'History' },
    { href: '/reports', label: 'Reports' },
    ...(profile.role === 'admin' ? [{ href: '/settings', label: 'Settings' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-100 pb-20 md:pb-0">
      <header className="print:hidden flex items-center justify-between bg-green-900 px-4 py-3 text-white">
        <span className="font-bold">ID Office Manager</span>
        <form action={signOut} className="flex items-center gap-3 text-sm">
          <Link href="/notifications" className="relative rounded border border-white/40 px-3 py-1">
            Alerts
            {(unread ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                {unread! > 99 ? '99+' : unread}
              </span>
            )}
          </Link>
          <span>{profile.full_name} ({profile.role})</span>
          <button className="rounded border border-white/40 px-3 py-1">Sign out</button>
        </form>
      </header>

      <nav className="print:hidden hidden gap-1 border-b border-gray-200 bg-white px-4 md:flex">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="px-3 py-3 text-sm font-medium text-green-900 hover:bg-gray-100">
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mx-auto max-w-5xl p-4">{children}</div>

      <nav className="print:hidden fixed inset-x-0 bottom-0 flex overflow-x-auto border-t border-gray-200 bg-white md:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="min-w-[5.5rem] flex-1 shrink-0 py-4 text-center text-xs font-medium text-green-900">
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
