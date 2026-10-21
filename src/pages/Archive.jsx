import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAsync, fetchAllWorks, fetchExhibitions, TYPE_LABEL, splitBody, museumRooms, roomOf, KIND_LABEL, pad } from '../lib/data'
import { Page, Lines, Img, EASE } from '../components/Motion'

export default function Archive() {
  const { data, loading } = useAsync(fetchAllWorks, [])
  const { data: exs } = useAsync(fetchExhibitions, [])
  const rooms = museumRooms(exs || [])
  const [type, setType] = useState('all')
  const types = useMemo(() => [...new Set((data || []).map((w) => w.type))], [data])
  const list = (data || []).filter((w) => type === 'all' || w.type === type)

  return (
    <Page className="wrap" style={{ paddingTop: 'clamp(40px, 6vw, 96px)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 24, marginBottom: 40 }}>
        <Lines lines={['ארכיון']} className="display" />
        <p className="lede">כל התערוכות וכל העבודות נשמרות כאן, גם אחרי שירדו מהקירות.</p>
      </div>
      {exs?.length > 0 && (
        <section className="arch-ex" aria-labelledby="arch-ex-h">
          <div className="section-head"><h2 id="arch-ex-h">תערוכות</h2><span className="mono mute">{pad(exs.length)} · מהחדשה לישנה</span></div>
          <ol className="arch-ex__list">
            {exs.map((ex) => (
              <li key={ex.id}>
                <Link to={`/e/${ex.slug}`}>
                  <span className="mono mute">{ex.code}</span>
                  <span className="arch-ex__title">{ex.title}</span>
                  <span className="mono mute">{KIND_LABEL[ex.kind] || ''}{ex.inquiry ? ` · ${ex.inquiry}` : ''}</span>
                  <span className="mono arch-ex__room">{roomOf(ex, rooms)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
      <div className="section-head"><h2>עבודות</h2></div>
      <div className="filters" role="group" aria-label="סינון לפי מדיה">
        <button className={`chip ${type === 'all' ? 'on' : ''}`} onClick={() => setType('all')} aria-pressed={type === 'all'}>הכל</button>
        {types.map((t) => (
          <button key={t} className={`chip ${type === t ? 'on' : ''}`} onClick={() => setType(t)} aria-pressed={type === t}>{TYPE_LABEL[t]}</button>
        ))}
      </div>
      {loading ? <div className="state"><div className="loader" /></div> : (
        <motion.div layout className="archive-grid">
          <AnimatePresence>
            {list.map((w, i) => (
              <motion.figure layout key={w.id} className="archive-item"
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.8, ease: EASE, delay: i * 0.04 }}>
                <Link to={`/e/${w.exhibition.slug}`}>
                  {w.media_url && w.type !== 'video'
                    ? <div className="frame"><Img src={w.media_url} alt={w.title} /></div>
                    : <div className="frame" style={{ padding: 24, minHeight: 200, display: 'flex', alignItems: 'flex-end' }}><span style={{ fontWeight: 200, fontSize: 24, lineHeight: 1.3 }}>{splitBody(w.body)[0] || w.title}</span></div>}
                </Link>
                <figcaption className="work__label">
                  <b>{w.exhibition.code}</b> · {w.title}<br />{TYPE_LABEL[w.type]}{w.year ? ` · ${w.year}` : ''}
                </figcaption>
              </motion.figure>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Page>
  )
}
