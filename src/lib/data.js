import { useEffect, useState } from 'react'
import { supabase, T } from './supabase'

export async function fetchExhibitions() {
  const { data, error } = await supabase
    .from(T.exhibitions)
    .select('*, works:taarucha_works(id, media_url, type)')
    .eq('status', 'published')
    .order('position', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchExhibition(slug) {
  const { data, error } = await supabase
    .from(T.exhibitions)
    .select('*, works:taarucha_works(*)')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  if (data) data.works = [...(data.works || [])].sort((a, b) => a.position - b.position)
  return data
}

export async function fetchAllWorks() {
  const { data, error } = await supabase
    .from(T.works)
    .select('*, exhibition:taarucha_exhibitions!inner(slug, code, title, status)')
    .eq('exhibition.status', 'published')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchSettings() {
  const { data } = await supabase.from(T.settings).select('*').eq('id', 1).maybeSingle()
  return data || {}
}

export function useAsync(fn, deps = []) {
  const [state, set] = useState({ loading: true, data: null, error: null })
  useEffect(() => {
    let alive = true
    set((s) => ({ ...s, loading: true }))
    fn()
      .then((data) => alive && set({ loading: false, data, error: null }))
      .catch((error) => alive && set({ loading: false, data: null, error }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return state
}

export function pad(n) { return String(n).padStart(2, '0') }

export function videoEmbed(url) {
  if (!url) return null
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?dnt=1`
  return null
}

export function splitBody(body) {
  return (body || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
}

export const TYPE_LABEL = { image: 'דימוי', text: 'טקסט', video: 'וידאו', composite: 'דימוי וטקסט', document: 'מסמך' }

// Media stored as "/media/..." lives in the site's public folder; prefix it with the deploy base.
export function asset(url) {
  if (!url) return url
  if (url.startsWith('/') && !url.startsWith('//')) return import.meta.env.BASE_URL.replace(/\/$/, '') + url
  return url
}
export const SITE = (path = '') => import.meta.env.BASE_URL.replace(/\/$/, '') + path
