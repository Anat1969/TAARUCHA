import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { useAsync, fetchExhibitions, splitBody, pad } from '../lib/data'
import { Page, Lines, Reveal, Tilt, Img, EASE } from '../components/Motion'

export default function Home() {
  const { data, loading, error } = useAsync(fetchExhibitions, [])
  if (loading) return <Page className="state"><div className="loader" /><span className="mono mute">טוען תערוכות</span></Page>
  if (error) return <Page className="state"><p className="lede">לא הצלחנו לטעון את התערוכות. נסו לרענן את הדף.</p></Page>
  if (!data?.length) return <Page className="state"><p className="lede">עוד אין תערוכות שפורסמו.</p></Page>

  const [current, ...rest] = data
  return (
    <Page>
      <Hero ex={current} />
      <section className="wrap" aria-labelledby="all-ex">
        <Reveal className="section-head">
          <h2 id="all-ex">תערוכות</h2>
          <span className="mono mute">{pad(data.length)} {data.length === 1 ? 'תערוכה' : 'תערוכות'}</span>
        </Reveal>
        <div className="cards">
          {data.map((ex, i) => <Card key={ex.id} ex={ex} i={i} />)}
        </div>
        <Reveal className="scale mono" style={{ marginTop: 48 }}>
          {data.map((ex, i) => (
            <div key={ex.id} className={`scale__seg ${i === 0 ? 'on' : ''}`}>
              {i === 0 && <motion.span className="scale__fill" style={{ insetInline: 0 }} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: EASE }} />}
              {ex.code}
            </div>
          ))}
          {rest.length === 0 && <div className="scale__seg">הבאה</div>}
        </Reveal>
      </section>
    </Page>
  )
}

function Hero({ ex }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yStage = useTransform(scrollYProgress, [0, 1], [0, 50])
  const yText = useTransform(scrollYProgress, [0, 1], [0, -60])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0.2])
  const intro = splitBody(ex.curatorial_text)[0]

  return (
    <section className="hero" ref={ref}>
      <motion.div className="hero__text" style={{ y: yText, opacity: fade }}>
        <motion.div className="mono mute" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.1 }}>
          תערוכה נוכחית — {ex.code}
        </motion.div>
        <Lines lines={[ex.title, ex.subtitle].filter(Boolean)} className="display" />
        <motion.p className="lede" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.55 }}>
          {intro}
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.7 }}>
          <Link to={`/e/${ex.slug}`} className="btn">כניסה לתערוכה <span className="arrow">←</span></Link>
        </motion.div>
      </motion.div>

      <motion.div className="hero__stage" style={{ y: yStage }}
        initial={{ opacity: 0, rotateY: -14, x: -60 }} animate={{ opacity: 1, rotateY: 0, x: 0 }}
        transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}>
        <Tilt className="hero__card" max={6}>
          <div className="hero__plate" />
          <Link to={`/e/${ex.slug}`} aria-label={`כניסה לתערוכה ${ex.title}`}>
            <div className="frame"><Img src={ex.cover_url} alt={`שער התערוכה ${ex.title}`} eager /></div>
          </Link>
          <div className="hero__tag mono">{ex.code} · {ex.year} · {pad(ex.works?.length || 0)} עבודות</div>
        </Tilt>
        <div className="hero__shadow" />
      </motion.div>
    </section>
  )
}

function Card({ ex, i }) {
  return (
    <Reveal delay={i * 0.08}>
      <Link to={`/e/${ex.slug}`} className="card">
        <div className="frame"><Img src={ex.cover_url} alt={`שער התערוכה ${ex.title}`} /></div>
        <span className="mono mute">{ex.code}</span>
        <span className="card__title">{ex.title}</span>
        <span className="card__meta mono mute"><span>{ex.subtitle}</span><span>{ex.year} · {pad(ex.works?.length || 0)} עבודות</span></span>
      </Link>
    </Reveal>
  )
}
