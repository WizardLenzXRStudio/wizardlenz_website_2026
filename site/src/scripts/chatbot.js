// Wizardlenz Guide: a lightweight on-site assistant. Answers from the site's own facts (no server, no tracking).
const EMAIL = 'inquiry@wizardlenzxrstudio.com';
const PHONE = '+91 99629 04036';
const L = (href, label, portal) => ({ href, label, portal });
const KB = [
  { id: 'hi', k: ['hi', 'hello', 'hey', 'hola', 'vanakkam', 'good morning', 'good evening'], a: "Hi! I'm the Wizardlenz guide. Ask me about our Academy programs, Studio services, games and tools, or how to reach the team.", chips: ['Academy programs', 'Studio services', 'Our games', 'Contact the team'] },
  { id: 'about', k: ['who', 'about', 'wizardlenz', 'company', 'what do you do', 'what is'], a: 'Wizardlenz XR Studio is a Chennai-based studio building VR, AR and AI experiences. We do three things: the Academy (XR programs for partner institutions), the Studio (XR for businesses) and Originals (our own games and tools).', links: [L('/about/', 'About us', 'About')], chips: ['Academy programs', 'Studio services', 'Our games'] },
  { id: 'academy', k: ['academy', 'college', 'university', 'institution', 'school', 'student', 'course', 'training program', 'curriculum', 'workshop', 'bootcamp', 'faculty', 'internship', 'in-plant'], a: 'The Academy runs hands-on XR programs for partner institutions: 1-day workshops (6 hours), bootcamps (2 to 5 days), semester courses (30 to 45 hours), faculty programs (3 to 5 days) and in-plant training (1 to 4 weeks). Students finish with something they built and earn certificates.', links: [L('/academy/', 'Explore the Academy', 'Academy'), L('/academy/#planner', 'Plan a program', 'Academy')], chips: ['Topics covered', 'Plan a program', 'Contact the team'] },
  { id: 'topics', k: ['topic', 'module', 'syllabus', 'learn', 'design track', 'unity', 'vr for designers', 'what do you teach'], a: 'We offer 13 hands-on topic modules, including a design track (VR for Designers, AR for Designers and Immersive Design Portfolio). Every module is project-based.', links: [L('/academy/', 'See all modules', 'Academy')], chips: ['Plan a program', 'Contact the team'] },
  { id: 'planner', k: ['plan', 'planner', 'schedule', 'hod', 'hours', 'draft'], a: "Use the program planner: pick your department, the hours you have and the topics you want, and you get a draft plan to share with your HOD. We refine it with you after.", links: [L('/academy/#planner', 'Open the planner', 'Academy')], chips: ['Contact the team'] },
  { id: 'studio', k: ['studio', 'business', 'company training', 'service', 'services', 'simulation', 'showroom', 'ar product', 'event', 'expo', 'build for', 'client', 'quote'], a: 'The Studio builds XR for business: training simulations, virtual showrooms and AR product views, immersive events, and XR games and AI experiences. We start with a quick working prototype so decisions are made on something real.', links: [L('/studio/', 'Explore the Studio', 'Studio'), L('/contact/', 'Book a discovery call', 'Contact')], chips: ['How do you work?', 'Contact the team'] },
  { id: 'process', k: ['process', 'how do you work', 'how does it work', 'steps', 'timeline', 'prototype'], a: 'Our process has four steps: Discover (we learn your goal, audience and budget), Prototype (a quick working demo), Build (full development with regular demos) and Launch and train (deploy, hand over and train your team).', links: [L('/studio/', 'See the process', 'Studio')], chips: ['Contact the team'] },
  { id: 'ai', k: ['ai', 'game', 'games development', 'character', 'assistant', 'headset', 'quest', 'unity'], a: 'We focus only on XR, games and AI: custom games and AI-powered features for headsets, phones and PCs, including game-based learning, AI characters and smart assistants.', links: [L('/studio/', 'Studio services', 'Studio')], chips: ['Our games', 'Contact the team'] },
  { id: 'originals', k: ['originals', 'our games', 'narrator', 'one eye', 'itch', 'play', 'mole', 'mayhem', 'own games'], a: 'Our Originals are made in-house: The Narrator Lies (a 50-level platformer where the hints are the trap, free on itch.io for Windows, Android coming soon), ImmersiTest (a free testing tool for XR developers) and Mole Mayhem AR (a mixed reality game for Meta Quest 3, in development).', links: [L('/originals/', 'See all Originals', 'Originals')], chips: ['ImmersiTest', 'Contact the team'] },
  { id: 'immersitest', k: ['immersitest', 'profiler', 'fps', 'testing tool', 'test tool', 'performance'], a: 'ImmersiTest is a free tool for XR developers: frame timing, FPS and memory from your Unity XR build, plus guided human validation for what a profiler cannot see. No accounts, and reports are deleted after 60 minutes.', links: [{ href: 'https://immersitest.wizardlenzxrstudio.com/#/', label: 'Open ImmersiTest', ext: true }], chips: ['Our games'] },
  { id: 'gallery', k: ['gallery', 'photos', 'album', 'pictures', 'events held', 'past programs'], a: 'The Gallery has an album from every program we run, posted by our team.', links: [L('/gallery/', 'Open the Gallery', 'Gallery')], chips: ['Academy programs'] },
  { id: 'partners', k: ['partner', 'trusted', 'clients', 'who have you worked', 'woxsen', 'peri', 'crescent', 'sathyabama', 'thiagarajar', 'reviews', 'testimonial'], a: "We've worked with 9 institutions and organisations across 3 cities, including PERI Institute of Technology, B. S. Abdur Rahman Crescent Institute, Sathyabama Institute of Science and Technology, Touchmark Descience, OriginBI Mindworks, Descience Open Source Club and Destinspark. Our work is recognised by StartupTN, MSME and Startup India.", links: [L('/', 'See the map', 'Home')], chips: ['Academy programs', 'Contact the team'] },
  { id: 'price', k: ['price', 'cost', 'fee', 'fees', 'charge', 'budget', 'how much', 'pricing', 'rate'], a: "Pricing depends on the format, hours and topics, so we quote after a short conversation. For institutions, the planner gives a draft plan first; for businesses, tell us the goal and budget and we'll say honestly what XR can do for it.", links: [L('/contact/', 'Ask for a quote', 'Contact')], chips: ['Plan a program', 'Contact the team'] },
  { id: 'where', k: ['where', 'location', 'address', 'chennai', 'city', 'office', 'visit'], a: 'We are based in Chennai, India, and have run programs in Chennai, Hyderabad and Madurai. We work with institutions and businesses elsewhere too.', links: [L('/contact/', 'Contact us', 'Contact')], chips: ['Contact the team'] },
  { id: 'contact', k: ['contact', 'talk', 'human', 'call', 'phone', 'email', 'mail', 'reach', 'whatsapp', 'enquiry', 'inquiry', 'team', 'meeting', 'demo', 'discovery'], a: `You can reach the team by email at ${EMAIL} or by phone at ${PHONE}, or send a message through the contact form.`, links: [L('/contact/', 'Open the contact form', 'Contact')], chips: ['Academy programs', 'Studio services'] },
  { id: 'thanks', k: ['thanks', 'thank you', 'thx', 'ok thanks', 'great'], a: "You're welcome! If you'd like to talk to a person, the contact form is the quickest way.", links: [L('/contact/', 'Contact us', 'Contact')] },
  { id: 'bye', k: ['bye', 'goodbye', 'see you'], a: 'See the magic! Be the magic! Bye for now.' }
];
const CHIP_MAP = { 'Academy programs': 'academy', 'Studio services': 'studio', 'Our games': 'originals', 'Contact the team': 'contact', 'Topics covered': 'topics', 'Plan a program': 'planner', 'How do you work?': 'process', 'ImmersiTest': 'immersitest' };
const FALLBACK = { a: `I'm not sure about that one. The team can answer it directly: ${EMAIL} or ${PHONE}.`, links: [L('/contact/', 'Open the contact form', 'Contact')], chips: ['Academy programs', 'Studio services', 'Our games'] };

