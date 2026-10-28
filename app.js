(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Cookies
  const ck = {
    get(n) { const m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); try { return m ? JSON.parse(decodeURIComponent(m[1])) : null; } catch { return null; } },
    set(n, v) { document.cookie = `${n}=${encodeURIComponent(JSON.stringify(v))};max-age=31536000;path=/;SameSite=Lax`; }
  };

  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const T = (window.TITLES || []).map(t => ({ ...t, id: slug(t.name) }));
  const byId = id => T.find(t => t.id === id);
  let favs = (ck.get('nt3_favs') || []).filter(byId);
  let q = '', cat = 'All', idx = 0, timer;
  const items = T.filter(t => t.carousel);

  const TAG = '<svg viewBox="0 0 24 24"><path d="M3 3h8l9 9-8 8-9-9z"/><circle cx="7.5" cy="7.5" r="1"/></svg>';
  const art = t => `<div class="art" data-name="${esc(t.name)}"><img src="${esc(t.cover)}" alt="${esc(t.name)}" loading="lazy"></div>`;
  const card = t => { const on = favs.includes(t.id); return `<article class="card" data-play="${t.id}" tabindex="0" role="button" aria-label="Play ${esc(t.name)}">${art(t)}<button class="fav${on ? ' on' : ''}" data-fav="${t.id}" aria-pressed="${on}" aria-label="${on ? 'Remove from' : 'Add to'} favorites">${on ? '★' : '☆'}</button><div class="meta"><h3>${esc(t.name)}</h3><p>${TAG}${esc(t.category)}</p></div></article>`; };
  const grid = (el, list, empty) => { el.innerHTML = list.length ? list.map(card).join('') : `<p class="empty">${empty}</p>`; };

  function render() {
    grid($('#popular'), T.slice(0, 6), 'No titles yet. Add them in data.js.');
    const cats = ['All', ...new Set(T.map(t => t.category))];
    $('#chips').innerHTML = cats.map(c => `<button class="chip${c === cat ? ' on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    grid($('#all'), T.filter(t => (cat === 'All' || t.category === cat) && t.name.toLowerCase().includes(q)), 'No titles match your search.');
    grid($('#favs'), favs.map(byId), 'No favorites yet. Select the star on any title to save it here.');
  }

  // Carousel
  function stage() {
    if (!items.length) { $('.hero').hidden = $('#dots').hidden = $('#trend').hidden = true; return; }
    $('#stage').innerHTML = items.map(t => `<div class="slide" data-id="${t.id}">${art(t)}<button class="play" data-play="${t.id}">&#9654; Play Now</button></div>`).join('');
    $('#dots').innerHTML = items.map((_, i) => `<button data-go="${i}" aria-label="Show title ${i + 1}"></button>`).join('');
    pos();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => go(idx + 1, true), 6500);
  }
  function pos() {
    const n = items.length, h = Math.floor(n / 2);
    $$('.slide').forEach((s, i) => { const o = ((i - idx + n + h) % n) - h; s.dataset.pos = Math.abs(o) > 1 ? 'x' : o; });
    $$('#dots button').forEach((b, i) => b.classList.toggle('on', i === idx));
  }
  function go(i, auto) { idx = (i + items.length) % items.length; pos(); if (!auto) { clearInterval(timer); timer = null; } }

  // Views
  function show(v) {
    if (v === 'chat') return dialog();
    ck.set('nt3_view', v);
    $$('.view').forEach(s => s.hidden = s.id !== 'view-' + v);
    $$('nav [data-view]').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    scrollTo(0, 0);
  }
  const dialog = () => { $('#modal').hidden = false; $('#m-close').focus(); };

  // User
  function play(id) {
    const t = byId(id); if (!t) return;
    $('#frame').src = t.url; $('#frame').title = t.name;
    $('#player').hidden = false; document.body.classList.add('playing');
    document.title = `${t.name} | New Tab 3`;
  }
  function home() {
    $('#frame').src = 'about:blank'; $('#player').hidden = true;
    document.body.classList.remove('playing'); document.title = 'New Tab 3';
  }

  document.addEventListener('click', e => {
    const g = id => e.target.closest(id);
    let el;
    if (el = g('[data-fav]')) { const id = el.dataset.fav; favs = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id]; ck.set('nt3_favs', favs); render(); return; }
    if (el = g('[data-play]')) return play(el.dataset.play);
    if (el = g('.slide')) { if (el.dataset.pos !== '0') go(items.findIndex(t => t.id === el.dataset.id)); return; }
    if (el = g('[data-view]')) return show(el.dataset.view);
    if (el = g('[data-cat]')) { cat = el.dataset.cat; return render(); }
    if (el = g('[data-go]')) return go(+el.dataset.go);
    if (g('#prev')) return go(idx - 1);
    if (g('#next')) return go(idx + 1);
    if (g('#viewAll')) return show('titles');
    if (g('#home-btn')) return home();
    if (g('#m-close') || e.target.id === 'modal') $('#modal').hidden = true;
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $('#modal').hidden = true;
    if (e.key === 'Enter' && e.target.matches('.card')) play(e.target.dataset.play);
  });
  document.addEventListener('error', e => { if (e.target.tagName === 'IMG') { e.target.style.display = 'none'; e.target.parentElement.classList.add('nocover'); } }, true);
  $('#search').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); render(); });

  render(); stage();
  const last = ck.get('nt3_view'); show(['home', 'titles', 'favorites'].includes(last) ? last : 'home');
})();
