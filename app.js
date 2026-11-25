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
  const typeEls = [...document.querySelectorAll('[data-build="type"]')];
  const frameEls = [...document.querySelectorAll('[data-build="frame"]')];
  let skip = false, running = false;

  const fullText = new Map(typeEls.map(el => [el, el.dataset.text || el.textContent]));
  const fullHTML = new Map(typeEls.map(el => [el, el.innerHTML]));
  typeEls.forEach(el => el.setAttribute('aria-label', fullText.get(el)));

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

  async function moveTo(el, x, y, ms = 500){
    const m = new DOMMatrix(getComputedStyle(el).transform);
    const sx = m.m41, sy = m.m42;
    await animate(ms, t => place(el, sx + (x - sx) * t, sy + (y - sy) * t));
  }

  async function dragFrame(el, target, ms = 900){
    const r = target.getBoundingClientRect();
    tag(el, true); shape(el, 'arrow');
    await moveTo(el, r.left + 8, r.top + 8, 500);
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

  async function typeLine(el, target, ms = 1100){
    const text = fullText.get(target);
    const r = target.getBoundingClientRect();
    shape(el, 'ibeam'); tag(el, true);
    await moveTo(el, r.left + 6, r.top + Math.min(20, r.height / 3), 400);
    const n = text.length;
    await animate(ms, t => {
      const k = Math.floor(t * n);
      const caret = document.createElement('span');
      caret.className = 'caret';
      target.replaceChildren(partialHTML(fullHTML.get(target), k), caret);
    });
    target.innerHTML = fullHTML.get(target);
    tag(el, false);
  }

  function reset(){
    skip = false;
    document.body.classList.add('building');
    typeEls.forEach(el => el.replaceChildren());
    frameEls.forEach(el => { el.style.clipPath = 'inset(0 100% 0 0)'; });
    Object.entries(cursors).forEach(([name, el], i) => {
      place(el, innerWidth * .5 + (i - 1) * 110, -60);
      shape(el, 'arrow'); tag(el, false); el.style.opacity = '1';
    });
    measure.classList.remove('show'); gv.classList.remove('show'); gh.classList.remove('show');
  }

  function finish(){
    skip = true;
    document.body.classList.remove('building');
    frameEls.forEach(el => { el.style.clipPath = 'none'; });
    typeEls.forEach(el => { el.innerHTML = fullHTML.get(el); });
    Object.values(cursors).forEach(el => { el.style.opacity = '0'; });
    measure.classList.remove('show'); gv.classList.remove('show'); gh.classList.remove('show');
    running = false;
  }

  async function build(){
    if (running) return;
    if (reduced || !finePointer){ finish(); return; }
    reset(); running = true;
    await wait(260);
    await dragFrame(cursors.soul, document.querySelector('.eyebrow'), 740);
    await wait(120);
    await dragFrame(cursors.rpa, document.querySelector('.stats'), 1000);
    await wait(140);
    await typeLine(cursors.soul, typeEls[0], 1150);
    await wait(160);
    await typeLine(cursors.coreflow, typeEls[1], 900);
    await wait(130);
    await dragFrame(cursors.coreflow, document.querySelector('.hero-actions'), 620);
    await wait(120);
    await dragFrame(cursors.soul, document.querySelector('.sign'), 560);
    await wait(1000);
    finish();
  }

  addEventListener('keydown', e => { if (e.key === 'Escape') finish(); });
  addEventListener('resize', () => { if (running) finish(); });

  // Reveal-on-scroll for everything below the hero.
  const reveals = [...document.querySelectorAll('.reveal')];
  if (!('IntersectionObserver' in window)){
    reveals.forEach(el => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting){ entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: .12 });
    reveals.forEach(el => io.observe(el));
    // Safety net: never leave content invisible if an observer callback is missed.
    setTimeout(() => reveals.forEach(el => el.classList.add('in')), 6000);
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build); else build();
})();
