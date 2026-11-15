const E = window.ENV || {}, app = document.getElementById('app'), nav = document.getElementById('nav');
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
if (!E.SUPABASE_URL || !E.SUPABASE_PUBLISHABLE_KEY) {
  app.innerHTML = '<div class="auth"><h1>FrameLog</h1><p class="err">Supabase settings are missing. Run <code>node build.js</code> with a filled-in .env file, or add the environment variables in Vercel and redeploy.</p></div>';
  throw new Error('Missing config');
}
const sb = supabase.createClient(E.SUPABASE_URL, E.SUPABASE_PUBLISHABLE_KEY);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let user = null, entries = [], tops = [], loaded = false;

const toast = (m, bad) => { const t = $('#toast'); t.textContent = m; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => t.className = '', 3200); };
const stars = r => r ? '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '') : '–';
const key = (t, y) => String(t).trim().toLowerCase() + '|' + (y || 0);
const avg = a => a.length ? a.reduce((s, e) => s + Number(e.rating), 0) / a.length : 0;
const byId = id => entries.find(e => e.id === id);
const uname = () => user.user_metadata?.username || user.email.split('@')[0];
const poster = e => `<div class="poster"><span>${esc(e.title)}</span>${e.poster_url ? `<img src="${esc(e.poster_url)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`;
const card = e => `<a class="card" href="#/film/${e.id}">${poster(e)}<small>${esc(e.title)}</small></a>`;
const opts = (l, s, all) => (all ? `<option value="">${all}</option>` : '') + l.map(x => `<option ${String(x) === String(s) ? 'selected' : ''}>${esc(x)}</option>`).join('');
const hb = l => { const x = Math.max(1, ...l.map(a => a[1])); return `<div class="hb">${l.map(([a, n]) => `<div><span>${esc(a)}</span><i style="width:${n / x * 100}%"></i><em>${n}</em></div>`).join('')}</div>`; };
const top4html = ed => `<div class="top4">${[1, 2, 3, 4].map(p => {
  const t = tops.find(x => x.position === p), e = t && byId(t.diary_entry_id), c = e ? 'slot' : 'slot empty';
  const inner = `<b>${p}</b>${e ? poster(e) + `<small>${esc(e.title)}</small>` : '<div class="poster">' + (ed ? '+' : '') + '</div>'}`;
  return ed ? `<button class="${c}" data-p="${p}">${inner}</button>` : e ? `<a class="${c}" href="#/film/${e.id}">${inner}</a>` : `<div class="${c}">${inner}</div>`;
}).join('')}</div>`;

async function load() {
  const [a, b] = await Promise.all([
    sb.from('diary_entries').select('*').order('watched_date', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('top_four').select('*').order('position')]);
  if (a.error || b.error) throw (a.error || b.error);
  entries = a.data; tops = b.data; loaded = true;
}

/* ---------- auth ---------- */
function authView(mode = 'in') {
  nav.hidden = true;
  app.innerHTML = `<div class="auth"><h1>FrameLog</h1><p class="muted">Your personal film archive.</p>
  <form id="af">${mode === 'up' ? '<input name="username" placeholder="Username" required minlength="2" autocomplete="username">' : ''}
  <input name="email" type="email" placeholder="Email" required autocomplete="email">
  <input name="password" type="password" placeholder="Password (6+ characters)" required minlength="6" autocomplete="${mode === 'up' ? 'new-password' : 'current-password'}">
  <button class="btn">${mode === 'up' ? 'Create account' : 'Sign in'}</button></form>
  <p class="muted"><a href="#" id="sw">${mode === 'up' ? 'Have an account? Sign in' : 'New here? Create an account'}</a></p><p class="err" id="ae"></p></div>`;
  $('#sw').onclick = e => { e.preventDefault(); authView(mode === 'up' ? 'in' : 'up'); };
  $('#af').onsubmit = async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('button'); b.disabled = true; $('#ae').textContent = '';
    const { data, error } = mode === 'up'
      ? await sb.auth.signUp({ email: f.email, password: f.password, options: { data: { username: f.username.trim() } } })
      : await sb.auth.signInWithPassword({ email: f.email, password: f.password });
    b.disabled = false;
    if (error) return $('#ae').textContent = error.message;
    if (mode === 'up' && !data.session) $('#ae').textContent = 'Account created. Confirm your email, then sign in.';
  };
}

