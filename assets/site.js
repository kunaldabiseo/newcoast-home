(() => {
  'use strict';
  const d = document, root = d.documentElement;
  root.classList.add('js');
  const $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const store = { get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }, set(k,v){ try { localStorage.setItem(k,v); } catch(e){} } };
  // Motion is reduced only when the visitor turns it off with the footer switch, so the page looks the same on every computer
  const RM = store.get('nc-motion-off') === '1';
  root.classList.toggle('rm', RM);
  const G = !!(window.gsap && window.ScrollTrigger) && !RM;
  const fine = matchMedia('(pointer:fine)').matches;
  const safe = (n, f) => { try { f(); } catch (e) { console.warn('[NewCoast] module failed:', n, e); } };
  let lenis = null;
  if (G) { gsap.registerPlugin(ScrollTrigger); root.classList.add('gsp'); }

  /* ---------- Smooth scroll ---------- */
  // Smooth-scroll engine runs on desktop widths only. Phones and tablets keep native scrolling (momentum, find, accessibility tools).
  const DESK = matchMedia('(min-width:1024px)');
  safe('lenis', () => {
    if (!G || !window.Lenis) return;
    gsap.ticker.lagSmoothing(0);
    let tick = null;
    const start = () => { if (lenis || !DESK.matches) return; lenis = new Lenis({ lerp: .1, smoothWheel: true }); lenis.on('scroll', ScrollTrigger.update); tick = t => lenis && lenis.raf(t * 1000); gsap.ticker.add(tick); };
    const stop = () => { if (!lenis) return; gsap.ticker.remove(tick); tick = null; lenis.destroy(); lenis = null; root.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped'); };
    start(); DESK.addEventListener ? DESK.addEventListener('change', e => (e.matches ? start() : stop())) : DESK.addListener(e => (e.matches ? start() : stop()));
  });
  const scrollToEl = (target, off = 0) => {
    if (lenis) return lenis.scrollTo(target, { offset: off, duration: 1.4 });
    if (typeof target === 'number') return scrollTo({ top: target, behavior: RM ? 'auto' : 'smooth' });
    const y = target.getBoundingClientRect().top + scrollY + off; scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
  };
  window.__ncScroll = scrollToEl;

  /* ---------- Loader: brand plate, counter, panels lift (first visit per session) ---------- */
  safe('loader', () => {
    let seen = false; try { seen = !!sessionStorage.getItem('nc-v3'); sessionStorage.setItem('nc-v3', '1'); } catch (e) {}
    if (!G || seen) return;
    const ld = d.createElement('div'); ld.className = 'ld'; ld.setAttribute('aria-hidden', 'true');
    ld.innerHTML = Array.from({ length: 5 }, (_, i) => `<div class="ld__p" style="left:${i * 20}%;width:20.3%"></div>`).join('') +
      '<div class="ld__in"><div class="ld__plate"><img src="img/logo.png" alt=""></div></div><div class="ld__t">Specialised hospitality business brokers</div><div class="ld__n">0</div>';
    d.body.appendChild(ld); lenis && lenis.stop();
    const n = $('.ld__n', ld), o = { v: 0 };
    gsap.timeline({ onComplete: () => { ld.remove(); lenis && lenis.start(); } })
      .from($('.ld__plate', ld), { y: 30, opacity: 0, duration: .7, ease: 'power3.out' })
      .to(o, { v: 100, duration: 1.2, ease: 'power2.inOut', onUpdate: () => n.textContent = Math.round(o.v) }, 0)
      .to([$('.ld__in', ld), n, $('.ld__t', ld)], { opacity: 0, y: -24, duration: .45, ease: 'power2.in' }, 1.25)
      .to($$('.ld__p', ld), { yPercent: -100, duration: .95, ease: 'expo.inOut', stagger: .07 }, 1.45);
  });

  /* ---------- Split words (headings) ---------- */
  safe('split', () => {
    const wrap = el => { let i = 0; const walk = node => Array.from(node.childNodes).forEach(n => {
      if (n.nodeType === 3) { const f = d.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) { f.appendChild(d.createTextNode(p)); return; }
        const w = d.createElement('span'); w.className = 'w'; const s = d.createElement('span'); s.textContent = p; s.style.transitionDelay = (i++ * .045) + 's'; w.appendChild(s); f.appendChild(w); }); n.replaceWith(f); }
      else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n); }); walk(el); };
    $$('[data-split],[data-words]').forEach(wrap);
  });

  /* ---------- Reveal + count ---------- */
  safe('reveal', () => {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px', threshold: .05 });
    $$('[data-reveal],[data-split],.chips').forEach(el => io.observe(el));
    setTimeout(() => $$('[data-reveal],[data-split]').forEach(el => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add('is-in'); }), 1600);
  });
  safe('count', () => {
    const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.unobserve(e.target);
      const el = e.target, to = +el.dataset.count, suf = el.dataset.suffix || ''; if (RM) { el.textContent = to + suf; return; }
      const t0 = performance.now(); const tick = t => { const p = clamp((t - t0) / 1600); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + suf; if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    }), { threshold: .6 });
    $$('[data-count]').forEach(el => io.observe(el));
  });

  /* ---------- Header: dropdown + mobile menu ---------- */
  safe('header', () => {
    const hdr = $('#hdr'), ddBtn = $('.nav__btn'), dd = $('#dd-services'), ddWrap = ddBtn.parentElement;
    const setDD = o => { ddBtn.setAttribute('aria-expanded', o); dd.classList.toggle('is-open', o); };
    ddBtn.addEventListener('click', () => setDD(ddBtn.getAttribute('aria-expanded') !== 'true'));
    if (matchMedia('(hover:hover)').matches) { ddWrap.addEventListener('mouseenter', () => setDD(true)); ddWrap.addEventListener('mouseleave', () => setDD(false)); }
    d.addEventListener('click', e => { if (!ddWrap.contains(e.target)) setDD(false); });
    ddWrap.addEventListener('keydown', e => { if (e.key === 'Escape') { setDD(false); ddBtn.focus(); } });
    ddWrap.addEventListener('focusout', e => { if (!ddWrap.contains(e.relatedTarget)) setDD(false); });
    const burger = $('.burger'), menu = $('#mnav');
    const setMenu = o => {
      burger.setAttribute('aria-expanded', o); burger.setAttribute('aria-label', o ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', o); $('#mbar').style.visibility = o ? 'hidden' : '';
      if (lenis) o ? lenis.stop() : lenis.start(); else d.body.style.overflow = o ? 'hidden' : '';
      if (o) { hdr.classList.remove('is-hidden'); setTimeout(() => $('a', menu).focus(), 60); }
      else if (menu.contains(d.activeElement)) burger.focus();
    };
    burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('keydown', e => {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') { setMenu(false); burger.focus(); }
      if (e.key === 'Tab') { const f = $$('a', menu).concat([burger]), i = f.indexOf(d.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    addEventListener('resize', () => { if (innerWidth >= 1000 && menu.classList.contains('is-open')) setMenu(false); });
    hdr.addEventListener('focusin', () => hdr.classList.remove('is-hidden'));
  });

  /* ---------- Hero slideshow: plain cross-fade (no ripple, no counter, no pause button) ---------- */
  safe('hero', () => {
    const frame = $('#hero'); if (!frame || !$('.slide', frame)) return; const slides = $$('.slide', frame);
    const DUR = 7000; let cur = 0, acc = 0, last = performance.now(), hover = false;
    const show = i => {
      cur = (i + slides.length) % slides.length; acc = 0;
      slides.forEach((s, k) => { const on = k === cur; s.classList.toggle('is-active', on); s.setAttribute('aria-hidden', !on); $$('a', s).forEach(a => a.tabIndex = on ? 0 : -1); });
      const nx = (cur + 1) % slides.length; $('#nextT').textContent = nx ? 'Buy a Hospitality Business' : 'Your Specialised Hospitality Business Broker'; $('#nextImg').src = $('.slide__img', slides[nx]).src;
    };
    $('#nextChip').addEventListener('click', () => show(cur + 1));
    frame.addEventListener('mouseenter', () => hover = true); frame.addEventListener('mouseleave', () => hover = false);
    frame.addEventListener('focusin', () => hover = true); frame.addEventListener('focusout', e => { if (!frame.contains(e.relatedTarget)) hover = false; });
    const loop = t => { const dt = t - last; last = t; if (!RM && !hover && !d.hidden) acc += dt; const p = clamp(acc / DUR); $('#nextBar').style.setProperty('--p', p); if (p >= 1) show(cur + 1); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    $$('[data-hero]').forEach(a => a.addEventListener('mouseenter', () => { if (cur !== +a.dataset.hero) show(+a.dataset.hero); }));
  });

  /* ---------- Tabs (roving focus + sliding pill) ---------- */
  const tabSets = {};
  safe('tabs', () => { $$('[data-tabs]').forEach(list => {
    const tabs = $$('[role="tab"]', list), pill = $('.tabs__pill', list);
    const move = () => { const t = tabs.find(x => x.getAttribute('aria-selected') === 'true'); if (!t || !pill) return; pill.style.width = t.offsetWidth + 'px'; pill.style.transform = 'translateX(' + (t.offsetLeft - 5) + 'px)'; };
    const select = (tab, focus) => { if (!tab) return;
      tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; const p = d.getElementById(t.getAttribute('aria-controls')); if (p) p.hidden = !on; });
      if (focus) tab.focus(); move();
      const panel = d.getElementById(tab.getAttribute('aria-controls')), chips = panel && $('.chips', panel);
      if (chips) { chips.classList.remove('is-in'); void chips.offsetWidth; chips.classList.add('is-in'); }
      list.dispatchEvent(new CustomEvent('tabchange', { detail: tab.dataset.key })); };
    tabs.forEach((t, i) => { t.addEventListener('click', () => select(t)); t.addEventListener('keydown', e => {
      const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key]; if (k !== undefined) { e.preventDefault(); select(tabs[(k + tabs.length) % tabs.length], true); } }); });
    tabSets[list.dataset.tabs] = { select: key => select(tabs.find(t => t.dataset.key === key)) };
    requestAnimationFrame(move); addEventListener('resize', move); d.fonts && d.fonts.ready.then(move);
  }); });

  /* ---------- Journey: pinned horizontal scroll, drawn line, big step number ---------- */
  const J = { sec: $('#journey'), pinned: false, dist: 0 };
  J.track = () => J.sec ? $('.jrny__track:not([hidden])', J.sec) : null;
  const leads = { sell: 'A simple, transparent 7-step process designed to make selling your hospitality business straightforward.', buy: 'Three clear steps to receive our hospitality business listings and the information you need.' };
  const drawLine = tr => {
    const li = $('.jline', tr), svg = $('svg', li), w = tr.scrollWidth, cards = $$('.step', tr);
    svg.setAttribute('width', w); svg.setAttribute('height', 140); svg.setAttribute('viewBox', `0 0 ${w} 140`);
    let p = 'M0 70'; cards.forEach((c, i) => { const x = c.offsetLeft + c.offsetWidth / 2; p += ` S ${x - 110} ${i % 2 ? 6 : 134}, ${x} 70`; });
    $$('path', svg).forEach(x => x.setAttribute('d', p));
    const draw = $('.draw', svg), len = draw.getTotalLength(); draw.style.strokeDasharray = len; draw.style.strokeDashoffset = len; return { draw, len };
  };
  // Native sticky pin (robust with smooth scroll and tab switches); progress is eased in a rAF loop
  J.cur = 0;
  J.apply = p => {
    const t = J.track(), real = $$('.step:not(.step--end)', t), D = J.dist;
    t.style.transform = `translate3d(${-p * D}px,0,0)`; $('#jrBar').style.transform = `scaleX(${p})`;
    if (J.line) J.line.draw.style.strokeDashoffset = J.line.len * (1 - p);
    if (!RM) $$('.step', t).forEach(c => { const x = c.offsetLeft - p * D, r = clamp((innerWidth * 1.04 - x) / (innerWidth * .34)); c.style.transform = `translateY(${(1 - r) * 110}px) rotate(${(1 - r) * 3}deg)`; c.style.setProperty('--o', (.15 + r * .85).toFixed(3)); });
    const idx = Math.min(real.length - 1, Math.floor(p * real.length * 1.03)); real.forEach((c, k) => c.classList.toggle('is-on', k === idx));
    const n = String(idx + 1).padStart(2, '0'); $('#jrNum').textContent = n; $('#jrBig').textContent = n;
  };
  const buildJourney = () => {
    if (!J.sec) return;
    // Pinned side-scroll on every desktop, the same as the live page (it is scroll-driven, so it only moves when the visitor scrolls)
    const wide = matchMedia('(min-width:1024px) and (min-height:560px)').matches;
    J.sec.classList.toggle('is-pinned', wide); J.pinned = wide;
    $$('.jrny__track', J.sec).forEach(t => t.style.transform = '');
    $$('.step', J.sec).forEach(c => { c.style.transform = ''; c.style.removeProperty('--o'); });
    const tr = J.track(), real = $$('.step:not(.step--end)', tr);
    $('#jrTot').textContent = String(real.length).padStart(2, '0');
    if (!wide) { J.sec.style.height = ''; J.line = null; if (G) ScrollTrigger.refresh(); return; }
    J.dist = Math.max(0, tr.scrollWidth - innerWidth); J.sec.style.height = (innerHeight + J.dist) + 'px';
    J.line = drawLine(tr); J.apply(J.cur);
    if (G) ScrollTrigger.refresh();
  };
  const jrTarget = () => { const r = J.sec.getBoundingClientRect(), total = J.sec.offsetHeight - innerHeight; return total > 0 ? clamp(-r.top / total) : 0; };
  (function jrLoop() { if (J.pinned) { const t = jrTarget(), nx = RM ? t : J.cur + (t - J.cur) * .14; if (Math.abs(nx - J.cur) > .0002 || RM) { J.cur = nx; J.apply(J.cur); } } requestAnimationFrame(jrLoop); })();
  safe('journey', () => {
    if (!J.sec) return;
    buildJourney();
    const jtabs = $('[data-tabs="journey"]');
    if (jtabs) jtabs.addEventListener('tabchange', e => {
      const jl = $('#jrLead'); if (jl && leads[e.detail]) jl.textContent = leads[e.detail];
      // Jump to the start of the section first (instantly), then rebuild on the next frame, so measurements are taken at rest
      const top = J.sec.getBoundingClientRect().top + scrollY, inside = scrollY > top + 5;
      J.cur = 0; buildJourney();
      if (inside) { if (lenis) lenis.scrollTo(top, { immediate: true, force: true }); else scrollTo(0, top); }
      onScroll();
    });
    $$('[data-journey]').forEach(a => a.addEventListener('click', () => tabSets.journey && tabSets.journey.select(a.dataset.journey)));
    let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { buildJourney(); onScroll(); }, 250); });
    addEventListener('load', () => { buildJourney(); onScroll(); });
    J.sec.addEventListener('focusin', e => { // keep a focused button inside the moving track on screen
      if (!J.pinned) return; const c = e.target.closest('.step'); if (!c) return;
      const tr = J.track(), dist = Math.max(1, tr.scrollWidth - innerWidth), p = clamp((c.offsetLeft - innerWidth * .3) / dist);
      const top = J.sec.getBoundingClientRect().top + scrollY; scrollToEl(top + p * (J.sec.offsetHeight - innerHeight));
    });
  });

  /* ---------- Value dial: click a segment or a factor button ---------- */
  safe('value', () => {
    if (!$('#dialSvg')) return;
    const F = [
      ['Financial performance', 'We don’t just list a business at any price. The listing price is set to reflect the true business operation, which includes a thorough assessment of trading and financial history.'],
      ['Location', 'Being familiar with the geographic area of a business means we understand your competition, your customers, your challenges and your potential, so pricing and positioning are grounded in lived local experience.'],
      ['Lease terms', 'We assess current and future lease terms so any limitations are addressed and factored into the listing price. That includes council or strata limitations and future rent and outgoing costs.'],
      ['Assets', 'Fitout, equipment and stock all form part of what a buyer takes on. Equipment inspections and stock valuation are worked through as part of the handover terms.'],
      ['Customer base', 'We know your hospitality customer base. A clear picture of who trades with the business, and why, helps us find a buyer who can keep it that way.'],
      ['Future potential', 'Our appraisal highlights the strengths and opportunities within your business, showing where value is created and, if necessary, where improvements will lift your sale price.']
    ];
    const NS = 'http://www.w3.org/2000/svg', svg = $('#dialSvg'), n = F.length, R = 210;
    const rot = d.createElementNS(NS, 'g'); rot.setAttribute('class', 'dial__rot'); svg.appendChild(rot);
    const pt = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
    for (let t = 0; t < 72; t++) { const a = t / 72 * Math.PI * 2, [x0, y0] = pt(a, 262), [x1, y1] = pt(a, t % 12 === 6 ? 286 : 274); const l = d.createElementNS(NS, 'line'); l.setAttribute('x1', x0); l.setAttribute('y1', y0); l.setAttribute('x2', x1); l.setAttribute('y2', y1); l.setAttribute('class', 'tick'); rot.appendChild(l); }
    const segs = [], lbls = [];
    F.forEach((f, i) => {
      const a0 = (i / n) * Math.PI * 2 - Math.PI / 2 - Math.PI / n + .04, a1 = a0 + Math.PI * 2 / n - .08;
      const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
      const p = d.createElementNS(NS, 'path'); p.setAttribute('d', `M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}`); p.setAttribute('class', 'seg'); rot.appendChild(p); segs.push(p);
      const [lx, ly] = pt((a0 + a1) / 2, R), g = d.createElementNS(NS, 'g'); g.setAttribute('transform', `translate(${lx} ${ly})`);
      const t = d.createElementNS(NS, 'text'); t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle'); t.setAttribute('class', 'lbl'); t.textContent = f[0].split(' ')[0];
      g.appendChild(t); rot.appendChild(g); lbls.push(t);
      p.addEventListener('click', () => sel(i));
    });
    const tabs = $$('#factors .factor'), panel = $('#fpanel'), tt = $('#fTitle'), tx = $('#fText'), dn = $('#dialName'), dc = $('.dial__core span');
    let cur = 0, angle = 0;
    const setAngle = a => { angle = a; rot.style.transform = `rotate(${a}deg)`; lbls.forEach(t => t.setAttribute('transform', `rotate(${-a})`)); };
    const sel = (i, focus) => {
      const diff = ((i - cur) % n + n + n / 2) % n - n / 2; cur = i; setAngle(angle - diff * 360 / n);
      tabs.forEach((t, k) => { const on = k === i; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      segs.forEach((s, k) => s.classList.toggle('is-on', k === i)); lbls.forEach((s, k) => s.classList.toggle('is-on', k === i));
      panel.setAttribute('aria-labelledby', 'f' + i); tt.textContent = F[i][0]; tx.textContent = F[i][1]; dn.textContent = F[i][0]; dc.textContent = (i + 1) + ' of ' + n + ' factors';
      panel.classList.remove('is-swap'); void panel.offsetWidth; panel.classList.add('is-swap');
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => { t.addEventListener('click', () => sel(i)); t.addEventListener('keydown', e => {
      const cols = innerWidth <= 520 ? 2 : 3; const k = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + cols, ArrowUp: i - cols, Home: 0, End: n - 1 }[e.key];
      if (k !== undefined) { e.preventDefault(); sel((k % n + n) % n, true); } }); });
    sel(0);
  });

  /* ---------- Testimonials rail: arrow buttons (no drag) ---------- */
  safe('rail', () => {
    if (!$('#rail')) return;
    const rail = $('#rail'), prev = $('#tPrev'), next = $('#tNext'), qs = $$('.quote', rail);
    const step = () => (qs[0] ? qs[0].offsetWidth + 20 : 300);
    const depth = () => { if (RM || !DESK.matches) { qs.forEach(q => { q.style.transform = ''; q.style.opacity = ''; }); return; } const c = innerWidth / 2; qs.forEach(q => { const r = q.getBoundingClientRect(), off = clamp(((r.left + r.width / 2) - c) / innerWidth, -1, 1);
      q.style.transform = `perspective(1200px) rotateY(${off * -14}deg) translateZ(${-Math.abs(off) * 80}px)`; q.style.opacity = 1 - Math.abs(off) * .35; }); };
    const sync = () => { const max = rail.scrollWidth - rail.clientWidth, p = max > 0 ? rail.scrollLeft / max : 1; prev.disabled = rail.scrollLeft < 4; next.disabled = rail.scrollLeft > max - 4; const cnt = $('#tCount'); if (cnt) { const k = max > 0 ? Math.round(rail.scrollLeft / step()) + 1 : 1; cnt.textContent = Math.min(qs.length, Math.max(1, k)) + ' / ' + qs.length; } depth(); };
    // Own eased animation, so the slide is smooth in every browser and setting (native smooth scroll gets switched off by "Reduce motion")
    let anim = 0;
    const glide = dir => { cancelAnimationFrame(anim); const from = rail.scrollLeft, max = rail.scrollWidth - rail.clientWidth;
      const to = clamp(Math.round((from + dir * step()) / step()) * step(), 0, max), t0 = performance.now(), D = 650;
      rail.style.scrollSnapType = 'none';
      const tick = t => { const k = clamp((t - t0) / D), e = 1 - Math.pow(1 - k, 3); rail.scrollLeft = from + (to - from) * e;
        if (k < 1) anim = requestAnimationFrame(tick); else rail.style.scrollSnapType = ''; };
      anim = requestAnimationFrame(tick); };
    prev.addEventListener('click', () => glide(-1));
    next.addEventListener('click', () => glide(1));
    rail.addEventListener('scroll', sync, { passive: true }); addEventListener('resize', sync); addEventListener('scroll', depth, { passive: true }); sync();
    rail.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); } if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); } });
  });

  /* ---------- FAQ: accordion, one open at a time. Height is animated in CSS, page length is re-measured afterwards ---------- */
  safe('faq', () => { const items = $$('.qa');
    const set = (it, on) => { it.classList.toggle('is-open', on); $('.qa__q', it).setAttribute('aria-expanded', on); };
    items.forEach(it => $('.qa__q', it).addEventListener('click', () => { const on = !it.classList.contains('is-open'); items.forEach(o => set(o, false)); set(it, on);
      setTimeout(() => { if (lenis) lenis.resize(); G && ScrollTrigger.refresh(); }, 380); }));
    if (matchMedia('(max-width:599px)').matches) items.forEach(o => set(o, false));
  });

  /* ---------- Enquiry form (truthful demo: nothing is transmitted) ---------- */
  safe('form', () => {
    if (!$('#enquiry')) return;
    const form = $('#enquiry'), ctx = $('#ctx'), errsum = $('#errsum'), status = $('#status'), sum = $('#sum'), mailBtn = $('#mailBtn'), radios = $$('input[name="interest"]', form);
    let lastIntent = null;
    const setIntent = v => { if (!v) return; const r = radios.find(x => x.value === v); if (!r) return; r.checked = true; lastIntent = v;
      ctx.innerHTML = 'We’ve selected <strong></strong> from the button you used. <button type="button" id="ctxClear">Change or clear it</button>'; $('strong', ctx).textContent = v; ctx.classList.add('is-on');
      $('#ctxClear').addEventListener('click', () => { r.checked = false; ctx.classList.remove('is-on'); ctx.textContent = ''; radios[0].focus(); }); };
    window.__setIntent = setIntent;
    radios.forEach(r => r.addEventListener('change', () => { if (lastIntent && r.value !== lastIntent) { ctx.classList.remove('is-on'); ctx.textContent = ''; lastIntent = null; } clearErr('interest'); }));
    const F = { interest: { el: () => radios[0], msg: 'Choose what you’re interested in.' }, email: { el: () => $('#em'), msg: 'Enter an email address, like name@example.com.' }, phone: { el: () => $('#ph'), msg: 'Enter a phone number so we can call you back.' }, message: { el: () => $('#msg'), msg: 'Add a short message.' }, captcha: { el: () => $('#capChk'), msg: 'Please tick “I’m not a robot”.' } };
    const setErr = (k, m) => { $('#err-' + k).textContent = m; if (k !== 'interest' && k !== 'captcha') F[k].el().setAttribute('aria-invalid', 'true'); };
    const clearErr = k => { const e = $('#err-' + k); if (e) e.textContent = ''; if (k !== 'interest' && k !== 'captcha' && F[k]) F[k].el().removeAttribute('aria-invalid'); };
    ['em', 'ph', 'msg'].forEach(id => $('#' + id).addEventListener('input', () => clearErr({ em: 'email', ph: 'phone', msg: 'message' }[id])));
    form.addEventListener('submit', e => {
      e.preventDefault(); Object.keys(F).forEach(clearErr);
      const v = Object.fromEntries(new FormData(form)), errs = [];
      if (v.company_site) return;
      if (!v.interest) errs.push('interest');
      if (!v.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) errs.push('email');
      if (!v.phone || v.phone.replace(/\D/g, '').length < 8) errs.push('phone');
      if (!v.message || v.message.trim().length < 2) errs.push('message');
      if (!$('#capChk').checked) errs.push('captcha');
      if (errs.length) { errs.forEach(k => setErr(k, F[k].msg)); errsum.hidden = false;
        errsum.innerHTML = '<strong>Please fix ' + errs.length + (errs.length > 1 ? ' things' : ' thing') + ':</strong><ul>' + errs.map(k => '<li><a href="#' + (k === 'interest' ? 'interest' : k === 'captcha' ? 'capChk' : F[k].el().id) + '">' + F[k].msg + '</a></li>').join('') + '</ul>';
        $$('a', errsum).forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); const k = a.getAttribute('href').slice(1); const tg = k === 'interest' ? radios[0] : d.getElementById(k); if (tg) { tg.setAttribute('tabindex', tg.tabIndex < 0 ? '-1' : tg.tabIndex); tg.focus(); } }));
        errsum.focus(); return; }
      errsum.hidden = true;
      const name = [v.first, v.last].filter(Boolean).join(' ');
      const lines = ['Interested in: ' + v.interest, name ? 'Name: ' + name : null, 'Email: ' + v.email.trim(), 'Phone: ' + v.phone.trim(), '', v.message.trim()].filter(x => x !== null);
      sum.textContent = lines.join('\n');
      mailBtn.href = 'mailto:contact@newcoastbrokers.com.au?subject=' + encodeURIComponent('Website enquiry: ' + v.interest) + '&body=' + encodeURIComponent(lines.join('\n'));
      status.hidden = false; status.focus(); G && ScrollTrigger.refresh();
    });
    $('#editBtn').addEventListener('click', () => { status.hidden = true; $('#msg').focus(); });
  });

  safe('cap', () => { const c = $('#capChk'), n = $('#capNote'); if (!c) return; c.addEventListener('change', () => { n.hidden = !c.checked; if (c.checked) { const e = $('#err-captcha'); if (e) e.textContent = ''; } }); });

  /* ---------- Team: copy email ---------- */
  safe('copy', () => { $$('.pf__copy').forEach(b => b.addEventListener('click', async () => {
    const tip = $('.pf__tip', b), v = b.dataset.copy;
    let ok = false; try { await navigator.clipboard.writeText(v); ok = true; } catch (e) {
      try { const t = d.createElement('textarea'); t.value = v; t.style.position = 'fixed'; t.style.opacity = '0'; d.body.appendChild(t); t.select(); ok = d.execCommand('copy'); t.remove(); } catch (e2) {} }
    tip.textContent = ok ? 'Email copied' : 'Copy not available';
    b.classList.add('ok'); clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove('ok'); tip.textContent = ''; }, 1800);
  })); });

  /* Service card thumbnails reuse the photos already embedded in the services column */
  safe('thumbs', () => { const src = $$('.svc__media img'); $$('img[data-thumb]').forEach((im, i) => { if (src[i]) im.src = src[i].src; }); });

  /* ================= Small-screen scenes (1023px and below). Nothing here runs on desktop. ================= */
  const SMALL = matchMedia('(max-width:1023px)'), PHONE = matchMedia('(max-width:599px)');
  const onMQ = (mq, f) => { mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f); };

  /* "Read more" for supporting paragraphs on phones (labelled, never hides an essential limitation) */
  safe('mMore', () => {
    const items = $$('[data-m-more]');
    const set = (el, b, open) => { el.classList.toggle('m-collapsed', !open); b.setAttribute('aria-expanded', open); $('span', b).textContent = open ? 'Show less' : el.dataset.mMore; };
    items.forEach((el, i) => { el.id = el.id || 'mm' + i;
      const b = d.createElement('button'); b.type = 'button'; b.className = 'm-more-btn'; b.setAttribute('aria-controls', el.id);
      b.innerHTML = '<span></span><svg width="10" height="10" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>';
      el.before(b); b.addEventListener('click', () => set(el, b, el.classList.contains('m-collapsed'))); });
    const apply = () => items.forEach(el => set(el, el.previousElementSibling, !PHONE.matches));
    apply(); onMQ(PHONE, apply);
  });

  /* Services: tabs on small screens, the full list stays as it is on desktop */
  safe('svcTabs', () => {
    if (!$('#svcList')) return;
    const sec = $('#services'), list = $('#svcList'), items = $$('.svc__item', list);
    const short = ['Sell a business', 'Buy a business', 'Business appraisal', 'Consulting', 'Property leasing', 'Property sales'];
    const wrap = d.createElement('div'); wrap.className = 'svc__layout'; list.before(wrap);
    const bar = d.createElement('div'); bar.className = 'svc__tabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Choose a service');
    wrap.append(bar, list);
    const tabs = items.map((it, i) => { it.id = it.id || 'svcp' + i; const ico = $('.svc__ico img', it);
      const b = d.createElement('button'); b.type = 'button'; b.className = 'svc__tab'; b.id = 'svct' + i; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', it.id);
      b.innerHTML = (ico ? '<img src="' + ico.src + '" alt="" width="30" height="30">' : '') + '<span>' + (it.dataset.short || short[i]) + '</span>';
      bar.appendChild(b); return b; });
    let cur = 0;
    const sel = (i, focus) => { cur = i; tabs.forEach((b, k) => { const on = k === i; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }); items.forEach((it, k) => it.classList.toggle('is-sel', k === i)); if (focus) tabs[i].focus(); };
    tabs.forEach((b, i) => { b.addEventListener('click', () => sel(i));
      b.addEventListener('keydown', e => { const k = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key]; if (k === undefined) return; e.preventDefault(); sel((k + tabs.length) % tabs.length, true); }); });
    const apply = () => { const on = SMALL.matches; sec.classList.toggle('is-tabbed', on);
      items.forEach((it, i) => { if (on) { it.setAttribute('role', 'tabpanel'); it.setAttribute('aria-labelledby', 'svct' + i); } else { it.removeAttribute('role'); it.removeAttribute('aria-labelledby'); } }); };
    sel(0); apply(); onMQ(SMALL, apply);
  });

  /* Process: every step title visible as a list; tap one to read it (one open at a time) */
  safe('jrAcc', () => {
    const tracks = $$('.jrny__track');
    const setS = (s, on) => { s.classList.toggle('is-open', on); const t = $('.step__t', s); if (t && t.hasAttribute('role')) t.setAttribute('aria-expanded', on); };
    const open = (tr, s) => { const was = s.classList.contains('is-open'); $$('.step', tr).forEach(x => setS(x, false)); if (!was) setS(s, true); };
    tracks.forEach((tr, ti) => $$('.step:not(.step--end)', tr).forEach((s, i) => {
      const h = $('h3', s), p = $('p', s); p.id = p.id || 'jp' + ti + '-' + i;
      const t = d.createElement('span'); t.className = 'step__t'; while (h.firstChild) t.appendChild(h.firstChild); h.appendChild(t);
      h.addEventListener('click', () => { if (SMALL.matches && !J.pinned) open(tr, s); });
      t.addEventListener('keydown', e => { if (t.hasAttribute('role') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(tr, s); } });
    }));
    const apply = () => tracks.forEach(tr => $$('.step:not(.step--end)', tr).forEach((s, i) => { const t = $('.step__t', s);
      if (SMALL.matches) { t.setAttribute('role', 'button'); t.tabIndex = 0; t.setAttribute('aria-controls', $('p', s).id); setS(s, i === 0 && !PHONE.matches); }
      else { ['role', 'tabindex', 'aria-expanded', 'aria-controls'].forEach(a => t.removeAttribute(a)); s.classList.remove('is-open'); } }));
    apply(); onMQ(SMALL, apply); onMQ(PHONE, apply);
  });

  /* Confidential safeguards: on phones the four titles stay visible and each opens to its explanation */
  safe('protoAcc', () => {
    if (!$('#proto')) return;
    const ol = $('#proto'), lis = $$('li', ol);
    const set = (li, on) => { li.classList.toggle('is-open', on); const t = $('.step__t', li); if (t) t.setAttribute('aria-expanded', on); };
    lis.forEach((li, i) => { const h = $('h3', li), p = $('p', li); p.id = p.id || 'pp' + i;
      const t = d.createElement('span'); t.className = 'step__t'; while (h.firstChild) t.appendChild(h.firstChild); h.appendChild(t);
      const go = () => { if (!PHONE.matches) return; const was = li.classList.contains('is-open'); lis.forEach(x => set(x, false)); if (!was) set(li, true); };
      h.addEventListener('click', go); t.addEventListener('keydown', e => { if (PHONE.matches && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(); } }); });
    const apply = () => { ol.classList.toggle('m-acc', PHONE.matches); lis.forEach((li, i) => { const t = $('.step__t', li);
      if (PHONE.matches) { t.setAttribute('role', 'button'); t.tabIndex = 0; t.setAttribute('aria-controls', $('p', li).id); set(li, i === 0); }
      else { ['role', 'tabindex', 'aria-expanded', 'aria-controls'].forEach(a => t.removeAttribute(a)); li.classList.remove('is-open'); } }); };
    apply(); onMQ(PHONE, apply);
  });

  /* Team emails: on small screens allow the line to break after the @ instead of cutting the address off */
  safe('mailBreak', () => { const spans = $$('.pf__mail span'), plain = spans.map(x => x.textContent);
    const apply = () => spans.forEach((x, i) => { if (SMALL.matches) { const [u, h] = plain[i].split('@'); x.textContent = ''; x.append(u + '@', d.createElement('wbr'), h); } else x.textContent = plain[i]; });
    apply(); onMQ(SMALL, apply); });

  /* Gentle entrance for each scene's items on small screens (skipped when motion is turned off) */
  safe('mMotion', () => {
    if (!G || RM) return;
    gsap.matchMedia().add('(max-width:1023px)', () => {
      const grp = (sel, trig) => { if (!$$(sel).length) return; trig = $(trig) || $(sel).parentElement; gsap.from(sel, { y: 16, opacity: 0, duration: .55, ease: 'power2.out', stagger: .05, clearProps: 'transform,opacity', scrollTrigger: { trigger: trig, start: 'top 78%', once: true } }); };
      grp('.svc__tab', '#services'); grp('#p-sell .step', '#journey'); grp('#p-hosp .chip', '#types'); grp('.factor', '#value');
      grp('#proto li', '#proto'); grp('.qa', '#faq'); grp('.post', '#blog'); grp('.fact', '.facts');
    });
  });

  /* ---------- Mobile swipe rows with dot indicators ---------- */
  safe('swipe', () => {
    const targets = []; // retired: small screens now use tabs, accordions and stacked rows instead of sideways-scrolling strips
    const mq = matchMedia('(max-width:899px)');
    const made = [];
    targets.forEach(([sel, dots = true]) => { const el = $(sel); if (!el) return;
      let bar = null; const items = () => Array.from(el.children).filter(c => c.offsetParent !== null);
      const sync = () => { if (!bar) return; const kids = items(), x = el.scrollLeft + el.clientWidth * .3; let k = 0; kids.forEach((c, i) => { if (c.offsetLeft - el.offsetLeft <= x) k = i; }); $$('i', bar).forEach((d, i) => d.classList.toggle('on', i === k)); };
      const apply = () => { const on = mq.matches; el.classList.toggle('swipe', on);
        if (on && dots && !bar) { bar = d.createElement('div'); bar.className = 'swdots'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = items().map(() => '<i></i>').join(''); el.after(bar); sync(); }
        if (!on && bar) { bar.remove(); bar = null; } };
      el.addEventListener('scroll', sync, { passive: true }); made.push(apply); apply(); });
    mq.addEventListener ? mq.addEventListener('change', () => made.forEach(f => f())) : mq.addListener(() => made.forEach(f => f()));
  });

  /* ---------- Footer subscribe (truthful demo) ---------- */
  safe('subscribe', () => { const f = $('#subForm'), i = $('#subEmail'), m = $('#subMsg'); if (!f) return;
    f.addEventListener('submit', e => { e.preventDefault();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.value.trim())) { m.className = 'sub__msg is-err'; m.textContent = 'Please enter a valid email address.'; i.setAttribute('aria-invalid', 'true'); i.focus(); return; }
      i.removeAttribute('aria-invalid'); m.className = 'sub__msg';
      m.innerHTML = 'Listing alerts aren’t connected in this preview, so you haven’t been subscribed. Email <a href="mailto:contact@newcoastbrokers.com.au?subject=Please%20add%20me%20to%20business%20listings">contact@newcoastbrokers.com.au</a> to be added.'; }); });

  /* ---------- In-page links: smooth scroll, intents, journey shortcuts ---------- */
  safe('links', () => { d.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]'); if (!a) return; const id = a.getAttribute('href'); if (id.length < 2) return;
    const el = d.getElementById(id.slice(1)); if (!el) return; e.preventDefault();
    if (a.dataset.journey && tabSets.journey) tabSets.journey.select(a.dataset.journey);
    if (a.dataset.intent && window.__setIntent) window.__setIntent(a.dataset.intent);
    scrollToEl(el, id === '#contact' ? -90 : 0);
    if (id === '#main') el.focus();
  }); });

  /* ---------- Motion toggle ---------- */
  safe('motion', () => { const b = $('#motionToggle'); b.setAttribute('aria-pressed', RM); b.textContent = 'Reduce motion: ' + (RM ? 'On' : 'Off');
    b.addEventListener('click', () => { store.set('nc-motion-off', RM ? '0' : '1'); location.reload(); }); });

  /* ---------- Cursor (small dot + ring only; no magnetic buttons, no tile disc, no photo tilt) ---------- */
  safe('pointer', () => {
    if (!fine || RM) return;
    const cur = $('.cursor'), dot = $('.cdot');
    let x = -100, y = -100, cx = -100, cy = -100;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cur.classList.add('is-on'); dot.classList.add('is-on'); }, { passive: true });
    d.documentElement.addEventListener('pointerleave', () => { cur.classList.remove('is-on'); dot.classList.remove('is-on'); });
    d.addEventListener('pointerover', e => { const t = e.target, inter = t.closest('a,button,label,.seg'), field = t.closest('input,textarea,select,iframe');
      cur.classList.toggle('is-off', !!field); dot.classList.toggle('is-off', !!field); cur.classList.toggle('is-hover', !!inter); });
    const loop = () => { cx += (x - cx) * .18; cy += (y - cy) * .18; cur.style.transform = `translate(${cx}px,${cy}px)`; dot.style.transform = `translate(${x}px,${y}px)`; requestAnimationFrame(loop); };
    loop();
  });

  /* ---------- Chapter label ---------- */
  safe('chapters', () => {
    const chap = $('.chap'), n = $('#chapN'), t = $('#chapT'), secs = $$('[data-chapter]');
    const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const i = secs.indexOf(e.target); n.textContent = String(i + 1).padStart(2, '0'); t.textContent = e.target.dataset.chapter; }), { rootMargin: '-50% 0px -50% 0px' });
    secs.forEach(s => io.observe(s));
    let past = false, hideT; new IntersectionObserver(es => { past = !es[0].isIntersecting && es[0].boundingClientRect.top < 0; if (!past) chap.classList.remove('on'); }).observe($('.hero') || $('.phero') || $('main'));
    // Show the label only while scrolling, so it never sits on top of content
    addEventListener('scroll', () => { if (!past) return; chap.classList.add('on'); clearTimeout(hideT); hideT = setTimeout(() => chap.classList.remove('on'), 1300); }, { passive: true });
    new IntersectionObserver(es => chap.style.visibility = es[0].isIntersecting ? 'hidden' : '', { rootMargin: '0px 0px -15% 0px' }).observe($('.ftr'));
  });

  /* ---------- GSAP extras: buyers mosaic, team wipe, marquee skew, footer word, expertise tags ---------- */
  safe('gsapExtras', () => {
    if (!G) return;
    if ($('.stack')) gsap.matchMedia().add('(min-width:1024px)', () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.stack', start: 'top 88%', end: 'center 50%', scrub: 1 } });
      tl.fromTo('.stack__a', { rotate: -7, x: -50, y: 70, scale: .88 }, { rotate: 0, x: 0, y: 0, scale: 1, ease: 'none' }, 0)
        .fromTo('.stack__b', { rotate: 9, x: 110, y: -30 }, { rotate: 0, x: 0, y: 0, ease: 'none' }, 0)
        .fromTo('.stack__c', { rotate: -6, x: 70, y: 140 }, { rotate: 0, x: 0, y: 0, ease: 'none' }, 0);
    });
    $$('.pf').forEach((c, i) => {
      gsap.fromTo($('.pf__stage', c), { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', delay: i * .15, clearProps: 'clipPath', scrollTrigger: { trigger: c, start: 'top 85%' } });
      gsap.fromTo($('.pf__img', c), { scale: 1.25 }, { scale: 1, duration: 2, ease: 'expo.out', delay: .2 + i * .15, clearProps: 'transform', scrollTrigger: { trigger: c, start: 'top 85%' } });
      gsap.from($$('.pf__creds li', c), { y: 16, opacity: 0, stagger: .06, duration: .8, ease: 'power3.out', delay: .6 + i * .15, scrollTrigger: { trigger: c, start: 'top 85%' } });
    });
    if ($('.marq')) { const skew = gsap.quickTo('.marq', 'skewX', { duration: .5, ease: 'power3' });
    ScrollTrigger.create({ onUpdate: s => { const v = s.getVelocity(); skew(clamp(v / -300, -7, 7)); $$('.marq').forEach(m => m.getAnimations().forEach(a => a.playbackRate = 1 + Math.min(5, Math.abs(v) / 400))); } }); }
    if ($('#expImg')) gsap.from('.exp__tags span', { y: 30, opacity: 0, stagger: .08, duration: .9, ease: 'back.out(1.8)', scrollTrigger: { trigger: '#expImg', start: 'top 60%' } });
    if ($('#dial')) gsap.from('.dial', { rotate: -100, scale: .75, opacity: 0, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '#dial', start: 'top 80%' } });
  });

  /* ---------- One scroll loop for everything else scroll-linked ---------- */
  const bar = $('.progress'), hdr = $('#hdr'), mbar = $('#mbar'), pars = $$('.js-par');
  const svcItems = $$('#svcList .svc__item'), svcImgs = $$('.svc__media img'), svcNum = $('#svcNum'), svcBar = $('#svcBar'), svcCap = $('#svcCap');
  const expImg = $('#expImg'), proto = $$('#proto li');
  const heroEl = $('#hero') || $('.phero'), contactEl = $('#contact');
  let lastY = scrollY, ticking = false, svcIdx = -1;
  function onScroll() {
    ticking = false;
    const y = scrollY, vh = innerHeight, docH = d.documentElement.scrollHeight - vh;
    bar.style.transform = 'scaleX(' + (docH > 0 ? y / docH : 0) + ')';
    const menuOpen = $('#mnav').classList.contains('is-open');
    hdr.classList.toggle('is-compact', y > 40);
    if (!menuOpen && !hdr.contains(d.activeElement) && y > lastY && y > 400) hdr.classList.add('is-hidden');
    if (y < lastY) hdr.classList.remove('is-hidden');
    lastY = y;
    d.body.classList.toggle('hdr-off', hdr.classList.contains('is-hidden'));
    const hb = heroEl ? heroEl.getBoundingClientRect().bottom : -1, cr = contactEl ? contactEl.getBoundingClientRect() : { top: 1e9, bottom: -1e9 };
    if (mbar) mbar.classList.toggle('is-on', hb < 0 && !(cr.top < vh && cr.bottom > 0));
    if (!RM) {
      if (DESK.matches) pars.forEach(img => { const r = img.parentElement.getBoundingClientRect(); if (r.bottom < -200 || r.top > vh + 200) return; const c = (r.top + r.height / 2 - vh / 2) / vh; img.style.transform = `translate3d(0,${c * parseFloat(img.dataset.speed || .1) * -100}%,0) scale(1.12)`; });
    }
    // Expertise photo opens out from a rounded crop as it scrolls in. It runs even when "Reduce motion" is on
    // (it only changes the crop, nothing moves), so the effect is never silently lost; the zoom part stays motion-only.
    if (expImg) { const r = expImg.getBoundingClientRect(), p = clamp((vh - r.top) / (vh * .8)); expImg.style.setProperty('--cx', ((1 - p) * 12).toFixed(2) + '%'); expImg.style.setProperty('--ci', ((1 - p) * 8).toFixed(2) + '%'); expImg.style.setProperty('--cs', RM ? '1' : (1.15 - p * .15).toFixed(3)); }
    if (svcItems.length) { let a = 0; svcItems.forEach((c, i) => { if (c.getBoundingClientRect().top < vh * .5) a = i; });
      if (a !== svcIdx) { const prev = svcIdx; svcIdx = a;
        svcItems.forEach((c, i) => c.classList.toggle('is-on', i === a));
        svcImgs.forEach((im, i) => { im.classList.toggle('was-on', i === prev); im.classList.toggle('is-on', i === a); });
        svcNum.textContent = '0' + (a + 1); svcBar.style.transform = 'scaleX(' + ((a + 1) / svcItems.length) + ')'; svcCap.textContent = $('h3', svcItems[a]).textContent; } }
    if (proto.length) proto.forEach(li => li.classList.toggle('is-on', li.getBoundingClientRect().top < vh * .62));

  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Marquee speed (no GSAP fallback) + footer word ---------- */
  safe('marquee', () => { if (G) return; const m = $('.marq'); if (!m || !m.getAnimations) return; let py = scrollY, v = 0;
    const loop = () => { const dy = scrollY - py; py = scrollY; v += (dy - v) * .1; if (!RM) m.getAnimations().forEach(a => a.playbackRate = 1 + Math.min(4, Math.abs(v) * .15)); requestAnimationFrame(loop); }; loop(); });


  if (G) { const rf = () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); }; d.fonts && d.fonts.ready.then(rf); addEventListener('load', rf); }
})();

