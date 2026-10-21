import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useAsync, fetchExhibitions, fetchSettings, splitBody, pad, museumRooms, KIND_LABEL, asset } from '../lib/data'
import { Page, Img, EASE } from '../components/Motion'

// The plan is drawn in a fixed 1200 x 760 world and scaled to the stage.
const W = 1200, H = 760

// Fixed footprint of the building. The newest exhibition always stands in the hall.
function buildPlan(rooms, settings, total) {
  const out = []
  const perm = rooms.permanent
  const n = Math.max(perm.length, 1)
  const pw = (W - 20 * (n - 1)) / n
  for (let i = 0; i < n; i++) {
    const ex = perm[i]
    out.push({
      id: ex ? `p-${ex.id}` : 'p-empty', kind: 'perm', ex,
      x: W - (i + 1) * pw - i * 20, y: 0, w: pw, h: 210,
      label: `אגף הקבע${n > 1 ? ` · ${pad(i + 1)}` : ''}`,
      to: ex ? `/e/${ex.slug}` : null,
    })
  }
  const g = rooms.galleries
  out.push({ id: g[0] ? `g-${g[0].id}` : 'g-a', kind: 'gallery', ex: g[0], x: 900, y: 230, w: 300, h: 330, label: 'גלריה מתחלפת א', to: g[0] && `/e/${g[0].slug}` })
  out.push({ id: rooms.hall ? `h-${rooms.hall.id}` : 'h', kind: 'hall', ex: rooms.hall, x: 320, y: 230, w: 560, h: 330, label: 'האולם המרכזי', to: rooms.hall && `/e/${rooms.hall.slug}` })
  out.push({ id: g[1] ? `g-${g[1].id}` : 'g-b', kind: 'gallery', ex: g[1], x: 0, y: 230, w: 300, h: 330, label: 'גלריה מתחלפת ב', to: g[1] && `/e/${g[1].slug}` })
  out.push({ id: 'about', kind: 'about', x: 820, y: 580, w: 380, h: 180, label: 'חדר האוצרת', to: '/about', settings })
  out.push({ id: 'lobby', kind: 'lobby', x: 420, y: 580, w: 380, h: 180, label: 'כניסה', to: null })
  out.push({ id: 'archive', kind: 'archive', x: 0, y: 580, w: 400, h: 180, label: 'הארכיון', to: '/archive', stored: rooms.stored, total })
  return out
}

// Walk order: the hall first, then the galleries, the permanent wing, the curator and the archive.
const ORDER = { hall: 0, gallery: 1, perm: 2, about: 3, archive: 4 }

export default function Home() {
  const { data, loading, error } = useAsync(fetchExhibitions, [])
  const { data: settings } = useAsync(fetchSettings, [])
  useEffect(() => { document.title = 'ענת דוד שטיבלמן · תערוכות' }, [])

  if (loading) return <Page className="state"><div className="loader" /><span className="mono mute">פותחים את הדלתות</span></Page>
  if (error) return <Page className="state"><p className="lede">לא הצלחנו לטעון את התערוכות. נסו לרענן את הדף.</p></Page>
  if (!data?.length) return <Page className="state"><p className="lede">עוד אין תערוכות שפורסמו.</p></Page>
  return <Museum list={data} settings={settings || {}} />
}