function match(q) {
  const t = ' ' + q.toLowerCase().replace(/[^a-z0-9+ ]/g, ' ') + ' ';
  let best = null, score = 0;
  for (const e of KB) {
    let s = 0;
    for (const k of e.k) if (t.includes(' ' + k + ' ') || (k.length > 4 && t.includes(k))) s += k.split(' ').length + (k.length > 6 ? 1 : 0);
    if (s > score) { score = s; best = e; }
  }
  return best || FALLBACK;
}

export const AV = full => `<span class="av${full ? ' av-full' : ''}">${full ? '<span class="av-aura"></span><span class="av-orbit"><i></i><i></i><i></i><i></i><i></i></span>' : ''}${full ? '<img class="av-plat" src="/img/rig/platform.webp" alt="" width="760" height="681"><span class="av-bob">' : ''}<span class="av-in">${full ? '<span class="av-rig"><img class="av-img" src="/img/rig/base.webp" alt="" width="760" height="681"><img class="rg rg-lleg" src="/img/rig/lleg.webp" alt=""><img class="rg rg-rleg" src="/img/rig/rleg.webp" alt=""><img class="rg rg-larm" src="/img/rig/larm.webp" alt=""><img class="rg rg-rarm" src="/img/rig/rarm.webp" alt=""></span>' : '<img class="av-img" src="/img/mascot-head.webp" alt="" width="320" height="219">'}<span class="av-eye"><i class="av-pupil"></i><i class="av-lid"></i></span>${full ? '<span class="av-cube"><svg viewBox="0 0 40 44" aria-hidden="true"><defs><linearGradient id="avCb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a5f3fc"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><path d="M20 3 36 12v20L20 41 4 32V12z" fill="url(#avCb)" fill-opacity=".45" stroke="#bff6ff" stroke-width="2"/><path d="M4 12l16 9 16-9M20 21v20" fill="none" stroke="#e0fbff" stroke-width="1.6"/></svg></span><span class="av-staff"></span>' : ''}</span>${full ? '</span>' : ''}<span class="av-fx" aria-hidden="true"></span></span>`;

