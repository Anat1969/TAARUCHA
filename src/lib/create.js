import { supabase, T } from './supabase'
import { pad } from './data'
import { titleFromName } from '../studio/upload'

// One way to open a new exhibition, from anywhere (logo menu, home drop, studio list).
// Files dropped before the exhibition exists wait here until its editor opens and hangs them.
const pending = new Map()
export const takePendingFiles = (id) => { const f = pending.get(id); pending.delete(id); return f || null }

export async function createExhibition(files = []) {
  const { data: top } = await supabase.from(T.exhibitions).select('position').order('position', { ascending: false }).limit(1)
  const next = (top?.[0]?.position || 0) + 1
  const title = files.length ? titleFromName(files[0].name) || 'תערוכה חדשה' : 'תערוכה חדשה'
  const { data, error } = await supabase.from(T.exhibitions).insert({
    title, slug: `ex-${pad(next)}-${Date.now().toString(36)}`, code: `EX ${pad(next)}`,
    year: String(new Date().getFullYear()), position: next, status: 'draft',
  }).select().single()
  if (error) throw error
  if (files.length) pending.set(data.id, files)
  return data
}