function Museum({ list, settings }) {
  const rooms = useMemo(() => museumRooms(list), [list])
  const plan = useMemo(() => buildPlan(rooms, settings, list.length), [rooms, settings, list.length])
  const tour = useMemo(() => plan.filter((r) => r.kind in ORDER && (r.ex || r.kind === 'about' || r.kind === 'archive'))
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind]), [plan])
  const [sel, setSel] = useState(tour[0]?.id)
  const [overview, setOverview] = useState(false)
  const room = plan.find((r) => r.id === sel) || tour[0]
  const at = tour.findIndex((r) => r.id === room.id)
  const go = (d) => { setOverview(false); setSel(tour[(at + d + tour.length) % tour.length].id) }
  const pick = (id) => { setOverview(false); setSel(id) }

  return (
    <Page className="museum">
      <section className="museum__head wrap">
        <div>
          <span className="mono mute">מפת המוזיאון · {pad(list.length)} תערוכות · {pad(rooms.permanent.length)} בקבע</span>
          <h1 className="museum__title">
            <span className="line-mask"><motion.span style={{ display: 'block' }} initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: EASE, delay: 0.1 }}>סיור במוזיאון</motion.span></span>
          </h1>
        </div>
        <p className="lede">התערוכה האחרונה שעלתה תמיד באולם המרכזי. הקודמות עוברות לגלריות ומשם לארכיון. הקבועות נשארות באגף שלהן.</p>
      </section>

      <div className="tour">
        <Stage plan={plan} sel={room.id} overview={overview} onPick={pick} />
        <div className="tour__controls mono" role="group" aria-label="סיור">
          <button onClick={() => go(-1)} aria-label="החדר הקודם">הקודם</button>
          <span className="tour__count">{pad(at + 1)} / {pad(tour.length)}</span>
          <button onClick={() => go(1)} aria-label="החדר הבא">הבא</button>
          <button className={overview ? 'on' : ''} onClick={() => setOverview((o) => !o)} aria-pressed={overview}>מבט על</button>
        </div>
        <AnimatePresence mode="wait">
          <RoomCard key={room.id} room={room} />
        </AnimatePresence>
      </div>

      <section className="wrap legend" aria-labelledby="legend-h">
        <div className="section-head"><h2 id="legend-h">חדרי המוזיאון</h2><span className="mono mute">לפי סדר הסיור</span></div>
        <ol className="legend__list">
          {tour.map((r, i) => (
            <li key={r.id}>
              <button className={r.id === room.id ? 'on' : ''} onClick={() => { pick(r.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
                <span className="mono mute">{pad(i + 1)}</span>
                <span className="mono">{r.label}</span>
                <span className="legend__title">{r.ex ? r.ex.title : r.kind === 'about' ? (settings.name || 'ענת דוד שטיבלמן') : `${pad(r.total)} תערוכות שמורות`}</span>
                <span className="mono mute">{r.ex ? `${r.ex.code} · ${r.ex.inquiry || KIND_LABEL[r.ex.kind] || ''}` : ''}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </Page>
  )
}

function useFit(ref) {
  const [k, setK] = useState(0.6)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setK(Math.min(width / (W * 1.08), height / (H * 0.95)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return k
}

function Stage({ plan, sel, overview, onPick }) {
  const ref = useRef(null)
  const k = useFit(ref)
  const r = plan.find((p) => p.id === sel)
  const zoom = overview || !r ? 0.74 : Math.min(1.7, Math.max(1.15, 520 / Math.max(r.w, r.h * 1.4)))
  const cx = overview || !r ? W / 2 : r.x + r.w / 2
  const cy = overview || !r ? H / 2 : r.y + r.h / 2
  const s = k * zoom
  // On wide screens the room card sits over the left of the stage; keep the building clear of it.
  const shift = typeof window !== 'undefined' && window.innerWidth > 900 ? 190 * k : 0

  // A little parallax from the pointer, on top of the fixed axonometric camera.
  const px = useMotionValue(0), py = useMotionValue(0)
  const rz = useSpring(px, { stiffness: 60, damping: 18 })
  const rx = useSpring(py, { stiffness: 60, damping: 18 })
  useEffect(() => { px.set(-34); py.set(overview ? 42 : 50) }, [overview, px, py])
  const onMove = (e) => {
    const b = e.currentTarget.getBoundingClientRect()
    px.set(-34 + ((e.clientX - b.left) / b.width - 0.5) * 8)
    py.set((overview ? 42 : 50) + ((e.clientY - b.top) / b.height - 0.5) * -6)
  }

  return (
    <div className="tour__stage" ref={ref} onPointerMove={onMove} onPointerLeave={() => { px.set(-34); py.set(overview ? 42 : 50) }}>
      <motion.div className="tour__cam" style={{ rotateX: rx, rotateZ: rz }}>
        <motion.div className="tour__world" style={{ width: W, height: H, marginLeft: -W / 2, marginTop: -H / 2 }}
          initial={{ scale: s * 0.7, opacity: 0 }}
          animate={{ x: -(cx - W / 2) * s + shift, y: -(cy - H / 2) * s, scale: s, opacity: 1 }}
          transition={{ duration: 1.4, ease: EASE }}>
          <div className="tour__slab" />
          {plan.map((p) => <Room key={p.id} p={p} on={p.id === sel && !overview} onPick={onPick} />)}
        </motion.div>
      </motion.div>
    </div>
  )
}

function Room({ p, on, onPick }) {
  const cover = p.ex?.cover_url
  const empty = !p.ex && !['about', 'archive', 'lobby'].includes(p.kind)
  const pickable = !empty && p.kind !== 'lobby'
  return (
    <motion.div className={`room room--${p.kind} ${on ? 'on' : ''} ${empty ? 'empty' : ''}`}
      style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
      animate={{ z: on ? 18 : 0 }} transition={{ duration: 0.9, ease: EASE }}>
      <button className="room__floor" disabled={!pickable} onClick={() => onPick(p.id)}
        aria-label={`${p.label}${p.ex ? ` · ${p.ex.title}` : ''}`} aria-pressed={on}>
        {cover && <img src={asset(cover)} alt="" className="room__cover" loading="lazy" />}
        <span className="room__label mono">{p.label}</span>
        {p.ex && <span className="room__title">{p.ex.code}</span>}
        {p.kind === 'hall' && <span className="room__new mono">חדשה</span>}
        {p.kind === 'archive' && <span className="room__title">{pad(p.total)}</span>}
        {p.kind === 'lobby' && <span className="room__door" />}
      </button>
      <span className="room__wall room__wall--back">
        {cover && <img src={asset(cover)} alt="" className="room__art" loading="lazy" />}
      </span>
      <span className="room__wall room__wall--side" />
    </motion.div>
  )
}

function RoomCard({ room }) {
  const ex = room.ex
  return (
    <motion.aside className="tour__card" aria-live="polite"
      initial={{ opacity: 0, y: 24, rotateX: 10 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.7, ease: EASE }}>
      <span className="mono mute">{room.label}{ex ? ` · ${KIND_LABEL[ex.kind] || ''}` : ''}</span>
      {ex ? (
        <>
          {ex.cover_url && <Link to={room.to} className="frame tour__thumb"><Img src={ex.cover_url} alt={`שער התערוכה ${ex.title}`} /></Link>}
          <span className="mono">{ex.code} · {ex.year} · {pad(ex.works?.length || 0)} עבודות</span>
          <h2 className="tour__title">{ex.title}</h2>
          {ex.subtitle && <p className="tour__sub">{ex.subtitle}</p>}
          {ex.inquiry && <p className="tour__inq mono">חקירה · {ex.inquiry}</p>}
          {splitBody(ex.curatorial_text)[0] && <p className="tour__text">{splitBody(ex.curatorial_text)[0]}</p>}
          <Link to={room.to} className="btn">כניסה לחדר <span className="arrow">←</span></Link>
        </>
      ) : room.kind === 'about' ? (
        <>
          <h2 className="tour__title">{room.settings?.name || 'ענת דוד שטיבלמן'}</h2>
          {room.settings?.tagline && <p className="tour__sub">{room.settings.tagline}</p>}
          <p className="tour__text">אוצרת, יוצרת, חוקרת, אמנית ואדריכלית. כל תערוכה כאן היא תוצר של חקירה, וסוג החקירה רשום על דלת החדר.</p>
          <Link to="/about" className="btn">אודות <span className="arrow">←</span></Link>
        </>
      ) : (
        <>
          <h2 className="tour__title">{pad(room.total)} תערוכות</h2>
          <p className="tour__text">כל התערוכות נשמרות כאן, גם אלה שעדיין תלויות באולמות.{room.stored?.length ? ` ירדו מהקירות: ${room.stored.map((e) => e.title).join(', ')}.` : ''}</p>
          <Link to="/archive" className="btn">לארכיון <span className="arrow">←</span></Link>
        </>
      )}
    </motion.aside>
  )
}