function livingAvatars(root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let px = null, py = null, lastMove = 0, raf = 0;
  const glance = { x: 0, y: 0 };
  const all = () => root.querySelectorAll('.av');
  const update = () => {
    raf = 0;
    const now = performance.now();
    const useP = px !== null && now - lastMove < 5000;
    all().forEach(av => {
      const r = av.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
      let dx, dy;
      if (useP) { dx = (px - (r.left + r.width / 2)) / 260; dy = (py - (r.top + r.height / 2)) / 260; }
      else { dx = glance.x; dy = glance.y; }
      dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
      av.style.setProperty('--ry', (dx * 8).toFixed(1) + 'deg');
      av.style.setProperty('--rx', (-dy * 6).toFixed(1) + 'deg');
      av.style.setProperty('--px', (dx * 22).toFixed(1) + '%');
      av.style.setProperty('--py', (dy * 20).toFixed(1) + '%');
    });
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  if (!reduce) {
    addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; px = e.clientX; py = e.clientY; lastMove = performance.now(); wake(); queue(); }, { passive: true });
    setInterval(() => { glance.x = (Math.random() * 2 - 1) * .8; glance.y = (Math.random() * 2 - 1) * .5; queue(); }, 2600);
    const blink = () => { all().forEach(a => a.classList.add('blink')); setTimeout(() => all().forEach(a => a.classList.remove('blink')), 160); setTimeout(blink, 2200 + Math.random() * 3600); };
    setTimeout(blink, 1800);
  }
  let sleepT;
  const wake = () => { clearTimeout(sleepT); root.classList.remove('is-sleep'); if (!reduce) sleepT = setTimeout(() => { if (!root.classList.contains('open')) root.classList.add('is-sleep'); }, 45000); };
  wake();
  const mood = (cls, ms) => { root.classList.add(cls); setTimeout(() => root.classList.remove(cls), ms); };
  return { mood, wake, queue };
}

