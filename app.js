(() => {
  'use strict';
  document.documentElement.classList.add('js');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const cursors = {
    soul:     document.querySelector('[data-c="soul"]'),
    rpa:      document.querySelector('[data-c="rpa"]'),
    coreflow: document.querySelector('[data-c="coreflow"]')
  };
  const measure = document.getElementById('measure');
  const gv = document.getElementById('gv');
  const gh = document.getElementById('gh');

  // Snapshot every build target BEFORE anything is hidden or emptied.
  const targets = [...document.querySelectorAll('[data-build]')].map(el => ({
    el,
    html: el.innerHTML,
    text: el.dataset.text || el.textContent,
    type: el.dataset.build === 'type',
    owner: el.dataset.owner || 'soul'
  }));
  targets.forEach(t => t.el.setAttribute('aria-label', t.text));

  const groups = new Map();
  targets.forEach(t => {
    const sec = t.el.closest('section') || document.body;
    if (!groups.has(sec)) groups.set(sec, []);
    groups.get(sec).push(t);
  });

  let skip = false, building = false, idleTimer = null;
  const queue = [];
  const built = new Set();

  // Reveal k characters while keeping em / strong / gradient markup intact.
  function partialHTML(html, k){
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const state = { k };
    const walk = node => {
      if (node.nodeType === Node.TEXT_NODE){
        const take = Math.min(state.k, node.textContent.length);
        state.k -= take;
        return document.createTextNode(node.textContent.slice(0, take));
      }
      const clone = node.cloneNode(false);
      [...node.childNodes].forEach(child => {
        const piece = walk(child);
        if (piece) clone.appendChild(piece);
      });
      return clone;
    };
    const frag = document.createDocumentFragment();
    [...tpl.content.childNodes].forEach(node => {
      const piece = walk(node);
      if (piece) frag.appendChild(piece);
    });
    return frag;
  }

  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const wait = ms => new Promise(r => setTimeout(r, skip ? 0 : ms));

  function animate(ms, fn){
    if (skip || reduced || !finePointer){ fn(1); return Promise.resolve(); }
    return new Promise(res => {
      const t0 = performance.now();
      const tick = now => {
        if (skip){ fn(1); res(); return; }
        const t = Math.min(1, (now - t0) / ms);
        fn(ease(t));
        if (t < 1) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
  }

  function place(el, x, y){ el.style.transform = `translate(${x}px,${y}px)`; }
  function shape(el, name){ el.classList.remove('arrow', 'cross', 'ibeam'); el.classList.add(name); }
  function tag(el, on){ el.querySelector('.tag').classList.toggle('show', on); }
  function showCursors(){ clearTimeout(idleTimer); Object.values(cursors).forEach(c => { c.style.opacity = '1'; }); }
  function idleFade(){ clearTimeout(idleTimer); idleTimer = setTimeout(() => {
    if (!building) Object.values(cursors).forEach(c => { c.style.opacity = '0'; });
  }, 900); }

  async function moveTo(el, x, y, ms = 420){
    const m = new DOMMatrix(getComputedStyle(el).transform);
    const sx = m.m41, sy = m.m42;
    await animate(ms, t => place(el, sx + (x - sx) * t, sy + (y - sy) * t));
  }

  async function dragFrame(el, target, ms = 620){
    const r = target.getBoundingClientRect();
    tag(el, true); shape(el, 'arrow');
    await moveTo(el, r.left + 8, r.top + 8, 380);
    shape(el, 'cross');
    gv.style.height = r.top + 'px'; gv.style.top = '0';
    gh.style.width = r.left + 'px'; gh.style.left = '0';
    gv.classList.add('show'); gh.classList.add('show'); measure.classList.add('show');
    await animate(ms, t => {
      const x = r.left + 8 + (r.width - 16) * t;
      const y = r.top + 8 + (r.height - 16) * t;
      place(el, x, y);
      target.style.clipPath = `inset(0 ${(1 - t) * 100}% ${(1 - t) * 100}% 0)`;
      measure.textContent = `${Math.round(t * r.width)} × ${Math.round(t * r.height)}`;
      gv.style.height = y + 'px'; gh.style.width = x + 'px';
      measure.style.left = (x + 20) + 'px'; measure.style.top = (y - 16) + 'px';
    });
    target.style.clipPath = 'none';
    gv.classList.remove('show'); gh.classList.remove('show'); measure.classList.remove('show');
    shape(el, 'arrow');
  }

  async function typeLine(el, target, html, text, ms){
    const r = target.getBoundingClientRect();
    shape(el, 'ibeam'); tag(el, true);
    await moveTo(el, r.left + 6, r.top + Math.min(20, Math.max(8, r.height / 3)), 360);
    const n = text.length;
    await animate(ms, t => {
      const k = Math.floor(t * n);
      const caret = document.createElement('span');
      caret.className = 'caret';
      target.replaceChildren(partialHTML(html, k), caret);
    });
    target.innerHTML = html;
    tag(el, false);
  }

  function hideAll(){
    targets.forEach(t => {
      if (t.type) t.el.replaceChildren();
      else t.el.style.clipPath = 'inset(0 100% 0 0)';
    });
  }

  function finish(){
    skip = true;
    targets.forEach(t => {
      t.el.style.clipPath = 'none';
      t.el.innerHTML = t.html;
    });
    Object.values(cursors).forEach(c => { c.style.opacity = '0'; });
    measure.classList.remove('show'); gv.classList.remove('show'); gh.classList.remove('show');
    queue.length = 0; building = false;
  }

  function enqueue(section){
    if (!section || built.has(section)) return;
    built.add(section); queue.push(section); pump();
  }

  async function buildSection(section){
    const items = groups.get(section) || [];
    if (!items.length) return;
    showCursors();
    for (const t of items){
      if (skip) break;
      const cursor = cursors[t.owner] || cursors.soul;
      if (t.type){
        const ms = Math.max(420, Math.min(950, 220 + t.text.length * 16));
        await typeLine(cursor, t.el, t.html, t.text, ms);
      } else {
        await dragFrame(cursor, t.el, section.id === 'hero' ? 780 : 520);
      }
      await wait(section.id === 'hero' ? 130 : 70);
    }
  }

  async function pump(){
    if (building) return;
    building = true;
    while (queue.length && !skip){
      await buildSection(queue.shift());
    }
    building = false;
    idleFade();
  }

  // Skip / reduced-motion / touch: show the whole page immediately.
  addEventListener('keydown', e => { if (e.key === 'Escape') finish(); });
  addEventListener('resize', () => { if (building) finish(); });

  if (reduced || !finePointer){
    finish();
  } else {
    hideAll();
    enqueue(document.getElementById('hero'));

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting){ enqueue(e.target); io.unobserve(e.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('section').forEach(s => io.observe(s));

    // Safety net: never leave content hidden if a callback is missed.
    setTimeout(() => {
      const stuck = targets.some(t => !t.type && t.el.style.clipPath && t.el.style.clipPath !== 'none');
      if (stuck) finish();
    }, 18000);
  }
})();
