import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const font = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans-app' })

export const metadata: Metadata = {
  title: { default: 'ID Office Manager', template: '%s · ID Office' },
  description: 'Inventory and sales tracking for the school ID office',
}
export const viewport: Viewport = { themeColor: '#0b0e14' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={font.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