/* ================= INNER PAGES v2 (runs after the shared header/footer script) ================= */
(() => {
  'use strict';
  const d = document, $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const safe = (n, f) => { try { f(); } catch (e) { console.warn('[NewCoast] page module failed:', n, e); } };
  const RM = () => d.documentElement.classList.contains('rm');
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const DESK = matchMedia('(min-width:1024px)');

  /* Statement: words light up as the paragraph scrolls through the screen */
  safe('words', () => $$('[data-xwords]').forEach(el => {
    const walk = node => Array.from(node.childNodes).forEach(n => {
      if (n.nodeType === 3) { const f = d.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) { f.appendChild(d.createTextNode(p)); return; } const s = d.createElement('span'); s.className = 'xw'; s.textContent = p; f.appendChild(s); }); n.replaceWith(f); }
      else if (n.nodeType === 1) walk(n); });
    walk(el); const ws = $$('.xw', el);
    const upd = () => { const r = el.getBoundingClientRect(), vh = innerHeight; const p = Math.max(0, Math.min(1, (vh * .85 - r.top) / (r.height + vh * .35))); const k = RM() ? ws.length : Math.round(p * ws.length); ws.forEach((w, i) => w.classList.toggle('on', i < k)); };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd(); }));

  /* Count-up numbers in stat tiles */
  safe('count', () => { const els = $$('[data-xcount]'); if (!els.length) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; io.unobserve(e.target); const el = e.target, raw = el.dataset.xcount, m = raw.match(/^(\d+)(%?)$/); if (!m || RM()) return;
      const end = +m[1], t0 = performance.now(), dur = 1400; const step = t => { const p = Math.min(1, (t - t0) / dur), v = Math.round(end * (1 - Math.pow(1 - p, 3))); el.textContent = v + m[2]; if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }), { threshold: .4 });
    els.forEach(el => io.observe(el)); });

  /* Expanding service panels */
  safe('expand', () => $$('.xexp__row').forEach(row => { const ps = $$('.xexp__p', row);
    const set = p => ps.forEach(x => x.classList.toggle('is-on', x === p));
    ps.forEach(p => { p.addEventListener('mouseenter', () => { if (DESK.matches) set(p); }); p.addEventListener('focus', () => set(p)); p.addEventListener('click', e => { if (!p.classList.contains('is-on')) { e.preventDefault(); set(p); } }); }); }));

  /* Hover list: floating photo follows the cursor */
  safe('hoverlist', () => $$('.xhl').forEach(sec => { const fl = $('.xhl__float', sec), im = $('img', fl); let x = 0, y = 0, cx = 0, cy = 0, raf = 0;
    const loop = () => { cx += (x - cx) * .18; cy += (y - cy) * .18; fl.style.left = cx + 'px'; fl.style.top = cy + 'px'; raf = fl.classList.contains('on') ? requestAnimationFrame(loop) : 0; };
    $$('.xhl__r', sec).forEach(r => { r.addEventListener('mouseenter', e => { if (!DESK.matches || RM()) return; im.src = r.dataset.img; x = cx = e.clientX; y = cy = e.clientY; fl.classList.add('on'); if (!raf) raf = requestAnimationFrame(loop); });
      r.addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; }); r.addEventListener('mouseleave', () => fl.classList.remove('on')); }); }));

  /* Testimonial slider */
  safe('quotes', () => $$('.xq').forEach(sec => { const ss = $$('.xq__s', sec), ws = $$('.xq__who', sec), bar = $('.xq__bar i', sec); let i = 0, tm = 0, hover = false;
    const go = n => { i = (n + ss.length) % ss.length; ss.forEach((s, j) => { s.classList.toggle('is-on', j === i); s.setAttribute('aria-hidden', j !== i); }); ws.forEach((w, j) => w.classList.toggle('is-on', j === i)); restart(); };
    const restart = () => { clearTimeout(tm); bar.classList.remove('run'); void bar.offsetWidth; if (RM() || hover) return; bar.classList.add('run'); tm = setTimeout(() => go(i + 1), 7000); };
    $$('.xq__arw', sec).forEach(b => b.addEventListener('click', () => go(i + +b.dataset.d))); ws.forEach(w => w.addEventListener('click', () => go(+w.dataset.i)));
    sec.addEventListener('mouseenter', () => { hover = true; restart(); }); sec.addEventListener('mouseleave', () => { hover = false; restart(); });
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) restart(); else clearTimeout(tm); }); io.observe(sec); }));

  /* FAQ: tabs on desktop, accordion on small screens */
  safe('faq', () => $$('.xfaq').forEach(sec => { const its = $$('.xfaq__it', sec);
    its.forEach(it => $('.xfaq__q', it).addEventListener('click', () => { const on = it.classList.contains('is-on');
      if (on && DESK.matches) return; its.forEach(o => { o.classList.remove('is-on'); $('.xfaq__q', o).setAttribute('aria-expanded', 'false'); });
      if (!on || DESK.matches) { it.classList.add('is-on'); $('.xfaq__q', it).setAttribute('aria-expanded', 'true'); } })); }));

  /* Demo spam check note */
  safe('caps', () => $$('.cap input').forEach(c => { const box = c.closest('.captcha'), note = $('.cap__note', box), err = $('.ferr', box);
    c.addEventListener('change', () => { if (note) note.hidden = !c.checked; if (c.checked && err) err.textContent = ''; }); }));
  const capOk = box => { const c = box && $('input[type="checkbox"]', box); return !!(c && c.checked); };

  /* Contact form (preview only: nothing is sent) */
  safe('form', () => { const f = $('#xForm'); if (!f) return; const radios = $$('input[name="interest"]', f), ok = $('#xOk');
    window.__setIntent = v => { const r = radios.find(x => x.value === v); if (r) { r.checked = true; err('interest', ''); } };
    const err = (k, m) => { const e = $('#' + k + '-e'); if (e) e.textContent = m; const w = e && e.closest('.xf'); if (w) w.classList.toggle('is-err', !!m); };
    radios.forEach(r => r.addEventListener('change', () => err('interest', '')));
    ['xemail', 'xphone', 'xmsg'].forEach(k => $('#' + k).addEventListener('input', () => err(k, '')));
    f.addEventListener('submit', e => { e.preventDefault(); let first = null; const bad = (k, m, el) => { err(k, m); if (!first) first = el; };
      const v = { interest: (radios.find(r => r.checked) || {}).value, first: $('#xfirst').value.trim(), last: $('#xlast').value.trim(), email: $('#xemail').value.trim(), phone: $('#xphone').value.trim(), msg: $('#xmsg').value.trim() };
      if (!v.interest) bad('interest', 'Choose what you’re interested in.', radios[0]);
      if (!EMAIL.test(v.email)) bad('xemail', 'Enter an email address, like name@example.com.', $('#xemail'));
      if (v.phone.replace(/\D/g, '').length < 8) bad('xphone', 'Enter a phone number so we can call you back.', $('#xphone'));
      if (!v.msg) bad('xmsg', 'Add a short message.', $('#xmsg'));
      const cap = $('.captcha', f); if (!capOk(cap)) { $('.ferr', cap).textContent = 'Please tick “I’m not a robot”.'; if (!first) first = $('input', cap); }
      if (first) { first.focus(); ok.hidden = true; return; }
      const body = `Interested in: ${v.interest}\nName: ${v.first} ${v.last}\nEmail: ${v.email}\nPhone: ${v.phone}\n\n${v.msg}`;
      $('#xMail').href = 'mailto:contact@newcoastbrokers.com.au?subject=' + encodeURIComponent('Website enquiry: ' + v.interest) + '&body=' + encodeURIComponent(body);
      ok.hidden = false; ok.focus(); }); });

  /* Pre-select the interest passed from another page (?intent=...) */
  safe('intent', () => { const q = new URLSearchParams(location.search).get('intent'); if (q && window.__setIntent) window.__setIntent(q); });

  /* Business finder (preview only) */
  safe('finder', () => { const f = $('#finder'); if (!f) return;
    f.addEventListener('submit', e => { e.preventDefault(); const box = $('.captcha', f);
      if (!capOk(box)) { $('.ferr', box).textContent = 'Please tick “I’m not a robot”.'; $('input', box).focus(); return; }
      const v = Object.fromEntries(new FormData(f)), ok = $('#finderOk');
      $('#finderSum').textContent = [v.type, v.where, v.involve, v.budget].filter(x => x && x !== '$').join(' · ') || 'No preferences chosen yet';
      ok.hidden = false; ok.focus(); }); });

  /* Confidentiality agreement form (preview only) */
  safe('nda', () => { const f = $('#ndaForm'); if (!f) return; const msg = $('#ndaErr'), ok = $('#ndaOk');
    f.addEventListener('submit', e => { e.preventDefault(); const v = Object.fromEntries(new FormData(f)), errs = [];
      if (!v.phone || v.phone.replace(/\D/g, '').length < 8) errs.push('a phone number');
      if (!v.email || !EMAIL.test(v.email.trim())) errs.push('a valid email address');
      if (!v.agree) errs.push('agreement to the terms');
      if (!capOk($('.captcha', f))) errs.push('the “I’m not a robot” check');
      if (errs.length) { msg.textContent = 'Please complete ' + errs.join(', ') + '.'; msg.hidden = false; msg.focus(); ok.hidden = true; return; }
      msg.hidden = true; ok.hidden = false; ok.focus(); }); });

  /* Locations map: Leaflet + Esri light tiles, loaded when near the screen */
  safe('map', () => { const el = $('#ncMap'); if (!el) return;
    const L0 = [{ k: 'newcastle', n: 'Newcastle, NSW', lat: -32.9283, lng: 151.7817, cur: true }, { k: 'central', n: 'Central Coast, NSW', lat: -33.4255, lng: 151.3421 }, { k: 'sydney', n: 'Sydney, NSW', lat: -33.8688, lng: 151.2093 }];
    const btns = $$('.loccard'); let map = null;
    const pick = k => { btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k)); const p = L0.find(x => x.k === k); if (map && p) map.flyTo([p.lat, p.lng], 10, { duration: .8 }); };
    btns.forEach(b => b.addEventListener('click', () => pick(b.dataset.k)));
    const init = () => { if (!window.L || map) return; const L = window.L;
      map = L.map(el, { scrollWheelZoom: false, zoomSnap: .25, attributionControl: true });
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', { attribution: 'Tiles &copy; Esri', maxZoom: 16 }).addTo(map)
        .on('load', () => { const fb = $('.map__fb'); if (fb) fb.remove(); });
      L0.forEach(p => L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', iconSize: [0, 0], html: '<div class="ncpin' + (p.cur ? '' : ' fut') + '"><span>' + p.n + '</span><i></i><em></em></div>' }) }).addTo(map).on('click', () => pick(p.k)));
      const pad = DESK.matches ? { paddingTopLeft: [Math.min(500, el.offsetWidth * .4), 60], paddingBottomRight: [60, 60] } : { padding: [40, 40] };
      map.fitBounds(L0.map(p => [p.lat, p.lng]), Object.assign({ maxZoom: 9 }, pad)); };
    const io = new IntersectionObserver(es => { if (!es[0].isIntersecting) return; io.disconnect();
      const css = d.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; d.head.appendChild(css);
      const s = d.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = init; d.head.appendChild(s); }, { rootMargin: '300px' });
    io.observe(el); });

  /* Blog index: category filter */
  safe('blogfilter', () => { const bar = $('.xblog__filters'); if (!bar) return; const bs = $$('button', bar), items = $$('.xblog__grid li');
    bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-pressed', x === b)); const c = b.dataset.cat; items.forEach(li => li.classList.toggle('is-hide', c !== 'all' && li.dataset.cat !== c)); })); });

  /* Article page: show the post chosen in ?slug= */
  safe('post', () => { const a = $('#art'); if (!a) return;
    const P = window.NC_POSTS || [], slug = new URLSearchParams(location.search).get('slug');
    const p = P.find(x => x.slug === slug) || P[0]; if (!p) return;
    $('#artMeta').textContent = p.cat + ' · ' + p.date; $('#artTitle').textContent = p.title; d.title = p.title + ' | NewCoast Business Brokers';
    $('#artImg').src = p.img;
    $$('.xbl__list li, .xbl__big').forEach(n => { const h = (n.getAttribute('href') || ($('a', n) || {}).getAttribute && $('a', n).getAttribute('href')) || ''; if (h.indexOf('slug=' + p.slug) > -1 && n.tagName === 'LI') n.remove(); }); });

  /* Reading progress (article + agreement pages) */
  safe('progress', () => { const b = $('.xprog'); if (!b) return; const upd = () => { const h = d.documentElement.scrollHeight - innerHeight; b.style.transform = 'scaleX(' + (h > 0 ? scrollY / h : 0) + ')'; }; addEventListener('scroll', upd, { passive: true }); upd(); });
})();

