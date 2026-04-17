/* ═══════════════════════════════════════════════════
   NISER MESS PORTAL — shared.js  v4
   Injects static header + footer into every page,
   handles cross-page navigation via localStorage.
   ═══════════════════════════════════════════════════ */

/* ── PAGE ROUTING ───────────────────────────────── */
const PAGES = {
  login:      'login.html',
  signup:     'login.html#signup',
  menu:       'index.html',
  review:     'reviews.html',
  ranking:    'ranking.html',
  anonLogin:  'anon-login.html',
  admin:      'admin.html',
  complaints: 'complaints.html',
  polls:      'polls.html',
  updates:    'updates.html',
};

function goTo(page) { window.location.href = page; }

// ── SESSION ──────────────────────────────────────
const DB = {
  get(key)        { try { return JSON.parse(localStorage.getItem('niser_' + key)) || null; } catch { return null; } },
  set(key, val)   { try { localStorage.setItem('niser_' + key, JSON.stringify(val)); } catch {} },
  getUsers()      { return DB.get('users')          || {}; },
  getReviews()    { return DB.get('reviews')        || {}; },
  setUsers(u)     { DB.set('users', u); },
  setReviews(r)   { DB.set('reviews', r); },
  getHidden()     { return DB.get('hidden_reviews') || {}; },
  setHidden(h)    { DB.set('hidden_reviews', h); },
  getHelpful()    { return DB.get('helpful')        || {}; },
  setHelpful(h)   { DB.set('helpful', h); },
  getAteThis()    { return DB.get('ate_this')       || {}; },
  setAteThis(a)   { DB.set('ate_this', a); },
  getAnonUsers()  { return DB.get('anon_users')     || {}; },
  setAnonUsers(a) { DB.set('anon_users', a); },
  getPolls()      { return DB.get('polls')          || []; },
  setPolls(p)     { DB.set('polls', p); },
  getPollVotes()  { return DB.get('poll_votes')     || {}; },
  setPollVotes(v) { DB.set('poll_votes', v); },
  getComplaints() { return DB.get('complaints')     || []; },
  setComplaints(c){ DB.set('complaints', c); },
  getUpdates()    { return DB.get('updates')        || []; },
  setUpdates(u)   { DB.set('updates', u); },
  getEmailStats() { return DB.get('emailjs_stats') || { currentSystem: 0, counts: [0, 0, 0, 0] }; },
  setEmailStats(s){ DB.set('emailjs_stats', s); },
};

let currentUser = DB.get('session') || null;

function doLogout() {
  DB.set('session', null);
  currentUser = null;
  window.location.href = 'login.html';
}

/* ── GUEST ID (for poll voting without login) ──── */
// Each browser gets a persistent random ID so guests can vote once per poll
function getGuestId() {
  let gid = localStorage.getItem('niser_guest_id');
  if (!gid) {
    gid = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('niser_guest_id', gid);
  }
  return gid;
}

// Returns the voter key: logged-in email or persistent guest ID
function getVoterKey() {
  return currentUser ? currentUser.email : getGuestId();
}

/* ── TOAST ──────────────────────────────────────── */
let toastTimer = null;
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ── HAMBURGER ──────────────────────────────────── */
function toggleHamburger(navId) {
  const el = document.getElementById(navId);
  if (el) el.classList.toggle('open');
}

/* ── EMAILJS ROTATION SYSTEM ─────────────────────
   4 systems with limits [180, 190, 190, 190].
   Resets monthly on the 14th (count tracked in localStorage).
   Cycle: 1→2→3→4→1→2→…
   ─────────────────────────────────────────────── */
const EMAILJS_SYSTEMS = [
  { publicKey: 'ZO3uwzocbG9SL-8AL', serviceId: 'service_lxqiu9f', templateId: 'template_nyg5mv8', limit: 180 },
  { publicKey: 'G9ACxTJeRE_qrrqTZ', serviceId: 'service_fiqunyg', templateId: 'template_4ohg92c', limit: 190 },
  { publicKey: 'LmZrYjg4E5g9oXft3', serviceId: 'service_z8ojeeg', templateId: 'template_3i67jsa', limit: 190 },
  { publicKey: 'PeG5e1uSO1__mCdwK', serviceId: 'service_yrpwajg', templateId: 'template_jjgbjxc', limit: 190 },
];

function getActiveEmailSystem() {
  const stats = DB.getEmailStats();
  const today = new Date();
  const lastReset = stats.lastReset ? new Date(stats.lastReset) : null;
  if (!lastReset || (today.getDate() >= 14 && (today.getMonth() !== lastReset.getMonth() || today.getFullYear() !== lastReset.getFullYear()))) {
    if (!lastReset || today.getDate() >= 14) {
      if (!lastReset || today.getDate() === 14) {
        stats.counts = [0, 0, 0, 0];
        stats.lastReset = today.toISOString();
        DB.setEmailStats(stats);
      }
    }
  }
  return EMAILJS_SYSTEMS[stats.currentSystem % EMAILJS_SYSTEMS.length];
}