/* ---------- views ---------- */
function dash() {
  const y = String(new Date().getFullYear()), ty = entries.filter(e => e.watched_date.startsWith(y));
  const m = Array(12).fill(0); ty.forEach(e => m[+e.watched_date.slice(5, 7) - 1]++);
  const mx = Math.max(1, ...m);
  app.innerHTML = `<header class="hero"><h1>FrameLog</h1><p>${esc(uname())}'s film archive</p></header><section class="pad">
  <div class="kpis"><div><b>${entries.length}</b>Films watched</div><div><b>${ty.length}</b>Watched in ${y}</div><div><b>${entries.length ? avg(entries).toFixed(1) : '–'}</b>Average rating</div></div>
  ${entries.length ? `<h2>Recently watched</h2><div class="grid">${entries.slice(0, 6).map(card).join('')}</div>` : '<div class="empty">Your archive is empty.<br><a class="btn" href="#/add">Log your first film</a></div>'}
  <h2>Top 4</h2>${top4html(false)}
  <h2>Watched per month in ${y}</h2><div class="bars">${m.map((n, i) => `<div><em>${n || ''}</em><i style="height:${Math.round(n / mx * 80)}px"></i><span>${MON[i][0]}</span></div>`).join('')}</div></section>`;
}

const F = { q: '', g: '', y: '', s: 'new' };
function coll() {
  const gs = [...new Set(entries.flatMap(e => e.genres))].sort(), ys = [...new Set(entries.map(e => e.release_year).filter(Boolean))].sort((a, b) => b - a);
  app.innerHTML = `<section class="pad"><h1>Films</h1><input id="q" type="search" placeholder="Search by title" value="${esc(F.q)}">
  <div class="row" style="margin-top:.5rem"><select id="g">${opts(gs, F.g, 'All genres')}</select><select id="y">${opts(ys, F.y, 'All years')}</select>
  <select id="s">${[['new', 'Newest watched'], ['old', 'Oldest watched'], ['top', 'Highest rated'], ['az', 'A to Z']].map(([v, l]) => `<option value="${v}" ${F.s === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <p class="muted" id="cnt" style="margin:.7rem 0"></p><div class="grid" id="gr"></div></section>`;
  const draw = () => {
    const l = entries.filter(e => (!F.q || (e.title + ' ' + (e.original_title || '')).toLowerCase().includes(F.q.toLowerCase())) && (!F.g || e.genres.includes(F.g)) && (!F.y || String(e.release_year) === F.y));
    l.sort({ new: (a, b) => b.watched_date.localeCompare(a.watched_date), old: (a, b) => a.watched_date.localeCompare(b.watched_date), top: (a, b) => b.rating - a.rating, az: (a, b) => a.title.localeCompare(b.title) }[F.s]);
    $('#cnt').textContent = l.length + (l.length === 1 ? ' film' : ' films');
    $('#gr').innerHTML = l.length ? l.map(card).join('') : `<div class="empty" style="grid-column:1/-1">${entries.length ? 'No films match your filters.' : 'Your archive is empty.<br><a class="btn" href="#/add">Log a film</a>'}</div>`;
  };
  $('#q').oninput = e => { F.q = e.target.value; draw(); };
  $('#g').onchange = e => { F.g = e.target.value; draw(); };
  $('#y').onchange = e => { F.y = e.target.value; draw(); };
  $('#s').onchange = e => { F.s = e.target.value; draw(); };
  draw();
}

function form(id) {
  const e = id ? byId(id) : null;
  if (id && !e) { location.hash = '#/collection'; return; }
  const v = e || { watched_date: new Date().toISOString().slice(0, 10), rating: 3, genres: [] };
  app.innerHTML = `<section class="pad"><h1>${e ? 'Edit film' : 'Log a film'}</h1><form id="ff" class="form">
  <label>Title *<input name="title" required value="${esc(v.title)}"></label>
  <label>Original title<input name="original_title" value="${esc(v.original_title)}"></label>
  <div class="row"><label>Release year<input name="release_year" type="number" min="1888" max="2100" value="${esc(v.release_year)}"></label><label>Runtime (minutes)<input name="runtime" type="number" min="1" max="1000" value="${esc(v.runtime)}"></label></div>
  <label>Director<input name="director" value="${esc(v.director)}"></label>
  <label>Genres, separated by commas<input name="genres" placeholder="Drama, Crime" value="${esc(v.genres.join(', '))}"></label>
  <label>Country<input name="country" value="${esc(v.country)}"></label>
  <label>Poster image link<input name="poster_url" type="url" placeholder="https://..." value="${esc(v.poster_url)}"></label>
  <label>Date watched *<input name="watched_date" type="date" required value="${esc(v.watched_date)}"></label>
  <label>Rating: <span class="stars" id="rv">${stars(v.rating)}</span><input name="rating" type="range" min="0.5" max="5" step="0.5" value="${v.rating}"></label>
  <label>Review<textarea name="review" rows="5">${esc(v.review)}</textarea></label>
  <label class="chk"><input name="is_favorite" type="checkbox" ${v.is_favorite ? 'checked' : ''}> Favorite</label>
  <div class="row"><button class="btn">Save film</button>${e ? '<button type="button" class="btn ghost danger" id="del">Delete film</button>' : ''}</div></form></section>`;
  $('#ff').oninput = ev => { if (ev.target.name === 'rating') $('#rv').textContent = stars(+ev.target.value); };
  if (e) $('#del').onclick = () => del(id);
  $('#ff').onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(ev.target), n = k => (f.get(k) || '').trim() || null, num = k => f.get(k) ? +f.get(k) : null;
    const p = { title: n('title'), original_title: n('original_title'), release_year: num('release_year'), director: n('director'),
      genres: (f.get('genres') || '').split(',').map(s => s.trim()).filter(Boolean).map(s => s[0].toUpperCase() + s.slice(1)),
      country: n('country'), runtime: num('runtime'), poster_url: n('poster_url'), watched_date: f.get('watched_date'),
      rating: +f.get('rating'), review: n('review'), is_favorite: f.has('is_favorite') };
    if (entries.some(x => x.id !== id && key(x.title, x.release_year) === key(p.title, p.release_year))) return toast('That film is already in your diary.', 1);
    const b = ev.submitter || ev.target.querySelector('button'); b.disabled = true;
    const { data, error } = await (e ? sb.from('diary_entries').update(p).eq('id', id) : sb.from('diary_entries').insert(p)).select().single();
    b.disabled = false;
    if (error) return toast(error.code === '23505' ? 'That film is already in your diary.' : error.message, 1);
    await load(); toast('Saved'); location.hash = '#/film/' + data.id;
  };
}

async function del(id) {
  if (!confirm('Delete this film from your diary? This cannot be undone.')) return;
  const { error } = await sb.from('diary_entries').delete().eq('id', id);
  if (error) return toast(error.message, 1);
  await load(); toast('Deleted'); location.hash = '#/collection';
}

function film(id) {
  const e = byId(id);
  if (!e) { app.innerHTML = '<div class="pad empty">Film not found.<br><a href="#/collection">Back to films</a></div>'; return; }
  const t = tops.find(x => x.diary_entry_id === id);
  const meta = [e.original_title && e.original_title !== e.title ? e.original_title : '', e.release_year, e.runtime && e.runtime + ' min'].filter(Boolean).map(esc).join(', ');
  const info = [e.director && 'Directed by ' + e.director, e.country, e.genres.join(', ')].filter(Boolean).map(esc).join('<br>');
  app.innerHTML = `<section class="pad"><div class="dh">${poster(e)}<div><h1>${esc(e.title)}${e.is_favorite ? ' <span class="fav">♥</span>' : ''}</h1>
  <p class="muted">${meta}</p><p class="stars">${stars(e.rating)}</p><p class="muted">${info}</p><p class="muted">Watched ${esc(e.watched_date)}</p></div></div>
  ${e.review ? `<p class="review">${esc(e.review)}</p>` : ''}
  <div class="row" style="margin-top:1rem"><button class="btn ghost" id="fv">${e.is_favorite ? '♥ Remove favorite' : '♡ Mark favorite'}</button><a class="btn ghost" href="#/edit/${e.id}">Edit</a></div>
  <h2>Top 4</h2><div class="row"><select id="tp">${[1, 2, 3, 4].map(p => `<option ${t?.position === p ? 'selected' : ''}>${p}</option>`).join('')}</select><button class="btn" id="tb">${t ? 'Move in Top 4' : 'Add to Top 4'}</button></div>
  <p style="margin-top:2rem"><button class="btn ghost danger" id="dl">Delete film</button></p></section>`;
  $('#fv').onclick = async () => { const { error } = await sb.from('diary_entries').update({ is_favorite: !e.is_favorite }).eq('id', id); if (error) return toast(error.message, 1); await load(); film(id); };
  $('#tb').onclick = () => setTop(+$('#tp').value, id);
  $('#dl').onclick = () => del(id);
}

async function setTop(p, eid) {
  let r = await sb.from('top_four').delete().or(`position.eq.${p},diary_entry_id.eq.${eid}`);
  if (!r.error) r = await sb.from('top_four').insert({ position: p, diary_entry_id: eid });
  if (r.error) return toast(r.error.message, 1);
  await load(); toast('Top 4 updated'); route();
}
async function clearTop(p) {
  const { error } = await sb.from('top_four').delete().eq('position', p);
  if (error) return toast(error.message, 1);
  await load(); toast('Slot cleared'); route();
}
function topView() {
  app.innerHTML = `<section class="pad"><h1>Top 4</h1><p class="muted">Tap a slot to pick or change a film.</p>${top4html(true)}</section>`;
  app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => pick(+b.dataset.p));
}
function pick(p) {
  if (!entries.length) return toast('Log a film first, then pick your Top 4.', 1);
  const cur = tops.find(t => t.position === p), d = $('#dlg');
  d.innerHTML = `<form method="dialog"><h2>Slot ${p}</h2><select id="ps">${[...entries].sort((a, b) => a.title.localeCompare(b.title)).map(e => `<option value="${e.id}" ${cur?.diary_entry_id === e.id ? 'selected' : ''}>${esc(e.title)}${e.release_year ? ' (' + e.release_year + ')' : ''}</option>`).join('')}</select>
  <div class="row"><button class="btn" value="ok">Save slot</button>${cur ? '<button class="btn ghost" value="clear">Clear</button>' : ''}<button class="btn ghost" value="x">Cancel</button></div></form>`;
  d.onclose = async () => { const v = d.returnValue; d.returnValue = ''; if (v === 'ok') await setTop(p, $('#ps').value); if (v === 'clear') await clearTop(p); };
  d.showModal();
}

let SY = '';
function stats() {
  if (!entries.length) { app.innerHTML = '<section class="pad"><h1>Statistics</h1><div class="empty">Log a few films to see your stats.<br><a class="btn" href="#/add">Log a film</a></div></section>'; return; }
  const yrs = [...new Set(entries.map(e => e.watched_date.slice(0, 4)))].sort().reverse();
  if (!yrs.includes(SY)) SY = yrs[0];
  const m = Array(12).fill(0); entries.filter(e => e.watched_date.startsWith(SY)).forEach(e => m[+e.watched_date.slice(5, 7) - 1]++);
  const mx = Math.max(1, ...m), ym = {}; entries.forEach(e => { const k = e.watched_date.slice(0, 7); ym[k] = (ym[k] || 0) + 1; });
  const [bk, bn] = Object.entries(ym).sort((a, b) => b[1] - a[1])[0];
  const gc = {}; entries.forEach(e => e.genres.forEach(g => gc[g] = (gc[g] || 0) + 1));
  const gl = Object.entries(gc).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const mins = entries.reduce((s, e) => s + (e.runtime || 0), 0);
  app.innerHTML = `<section class="pad"><h1>Statistics</h1>
  <div class="kpis"><div><b>${entries.length}</b>Films watched</div><div><b>${avg(entries).toFixed(2)}</b>Average rating</div><div><b>${Math.round(mins / 60)}h</b>Total runtime</div><div><b>${MON[+bk.slice(5) - 1]} ${bk.slice(0, 4)}</b>Most active month (${bn} films)</div></div>
  <h2>Films per month</h2><select id="sy" style="margin-bottom:1rem">${opts(yrs, SY)}</select>
  <div class="bars">${m.map((n, i) => `<div><em>${n || ''}</em><i style="height:${Math.round(n / mx * 80)}px"></i><span>${MON[i][0]}</span></div>`).join('')}</div>
  <h2>Most-watched genres</h2>${gl.length ? hb(gl) : '<p class="muted">Add genres to your films to see this.</p>'}
  <h2>Films per year</h2>${hb(yrs.map(y => [y, entries.filter(e => e.watched_date.startsWith(y)).length]))}</section>`;
  $('#sy').onchange = e => { SY = e.target.value; stats(); };
}

function exp() {
  const data = { app: 'FrameLog', version: 1, exported_at: new Date().toISOString(),
    entries: entries.map(({ id, user_id, created_at, ...r }) => r),
    top_four: tops.map(t => { const e = byId(t.diary_entry_id); return e && { position: t.position, title: e.title, release_year: e.release_year }; }).filter(Boolean) };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `framelog-${new Date().toISOString().slice(0, 10)}.json`; a.click();
}
async function imp(file) {
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.entries)) throw Error('This is not a FrameLog export file');
    const have = new Set(entries.map(e => key(e.title, e.release_year))), rows = [];
    const cols = ['title', 'original_title', 'release_year', 'director', 'genres', 'country', 'runtime', 'poster_url', 'watched_date', 'rating', 'review', 'is_favorite'];
    for (const r of d.entries) {
      if (!r.title || !r.watched_date || !(r.rating >= .5 && r.rating <= 5)) continue;
      const k = key(r.title, r.release_year); if (have.has(k)) continue; have.add(k);
      rows.push(Object.fromEntries(cols.filter(c => r[c] !== undefined).map(c => [c, r[c]])));
    }
    if (rows.length) { const { error } = await sb.from('diary_entries').insert(rows); if (error) throw error; }
    await load();
    for (const t of d.top_four || []) {
      const e = entries.find(x => key(x.title, x.release_year) === key(t.title, t.release_year));
      if (e && t.position >= 1 && t.position <= 4 && !tops.some(x => x.position === t.position || x.diary_entry_id === e.id)) { await sb.from('top_four').insert({ position: t.position, diary_entry_id: e.id }); await load(); }
    }
    toast(`Imported ${rows.length} new film${rows.length === 1 ? '' : 's'}`); route();
  } catch (e) { toast('Import failed: ' + (e.message || e), 1); }
}
function settings() {
  app.innerHTML = `<section class="pad"><h1>${esc(uname())}</h1><p class="muted">${esc(user.email)}</p>
  <h2>Backup</h2><div class="row"><button class="btn" id="ex">Export JSON</button><label class="btn ghost">Import JSON<input id="im" type="file" accept=".json,application/json" hidden></label></div>
  <p class="muted" style="margin-top:.6rem">Import skips films that are already in your diary.</p>
  <h2>Account</h2><button class="btn ghost" id="lo">Sign out</button></section>`;
  $('#ex').onclick = exp;
  $('#im').onchange = e => { if (e.target.files[0]) imp(e.target.files[0]); e.target.value = ''; };
  $('#lo').onclick = () => sb.auth.signOut();
}

/* ---------- routing ---------- */
const NAV = [['', 'Home'], ['collection', 'Films'], ['add', 'Log'], ['top', 'Top 4'], ['stats', 'Stats'], ['settings', 'Me']];
const VIEWS = { '': dash, collection: coll, add: form, edit: form, film, top: topView, stats, settings };
async function route() {
  if (!user) return authView();
  const [r = '', id] = location.hash.replace(/^#\/?/, '').split('/');
  nav.hidden = false;
  nav.innerHTML = NAV.map(([h, l]) => `<a href="#/${h}" class="${h === r ? 'on' : ''}">${l}</a>`).join('');
  if (!loaded) {
    app.innerHTML = '<p class="muted pad">Loading your archive...</p>';
    try { await load(); } catch (e) { app.innerHTML = `<div class="pad"><p class="err">Could not load your films: ${esc(e.message)}</p><p class="muted">Check that schema.sql was run in Supabase, then try again.</p><button class="btn" onclick="route()">Try again</button></div>`; return; }
  }
  window.scrollTo(0, 0); (VIEWS[r] || dash)(id);
}
addEventListener('hashchange', route);
sb.auth.onAuthStateChange((ev, s) => {
  if (ev === 'TOKEN_REFRESHED') return;
  const nu = s?.user || null;
  if (ev !== 'INITIAL_SESSION' && nu?.id === user?.id) return;
  user = nu; loaded = false; entries = []; tops = [];
  setTimeout(route, 0);
});

/* PWA: register service worker (static files only) */
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}));
