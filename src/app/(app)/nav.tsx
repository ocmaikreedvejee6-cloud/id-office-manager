'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Bell, ClipboardCheck, History, LayoutDashboard, Package, Settings, ShoppingCart, Users } from 'lucide-react'

const ICONS = {
  dashboard: LayoutDashboard, sale: ShoppingCart, approvals: ClipboardCheck, inventory: Package,
  history: History, reports: BarChart3, alerts: Bell, settings: Settings, users: Users,
}
export type NavLink = { href: string; label: string; icon: keyof typeof ICONS; badge?: number }

export default function Nav({ links, variant }: { links: NavLink[]; variant: 'side' | 'tabs' }) {
  const path = usePathname()
  const isActive = (href: string) => (href === '/' ? path === '/' : path.startsWith(href))

  if (variant === 'side') {
    return (
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Main">
        {links.map((l) => {
          const Icon = ICONS[l.icon]
          const on = isActive(l.href)
          return (
            <Link key={l.href} href={l.href} aria-current={on ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                on ? 'grad-red text-white shadow-lg shadow-red-900/30' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              <span className="flex-1">{l.label}</span>
              {!!l.badge && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-green-900">
                  {l.badge > 99 ? '99+' : l.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex overflow-x-auto px-1 py-1" aria-label="Main">
      {links.map((l) => {
        const Icon = ICONS[l.icon]
        const on = isActive(l.href)
        return (
          <Link key={l.href} href={l.href} aria-current={on ? 'page' : undefined}
            className={`relative flex min-w-[4.75rem] flex-1 shrink-0 flex-col items-center gap-0.5 rounded-lg py-2 text-[11px] font-medium ${
              on ? 'bg-green-50 text-green-900' : 'text-gray-600'}`}>
            <Icon className="h-5 w-5" aria-hidden />
            {l.label}
            {!!l.badge && (
              <span className="absolute right-3 top-1 rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-green-900">
                {l.badge > 99 ? '99+' : l.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
