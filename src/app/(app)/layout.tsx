import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import Nav, { type NavLink } from './nav'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg grad-red text-sm font-extrabold text-white ring-1 ring-white/25">ID</span>
      <span className="leading-tight">
        <span className="block text-sm font-bold">ID Office</span>
        <span className="block text-xs text-white/60">Manager</span>
      </span>
    </div>
  )
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

  const [unread, pending] = await Promise.all([
    supabase.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null),
    supabase.from('sales').select('id', { count: 'exact', head: true }).eq('approval_status', 'pending'),
  ])

  const links: NavLink[] = [
    { href: '/', label: 'Dashboard', icon: 'dashboard' },
    { href: '/pos', label: 'Record Sale', icon: 'sale' },
    { href: '/approvals', label: 'Approvals', icon: 'approvals', badge: pending.count ?? 0 },
    { href: '/inventory', label: 'Inventory', icon: 'inventory' },
    { href: '/sales', label: 'History', icon: 'history' },
    { href: '/reports', label: 'Reports', icon: 'reports' },
    { href: '/notifications', label: 'Alerts', icon: 'alerts', badge: unread.count ?? 0 },
    ...(profile.role === 'admin' ? [{ href: '/settings', label: 'Settings', icon: 'settings' } as NavLink] : []),
  ]

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col circuit border-r border-white/5 bg-ink-900 text-white md:flex print:hidden">
        <div className="px-5 py-6"><Brand /></div>
        <Nav links={links} variant="side" />
        <form action={signOut} className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-semibold">{profile.full_name}</p>
          <p className="mb-3 text-xs capitalize text-white/60">{profile.role}</p>
          <button className="flex w-full items-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-sm text-white/90 hover:bg-white/10">
            <LogOut className="h-4 w-4" aria-hidden /> Sign out
          </button>
        </form>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between circuit border-b border-red-600/40 bg-ink-900 px-4 py-3 text-white md:hidden print:hidden">
        <Brand />
        <form action={signOut}>
          <button aria-label="Sign out" className="rounded-lg border border-white/25 p-2"><LogOut className="h-4 w-4" /></button>
        </form>
      </header>

      <main className="px-4 pb-28 pt-5 md:ml-60 md:px-10 md:pb-12 md:pt-8 print:m-0 print:p-0">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white md:hidden print:hidden">
        <Nav links={links} variant="tabs" />
      </div>
    </div>
  )
}
