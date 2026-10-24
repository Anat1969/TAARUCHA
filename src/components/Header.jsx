import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useAsync, fetchExhibitions, fetchSettings, exLinks, hostOf, museumRooms, roomOf, DEV_CHAT } from '../lib/data'
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

// Actions a page adds to the A&I logo button (the exhibition page's edit actions).
let pageMenu = { items: [], status: '' }
const pageMenuSubs = new Set()
export function usePageMenu(menu, deps) {
  useEffect(() => {
    pageMenu = menu
    pageMenuSubs.forEach((f) => f())
    return () => { pageMenu = { items: [], status: '' }; pageMenuSubs.forEach((f) => f()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
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

// The A&I logo button (<ai-menu> from https://appofapp-gh.vercel.app/ai-menu.js). Copy link, dev chat and install
// come from it; its items open "מאחורי התערוכות" (who she is, each exhibition's inquiry and research links), about,
// the studio, and the current page's edit actions.
function LogoMenu() {
  const [open, setOpen] = useState(false)
  const [, tick] = useState(0)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { data: s } = useAsync(fetchSettings, [])
  const { data: list } = useAsync(fetchExhibitions, [])
  const ref = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => { const f = () => tick((n) => n + 1); pageMenuSubs.add(f); return () => pageMenuSubs.delete(f) }, [])
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [open])

  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    el.items = [
      ...pageMenu.items,
      { label: 'מאחורי התערוכות', hint: 'מחקר לפי תערוכה', onSelect: () => setOpen(true) },
      { label: 'אודות', onSelect: () => navigate('/about') },
      { label: 'סטודיו', onSelect: () => navigate('/studio') },
    ]
    el.status = pageMenu.status
  })

  // The exhibition in front of the visitor comes first.
  const slug = pathname.startsWith('/e/') ? decodeURIComponent(pathname.slice(3)) : null
  const rooms = museumRooms(list || [])
  const items = [...(list || [])].sort((a, b) => (b.slug === slug) - (a.slug === slug))

  return (
    <div className="logo" ref={ref}>
      <ai-menu ref={menuRef} chat={DEV_CHAT} />
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
