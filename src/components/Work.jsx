import { splitBody, videoEmbed, TYPE_LABEL, pad, asset } from '../lib/data'
import { Img } from './Motion'
import { WorkEditLink } from './EditBar'

export function Prose({ body, skipPoem }) {
  const parts = splitBody(body)
  return (
    <div className="prose">
      {parts.map((p, i) => {
        if (i === 0 && p.includes('\n')) return skipPoem ? null : <p key={i} className="poem">{p}</p>
        const isAsk = i === parts.length - 1 && /[?？]$/.test(p)
        const isLead = !isAsk && p.length < 70
        return <p key={i} className={isAsk ? 'ask' : isLead ? 'lead' : undefined}>{p}</p>
      })}
    </div>
  )
}

export function Poem({ body }) {
  const first = splitBody(body)[0]
  if (!first) return null
  return <p className="poem">{first}</p>
}

export function Label({ w, i }) {
  return (
    <figcaption className="work__label">
      <b>W-{pad(i + 1)}</b> · {w.title || TYPE_LABEL[w.type]}
      {w.kicker && <><br />{w.kicker}</>}
      <br />{[w.year, w.medium || TYPE_LABEL[w.type]].filter(Boolean).join(' · ')}
    </figcaption>
  )
}

export function VideoPlayer({ w }) {
  const embed = videoEmbed(w.video_url)
  return (
    <div className="video-frame">
      {embed ? (
        <iframe src={embed} title={w.title || 'וידאו'} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />
      ) : w.media_url || w.video_url ? (
        <video src={asset(w.media_url || w.video_url)} controls playsInline preload="metadata" />
      ) : (
        <div className="mono" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#A3A39F' }}>[וידאו]</div>
      )}
    </div>
  )
}

// A single work on the wall. `h` is the hanging height (CSS length) shared by the row.
export function WallWork({ w, i, h, onOpen, stacked, exId }) {
  const open = () => onOpen?.(i)
  const imgStyle = stacked ? { width: '100%', height: 'auto' } : { height: h, width: 'auto' }
  const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }

  if (w.type === 'text') {
    return (
      <figure className="work">
        <div className="textwork">
          <blockquote>{splitBody(w.body)[0] || w.title}</blockquote>
          {splitBody(w.body).length > 1 && <div style={{ marginTop: 20 }}><Prose body={w.body} skipPoem /></div>}
        </div>
        <Label w={w} i={i} />
        <WorkEditLink exhibitionId={exId} workId={w.id} />
      </figure>
    )
  }

  if (w.type === 'video') {
    return (
      <figure className="work" style={{ width: stacked ? '100%' : `calc(${h} * 16 / 9)` }}>
        <div className="work__spot" aria-hidden="true" />
        <VideoPlayer w={w} />
        <Label w={w} i={i} />
        <WorkEditLink exhibitionId={exId} workId={w.id} />
      </figure>
    )
  }

  const image = (
    <div className="work__body" role="button" tabIndex={0} onClick={open} onKeyDown={key} aria-label={`הגדלת העבודה ${w.title || ''}`}>
      <div className="frame" style={stacked ? undefined : { height: h }}>
        <Img src={w.media_url} alt={w.title} style={imgStyle} />
      </div>
      <div className="work__cast" aria-hidden="true" />
    </div>
  )

  if (w.type === 'composite' || w.layout === 'diptych') {
    return (
      <figure className="work">
        <div className="work__spot" aria-hidden="true" />
        <div className="diptych">
          <div className="diptych__img">{image}</div>
          <div className="diptych__text">
            {w.kicker && <span className="mono mute">{w.kicker}</span>}
            {stacked ? <Prose body={w.body} /> : <Poem body={w.body} />}
            {!stacked && <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={open}>קריאה מלאה <span className="arrow">←</span></button>}
          </div>
        </div>
        <Label w={w} i={i} />
        <WorkEditLink exhibitionId={exId} workId={w.id} />
      </figure>
    )
  }

  return (
    <figure className="work">
      <div className="work__spot" aria-hidden="true" />
      {image}
      <Label w={w} i={i} />
        <WorkEditLink exhibitionId={exId} workId={w.id} />
    </figure>
  )
}
