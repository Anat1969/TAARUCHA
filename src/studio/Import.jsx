// ייבוא יצירות מאפליקציה: /studio/import?src=<creations.json>&topic=<id>
// מגיעים מהכפתור "העלאה לחדר בתערוכה" שבדף היצירות של כל אפליקציה. כל נושא הופך לחדר באגף הקבע.
// ייבוא חוזר מעדכן את אותו חדר (לפי הכתובת) ומחליף את העבודות שבו, כך שאין כפילויות.
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase, T } from '../lib/supabase'
import { pad } from '../lib/data'
import { roomsFromCreations } from '../lib/creations'

export default function Import() {
  const { search } = useLocation()
  const q = new URLSearchParams(search)
  const src = q.get('src') || ''
  const topic = q.get('topic') || ''
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [pick, setPick] = useState({})
  const [existing, setExisting] = useState({})
  const [state, setState] = useState('idle')
  const [done, setDone] = useState([])

  useEffect(() => {
    if (!src) { setErr('חסרה כתובת של קובץ יצירות. הכפתור "העלאה לחדר בתערוכה" בדף היצירות של האפליקציה מוסיף אותה.'); return }
    fetch(src, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json() }).then(async (d) => {
      setData(d)
      const rooms = roomsFromCreations(d, src)
      setPick(Object.fromEntries(rooms.map((r, i) => [r.slug, topic ? d.topics[i].id === topic : true])))
      const { data: ex } = await supabase.from(T.exhibitions).select('slug').in('slug', rooms.map((r) => r.slug))
      setExisting(Object.fromEntries((ex || []).map((e) => [e.slug, true])))
    }).catch((e) => setErr(`הקובץ לא נטען (${e.message}). בדקו שהאפליקציה פורסמה ושהכתובת נכונה: ${src}`))
  }, [src, topic])

  const rooms = data ? roomsFromCreations(data, src) : []
  const chosen = rooms.filter((r) => pick[r.slug])

  const run = async () => {
    setState('busy'); setDone([])
    const { data: top } = await supabase.from(T.exhibitions).select('position').order('position', { ascending: false }).limit(1)
    let next = (top?.[0]?.position || 0) + 1
    const out = []
    for (const r of chosen) {
      const { works, ...fields } = r
      const now = new Date().toISOString()
      const { data: cur } = await supabase.from(T.exhibitions).select('id').eq('slug', r.slug).maybeSingle()
      let id = cur?.id
      if (id) {
        const u = await supabase.from(T.exhibitions).update({ ...fields, status: 'published', published_at: now }).eq('id', id)
        if (u.error) { setState('error'); setErr('העדכון נכשל: ' + u.error.message); return }
        await supabase.from(T.works).delete().eq('exhibition_id', id)
      } else {
        const ins = await supabase.from(T.exhibitions).insert({ ...fields, code: `EX ${pad(next)}`, position: next, status: 'published', published_at: now }).select('id').single()
        if (ins.error) { setState('error'); setErr('יצירת החדר נכשלה: ' + ins.error.message); return }
        id = ins.data.id; next++
      }
      if (works.length) {
        const w = await supabase.from(T.works).insert(works.map((x) => ({ ...x, exhibition_id: id })))
        if (w.error) { setState('error'); setErr('תליית העבודות נכשלה: ' + w.error.message); return }
      }
      out.push(r); setDone([...out])
    }
    setState('done')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <span className="mono mute">ייבוא יצירות מאפליקציה</span>
        <h1 className="st-title">{data ? `${data.app.name}: חדר לכל נושא` : 'יצירות מאפליקציה'}</h1>
        <p className="lede">כל נושא נעשה חדר באגף הקבע, וכל יצירה נתלית על הקיר שלו. ייבוא חוזר מעדכן את אותו חדר.</p>
      </div>
      {err && <p className="lede" role="alert" style={{ color: '#b3261e' }}>{err}</p>}
      {!data && !err && <div className="loader" />}
      {data && (
        <>
          <div className="st-list">
            {rooms.map((r) => (
              <label key={r.slug} className="panel st-row" style={{ cursor: 'pointer', alignItems: 'center' }}>
                {r.cover_url ? <img className="st-thumb" src={r.cover_url} alt="" /> : <div className="st-thumb" />}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <span className="mono mute">{r.subtitle} · {pad(r.works.length)} עבודות · {existing[r.slug] ? 'חדר קיים, יעודכן' : 'חדר חדש'}</span>
                  <span style={{ fontWeight: 200, fontSize: 24, lineHeight: 1.15 }}>{r.title}</span>
                </div>
                <input type="checkbox" checked={!!pick[r.slug]} onChange={(e) => setPick({ ...pick, [r.slug]: e.target.checked })} aria-label={`בחירת החדר ${r.title}`} style={{ width: 22, height: 22 }} />
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="sbtn primary" disabled={!chosen.length || state === 'busy'} onClick={run}>
              {state === 'busy' ? `תולה… ${done.length} מתוך ${chosen.length}` : `יצירת ${chosen.length} חדרים`}
            </button>
            <button className="sbtn ghost" onClick={() => setPick(Object.fromEntries(rooms.map((r) => [r.slug, true])))}>כל הנושאים</button>
          </div>
          {state === 'done' && (
            <div className="panel" role="status" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <strong style={{ fontWeight: 400 }}>{done.length} חדרים תלויים באגף הקבע.</strong>
              {done.map((r) => <Link key={r.slug} to={`/e/${r.slug}`} className="mono">{r.title} ←</Link>)}
              <Link to="/" className="sbtn ghost" style={{ alignSelf: 'flex-start', display: 'inline-flex' }}>למפת המוזיאון</Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
