import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/auth'
import { createExhibition } from '../lib/create'
import { EASE } from './Motion'

// Admin only, on the home page: drop files here and a new exhibition opens with them on its walls.
export default function HomeDrop() {
  const { session, isAdmin, ready } = useAuth()
  const nav = useNavigate()
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  if (!session || !ready || !isAdmin) return null

  const start = async (files) => {
    setBusy(true); setErr(null)
    try { nav(`/studio/e/${(await createExhibition(files)).id}#add`) }
    catch (e) { setErr(e.message); setBusy(false) }
  }

  return (
    <motion.section className="homedrop wrap" aria-label="תערוכה חדשה"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }}>
      <div className={`homedrop__zone ${over ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = [...(e.dataTransfer.files || [])]; if (f.length) start(f) }}>
        <span className="homedrop__title">{busy ? 'פותחת חדר חדש…' : 'תערוכה חדשה'}</span>
        <span className="mono mute">גררי לכאן קבצים · כל סוג · כמה בבת אחת</span>
        <span className="homedrop__btn mono">בחירת קבצים</span>
        <input type="file" multiple aria-label="קבצים לתערוכה חדשה" disabled={busy}
          onChange={(e) => { const f = [...(e.target.files || [])]; e.target.value = ''; if (f.length) start(f) }} />
      </div>
      {err && <p className="mono" role="alert" style={{ color: '#8B2A1F' }}>היצירה נכשלה: {err}</p>}
    </motion.section>
  )
}
