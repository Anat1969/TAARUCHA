import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useAsync, fetchExhibitions, fetchSettings, exLinks, hostOf, museumRooms, roomOf, DEV_CHAT, asset } from '../lib/data'
import { useInstall } from '../lib/install'
import { EASE } from './Motion'

// The app's mark: a museum plan seen from above, a hall flanked by two galleries.
export function AppMark({ size = 30 }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1.5" y="1.5" width="29" height="29" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 9.5h29M10 9.5v14M22 9.5v14M1.5 23.5h11.5M19 23.5h11.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="10" y="9.5" width="12" height="14" fill="currentColor" opacity=".16" />
    </svg>
  )
}

// The owner's mark. An uploaded logo (studio settings) replaces the typographic monogram.
function LogoMark({ url }) {
  if (url) return <img className="logo__img" src={asset(url)} alt="" />
  return <span className="logo__mono" aria-hidden="true"><span>A</span><span>D</span><span>S</span></span>
}

export default function Header() {
  return (
    <motion.header className="hdr" initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.9, ease: EASE }}>
      <Link to="/" className="hdr__name" aria-label="תערוכות · דף הבית">
        <AppMark />
        <span className="hdr__app">תערוכות</span>
        <span className="mono mute hdr__by">ענת דוד שטיבלמן</span>
      </Link>
      <nav className="hdr__nav mono" aria-label="ניווט ראשי">
        <NavLink to="/" end>מפת המוזיאון</NavLink>
        <NavLink to="/archive">ארכיון</NavLink>
        <LogoMenu />
      </nav>
    </motion.header>
  )
}

function LogoMenu() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { pathname } = useLocation()
  const { data: s } = useAsync(fetchSettings, [])
  const { data: list } = useAsync(fetchExhibitions, [])
  const { canInstall, install } = useInstall()
  const ref = useRef(null)

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [open])

  // The exhibition in front of the visitor comes first.
  const slug = pathname.startsWith('/e/') ? decodeURIComponent(pathname.slice(3)) : null
  const rooms = museumRooms(list || [])
  const items = [...(list || [])].sort((a, b) => (b.slug === slug) - (a.slug === slug))

  const copy = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="logo" ref={ref}>
      <button className={`logo__btn ${open ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="logo-panel" aria-label="מאחורי התערוכות: מחקר, פיתוח, אודות">
        <LogoMark url={s?.logo_url} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div id="logo-panel" className="logo__panel" role="dialog" aria-label="מאחורי התערוכות"
            initial={{ opacity: 0, y: -12, rotateX: -12 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: EASE }}>
            <section className="logo__who">
              <span className="mono mute">מאחורי התערוכות</span>
              <strong>{s?.name || 'ענת דוד שטיבלמן'}</strong>
              <span className="logo__roles">אוצרת · יוצרת · חוקרת · אמנית · אדריכלית</span>
              <Link to="/about" className="logo__link mono">אודות</Link>
            </section>

            <section className="logo__inq" aria-label="החקירה מאחורי כל תערוכה">
              <span className="mono mute">מחקר ופיתוח לפי תערוכה</span>
              <ul>
                {items.map((ex) => {
                  const links = exLinks(ex)
                  return (
                    <li key={ex.id} className={ex.slug === slug ? 'here' : ''}>
                      <Link to={`/e/${ex.slug}`} className="logo__ex">
                        <span className="mono">{ex.code} · {ex.slug === slug ? 'התערוכה שמולך' : roomOf(ex, rooms)}</span>
                        <span className="logo__extitle">{ex.title}</span>
                      </Link>
                      <span className="logo__type">{ex.inquiry || 'סוג החקירה טרם נרשם'}</span>
                      {links.length > 0 && (
                        <span className="logo__exlinks mono">
                          {links.map((l, i) => <a key={i} href={l.url} target="_blank" rel="noopener noreferrer">{l.label || hostOf(l.url)}</a>)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>

            <section className="logo__tools mono" aria-label="האפליקציה">
              <button onClick={copy}>{copied ? 'הקישור הועתק' : 'העתקת קישור'}</button>
              <a href={DEV_CHAT} target="_blank" rel="noopener noreferrer">שיחת הפיתוח</a>
              {canInstall && <button onClick={install}>התקנת האפליקציה</button>}
              <Link to="/studio">סטודיו</Link>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
