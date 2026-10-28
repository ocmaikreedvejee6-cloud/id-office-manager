import { createClient } from '@/lib/supabase/client'

const BUCKET = 'product-images'
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export function checkImage(file: File): string | null {
  if (!ALLOWED.includes(file.type)) return 'Use a JPG, PNG or WebP picture.'
  if (file.size > 15 * 1024 * 1024) return 'That picture is too large (max 15 MB).'
  return null
}

// Shrinks the picture to at most 800px so uploads stay small and pages load fast on phones.
async function resize(file: File, max = 800): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((ok, fail) =>
    c.toBlob((b) => (b ? ok(b) : fail(new Error('Could not process the picture'))), 'image/jpeg', 0.85))
}

export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const blob = await resize(file)
  const path = `${productId}/${crypto.randomUUID()}.jpg`
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw new Error(error.message)
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
