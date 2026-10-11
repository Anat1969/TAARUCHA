import { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase, T } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { workFromFile } from '../studio/upload'
import { EASE } from './Motion'

// Admin only: drop files straight onto the exhibition page; each becomes a work on this wall.
export default function PageDrop({ ex, works, onAdded }) {
  const { session, isAdmin, ready } = useAuth()
  const [over, setOver] = useState(false)
  const [items, setItems] = useState([])
  if (!session || !ready || !isAdmin) return null

  const add = async (files) => {
    const list = files.map((f, k) => ({ id: `${Date.now()}-${k}`, name: f.name, state: 'up', file: f }))
    setItems(list.map(({ file, ...r }) => r))
    let pos = works.length ? Math.max(...works.map((w) => w.position)) : 0
    const jobs = list.map((it) => ({ it, position: ++pos }))
    let cover = null
    const run = async ({ it, position }) => {
      try {
        const fields = await workFromFile(it.file, `ex-${ex.id}`)
        const { data, error } = await supabase.from(T.works).insert({ exhibition_id: ex.id, year: ex.year, position, ...fields }).select().single()
        if (error) throw error
        if (!cover && data.media_url && data.type !== 'video') cover = data.media_url
        setItems((q) => q.map((x) => (x.id === it.id ? { ...x, state: 'done' } : x)))
      } catch (e) {
        setItems((q) => q.map((x) => (x.id === it.id ? { ...x, state: 'err', error: e.message || 'ההעלאה נכשלה' } : x)))
      }
    }
    await Promise.all(Array.from({ length: 3 }, async () => { while (jobs.length) await run(jobs.shift()) }))
    if (cover && !ex.cover_url) await supabase.from(T.exhibitions).update({ cover_url: cover }).eq('id', ex.id)
    onAdded()
  }

  const busy = items.some((q) => q.state === 'up')
  return (
    <motion.section className="pagedrop wrap" aria-label="הוספת חומרים לתערוכה"
      initial={{ opacity: 0, y: 30, rotateX: 10 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.9, ease: EASE }}>
      <div className={`pagedrop__zone ${over ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = [...(e.dataTransfer.files || [])]; if (f.length) add(f) }}>
        <span className="mono mute">מצב עריכה · {works.length ? `${works.length} עבודות על הקיר` : 'הקיר עדיין ריק'}</span>
        <span className="pagedrop__title">{busy ? 'מעלה לקיר…' : 'גררי לכאן חומרים לתערוכה'}</span>
        <span className="mono mute">תמונות · PDF · פליירים · מסמכים · סרטונים — כמה בבת אחת</span>
        <span className="pagedrop__btn mono">בחירת קבצים</span>
        <input type="file" multiple aria-label="בחירת קבצים להעלאה" onChange={(e) => { const f = [...(e.target.files || [])]; if (f.length) add(f); e.target.value = '' }} />
      </div>
      {items.length > 0 && (
        <ul className="pagedrop__list mono" aria-live="polite">
          {items.map((q) => <li key={q.id} className={q.state}><span>{q.name}</span><span>{q.state === 'up' ? 'מעלה…' : q.state === 'done' ? 'על הקיר' : q.error}</span></li>)}
        </ul>
      )}
    </motion.section>
  )
}
