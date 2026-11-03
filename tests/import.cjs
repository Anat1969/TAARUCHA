// בדיקת ייבוא יצירות: /studio/import עם מנהל מדומה ו-Supabase מדומה. הרצה: npx vite preview --port 4173 & node tests/import.cjs
const { chromium } = require('playwright');
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
  await p.goto('' + (process.argv[2] || 'http://localhost:4173/') + 'studio/import?src=' + encodeURIComponent(src) + '&topic=haste');

  await p.waitForSelector('.st-row', { timeout: 20000 });
  const rows = await p.locator('.st-row').count();
  const checked = await p.locator('.st-row input:checked').count();
  await p.screenshot({ path: '/tmp/import.png' });
  await p.getByRole('button', { name: /יצירת 1 חדרים/ }).click();
  await p.waitForSelector('[role=status]', { timeout: 15000 });
  const st = await p.locator('[role=status] strong').textContent();
  const ok = rows >= 6 && checked === 1 && posts.some((x) => x.startsWith('taarucha_works')) && st.includes('1 חדרים');
  console.log(ok ? 'ok: ייבוא יצירות' : 'FAIL', { rows, checked, posts, st }); process.exitCode = ok ? 0 : 1;
  await b.close();
})();
