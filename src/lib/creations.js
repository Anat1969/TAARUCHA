// יצירות מאפליקציות: קובץ creations.json (תקן AppOfApp-GH/docs/creations-standard.md) הופך לחדרים.
// כל נושא = תערוכה קבועה משלה (חדר באגף הקבע), וכל יצירה = עבודת דימוי על הקיר, עם הטקסט שלה בגוף העבודה.
// המיפוי משותף לייבוא בסטודיו (/studio/import) ולסקריפט ה-SQL (tools/creations-sql.mjs).
export const STYLE_HE = { poster: 'טקסט על תמונה', gradient: 'שדה צבע', veil: 'שקיפות', insight: 'תובנה', quote: 'ציטוט', haiku: 'הייקו', post: 'פוסט', fromto: 'ממה למה', essay: 'מאמר' }
export const plain = (s) => String(s ?? '').replace(/==(.+?)==/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').trim()

function workBody(c) {
  switch (c.style) {
    case 'quote': return [c.quote, [c.who, c.cite].filter(Boolean).join(', ')].filter(Boolean).map(plain).join('\n\n')
    case 'haiku': return [(c.lines || []).join('\n'), c.text].filter(Boolean).map(plain).join('\n\n')
    case 'fromto': return [`${c.fromLabel || 'ממה'}: ${plain(c.from)}`, `${c.toLabel || 'למה'}: ${plain(c.to)}`, plain(c.text)].filter(Boolean).join('\n\n')
    case 'essay': return [c.text, ...(c.body || [])].filter(Boolean).map(plain).join('\n\n')
    default: return [c.text].filter(Boolean).map(plain).join('\n\n')
  }
}
const workTitle = (c) => plain(c.title || c.quote || (c.lines || [])[0] || STYLE_HE[c.style])

export function roomsFromCreations(data, jsonUrl, onlyTopic) {
  const app = data.app || {}
  const abs = (u) => (u ? new URL(u, jsonUrl).href : null)
  return (data.topics || []).filter((t) => !onlyTopic || t.id === onlyTopic).map((t) => {
    const works = (t.creations || []).filter((c) => c.png).map((c, i) => ({
      type: 'image',
      media_url: abs(c.png),
      title: workTitle(c),
      kicker: STYLE_HE[c.style] || c.style,
      body: workBody(c),
      year: String(new Date().getFullYear()),
      medium: c.credit ? `יצירה דיגיטלית, A4 · ${plain(c.credit)}` : 'יצירה דיגיטלית, A4',
      position: i + 1,
    }))
    return {
      slug: t.room || `${app.id}-${t.id}`,
      title: plain(t.title),
      subtitle: `${app.name} · ${t.zone}`,
      curatorial_text: plain(t.sub || ''),
      inquiry: `יצירות מתוך האפליקציה ${app.name}`,
      kind: 'permanent',
      year: String(new Date().getFullYear()),
      links: app.url ? [{ label: app.name, url: app.url }] : [],
      cover_url: works[0]?.media_url || null,
      works,
    }
  })
}

// כתבה מאפליקציה: עמוד A4 אחד (רכיב <app-article>), שנתלה בחדר של האפליקציה, room-<app.id>.
// גוף העבודה הוא JSON עם הכתובת והמקור, והקיר מציג את הכתבה החיה מתוך קובץ היצירות של האפליקציה.
export const ARTICLE_LAYOUT = 'cr-article'
export function articleSource(data, key) {
  if (key.pool) return (data.pool || []).find((x) => x.id === key.pool) || null
  return (data.topics || []).find((x) => x.id === key.topic) || null
}
export function articleHero(t, jsonUrl) {
  const c = (t?.creations || []).find((x) => x.image && ['poster', 'veil', 'post', 'essay'].includes(x.style)) || (t?.creations || []).find((x) => x.image)
  return c ? new URL(c.image, jsonUrl).href : null
}
export function articleBody(src, key) { return JSON.stringify(key.pool ? { src, pool: key.pool } : { src, topic: key.topic }) }
export function parseArticle(w) {
  if (w?.layout !== ARTICLE_LAYOUT) return null
  try { const b = JSON.parse(w.body || ''); return b && b.src && (b.topic || b.pool) ? b : null } catch { return null }
}
export function articleRoom(app) {
  return {
    slug: `room-${app.id}`,
    title: app.name,
    subtitle: 'החדר של האפליקציה',
    curatorial_text: plain(app.description || '') || `כתבות שנוצרו באפליקציה ${app.name}`,
    kind: 'permanent',
    inquiry: `כתבות מתוך האפליקציה ${app.name}`,
    year: String(new Date().getFullYear()),
    links: app.url ? [{ label: app.name, url: app.url }] : [],
  }
}
