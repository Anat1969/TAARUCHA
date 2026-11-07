// בדיקת ייבוא יצירות וכתבות: /studio/import עם מנהל מדומה ו-Supabase מדומה. הרצה: npx vite preview --port 4173 & node tests/import.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
// הרכיב המשותף <app-article> מעותק מקומי של AppOfApp-GH, וקובץ יצירות מקומי עם מאגר (עולם נעלם)
const CREATIONS_JS = process.env.CREATIONS_JS || path.join(__dirname, '../../appofapp-gh/public/creations.js');
const ARTICLE_JSON = process.env.ARTICLE_JSON || path.join(__dirname, 'fixtures/olam-creations.json');
const BASE = process.argv[2] || 'http://localhost:4173/';
const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };

// כתבה אחת: /studio/import?article=1 תולה אותה בחדר room-<app>, ופעם שנייה מעדכנת. ובדף החדר הכתבה חיה על הקיר.
async function articles(b, sess) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  const st = { room: null, works: [], calls: [] };
  await p.route('**/ai-menu.js', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await p.route('**/creations.js', (r) => r.fulfill({ path: CREATIONS_JS, contentType: 'application/javascript', headers: H }));
  await p.route('https://olam.test/**', (r) => r.request().url().endsWith('.json') ? r.fulfill({ path: ARTICLE_JSON, contentType: 'application/json', headers: H }) : r.fulfill({ status: 404, headers: H, body: '' }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await p.route(/supabase\.co/, async (r) => {
    const u = decodeURIComponent(r.request().url()), m = r.request().method();
    const J = (body, status = 200) => r.fulfill({ status, contentType: 'application/json', headers: H, body: JSON.stringify(body) });
    if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: H, body: '' });
    if (u.includes('/rpc/taarucha_whoami')) return J(true);
    if (u.includes('/auth/v1/user')) return J({ id: 'u1', email: 'a@b.c', aud: 'authenticated' });
    const one = (r.request().headers()['accept'] || '').includes('vnd.pgrst.object');
    st.calls.push(m + ' ' + u.split('/rest/v1/')[1]);
    if (u.includes('/taarucha_exhibitions')) {
      if (m === 'POST') { st.room = { id: 'room1', ...JSON.parse(r.request().postData()) }; return J(one ? { id: 'room1' } : [{ id: 'room1' }], 201); }
      if (m === 'PATCH') { Object.assign(st.room, JSON.parse(r.request().postData())); return J([]); }
      if (u.includes('select=position')) return J([{ position: 41 }]);
      if (u.includes('works:taarucha_works(id')) return J(st.room ? [{ ...st.room, works: st.works.map(({ id, media_url, type, title, position }) => ({ id, media_url, type, title, position })) }] : []);
      if (u.includes('works:taarucha_works')) return J(st.room ? { ...st.room, works: st.works } : null);
      return J(one ? st.room : st.room ? [st.room] : []);
    }
    if (u.includes('/taarucha_works')) {
      if (m === 'POST') { const w = JSON.parse(r.request().postData()); st.works.push({ id: 'w' + (st.works.length + 1), ...w }); return J([], 201); }
      if (m === 'PATCH') { st.patched = (st.patched || 0) + 1; return J([]); }
      if (u.includes('body=eq.')) return J(st.works.filter((w) => u.includes('body=eq.' + w.body)).map((w) => ({ id: w.id })));
      if (u.includes('select=position')) return J(st.works.map((w) => ({ position: w.position })));
      return J(st.works);
    }
    return J([]);
  });
  await p.addInitScript((s) => localStorage.setItem('sb-ktqmwpbzcnzkhjskqisy-auth-token', JSON.stringify(s)), sess);
  const src = 'https://olam.test/creations.json';
  const url = BASE + 'studio/import?article=1&src=' + encodeURIComponent(src) + '&pool=l-116';
  const fail = [];
  const ok = (c, m) => { console.log((c ? 'ok: ' : 'FAIL: ') + m); if (!c) fail.push(m); };
  await p.goto(url);
  await p.waitForSelector('app-article[data-ready="1"] .ar-sheet', { timeout: 20000 });
  ok(await p.getByText('הכתבה תיתלה בחדר של עולם נעלם').count() > 0, 'כתבה: שורת "הכתבה תיתלה בחדר של"');
  const fit = await p.locator('app-article .ar-sheet').getAttribute('data-fit');
  ok(fit && fit !== 'over', 'כתבה: הגיליון בלי גלישה (' + fit + ')');
  await p.getByRole('button', { name: /תלייה בחדר של/ }).click();
  await p.waitForSelector('[role=status]', { timeout: 15000 });
  ok(st.room?.slug === 'room-olam' && st.room.kind === 'permanent' && st.room.status === 'published', 'כתבה: נפתח החדר room-olam באגף הקבע');
  ok(st.works.length === 1 && st.works[0].layout === 'cr-article' && JSON.parse(st.works[0].body).pool === 'l-116', 'כתבה: נתלתה עבודה cr-article עם המקור');
  await p.goto(url);
  await p.waitForSelector('app-article[data-ready="1"]', { timeout: 20000 });
  await p.getByRole('button', { name: /תלייה בחדר של/ }).click();
  await p.waitForSelector('[role=status]', { timeout: 15000 });
  ok((await p.locator('[role=status]').innerText()).includes('הכתבה כבר תלויה בחדר, עודכנה') && st.works.length === 1 && st.patched === 1, 'כתבה: תלייה חוזרת מעדכנת ולא מכפילה');
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    await p.setViewportSize(vp);
    await p.goto(BASE + 'e/room-olam');
    await p.waitForSelector('.work--article app-article[data-ready="1"] .ar-sheet', { timeout: 20000, state: 'attached' });
    ok(await p.locator('.work--article app-article').count() === 1, `חדר (${vp.width}): הכתבה חיה על הקיר`);
    await p.locator('.work--article .work__body').first().click();
    await p.waitForSelector('.lb__article app-article[data-ready="1"]', { timeout: 15000 });
    ok(true, `חדר (${vp.width}): ההגדלה מציגה את הכתבה`);
    await p.screenshot({ path: path.join(require('os').tmpdir(), `article-room-${vp.width}.png`) }).catch(() => {});
    await p.keyboard.press('Escape');
  }
  ok(!errs.length, 'כתבה: בלי שגיאות JavaScript ' + errs.join(' | '));
  if (fail.length) throw new Error(fail.join('; '));
}
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const posts = [];
  await p.route('**/ai-menu.js', (r) => r.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));

  await p.route(/supabase\.co/, async (r) => {
    const u = r.request().url(), m = r.request().method();
    const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
    const _f = r.fulfill.bind(r); r.fulfill = (o) => _f({ ...o, headers: { ...H, ...(o.headers || {}) } });
    if (m === 'OPTIONS') return r.fulfill({ status: 204, body: '' });
    if (u.includes('/rpc/taarucha_whoami')) return r.fulfill({ status: 200, contentType: 'application/json', body: 'true' });
    if (u.includes('/auth/v1/user')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'u1', email: 'a@b.c', aud: 'authenticated' }) });
    if (m === 'POST') { posts.push(u.split('/rest/v1/')[1]); const body = JSON.parse(r.request().postData() || '{}'); return r.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(Array.isArray(body) ? body : { id: 'ex' + posts.length }) }); }
    if (u.includes('select=position')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ position: 41 }]) });
    if (u.includes('/taarucha_exhibitions') && u.includes('select=id') ) return r.fulfill({ status: 200, contentType: 'application/json', body: 'null' , headers: {'content-range':'*/0'} });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
  await p.route('**/cdn.jsdelivr.net/**', (r) => r.continue());
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const sess = { access_token: 'x.y.z', token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'r', user: { id: 'u1', email: 'a@b.c', aud: 'authenticated' } };
  await p.addInitScript((s) => localStorage.setItem('sb-ktqmwpbzcnzkhjskqisy-auth-token', JSON.stringify(s)), sess);
  const src = 'https://cdn.jsdelivr.net/gh/Anat1969/Amirot-GH@a6df3ffbf40704528aabde6d810db9c4b1ef5c76/public/creations.json';
  await p.goto(BASE + 'studio/import?src=' + encodeURIComponent(src) + '&topic=haste');

  await p.waitForSelector('.st-row', { timeout: 20000 });
  const rows = await p.locator('.st-row').count();
  const checked = await p.locator('.st-row input:checked').count();
  await p.screenshot({ path: '/tmp/import.png' });
  await p.getByRole('button', { name: /יצירת 1 חדרים/ }).click();
  await p.waitForSelector('[role=status]', { timeout: 15000 });
  const st = await p.locator('[role=status] strong').textContent();
  const ok = rows >= 6 && checked === 1 && posts.some((x) => x.startsWith('taarucha_works')) && st.includes('1 חדרים');
  console.log(ok ? 'ok: ייבוא יצירות' : 'FAIL', { rows, checked, posts, st }); process.exitCode = ok ? 0 : 1;
  await articles(b, sess).catch((e) => { console.log('FAIL: כתבה', e.message); process.exitCode = 1; });
  await b.close();
})();