function recordEmailSent() {
  const stats = DB.getEmailStats();
  const sys = stats.currentSystem % EMAILJS_SYSTEMS.length;
  stats.counts[sys] = (stats.counts[sys] || 0) + 1;
  const limit = EMAILJS_SYSTEMS[sys].limit;
  if (stats.counts[sys] >= limit) {
    stats.currentSystem = (sys + 1) % EMAILJS_SYSTEMS.length;
  }
  DB.setEmailStats(stats);
}

function getEmailSystemStatus() {
  const stats = DB.getEmailStats();
  return EMAILJS_SYSTEMS.map((s, i) => ({
    num: i + 1,
    serviceId: s.serviceId,
    limit: s.limit,
    used: stats.counts[i] || 0,
    remaining: Math.max(0, s.limit - (stats.counts[i] || 0)),
    active: (stats.currentSystem % EMAILJS_SYSTEMS.length) === i,
  }));
}

/* ── RENDER HEADER ──────────────────────────────── */
function renderHeader(activePage) {
  const isLoggedIn = !!currentUser;
  const isAdmin    = currentUser?.isAdmin;
  const isAnon     = currentUser?.isAnon;

  let userHTML;
  if (isLoggedIn) {
    const initials = isAnon ? '🕵' : currentUser.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    userHTML = `
      <div class="user-chip">
        <div class="user-avatar" style="${isAnon ? 'background:linear-gradient(135deg,#7c5cbf,#4a1a9c);' : ''}">${initials}</div>
        <span>${isAnon ? currentUser.codeName : currentUser.name.split(' ')[0]}</span>
        ${isAdmin ? '<span style="font-size:9px;background:#7c5cbf;color:#fff;padding:1px 5px;border-radius:3px;font-weight:700;">ADMIN</span>' : ''}
        ${isAnon  ? '<span style="font-size:9px;background:rgba(124,92,191,0.2);color:var(--accent2);padding:1px 5px;border-radius:3px;font-weight:700;">ANON</span>' : ''}
        <button class="nav-btn" style="padding:4px 8px;font-size:11px;" onclick="doLogout()">Log Out</button>
      </div>`;
  } else {
    userHTML = `<a class="nav-btn primary" href="login.html">Log In</a>`;
  }

  const navLinks = [
    { label: 'Menu',       href: 'index.html',      key: 'menu' },
    { label: 'Reviews',    href: 'reviews.html',    key: 'review' },
    { label: 'Rankings',   href: 'ranking.html',    key: 'ranking' },
    { label: 'Polls',      href: 'polls.html',      key: 'polls' },
    { label: 'Complaints', href: 'complaints.html', key: 'complaints' },
    { label: 'Updates',    href: 'updates.html',    key: 'updates' },
  ];

  const navHTML = navLinks.map(n =>
    `<a class="nav-btn${activePage === n.key ? ' active' : ''}" href="${n.href}">${n.label}</a>`
  ).join('');

  const el = document.getElementById('site-header');
  if (!el) return;
  el.innerHTML = `
    <a class="header-brand" href="index.html">
      <div class="header-logo">N</div>
      <div><div class="header-title">NISER Mess</div><div class="header-sub">NISER · Bhubaneswar</div></div>
    </a>
    <nav class="header-nav" id="main-nav">
      ${navHTML}
      <div id="user-area">${userHTML}</div>
    </nav>
    <button class="hamburger" onclick="toggleHamburger('main-nav')">☰</button>`;
}

/* ── RENDER FOOTER ──────────────────────────────── */
function renderFooter(extra) {
  const el = document.getElementById('site-footer');
  if (!el) return;
  el.innerHTML = `
    <strong>NISER Mess Portal</strong> · National Institute of Science Education and Research, Bhubaneswar
    <div class="footer-links">
      <a href="https://www.niser.ac.in" target="_blank">niser.ac.in ↗</a>
      <a href="reviews.html">Food Reviews</a>
      <a href="ranking.html">Rankings</a>
      <a href="polls.html">Polls</a>
      <a href="complaints.html">Complaints</a>
      <a href="updates.html">Updates</a>
      <a href="https://shubhranshu-24.github.io/shubhranshu/" target="_blank">Developer ↗</a>
    </div>
    ${extra || ''}
    <div style="margin-top:6px;font-size:11px;opacity:0.5;">Developed by Boss</div>
    <div style="margin-top:4px;font-size:10px;opacity:0.35;">All ratings are user-submitted. NISER is not responsible for review content.</div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
      <a href="admin.html" style="font-size:10px;color:rgba(255,255,255,0.22);letter-spacing:0.05em;">Admin Portal</a>
    </div>`;
}
