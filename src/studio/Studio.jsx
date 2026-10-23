import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, NavLink, Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, T } from '../lib/supabase'
import { pad, TYPE_LABEL, asset, SITE, exLinks } from '../lib/data'
import { uploadFile, slugify, workFromFile, pdfPreview, isPdf, kindOf } from './upload'
import { useAuth, GoogleMark, googleEnabled } from '../lib/auth'
import './studio.css'

const EASE = [0.2, 0.7, 0.1, 1]

export default function Studio() {
  const { session, isAdmin, ready, signOut } = useAuth()
  const nav = useNavigate()
  const { search } = useLocation()
  useEffect(() => { document.title = 'סטודיו · תערוכות' }, [])

  // Arriving from an exhibition's "עריכה" tab: once signed in, go back to that page in edit mode.
  const next = new URLSearchParams(search).get('next')
  useEffect(() => {
    if (session && ready && isAdmin && next?.startsWith('/') && !next.startsWith('//')) nav(next, { replace: true })
  }, [session, ready, isAdmin, next, nav])

  if (session === undefined || (session && !ready)) return <div className="st state"><div className="loader" /></div>
  if (!session) return <Login />
  if (!isAdmin) return (
    <div className="st state">
      <p className="lede">החשבון {session.user.email} אינו מורשה לערוך את האתר.</p>
      <div className="actions">
        <button className="sbtn" onClick={signOut}>כניסה עם חשבון אחר</button>
        <Link className="sbtn ghost" to="/" style={{ display: 'inline-flex', alignItems: 'center' }}>חזרה לאתר</Link>
      </div>
    </div>
  )

  return (
    <div className="st">
      <header className="st-hdr">
        <span style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
          <strong style={{ fontWeight: 300 }}>סטודיו</strong>
          <span className="mono" style={{ color: 'var(--on-deep-mute)' }}>{session.user.email}</span>
        </span>
        <nav className="mono" aria-label="ניווט סטודיו">
          <NavLink to="/studio" end>תערוכות</NavLink>
          <NavLink to="/studio/settings">אודות והגדרות</NavLink>
          <Link to="/">צפייה באתר</Link>
          <button onClick={signOut}>יציאה</button>
        </nav>
      </header>
      <main className="st-main">
        <Routes>
          <Route index element={<List />} />
          <Route path="e/:id" element={<Editor />} />
          <Route path="settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

/* ---------------- shared bits ---------------- */
function useToast() {
  const [t, setT] = useState(null)
  const show = useCallback((msg, err) => { setT({ msg, err }); setTimeout(() => setT(null), err ? 5000 : 2600) }, [])
  const node = (
    <AnimatePresence>
      {t && <motion.div className={`toast ${t.err ? 'err' : ''}`} role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>{t.msg}</motion.div>}
    </AnimatePresence>
  )
  return [show, node]
}

function Field({ label, hint, full, children }) {
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label><span className="lbl">{label}</span>{children}</label>
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

function Drop({ value, onFile, accept = 'image/*', label = 'גררי קובץ או לחצי', busy, kind = 'image' }) {
  const [over, setOver] = useState(false)
  return (
    <div className={`drop ${over ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}>
      {busy ? <div className="loader" /> : value ? (kind === 'video' ? <video src={asset(value)} muted /> : <img src={asset(value)} alt="" />) : null}
      <span className="mono mute">{busy ? 'מעלה…' : value ? 'החלפה' : label}</span>
      <input type="file" accept={accept} aria-label={label} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </div>
  )
}

// The main way to fill an exhibition: drop any number of files of any kind; each becomes a work.
function GalleryDrop({ onFiles, queue }) {
  const [over, setOver] = useState(false)
  const up = queue.filter((q) => q.state === 'up').length
  const errs = queue.filter((q) => q.state === 'err')
  return (
    <div className="gdrop-wrap">
      <div className={`gdrop ${over ? 'over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = [...(e.dataTransfer.files || [])]; if (f.length) onFiles(f) }}>
        <span className="gdrop__title">{up ? `מעלה ${queue.length - up} / ${queue.length}…` : 'גררי קבצים לכאן'}</span>
        <span className="sbtn primary gdrop__btn">בחירה</span>
        <span className="mono mute gdrop__hint">כל סוג · כמה בבת אחת</span>
        <input type="file" multiple aria-label="בחירת קבצים להעלאה" onChange={(e) => { const f = [...(e.target.files || [])]; if (f.length) onFiles(f); e.target.value = '' }} />
      </div>
      {errs.length > 0 && (
        <ul className="gqueue mono" aria-live="polite">
          {errs.map((q) => <li key={q.id} className="err"><span className="gqueue__name">{q.name}</span><span>{q.error}</span></li>)}
        </ul>
      )}
    </div>
  )
}

/* ---------------- login ---------------- */
function Login() {
  const { signIn, signInWithPassword } = useAuth()
  const [email, setEmail] = useState('shtanat5@gmail.com')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [google, setGoogle] = useState(false)
  useEffect(() => { googleEnabled().then((on) => setGoogle(on === true)) }, [])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const err = await signInWithPassword(email, password)
    setBusy(false)
    if (err) setMsg({ err: true, text: err })
  }
  const withGoogle = async () => { const err = await signIn(); if (err) setMsg({ err: true, text: err }) }

  return (
    <div className="st" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
      <motion.form className="panel" onSubmit={submit} style={{ width: 'min(420px, 100%)', display: 'flex', flexDirection: 'column', gap: 18 }}
        initial={{ opacity: 0, y: 30, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ duration: 0.9, ease: EASE }}>
        <span className="mono mute">סטודיו</span>
        <h1 className="st-title">כניסה</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)' }}>העריכה פתוחה רק לחשבון המורשה.</p>
        <Field label="דוא״ל"><input type="email" dir="ltr" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="סיסמה"><input type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {msg && <p role="status" style={{ margin: 0, color: msg.err ? '#8B2A1F' : 'var(--ink-2)' }}>{msg.text}</p>}
        <div className="actions">
          <button className="sbtn primary" type="submit" disabled={busy}>{busy ? 'רגע…' : 'כניסה'}</button>
        </div>
        {google && (
          <button className="sbtn" type="button" onClick={withGoogle} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><GoogleMark /> כניסה עם Google</button>
        )}
        <Link to="/" className="mono mute">חזרה לאתר</Link>
      </motion.form>
    </div>
  )
}

/* ---------------- exhibitions list ---------------- */
function List() {
  const [rows, setRows] = useState(null)
  const nav = useNavigate()
  const [toast, toastNode] = useToast()

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(T.exhibitions).select('*, works:taarucha_works(count)').order('position', { ascending: false })
    if (error) toast('שגיאה בטעינה', true)
    setRows(data || [])
  }, [toast])
  useEffect(() => { load() }, [load])

  const create = async () => {
    const next = (rows?.length ? Math.max(...rows.map((r) => r.position)) : 0) + 1
    const { data, error } = await supabase.from(T.exhibitions).insert({
      title: 'תערוכה חדשה', slug: `ex-${pad(next)}-${Date.now().toString(36)}`, code: `EX ${pad(next)}`,
      year: String(new Date().getFullYear()), position: next, status: 'draft',
    }).select().single()
    if (error) return toast('יצירה נכשלה: ' + error.message, true)
    nav(`/studio/e/${data.id}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <h1 className="st-title">תערוכות</h1>
        <button className="sbtn primary" onClick={create}>תערוכה חדשה +</button>
      </div>
      {!rows ? <div className="loader" /> : rows.length === 0 ? <p className="lede">עוד אין תערוכות. התחילי בכפתור למעלה.</p> : (
        <div className="st-list">
          {rows.map((r, i) => (
            <motion.div key={r.id} className="panel st-row" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: i * 0.05 }}>
              {r.cover_url ? <img className="st-thumb" src={asset(r.cover_url)} alt="" /> : <div className="st-thumb" />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <span className="mono mute">{r.code} · {r.kind === 'permanent' ? 'קבועה' : 'מתחלפת'} · {r.year} · {pad(r.works?.[0]?.count || 0)} עבודות</span>
                <span style={{ fontWeight: 200, fontSize: 26, lineHeight: 1.15 }}>{r.title}</span>
                <span><span className={`badge ${r.status === 'published' ? 'pub' : ''}`}>{r.status === 'published' ? 'מפורסמת' : 'טיוטה'}</span></span>
              </div>
              <div className="actions">
                <Link className="sbtn" to={`/studio/e/${r.id}`} style={{ display: 'inline-flex', alignItems: 'center' }}>עריכה</Link>
                <Link className="sbtn ghost" to={`/e/${r.slug}`} style={{ display: 'inline-flex', alignItems: 'center' }}>תצוגה</Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      {toastNode}
    </div>
  )
}

/* ---------------- exhibition editor ---------------- */
function Editor() {
  const { id } = useParams()
  const nav = useNavigate()
  const [ex, setEx] = useState(null)
  const [works, setWorks] = useState([])
  const [saving, setSaving] = useState(false)
  const [coverBusy, setCoverBusy] = useState(false)
  const [queue, setQueue] = useState([])
  const [dirty, setDirty] = useState(false)
  const [toast, toastNode] = useToast()

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(T.exhibitions).select('*, works:taarucha_works(*)').eq('id', id).single()
    if (error) return toast('התערוכה לא נמצאה', true)
    setWorks([...(data.works || [])].sort((a, b) => a.position - b.position))
    delete data.works
    setEx(data)
  }, [id, toast])
  useEffect(() => { load() }, [load])

  // Covers uploaded as PDF before previews existed: render page 1 once and keep that as the cover.
  const pdfCover = ex && isPdf(ex.cover_url) ? ex.cover_url : null
  useEffect(() => {
    if (!pdfCover) return
    let alive = true
    pdfPreview(pdfCover).then(({ file }) => uploadFile(file, `ex-${id}`)).then(async (url) => {
      if (!alive) return
      const { error } = await supabase.from(T.exhibitions).update({ cover_url: url }).eq('id', id)
      if (!error) setEx((e) => ({ ...e, cover_url: url }))
    }).catch(() => {})
    return () => { alive = false }
  }, [pdfCover, id])

  // Arriving from the exhibition page with #w-<id> or #add: scroll there once the works are drawn.
  const { hash } = useLocation()
  useEffect(() => {
    if (!ex || !hash) return
    const t = setTimeout(() => {
      const el = document.getElementById(hash.slice(1))
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1800) }
    }, 400)
    return () => clearTimeout(t)
  }, [ex, hash, works.length])

  if (!ex) return <div className="loader" />
  const set = (k) => (e) => { setEx({ ...ex, [k]: e.target.value }); setDirty(true) }

  const save = async (patch = {}) => {
    setSaving(true)
    // Publishing moves the exhibition into the main hall: the newest published one leads.
    if (patch.status === 'published' && ex.status !== 'published') patch = { ...patch, published_at: new Date().toISOString() }
    const next = { ...ex, ...patch }
    const { id: _id, created_at, ...fields } = next
    fields.slug = slugify(fields.slug)
    fields.links = exLinks(fields)
    fields.updated_at = new Date().toISOString()
    const { error } = await supabase.from(T.exhibitions).update(fields).eq('id', ex.id)
    setSaving(false)
    if (error) return toast(error.code === '23505' ? 'הכתובת (slug) כבר תפוסה' : 'השמירה נכשלה: ' + error.message, true)
    setEx({ ...next, slug: fields.slug, links: fields.links })
    setDirty(false)
    toast('נשמר')
  }

  const remove = async () => {
    if (!confirm(`למחוק את "${ex.title}" ואת כל העבודות שבה? אי אפשר לבטל.`)) return
    const { error } = await supabase.from(T.exhibitions).delete().eq('id', ex.id)
    if (error) return toast('המחיקה נכשלה', true)
    nav('/studio')
  }

  const onCover = async (file) => {
    setCoverBusy(true)
    try {
      // An empty exhibition: the cover file is also its first work, so the wall is never blank.
      if (!works.length) {
        const fields = await workFromFile(file, `ex-${ex.id}`)
        const { data } = await supabase.from(T.works).insert({ exhibition_id: ex.id, year: ex.year, position: 1, ...fields }).select().single()
        if (data) setWorks([data])
        if (fields.media_url && fields.type !== 'video') { await save({ cover_url: fields.media_url }); return }
      }
      const img = kindOf(file) === 'pdf' ? (await pdfPreview(file)).file : file
      const url = await uploadFile(img, `ex-${ex.id}`); await save({ cover_url: url })
    }
    catch (e) { toast('ההעלאה נכשלה: ' + e.message, true) }
    finally { setCoverBusy(false) }
  }

  const addFiles = async (files) => {
    const items = files.map((f, k) => ({ id: `${Date.now()}-${k}`, name: f.name, state: 'up', file: f }))
    setQueue((q) => [...q.filter((x) => x.state === 'up'), ...items.map(({ file, ...rest }) => rest)])
    let pos = (works.length ? Math.max(...works.map((w) => w.position)) : 0)
    const added = []
    let cover = ex.cover_url && !isPdf(ex.cover_url) ? ex.cover_url : null
    // A few uploads at a time; positions are reserved up front so the wall keeps the drop order.
    const jobs = items.map((it) => ({ it, position: ++pos }))
    const run = async ({ it, position }) => {
      try {
        const fields = await workFromFile(it.file, `ex-${ex.id}`)
        const { data, error } = await supabase.from(T.works).insert({ exhibition_id: ex.id, year: ex.year, position, ...fields }).select().single()
        if (error) throw error
        added.push(data)
        setWorks((ws) => [...ws, data].sort((a, b) => a.position - b.position))
        if (!cover && data.media_url && data.type !== 'video') cover = data.media_url
        setQueue((q) => q.map((x) => (x.id === it.id ? { ...x, state: 'done' } : x)))
      } catch (e) {
        setQueue((q) => q.map((x) => (x.id === it.id ? { ...x, state: 'err', error: e.message || 'ההעלאה נכשלה' } : x)))
      }
    }
    const pool = [...jobs]
    await Promise.all(Array.from({ length: 3 }, async () => { while (pool.length) await run(pool.shift()) }))
    // Works on the wall means the exhibition is open: a draft that receives files is published.
    const open = added.length && ex.status !== 'published' ? { status: 'published' } : {}
    if ((cover && cover !== ex.cover_url) || open.status) await save({ ...(cover && cover !== ex.cover_url ? { cover_url: cover } : {}), ...open })
    if (added.length) toast(`${added.length} ${added.length === 1 ? 'קובץ נוסף' : 'קבצים נוספו'} לקיר`)
    setTimeout(() => setQueue((q) => q.filter((x) => x.state !== 'done')), 1500)
  }

  const addWork = async (type) => {
    const position = (works.length ? Math.max(...works.map((w) => w.position)) : 0) + 1
    const { data, error } = await supabase.from(T.works).insert({
      exhibition_id: ex.id, type, position, title: '', year: ex.year,
      layout: type === 'composite' ? 'diptych' : type === 'video' ? 'wide' : 'full',
    }).select().single()
    if (error) return toast('ההוספה נכשלה', true)
    setWorks([...works, data])
  }

  const move = async (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= works.length) return
    const a = works[i], b = works[j]
    const next = [...works]; next[i] = { ...b, position: a.position }; next[j] = { ...a, position: b.position }
    setWorks(next)
    const r1 = await supabase.from(T.works).update({ position: b.position }).eq('id', a.id)
    const r2 = await supabase.from(T.works).update({ position: a.position }).eq('id', b.id)
    if (r1.error || r2.error) { toast('הסידור נכשל', true); load() }
  }

  const published = ex.status === 'published'
  return (
    <div className="ed">
      <header className="ed-top">
        <Link to="/studio" className="mono mute">→ תערוכות</Link>
        <input className="ed-title" value={ex.title || ''} onChange={set('title')} aria-label="שם התערוכה" placeholder="שם התערוכה" />
        <div className="actions">
          {dirty && <button className="sbtn primary" onClick={() => save()} disabled={saving}>{saving ? 'שומר…' : 'שמירה'}</button>}
          {published
            ? <button className="sbtn ghost" onClick={() => save({ status: 'draft' })} disabled={saving} title="הסתרה מהאתר">באתר · הסתרה</button>
            : <button className="sbtn primary" onClick={() => save({ status: 'published' })} disabled={saving}>טיוטה · פרסום</button>}
          <Link className="sbtn ghost" to={`/e/${ex.slug}`} style={{ display: 'inline-flex', alignItems: 'center' }}>צפייה</Link>
        </div>
      </header>

      <section className="panel ed-info" aria-label="פרטי התערוכה">
        <div className="ed-cover">
          <Drop value={isPdf(ex.cover_url) ? null : ex.cover_url} onFile={onCover} busy={coverBusy} accept="image/*,application/pdf" label="שער" />
        </div>
        <div className="ed-fields">
          <input value={ex.subtitle || ''} onChange={set('subtitle')} placeholder="תת־כותרת" aria-label="תת־כותרת" />
          <div className="ed-room">
            <div className="ed-seg mono" role="group" aria-label="סוג התערוכה">
              {[['temporary', 'מתחלפת'], ['permanent', 'קבועה']].map(([k, l]) => (
                <button key={k} type="button" className={(ex.kind || 'temporary') === k ? 'on' : ''} aria-pressed={(ex.kind || 'temporary') === k}
                  onClick={() => { setEx({ ...ex, kind: k }); setDirty(true) }}>{l}</button>
              ))}
            </div>
            <input value={ex.inquiry || ''} onChange={set('inquiry')} placeholder="סוג החקירה" aria-label="סוג החקירה" list="inquiry-kinds" />
            <datalist id="inquiry-kinds">
              {['מחקר עירוני', 'מחקר תכנוני', 'מחקר טקסט ופרשנות', 'מחקר חזותי', 'מחקר חומר', 'מחקר היסטורי', 'פיתוח כלי דיגיטלי', 'מחקר עם AI'].map((v) => <option key={v} value={v} />)}
            </datalist>
          </div>
          <textarea value={ex.curatorial_text || ''} onChange={set('curatorial_text')} placeholder="טקסט אוצרותי" aria-label="טקסט אוצרותי" rows={3} />
          <details className="ed-more">
            <summary className="mono">קישורים{exLinks(ex).length ? ` · ${exLinks(ex).length}` : ''}</summary>
            <div className="ed-links">
              {[0, 1, 2].map((k) => {
                const l = (ex.links || [])[k] || {}
                const setLink = (f) => (e) => {
                  const links = [0, 1, 2].map((j) => ({ ...((ex.links || [])[j] || {}) }))
                  links[k][f] = e.target.value
                  setEx({ ...ex, links }); setDirty(true)
                }
                return (
                  <div className="ed-links__row" key={k}>
                    <input value={l.label || ''} onChange={setLink('label')} placeholder="שם · פרויקט / אפליקציה" aria-label={`שם קישור ${k + 1}`} />
                    <input value={l.url || ''} onChange={setLink('url')} placeholder="כתובת · claude.ai או האפליקציה" aria-label={`כתובת קישור ${k + 1}`} dir="ltr" />
                  </div>
                )
              })}
            </div>
          </details>
          <details className="ed-more">
            <summary className="mono">פרטים נוספים</summary>
            <div className="ed-more__grid">
              <Field label="קוד"><input value={ex.code || ''} onChange={set('code')} /></Field>
              <Field label="שנה"><input value={ex.year || ''} onChange={set('year')} /></Field>
              <Field label="כתובת"><input value={ex.slug || ''} onChange={set('slug')} dir="ltr" /></Field>
              <Field label="סדר בדף הבית"><input type="number" value={ex.position ?? 0} onChange={(e) => { setEx({ ...ex, position: Number(e.target.value) }); setDirty(true) }} /></Field>
            </div>
            <button className="linkbtn danger mono" onClick={remove}>מחיקת התערוכה</button>
          </details>
        </div>
      </section>

      <div id="add" className="ed-works-head">
        <h2>עבודות · {pad(works.length)}</h2>
        <select className="ed-add mono" value="" onChange={(e) => e.target.value && addWork(e.target.value)} aria-label="הוספת עבודה ריקה">
          <option value="">+ עבודה ריקה</option>
          {Object.entries(TYPE_LABEL).map(([t, l]) => <option key={t} value={t}>{l}</option>)}
        </select>
      </div>
      <GalleryDrop onFiles={addFiles} queue={queue} />

      <div className="ed-list">
        <AnimatePresence initial={false}>
          {works.map((w, i) => (
            <motion.div key={w.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.4, ease: EASE }}>
              <WorkEditor w={w} i={i} total={works.length} exId={ex.id} toast={toast}
                onMove={(d) => move(i, d)}
                onSaved={(nw) => setWorks((ws) => ws.map((x) => (x.id === nw.id ? nw : x)))}
                onDeleted={() => setWorks((ws) => ws.filter((x) => x.id !== w.id))} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {toastNode}
    </div>
  )
}

function WorkEditor({ w: initial, i, total, exId, toast, onMove, onSaved, onDeleted }) {
  const [w, setW] = useState(initial)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [up, setUp] = useState(false)
  useEffect(() => { setW(initial); setDirty(false) }, [initial])
  const set = (k) => (e) => { setW({ ...w, [k]: e.target.value }); setDirty(true) }

  const save = async (patch = {}) => {
    setBusy(true)
    const next = { ...w, ...patch }
    const { id, created_at, exhibition_id, ...fields } = next
    const { error } = await supabase.from(T.works).update(fields).eq('id', w.id)
    setBusy(false)
    if (error) return toast('השמירה נכשלה: ' + error.message, true)
    setDirty(false); onSaved(next); toast(`W-${pad(i + 1)} נשמרה`)
  }
  const del = async () => {
    if (!confirm('למחוק את העבודה?')) return
    const { error } = await supabase.from(T.works).delete().eq('id', w.id)
    if (error) return toast('המחיקה נכשלה', true)
    onDeleted()
  }
  const onFile = async (file) => {
    setUp(true)
    try {
      if (w.type === 'document' || ['pdf', 'document'].includes(kindOf(file))) {
        const { title, ...fields } = await workFromFile(file, `ex-${exId}`)
        await save(fields)
      } else await save({ media_url: await uploadFile(file, `ex-${exId}`) })
    }
    catch (e) { toast('ההעלאה נכשלה: ' + e.message, true) }
    setUp(false)
  }

  const { hash } = useLocation()
  const [open, setOpen] = useState(() => hash === `#w-${initial.id}`)
  const thumb = w.media_url && w.type !== 'video' ? asset(w.media_url) : null
  const saveTitle = () => { if (w.title !== initial.title) save({ title: w.title }) }

  return (
    <section id={`w-${w.id}`} className={`wrow ${open ? 'open' : ''}`} aria-label={`עבודה ${i + 1}`}>
      <div className="wrow__line">
        <button className="wrow__thumb" onClick={() => setOpen(!open)} aria-label="פרטי העבודה">
          {thumb ? <img src={thumb} alt="" /> : <span className="mono">{TYPE_LABEL[w.type]?.slice(0, 4)}</span>}
        </button>
        <span className="mono mute wrow__idx">W-{pad(i + 1)}</span>
        <input className="wrow__title" value={w.title || ''} placeholder="ללא כותרת" aria-label="כותרת"
          onChange={(e) => setW({ ...w, title: e.target.value })} onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
        <span className="mono mute wrow__type">{TYPE_LABEL[w.type]}</span>
        <span className="wrow__move">
          <button onClick={() => onMove(-1)} disabled={i === 0} aria-label="הזזה למעלה">↑</button>
          <button onClick={() => onMove(1)} disabled={i === total - 1} aria-label="הזזה למטה">↓</button>
        </span>
        <button className="wrow__open mono" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'סגירה' : 'עריכה'}</button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="wrow__body" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}>
            <div className="wrow__grid">
              <div className="wrow__media">
                {w.type !== 'text' && (
                  <Drop value={w.type === 'video' ? w.media_url : w.media_url} onFile={onFile} busy={up}
                    kind={w.type === 'video' ? 'video' : 'image'} label="החלפת קובץ"
                    accept={w.type === 'video' ? 'video/*' : w.type === 'document' ? '*/*' : 'image/*'} />
                )}
              </div>
              <div className="wrow__fields">
                <span className="wrow__pair">
                  <select value={w.type} onChange={set('type')} aria-label="סוג">
                    {Object.entries(TYPE_LABEL).map(([t, l]) => <option key={t} value={t}>{l}</option>)}
                  </select>
                  <input value={w.year || ''} onChange={set('year')} placeholder="שנה" aria-label="שנה" style={{ width: 90 }} />
                  <input value={w.medium || ''} onChange={set('medium')} placeholder="מדיום" aria-label="מדיום" />
                </span>
                <input value={w.kicker || ''} onChange={set('kicker')} placeholder="כותרת־על" aria-label="כותרת־על" />
                {w.type !== 'image' && <textarea value={w.body || ''} onChange={set('body')} placeholder="טקסט" aria-label="טקסט" rows={4} />}
                {w.type === 'video' && <input dir="ltr" value={w.video_url || ''} onChange={set('video_url')} placeholder="קישור יוטיוב / וימאו" aria-label="קישור לווידאו" />}
                {w.file_name && <span className="mono mute" dir="ltr">{w.file_name}</span>}
                <div className="actions" style={{ justifyContent: 'space-between' }}>
                  <button className="sbtn primary" onClick={() => save()} disabled={busy || !dirty}>{busy ? 'שומר…' : dirty ? 'שמירה' : 'נשמר'}</button>
                  <button className="linkbtn danger mono" onClick={del}>מחיקה</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

/* ---------------- settings ---------------- */
function Settings() {
  const [s, setS] = useState(null)
  const [busy, setBusy] = useState(false)
  const [logoBusy, setLogoBusy] = useState(false)
  const [toast, toastNode] = useToast()
  useEffect(() => { supabase.from(T.settings).select('*').eq('id', 1).maybeSingle().then(({ data }) => setS(data || { id: 1 })) }, [])
  if (!s) return <div className="loader" />
  const set = (k) => (e) => setS({ ...s, [k]: e.target.value })
  const save = async () => {
    setBusy(true)
    const { error } = await supabase.from(T.settings).upsert({ ...s, id: 1, updated_at: new Date().toISOString() })
    setBusy(false)
    error ? toast('השמירה נכשלה', true) : toast('נשמר')
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <h1 className="st-title">אודות והגדרות</h1>
      <section className="panel">
        <div className="form">
          <Field label="שם"><input value={s.name || ''} onChange={set('name')} /></Field>
          <Field label="שורת תיאור"><input value={s.tagline || ''} onChange={set('tagline')} /></Field>
          <Field label="לוגו">
            <Drop value={s.logo_url} busy={logoBusy} label="לוגו" onFile={async (f) => {
              setLogoBusy(true)
              try { setS({ ...s, logo_url: await uploadFile(f, 'brand') }); toast('הלוגו עלה · לשמור') }
              catch (e) { toast('ההעלאה נכשלה: ' + e.message, true) }
              finally { setLogoBusy(false) }
            }} />
          </Field>
          <Field label="דוא״ל ליצירת קשר"><input dir="ltr" value={s.email || ''} onChange={set('email')} /></Field>
          <Field label="קישור לאינסטגרם"><input dir="ltr" value={s.instagram || ''} onChange={set('instagram')} /></Field>
          <Field label="טקסט אודות" full><textarea value={s.bio || ''} onChange={set('bio')} /></Field>
        </div>
        <div className="actions" style={{ marginTop: 20 }}><button className="sbtn primary" onClick={save} disabled={busy}>שמירה</button></div>
      </section>
      <PasswordPanel toast={toast} />
      {toastNode}
    </div>
  )
}

function PasswordPanel({ toast }) {
  const { updatePassword } = useAuth()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (pw.length < 8) return toast('סיסמה של 8 תווים לפחות', true)
    if (pw !== pw2) return toast('הסיסמאות אינן זהות', true)
    setBusy(true)
    const err = await updatePassword(pw)
    setBusy(false)
    if (err) return toast('החלפת הסיסמה נכשלה: ' + err, true)
    setPw(''); setPw2(''); toast('הסיסמה הוחלפה')
  }
  return (
    <form className="panel" onSubmit={submit}>
      <div className="form">
        <Field label="סיסמה חדשה"><input type="password" dir="ltr" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Field label="אימות סיסמה"><input type="password" dir="ltr" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
      </div>
      <div className="actions" style={{ marginTop: 20 }}><button className="sbtn primary" type="submit" disabled={busy}>החלפת סיסמה</button></div>
    </form>
  )
}
