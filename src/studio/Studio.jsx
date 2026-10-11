import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, NavLink, Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, T } from '../lib/supabase'
import { pad, TYPE_LABEL, asset, SITE } from '../lib/data'
import { uploadFile, slugify } from './upload'
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

function Drop({ value, onFile, accept = 'image/*', label = 'גררי לכאן קובץ או לחצי לבחירה', busy, kind = 'image' }) {
  const [over, setOver] = useState(false)
  return (
    <div className={`drop ${over ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}>
      {busy ? <div className="loader" /> : value ? (kind === 'video' ? <video src={asset(value)} muted /> : <img src={asset(value)} alt="" />) : null}
      <span className="mono mute">{busy ? 'מעלה…' : value ? 'החלפה: גררי קובץ חדש או לחצי' : label}</span>
      <input type="file" accept={accept} aria-label={label} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
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
                <span className="mono mute">{r.code} · {r.year} · {pad(r.works?.[0]?.count || 0)} עבודות</span>
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
  const [toast, toastNode] = useToast()

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(T.exhibitions).select('*, works:taarucha_works(*)').eq('id', id).single()
    if (error) return toast('התערוכה לא נמצאה', true)
    setWorks([...(data.works || [])].sort((a, b) => a.position - b.position))
    delete data.works
    setEx(data)
  }, [id, toast])
  useEffect(() => { load() }, [load])

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
  const set = (k) => (e) => setEx({ ...ex, [k]: e.target.value })

  const save = async (patch = {}) => {
    setSaving(true)
    const next = { ...ex, ...patch }
    const { id: _id, created_at, ...fields } = next
    fields.slug = slugify(fields.slug)
    fields.updated_at = new Date().toISOString()
    const { error } = await supabase.from(T.exhibitions).update(fields).eq('id', ex.id)
    setSaving(false)
    if (error) return toast(error.code === '23505' ? 'הכתובת (slug) כבר תפוסה' : 'השמירה נכשלה: ' + error.message, true)
    setEx({ ...next, slug: fields.slug })
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
    try { const url = await uploadFile(file, `ex-${ex.id}`); await save({ cover_url: url }) }
    catch (e) { toast('ההעלאה נכשלה: ' + e.message, true) }
    setCoverBusy(false)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link to="/studio" className="mono mute">→ כל התערוכות</Link>
          <h1 className="st-title">{ex.title || 'ללא שם'}</h1>
        </div>
        <div className="actions">
          <span className={`badge ${published ? 'pub' : ''}`}>{published ? 'מפורסמת' : 'טיוטה'}</span>
          <button className="sbtn" onClick={() => save({ status: published ? 'draft' : 'published' })} disabled={saving}>{published ? 'החזרה לטיוטה' : 'פרסום'}</button>
          <Link className="sbtn ghost" to={`/e/${ex.slug}`} style={{ display: 'inline-flex', alignItems: 'center' }}>חזרה לדף התערוכה</Link>
        </div>
      </div>

      <section className="panel" aria-label="פרטי התערוכה">
        <div className="form">
          <Field label="שם התערוכה"><input value={ex.title || ''} onChange={set('title')} /></Field>
          <Field label="תת־כותרת"><input value={ex.subtitle || ''} onChange={set('subtitle')} /></Field>
          <Field label="קוד" hint="למשל EX 02"><input value={ex.code || ''} onChange={set('code')} /></Field>
          <Field label="שנה"><input value={ex.year || ''} onChange={set('year')} /></Field>
          <Field label="כתובת בדף (slug)" hint={`/e/${slugify(ex.slug)}`}><input value={ex.slug || ''} onChange={set('slug')} dir="ltr" /></Field>
          <Field label="סדר בדף הבית" hint="מספר גבוה מופיע ראשון"><input type="number" value={ex.position ?? 0} onChange={(e) => setEx({ ...ex, position: Number(e.target.value) })} /></Field>
          <Field label="טקסט אוצרותי" hint="שורה ריקה מפרידה בין פסקאות" full><textarea value={ex.curatorial_text || ''} onChange={set('curatorial_text')} /></Field>
          <Field label="דימוי שער" full><Drop value={ex.cover_url} onFile={onCover} busy={coverBusy} /></Field>
        </div>
        <div className="actions" style={{ marginTop: 20, justifyContent: 'space-between' }}>
          <button className="sbtn primary" onClick={() => save()} disabled={saving}>{saving ? 'שומר…' : 'שמירת פרטים'}</button>
          <button className="sbtn danger" onClick={remove}>מחיקת התערוכה</button>
        </div>
      </section>

      <div id="add" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, borderTop: '1px solid var(--ink)', paddingTop: 16 }}>
        <h2 style={{ margin: 0, fontWeight: 200, fontSize: 32 }}>עבודות · {pad(works.length)}</h2>
        <div className="actions">
          <span className="mono mute">הוספת עבודה:</span>
          {Object.entries(TYPE_LABEL).map(([t, l]) => <button key={t} className="sbtn" onClick={() => addWork(t)}>{l} +</button>)}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {works.map((w, i) => (
          <motion.div key={w.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <WorkEditor w={w} i={i} total={works.length} exId={ex.id} toast={toast}
              onMove={(d) => move(i, d)}
              onSaved={(nw) => setWorks(works.map((x) => (x.id === nw.id ? nw : x)))}
              onDeleted={() => setWorks(works.filter((x) => x.id !== w.id))} />
          </motion.div>
        ))}
      </AnimatePresence>
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
    try { const url = await uploadFile(file, `ex-${exId}`); await save({ media_url: url }) }
    catch (e) { toast('ההעלאה נכשלה: ' + e.message, true) }
    setUp(false)
  }

  const needsMedia = w.type !== 'text'
  return (
    <section id={`w-${w.id}`} className="panel work-card" aria-label={`עבודה ${i + 1}`}>
      <div className="work-idx">
        <span>W-{pad(i + 1)}</span>
        <button onClick={() => onMove(-1)} disabled={i === 0} aria-label="הזזה למעלה">למעלה</button>
        <button onClick={() => onMove(1)} disabled={i === total - 1} aria-label="הזזה למטה">למטה</button>
      </div>
      <div className="form">
        <Field label="סוג">
          <select value={w.type} onChange={set('type')}>
            {Object.entries(TYPE_LABEL).map(([t, l]) => <option key={t} value={t}>{l}</option>)}
          </select>
        </Field>
        <Field label="כותרת"><input value={w.title || ''} onChange={set('title')} /></Field>
        <Field label="כותרת־על" hint="למשל: כיוון 1 · השכונות הוותיקות"><input value={w.kicker || ''} onChange={set('kicker')} /></Field>
        <Field label="שנה · מדיום">
          <span style={{ display: 'flex', gap: 8 }}>
            <input style={{ width: 96 }} value={w.year || ''} onChange={set('year')} aria-label="שנה" />
            <input style={{ flex: 1, minWidth: 0 }} value={w.medium || ''} onChange={set('medium')} aria-label="מדיום" />
          </span>
        </Field>
        {w.type !== 'image' && (
          <Field label="טקסט" hint="פסקה ראשונה עם שורות קצרות מוצגת כשיר על הקיר. שאלה בסוף מודגשת." full>
            <textarea value={w.body || ''} onChange={set('body')} />
          </Field>
        )}
        {w.type === 'video' && (
          <Field label="קישור לווידאו" hint="יוטיוב או וימאו. אפשר גם להעלות קובץ למטה (עד 50MB)." full>
            <input dir="ltr" value={w.video_url || ''} onChange={set('video_url')} placeholder="https://vimeo.com/…" />
          </Field>
        )}
        {needsMedia && (
          <Field label={w.type === 'video' ? 'קובץ וידאו' : 'דימוי'} full>
            <Drop value={w.media_url} onFile={onFile} busy={up}
              kind={w.type === 'video' ? 'video' : 'image'}
              accept={w.type === 'video' ? 'video/mp4,video/webm' : 'image/*'} />
          </Field>
        )}
        <div className="actions full" style={{ justifyContent: 'space-between' }}>
          <button className="sbtn primary" onClick={() => save()} disabled={busy || !dirty}>{busy ? 'שומר…' : dirty ? 'שמירה' : 'נשמר'}</button>
          <button className="sbtn danger" onClick={del}>מחיקה</button>
        </div>
      </div>
    </section>
  )
}

/* ---------------- settings ---------------- */
function Settings() {
  const [s, setS] = useState(null)
  const [busy, setBusy] = useState(false)
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
