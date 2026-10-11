import { supabase, BUCKET } from '../lib/supabase'

// Uploads a file to the public media bucket and returns its public URL.
export async function uploadFile(file, folder = 'misc') {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export function slugify(s) {
  const base = (s || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || `ex-${Date.now().toString(36)}`
}

export const MAX_BYTES = 50 * 1024 * 1024

const ext = (name) => (name.split('.').pop() || '').toLowerCase()

// What a dropped file becomes on the wall.
export function kindOf(file) {
  const t = file.type || ''
  if (t.startsWith('image/') && !/heic|heif/.test(t)) return 'image'
  if (t.startsWith('video/')) return 'video'
  if (t === 'application/pdf' || ext(file.name) === 'pdf') return 'pdf'
  return 'document'
}

export const isPdf = (url) => /\.pdf($|\?)/i.test(url || '')

// File name → readable title: "ted_flyer-02.pdf" → "ted flyer 02"
export function titleFromName(name) {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

// Renders the first page of a PDF (File or URL) to a JPEG File, for the wall and the cover.
export async function pdfPreview(src, width = 1800) {
  const pdfjs = await import('pdfjs-dist')
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = worker
  const data = typeof src === 'string' ? { url: src } : { data: new Uint8Array(await src.arrayBuffer()) }
  const doc = await pdfjs.getDocument(data).promise
  const page = await doc.getPage(1)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: width / base.width })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.86))
  const pages = doc.numPages
  doc.destroy()
  return { file: new File([blob], 'preview.jpg', { type: 'image/jpeg' }), pages }
}

// Uploads any file and returns the fields of the work it becomes.
export async function workFromFile(file, folder) {
  if (file.size > MAX_BYTES) throw new Error(`הקובץ גדול מ־50MB (${Math.round(file.size / 1048576)}MB). לסרטון ארוך עדיף קישור יוטיוב או וימאו.`)
  const kind = kindOf(file)
  const title = titleFromName(file.name)
  if (kind === 'image') return { type: 'image', layout: 'full', title, media_url: await uploadFile(file, folder) }
  if (kind === 'video') return { type: 'video', layout: 'wide', title, media_url: await uploadFile(file, folder) }
  const file_url = await uploadFile(file, folder)
  let media_url = null, medium = ext(file.name).toUpperCase()
  if (kind === 'pdf') {
    try {
      const p = await pdfPreview(file)
      media_url = await uploadFile(p.file, folder)
      medium = `PDF · ${p.pages} ${p.pages === 1 ? 'עמוד' : 'עמודים'}`
    } catch { /* keep the document without a preview */ }
  }
  return { type: 'document', layout: 'full', title, medium, media_url, file_url, file_name: file.name }
}
