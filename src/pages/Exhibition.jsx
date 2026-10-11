import { useParams, Link } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { motion, useScroll, useTransform, useSpring, useVelocity, useMotionValueEvent } from 'framer-motion'
import { useAsync, fetchExhibition, fetchExhibitions, splitBody, pad, TYPE_LABEL } from '../lib/data'
import { Page, Lines, Reveal, EASE } from '../components/Motion'
import { WallWork } from '../components/Work'
import Lightbox from '../components/Lightbox'
import EditBar from '../components/EditBar'

function useIsNarrow() {
  const q = '(max-width: 900px)'
  const [narrow, set] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => set(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return narrow
}

export default function Exhibition() {
  const { slug } = useParams()
  const { data: ex, loading, error } = useAsync(() => fetchExhibition(slug), [slug])
  const { data: all } = useAsync(fetchExhibitions, [])
  const [open, setOpen] = useState(null)
  const narrow = useIsNarrow()

  useEffect(() => { if (ex) document.title = `${ex.title} · ענת דוד שטיבלמן` }, [ex])

  if (loading) return <Page className="state"><div className="loader" /><span className="mono mute">פותחים את האולם</span></Page>
  if (error || !ex) return <Page className="state"><p className="lede">התערוכה לא נמצאה.</p><Link className="btn" to="/">לכל התערוכות</Link></Page>

  const works = ex.works || []
  const media = [...new Set(works.map((w) => TYPE_LABEL[w.type]))].join(' · ')
  const paras = splitBody(ex.curatorial_text)
  const idx = (all || []).findIndex((e) => e.slug === ex.slug)
  const older = idx >= 0 ? all[idx + 1] : null
  const newer = idx > 0 ? all[idx - 1] : null

  return (
    <Page>
      <section className="ex-intro">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <motion.div className="mono mute" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <Link to="/">תערוכות</Link> / {ex.code}
          </motion.div>
          <Lines lines={[ex.title, ex.subtitle].filter(Boolean)} className="display display--md" />
        </div>
        <Reveal style={{ display: 'flex', flexDirection: 'column', gap: 28 }} delay={0.4}>
          {paras.map((p, i) => <p key={i} className="lede" style={{ maxWidth: 'none' }}>{p}</p>)}
          <dl className="ex-meta mono">
            <div><dt>שנה</dt><dd>{ex.year || '—'}</dd></div>
            <div><dt>עבודות</dt><dd>{pad(works.length)}</dd></div>
            <div><dt>מדיה</dt><dd>{media || '—'}</dd></div>
          </dl>
        </Reveal>
      </section>

      {works.length > 0 && (narrow
        ? <Stack works={works} onOpen={setOpen} exId={ex.id} />
        : <Wall works={works} onOpen={setOpen} code={ex.code} exId={ex.id} />)}

      <nav aria-label="ניווט בין תערוכות" className="wrap mono" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, paddingTop: 48 }}>
        <Link to="/" className="btn"><span className="arrow">→</span> כל התערוכות</Link>
        <span style={{ display: 'flex', gap: 12 }}>
          {newer && <Link to={`/e/${newer.slug}`} className="btn">{newer.code} · הבאה</Link>}
          {older && <Link to={`/e/${older.slug}`} className="btn">{older.code} · הקודמת <span className="arrow">←</span></Link>}
        </span>
      </nav>

      <Lightbox works={works} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
      <EditBar exhibitionId={ex.id} />
    </Page>
  )
}

// Desktop: the page scroll drives a horizontal walk along a lit wall.
function Wall({ works, onOpen, code, exId }) {
  const track = useRef(null)
  const row = useRef(null)
  const [dist, setDist] = useState(0)
  const [vh, setVh] = useState(800)
  const [active, setActive] = useState(0)

  const measure = useCallback(() => {
    if (!row.current) return
    setDist(Math.max(0, row.current.offsetWidth - window.innerWidth))
    setVh(window.innerHeight)
  }, [])

  useLayoutEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (row.current) ro.observe(row.current)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [measure])

  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] })
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.4 })
  const x = useTransform(smooth, [0, 1], [0, dist])
  const vel = useVelocity(scrollYProgress)
  const tilt = useSpring(useTransform(vel, [-1.5, 0, 1.5], [7, 0, -7]), { stiffness: 80, damping: 20 })
  const floorX = useTransform(smooth, [0, 1], [0, dist * 0.35])

  useMotionValueEvent(smooth, 'change', (v) => setActive(Math.min(works.length - 1, Math.round(v * (works.length - 1)))))

  const hang = 'min(54vh, 600px)'
  return (
    <section ref={track} className="wall-track" aria-label="קירות התערוכה" style={{ height: dist + vh }}>
      <div className="wall-sticky">
        <div className="wall-room" aria-hidden="true" />
        <motion.div className="wall-floor" aria-hidden="true" style={{ x: floorX }} />
        <div className="wall-head mono mute">
          <span>{code} · אולם</span>
          <span>W-{pad(active + 1)} / {pad(works.length)}</span>
        </div>
        <motion.div ref={row} className="wall-row" style={{ x, rotateY: tilt }}>
          {works.map((w, i) => (
            <motion.div key={w.id} initial={{ opacity: 0, y: 60, rotateY: -10 }} animate={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ duration: 1.2, ease: EASE, delay: 0.3 + i * 0.12 }} style={{ transformStyle: 'preserve-3d', flex: '0 0 auto' }}>
              <WallWork w={w} i={i} h={hang} onOpen={onOpen} exId={exId} />
            </motion.div>
          ))}
          <div style={{ flex: '0 0 12vw' }} aria-hidden="true" />
        </motion.div>
        <div className="wall-foot">
          <div className="scale mono">
            {works.map((w, i) => (
              <div key={w.id} className={`scale__seg ${i <= active ? 'on' : ''}`}>
                <motion.span className="scale__fill" style={{ insetInline: 0 }} animate={{ scaleX: i < active ? 1 : i === active ? 0.5 : 0 }} transition={{ duration: 0.6, ease: EASE }} />
                W-{pad(i + 1)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Stack({ works, onOpen, exId }) {
  return (
    <section className="wall-stack" aria-label="עבודות התערוכה" style={{ borderTop: '1px solid var(--ink)' }}>
      {works.map((w, i) => (
        <Reveal key={w.id}><WallWork w={w} i={i} onOpen={onOpen} stacked exId={exId} /></Reveal>
      ))}
    </section>
  )
}