/* Sell page: sale process roadmap (#sale-process) */
(() => {
  'use strict';
  const sec = document.getElementById('sale-process'); if (!sec) return;
  try {
    const $ = s => sec.querySelector(s), $$ = s => Array.from(sec.querySelectorAll(s));
    const steps = $$('.sp2__step'), dots = $$('.sp2__dot'), imgs = $$('.sp2__imgs img'), n = steps.length;
    const list = $('#sp2List'), rail = $('.sp2__rail'), big = $('#sp2Big'), ttl = $('#sp2Ttl'), ring = $('#sp2Ring'), pct = $('#sp2Pct'), cnt = $('#sp2Cnt');
    const arws = $$('.sp2__arw'), DESK = matchMedia('(min-width:1024px)'), C = 326.73;
    const data = steps.map(s => [s.querySelector('.sp2__node b').textContent, s.querySelector('h3').textContent]);
    let cur = -1;
    const flip = el => { el.classList.remove('is-flip'); void el.offsetWidth; el.classList.add('is-flip'); };
    const set = i => {
      i = Math.max(0, Math.min(n - 1, i)); if (i === cur) return; cur = i;
      steps.forEach((s, j) => { s.classList.toggle('is-on', j === i); s.classList.toggle('is-done', j < i); });
      dots.forEach((d, j) => { d.classList.toggle('is-on', j === i); d.classList.toggle('is-done', j < i); d.setAttribute('aria-current', j === i ? 'step' : 'false'); });
      imgs.forEach((im, j) => im.classList.toggle('is-on', j === i));
      big.textContent = data[i][0]; ttl.textContent = data[i][1]; flip(big); flip(ttl);
      ring.style.setProperty('--o', (C * (1 - (i + 1) / n)).toFixed(2)); pct.textContent = i + 1;
      cnt.textContent = data[i][0];
    };
    /* desktop: the step crossing the middle of the screen is the active one */
    const desk = () => {
      const mid = innerHeight * .5, cards = steps.map(s => s.querySelector('.sp2__card').getBoundingClientRect());
      let i = 0; cards.forEach((r, j) => { if (r.top < mid) i = j; }); set(i);
      const nodes = steps.map(s => s.querySelector('.sp2__node').getBoundingClientRect()), L = list.getBoundingClientRect();
      const y0 = nodes[0].top + nodes[0].height / 2, y1 = nodes[n - 1].top + nodes[n - 1].height / 2, f = Math.max(0, Math.min(1, (mid - y0) / (y1 - y0)));
      rail.style.setProperty('--rt', (y0 - L.top) + 'px'); rail.style.setProperty('--rh', (y1 - y0) + 'px'); rail.style.setProperty('--rf', (f * (y1 - y0)) + 'px');
      sec.querySelector('#sp2Meter').style.setProperty('--p', (f * 100).toFixed(1) + '%');
    };
    /* tablet/mobile: swipe deck */
    const step = () => { const a = steps[0], b = steps[1]; return b ? b.offsetLeft - a.offsetLeft : a.offsetWidth; };
    const mob = () => {
      const max = list.scrollWidth - list.clientWidth, f = max > 0 ? list.scrollLeft / max : 0;
      set(Math.round(list.scrollLeft / step()));
      $('#sp2Pbar').style.setProperty('--p', Math.max(8, f * 100).toFixed(1) + '%');
      arws[0].disabled = list.scrollLeft < 4; arws[1].disabled = list.scrollLeft > max - 4;
    };
    let raf = 0; const tick = () => { raf = 0; DESK.matches ? desk() : mob(); };
    const req = () => { if (!raf) raf = requestAnimationFrame(tick); };
    addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); list.addEventListener('scroll', req, { passive: true });
    if (DESK.addEventListener) DESK.addEventListener('change', () => { cur = -1; req(); });
    dots.forEach(d => d.addEventListener('click', () => {
      const card = steps[+d.dataset.go].querySelector('.sp2__card'), off = -(innerHeight / 2 - Math.min(card.offsetHeight, innerHeight * .4) / 2) + 40;
      if (window.__ncScroll) window.__ncScroll(card, off); else card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
    arws.forEach(a => a.addEventListener('click', () => list.scrollBy({ left: +a.dataset.dir * step(), behavior: document.documentElement.classList.contains('rm') ? 'auto' : 'smooth' })));
    cur = -1; set(0); req();
  } catch (e) { console.warn('[NewCoast] sale process failed', e); }
})();

/* ================= SMALL SCREENS (1023px and below): scene-sized reading. Nothing here runs on desktop. ================= */
(() => {
  'use strict';
  const d = document, $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const SMALL = matchMedia('(max-width:1023px)'), PHONE = matchMedia('(max-width:599px)');
  const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => RMQ.matches || d.documentElement.classList.contains('rm');
  const onMQ = (mq, f) => mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f);
  const safe = (n, f) => { try { f(); } catch (e) { console.warn('[NewCoast] small-screen module failed:', n, e); } };
  const CHEV = '<svg class="macc__ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.5l4 4 4-4" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let refit = () => {};

  /* Long lists become one-open-at-a-time disclosures, so the whole list fits one screen.
     The heading itself becomes the button (h3 > button), the answer stays in normal document flow. */
  safe('macc', () => {
    const groups = $$('[data-macc]'); if (!groups.length) return;
    let uid = 0;
    const setOpen = (it, open) => { it.classList.toggle('is-open', open); const b = it._maccBtn; if (b) b.setAttribute('aria-expanded', open); };
    const build = () => groups.forEach(g => { if (g._macc) return; g._macc = true; g.classList.add('macc-on');
      const items = $$('[data-macc-i]', g).filter(i => i.closest('[data-macc]') === g);
      items.forEach((it, i) => { const h = $('[data-macc-h]', it), bodies = $$('[data-macc-b]', it); if (!h) return;
        const ids = bodies.map(b => b.id || (b.id = 'macc' + (++uid)));
        const btn = d.createElement('button'); btn.type = 'button'; btn.className = 'macc__btn'; btn.setAttribute('aria-controls', ids.join(' '));
        while (h.firstChild) btn.appendChild(h.firstChild); btn.insertAdjacentHTML('beforeend', CHEV); h.appendChild(btn); it._maccBtn = btn; it._maccH = h;
        btn.addEventListener('click', e => { e.stopPropagation(); const open = !it.classList.contains('is-open');
          items.forEach(o => setOpen(o, false)); setOpen(it, open);
          if (open && !reduced() && window.gsap) gsap.fromTo(bodies.filter(b => b.offsetParent), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .45, ease: 'power2.out', clearProps: 'opacity,transform' });
          refit(); });
        setOpen(it, i === 0); }); });
    const teardown = () => groups.forEach(g => { if (!g._macc) return; g._macc = false; g.classList.remove('macc-on');
      $$('[data-macc-i]', g).forEach(it => { const b = it._maccBtn, h = it._maccH; if (!b) return; $('.macc__ic', b).remove(); while (b.firstChild) h.insertBefore(b.firstChild, b); b.remove(); it._maccBtn = null; it.classList.remove('is-open'); }); });
    const apply = () => (SMALL.matches ? build() : teardown()); apply(); onMQ(SMALL, () => { apply(); refit(); });
  });

  /* The tail of a very long paragraph: hidden behind an inline "Read more" on small screens only */
  safe('tail', () => { const tails = $$('[data-m-tail]'); if (!tails.length) return;
    tails.forEach((t, i) => { t.id = t.id || 'mt' + i; const b = d.createElement('button'); b.type = 'button'; b.className = 'm-tail-btn'; b.setAttribute('aria-controls', t.id); b.textContent = 'Read more'; t.after(b);
      b.addEventListener('click', () => { const open = t.classList.toggle('is-open'); b.setAttribute('aria-expanded', open); b.textContent = open ? 'Show less' : 'Read more'; refit(); }); });
    const apply = () => tails.forEach(t => { const b = t.nextElementSibling; t.classList.remove('is-open'); b.setAttribute('aria-expanded', 'false'); b.textContent = 'Read more'; });
    apply(); onMQ(SMALL, apply); });

  /* Sections that fit the usable screen become gentle (proximity) snap points; anything taller flows naturally */
  safe('fit', () => { const secs = $$('main > section, main > article'); let t = 0;
    const run = () => { const on = SMALL.matches && !reduced(); const vh = innerHeight;
      secs.forEach(s => { const fit = on && s.offsetHeight <= vh * 1.02 && s.offsetHeight >= vh * .45; s.classList.toggle('m-fit', fit); }); };
    refit = () => { clearTimeout(t); t = setTimeout(run, 650); };
    addEventListener('load', run); addEventListener('resize', refit); if (d.fonts && d.fonts.ready) d.fonts.ready.then(run); run(); });

  /* Gentle entrances for small screens only (GSAP matchMedia reverts everything on desktop / reduced motion) */
  safe('mgsap', () => { if (!window.gsap || !window.ScrollTrigger) return;
    gsap.matchMedia().add({ small: '(max-width:1023px) and (prefers-reduced-motion: no-preference)' }, ctx => {
      if (d.documentElement.classList.contains('rm')) return;
      const grp = (sel, trig, o) => { const els = $$(sel); if (!els.length) return; gsap.from(els, Object.assign({ y: 18, opacity: 0, duration: .6, ease: 'power2.out', stagger: .06, clearProps: 'transform,opacity', scrollTrigger: { trigger: trig || els[0].parentElement, start: 'top 82%', once: true } }, o || {})); };
      $$('[data-macc]').forEach(g => { const kids = Array.from(g.children).filter(c => c.matches('[data-macc-i]')); if (kids.length) gsap.from(kids, { y: 16, opacity: 0, duration: .55, ease: 'power2.out', stagger: .06, clearProps: 'transform,opacity', scrollTrigger: { trigger: g, start: 'top 85%', once: true } }); });
      grp('.xt__grid li', '.xt__grid'); grp('.xstat__t', '.xstat__grid'); grp('.xbl__list li', '.xbl__list'); grp('.xct__tile', '.xct__info');
      $$('.xh__strip figure').forEach((f, i) => gsap.to(f, { yPercent: (i % 2 ? -6 : 6), ease: 'none', scrollTrigger: { trigger: '.xh__strip', start: 'top bottom', end: 'bottom top', scrub: true } }));
    });
  });
})();