export function initChatbot() {
  if (document.getElementById('wlz-chat') || location.pathname.startsWith('/admin')) return;
  const root = document.createElement('div');
  root.id = 'wlz-chat';
  root.innerHTML = `
  <button class="cb-fab" type="button" aria-label="Chat with the Wizardlenz guide" aria-expanded="false" aria-controls="cb-panel">
    ${AV(true)}
    <span class="cb-dot" aria-hidden="true"></span>
  </button>
  <section class="cb-panel" id="cb-panel" role="dialog" aria-label="Wizardlenz guide" hidden>
    <header><span class="cb-av">${AV()}</span><div><b>Wizardlenz Guide</b><small>Automated assistant</small></div><button type="button" class="cb-x" aria-label="Close chat">×</button></header>
    <div class="cb-log" role="log" aria-live="polite"></div>
    <div class="cb-chips"></div>
    <form class="cb-form" autocomplete="off"><input type="text" name="q" placeholder="Ask about programs, services, games…" aria-label="Your question" maxlength="200"><button type="submit" aria-label="Send">➤</button></form>
  </section>`;
  document.body.appendChild(root);
  const fab = root.querySelector('.cb-fab'), panel = root.querySelector('.cb-panel'), log = root.querySelector('.cb-log'),
    chips = root.querySelector('.cb-chips'), form = root.querySelector('.cb-form'), input = form.q;
  const dot = root.querySelector('.cb-dot');
  const life = livingAvatars(root);
  // Proactive popups: short speech bubbles from the guide (greeting, page tips, exit intent)
  const POPS = {
    '/': [{ t: 'Want to see what we build? Pick a path: Academy, Studio or Originals.', q: 'Academy programs', b: 'Show me' }, { t: 'Running a program for your college? Our planner drafts it in a minute.', q: 'Plan a program', b: 'Plan it' }],
    '/academy/': [{ t: 'Not sure which format fits? I can explain the five program types.', q: 'Academy programs', b: 'Explain' }, { t: 'Try the planner below. You get a draft plan to share with your HOD.', q: 'Plan a program', b: 'Tell me more' }],
    '/studio/': [{ t: 'Have a project in mind? A quick prototype comes first, before any big commitment.', q: 'How do you work?', b: 'How it works' }, { t: 'Need training, a showroom, an event or a game? Tell the team your goal.', q: 'Contact the team', b: 'Talk to the team' }],
    '/originals/': [{ t: 'Curious about The Narrator Lies? It is free on itch.io. Careful, he lies!', q: 'Our games', b: 'See the games' }, { t: 'Building for XR? ImmersiTest is a free tool for you.', q: 'ImmersiTest', b: 'What is it?' }],
    '/gallery/': [{ t: 'Every program gets an album here. Want to run one at your campus?', q: 'Academy programs', b: 'Yes, tell me' }],
    '/about/': [{ t: 'Want to work with us? The team replies to every enquiry.', q: 'Contact the team', b: 'Contact' }],
    '/contact/': [{ t: 'Prefer to talk? You can also email or call the team directly.', q: 'Contact the team', b: 'Show details' }]
  };
  const pop = document.createElement('div'); pop.className = 'cb-pop'; pop.hidden = true; pop.setAttribute('role', 'status');
  pop.innerHTML = '<button type="button" class="cb-pop-x" aria-label="Dismiss">×</button><p></p><button type="button" class="cb-pop-go"></button>';
  root.appendChild(pop);
  let popTimer = 0, popShown = 0, shownSet = [];
  try { shownSet = JSON.parse(sessionStorage.getItem('wlz-pops') || '[]'); } catch (e) {}
  const mark = id => { shownSet.push(id); try { sessionStorage.setItem('wlz-pops', JSON.stringify(shownSet)); } catch (e) {} };
  const hidePop = () => { pop.hidden = true; clearTimeout(popTimer); };
  function showPop(id, text, q, label) {
    if (!panel.hidden || popShown >= 3 || shownSet.includes(id)) return false;
    popShown++; mark(id);
    pop.querySelector('p').textContent = text;
    const go = pop.querySelector('.cb-pop-go'); go.textContent = label; go.hidden = !q;
    go.onclick = () => { hidePop(); open(); if (q) setTimeout(() => ask(q, !!CHIP_MAP[q]), 350); };
    pop.hidden = false; life.mood('is-wave', 1600);
    clearTimeout(popTimer); popTimer = setTimeout(hidePop, 14000);
    return true;
  }
  pop.querySelector('.cb-pop-x').addEventListener('click', hidePop);
  const here = location.pathname.replace(/index\.html$/, '');
  const tips = POPS[here] || [];
  setTimeout(() => showPop('hi', "Hi! I'm the Wizardlenz guide. Need a hand finding something?", null, ''), 3500);
  tips.forEach((tp, i) => setTimeout(() => showPop(here + i, tp.t, tp.q, tp.b), 26000 + i * 34000));
  let exitDone = false;
  document.addEventListener('mouseout', e => { if (!exitDone && !e.relatedTarget && e.clientY < 8 && panel.hidden) { exitDone = true; showPop('exit', 'Before you go: any questions? Ask me, or reach the team directly.', 'Contact the team', 'Contact the team'); } });
  fab.addEventListener('pointerenter', () => life.mood('is-hover', 900));

  const scroll = () => { log.scrollTop = log.scrollHeight; };
  const bubble = (who, text, links) => {
    const d = document.createElement('div'); d.className = 'cb-m cb-' + who;
    if (who === 'bot') { const av = document.createElement('span'); av.className = 'cb-av cb-av-s'; av.innerHTML = AV(); d.appendChild(av); }
    const p = document.createElement('p'); p.textContent = text; d.appendChild(p);
    if (links && links.length) {
      const r = document.createElement('div'); r.className = 'cb-links';
      links.forEach(l => {
        const a = document.createElement('a'); a.href = l.href; a.textContent = l.label;
        if (l.ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } else if (l.portal) a.dataset.portal = l.portal;
        r.appendChild(a);
      });
      d.appendChild(r);
    }
    log.appendChild(d); scroll();
  };
  const setChips = list => {
    chips.textContent = '';
    (list || []).forEach(c => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.addEventListener('click', () => ask(c, true)); chips.appendChild(b); });
  };
  const reply = e => {
    const typing = document.createElement('div'); typing.className = 'cb-m cb-bot cb-typing'; typing.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(typing); scroll();
    root.classList.add('is-talk');
    setTimeout(() => { typing.remove(); root.classList.remove('is-talk'); bubble('bot', e.a, e.links); setChips(e.chips); life.mood(e === FALLBACK ? 'is-shrug' : 'is-happy', e === FALLBACK ? 1500 : 1100); }, 650);
  };
  function ask(text, fromChip) {
    const q = text.trim(); if (!q) return;
    life.wake();
    bubble('me', q);
    const e = fromChip && CHIP_MAP[q] ? KB.find(x => x.id === CHIP_MAP[q]) : match(q);
    reply(e);
  }
  const open = () => {
    hidePop(); life.wake(); life.mood('is-happy', 1100);
    panel.hidden = false; fab.setAttribute('aria-expanded', 'true'); root.classList.add('open'); dot.hidden = true;
    if (!log.children.length) { bubble('bot', "Hi! I'm the Wizardlenz guide. What would you like to know?"); setChips(['Academy programs', 'Studio services', 'Our games', 'Contact the team']); }
    setTimeout(() => input.focus(), 50);
  };
  const close = () => { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); root.classList.remove('open'); fab.focus(); };
  fab.addEventListener('click', () => (panel.hidden ? open() : close()));
  root.querySelector('.cb-x').addEventListener('click', close);
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; ask(v, false); });
}
