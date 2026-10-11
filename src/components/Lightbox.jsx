import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Prose, VideoPlayer, DocCard } from './Work'
import { pad, TYPE_LABEL, asset } from '../lib/data'
import { EASE } from './Motion'

export default function Lightbox({ works, index, onClose, onIndex }) {
  const [zoom, setZoom] = useState(null)
  const w = index != null ? works[index] : null

  useEffect(() => {
    if (index == null) return
    setZoom(null)
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && index < works.length - 1) onIndex(index + 1)
      if (e.key === 'ArrowRight' && index > 0) onIndex(index - 1)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [index, works.length, onClose, onIndex])

  return (
    <AnimatePresence>
      {w && (
        <motion.div className="lb" role="dialog" aria-modal="true" aria-label={w.title || 'עבודה'}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
          <button className="lb__close mono" onClick={onClose} autoFocus>סגירה</button>
          <div className="lb__media">
            {w.type === 'video' ? (
              <div style={{ width: '100%' }}><VideoPlayer w={w} /></div>
            ) : w.type === 'document' && !w.media_url ? (
              <DocCard w={w} />
            ) : w.media_url ? (
              <motion.img key={w.id} src={asset(w.media_url)} alt={w.title || ''}
                className={zoom ? 'zoomed' : ''}
                style={zoom ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                onClick={(e) => {
                  if (zoom) return setZoom(null)
                  const r = e.currentTarget.getBoundingClientRect()
                  setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 })
                }}
                initial={{ opacity: 0, scale: 0.94, rotateY: -8 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 0.9, ease: EASE }} />
            ) : null}
          </div>
          <motion.aside className="lb__side" key={`s-${w.id}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}>
            <span className="mono" style={{ color: 'var(--on-deep-mute)' }}>W-{pad(index + 1)} / {pad(works.length)} · {TYPE_LABEL[w.type]}</span>
            {w.kicker && <span className="mono" style={{ color: 'var(--on-deep-mute)' }}>{w.kicker}</span>}
            <h2 style={{ margin: 0, fontWeight: 200, fontSize: 'clamp(28px, 3vw, 44px)', lineHeight: 1.15 }}>{w.title}</h2>
            {w.body && <Prose body={w.body} />}
            <span className="mono" style={{ color: 'var(--on-deep-mute)' }}>{[w.year, w.medium].filter(Boolean).join(' · ')}</span>
            {w.file_url && <a className="lb__doc mono" href={asset(w.file_url)} target="_blank" rel="noopener">פתיחת המסמך המלא ←</a>}
            <div className="lb__nav mono">
              <button onClick={() => onIndex(index - 1)} disabled={index === 0}>→ הקודמת</button>
              <button onClick={() => onIndex(index + 1)} disabled={index === works.length - 1}>הבאה ←</button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
