/* ═══════════════════════════════════════════════════
   NISER MESS PORTAL — shared.js  v6
   - NO localStorage caching except session token
   - All data fetched live from Google Sheets
   - Session stored in sessionStorage only
   ═══════════════════════════════════════════════════ */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz0qFGsmvbpkfJNNRohDzPpiLAbTivfRF9LMoNLaDZi-VBKXjhigfc03xSc6fySJUQ/exec';

/* ── PAGE ROUTING ─────────────────────────────────── */
const PAGES = {
  login:'login.html', signup:'login.html#signup', menu:'index.html',
  review:'reviews.html', ranking:'ranking.html', anonLogin:'anon-login.html',
  admin:'admin.html', complaints:'complaints.html', polls:'polls.html', updates:'updates.html',
};

/* ── SESSION (sessionStorage only — cleared on tab close) ── */
const Session = {
  get()    { try { return JSON.parse(sessionStorage.getItem('niser_session')) || null; } catch { return null; } },
  set(val) { try { sessionStorage.setItem('niser_session', JSON.stringify(val)); } catch {} },
  clear()  { sessionStorage.removeItem('niser_session'); },
};

let currentUser = Session.get();

function doLogout() {
  Session.clear();
  currentUser = null;
  window.location.href = 'login.html';
}

/* ── GUEST ID (persistent across sessions for poll voting) ── */
function getGuestId() {
  let gid = localStorage.getItem('niser_guest_id');
  if (!gid) {
    gid = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('niser_guest_id', gid);
  }
  return gid;
}
function getVoterKey() {
  return currentUser ? currentUser.email : getGuestId();
}

/* ── SHEET API ────────────────────────────────────── */
async function sheetGet(params) {
  const url = new URL(APPS_SCRIPT_URL);
  Object.entries(params).forEach(([k,v]) => url.searchParams.append(k, v));
  const res = await fetch(url.toString());
  return res.json();
}

async function sheetPost(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  // no-cors returns opaque response — assume ok
  return { status: 'ok' };
}

async function sheetPostWithResponse(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/* ── DATA FETCHERS ───────────────────────────────── */
async function fetchReviews()    { return sheetGet({ action:'getReviews' }); }
async function fetchPolls()      { return sheetGet({ action:'getPolls' }); }
async function fetchComplaints() { return sheetGet({ action:'getComplaints' }); }
async function fetchUpdates()    { return sheetGet({ action:'getUpdates' }); }
async function fetchMenuItems()  { return sheetGet({ action:'getMenuItems' }); }
async function fetchAllPollVotes(pollId) {
  return sheetGet({ action:'getAllPollVotes', pollId, voterKey: getVoterKey() });
}

/* ── OBFUSCATION ─────────────────────────────────── */
function obfuscate(str) {
  const key = 'NISER2024SITU';
  return btoa(str.split('').map((c,i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i%key.length))).join(''));
}
function deobfuscate(encoded) {
  const key = 'NISER2024SITU';
  try { return atob(encoded).split('').map((c,i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i%key.length))).join(''); }
  catch { return '[decode error]'; }
}

/* ── TOAST ─────────────────────────────────────────── */
let _toastTimer = null;
function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ── HAMBURGER ─────────────────────────────────────── */
function toggleHamburger(navId) {
  const el = document.getElementById(navId); if (el) el.classList.toggle('open');
}

/* ── EMAILJS ROTATION ─────────────────────────────── */
const EMAILJS_SYSTEMS = [
  { publicKey:'ZO3uwzocbG9SL-8AL', serviceId:'service_lxqiu9f', templateId:'template_nyg5mv8', limit:180 },
  { publicKey:'G9ACxTJeRE_qrrqTZ', serviceId:'service_fiqunyg', templateId:'template_4ohg92c', limit:190 },
  { publicKey:'LmZrYjg4E5g9oXft3', serviceId:'service_z8ojeeg', templateId:'template_3i67jsa', limit:190 },
  { publicKey:'PeG5e1uSO1__mCdwK', serviceId:'service_yrpwajg', templateId:'template_jjgbjxc', limit:190 },
];
// EmailJS rotation state only — tiny, stored in localStorage (not user data)
function _getEmailStats() { try { return JSON.parse(localStorage.getItem('niser_emailjs')) || {currentSystem:0,counts:[0,0,0,0]}; } catch { return {currentSystem:0,counts:[0,0,0,0]}; } }
function _setEmailStats(s) { try { localStorage.setItem('niser_emailjs', JSON.stringify(s)); } catch {} }
function getActiveEmailSystem() { const s=_getEmailStats(); return EMAILJS_SYSTEMS[s.currentSystem%EMAILJS_SYSTEMS.length]; }
function recordEmailSent() {
  const s=_getEmailStats(), sys=s.currentSystem%EMAILJS_SYSTEMS.length;
  s.counts[sys]=(s.counts[sys]||0)+1;
  if(s.counts[sys]>=EMAILJS_SYSTEMS[sys].limit) s.currentSystem=(sys+1)%EMAILJS_SYSTEMS.length;
  _setEmailStats(s);
}
function getEmailSystemStatus() {
  const s=_getEmailStats();
  return EMAILJS_SYSTEMS.map((x,i)=>({num:i+1,serviceId:x.serviceId,limit:x.limit,used:s.counts[i]||0,remaining:Math.max(0,x.limit-(s.counts[i]||0)),active:(s.currentSystem%EMAILJS_SYSTEMS.length)===i}));
}

