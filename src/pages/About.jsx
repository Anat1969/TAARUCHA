import { useAsync, fetchSettings, splitBody } from '../lib/data'
import { Page, Lines, Reveal } from '../components/Motion'

export default function About() {
  const { data: s } = useAsync(fetchSettings, [])
  return (
    <Page className="wrap" style={{ paddingTop: 'clamp(40px, 6vw, 96px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 'clamp(32px, 6vw, 110px)', alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span className="mono mute">אודות</span>
          <Lines lines={(s?.name || 'ענת דוד שטיבלמן').split(' ').reduce((acc, w, i) => { i % 2 ? (acc[acc.length - 1] += ' ' + w) : acc.push(w); return acc }, [])} className="display display--md" />
          {s?.tagline && <span className="mono mute">{s.tagline}</span>}
        </div>
        <Reveal delay={0.3} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {splitBody(s?.bio).map((p, i) => <p key={i} className="lede" style={{ maxWidth: 'none' }}>{p}</p>)}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {s?.email && <a className="btn" href={`mailto:${s.email}`}>כתבו לי <span className="arrow">←</span></a>}
            {s?.instagram && <a className="btn" href={s.instagram} target="_blank" rel="noreferrer">אינסטגרם</a>}
          </div>
        </Reveal>
      </div>
    </Page>
  )
}
