import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ID Office Manager',
    short_name: 'ID Office',
    description: 'Inventory and sales tracking for the school ID office',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f4f6',
    theme_color: '#14532d',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