/* ── COUNTDOWN HELPER ─────────────────────────────── */
function formatCountdown(msLeft) {
  if (msLeft <= 0) return 'Closed';
  const s = Math.floor(msLeft/1000), h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  const pad = n => String(n).padStart(2,'0');
  if (h >= 24) { const d=Math.floor(h/24); return `${d}d ${pad(h%24)}h ${pad(m)}m`; }
  return `${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
}

/* ── RENDER HEADER ─────────────────────────────────── */
function renderHeader(activePage) {
  const isLoggedIn = !!currentUser, isAdmin = currentUser?.isAdmin, isAnon = currentUser?.isAnon;
  let userHTML;
  if (isLoggedIn) {
    const initials = isAnon ? '🕵' : currentUser.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
    userHTML = `<div class="user-chip">
      <div class="user-avatar" style="${isAnon?'background:linear-gradient(135deg,#7c5cbf,#4a1a9c);':''}">${initials}</div>
      <span>${isAnon ? currentUser.codeName : currentUser.name.split(' ')[0]}</span>
      ${isAdmin?'<span style="font-size:9px;background:#7c5cbf;color:#fff;padding:1px 5px;border-radius:3px;font-weight:700;">ADMIN</span>':''}
      ${isAnon?'<span style="font-size:9px;background:rgba(124,92,191,0.2);color:var(--accent2);padding:1px 5px;border-radius:3px;font-weight:700;">ANON</span>':''}
      <button class="nav-btn" style="padding:4px 8px;font-size:11px;" onclick="doLogout()">Log Out</button>
    </div>`;
  } else {
    userHTML = `<a class="nav-btn primary" href="login.html">Log In</a>`;
  }
  const navLinks = [
    {label:'Menu',href:'index.html',key:'menu'},{label:'Reviews',href:'reviews.html',key:'review'},
    {label:'Rankings',href:'ranking.html',key:'ranking'},{label:'Polls',href:'polls.html',key:'polls'},
    {label:'Complaints',href:'complaints.html',key:'complaints'},{label:'Updates',href:'updates.html',key:'updates'},
  ];
  const navHTML = navLinks.map(n=>`<a class="nav-btn${activePage===n.key?' active':''}" href="${n.href}">${n.label}</a>`).join('');
  const el = document.getElementById('site-header'); if (!el) return;
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

/* ── RENDER FOOTER ─────────────────────────────────── */
function renderFooter(extra) {
  const el = document.getElementById('site-footer'); if (!el) return;
  el.innerHTML = `
    <strong>NISER Mess Portal</strong> · National Institute of Science Education and Research, Bhubaneswar
    <div class="footer-links">
      <a href="https://www.niser.ac.in" target="_blank">niser.ac.in ↗</a>
      <a href="reviews.html">Food Reviews</a><a href="ranking.html">Rankings</a>
      <a href="polls.html">Polls</a><a href="complaints.html">Complaints</a>
      <a href="updates.html">Updates</a>
      <a href="https://shubhranshu-24.github.io/shubhranshu/" target="_blank">Developer ↗</a>
    </div>
    ${extra||''}
    <div style="margin-top:6px;font-size:11px;opacity:0.5;">Developed by Boss</div>
    <div style="margin-top:4px;font-size:10px;opacity:0.35;">All ratings are user-submitted.</div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.08);">
      <a href="admin.html" style="font-size:10px;color:rgba(255,255,255,0.22);letter-spacing:0.05em;">Admin Portal</a>
    </div>`;
}
