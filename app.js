/* ═══════════════════════════════════════════════════
   NISER MESS PORTAL — app.js  v5
   Shared logic loaded by index.html, reviews.html,
   ranking.html. Depends on shared.js being loaded first.

   Changes in v5:
   - Reviews always open (no time-window restriction)
   - Food item polls removed (use community polls instead)
   - LIVE meal badge removed
   - Content-Type fixed to text/plain for no-cors sheet pushes
   ═══════════════════════════════════════════════════ */

// APPS_SCRIPT_URL and SHEET_CSV_URL are defined inline in each page's <script> block.

// ════════════════════════════════════════
// OBFUSCATION (same key as anon-login.js)
// ════════════════════════════════════════
function obfuscate(str) {
  const key = 'NISER2024SITU';
  return btoa(str.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join(''));
}
function deobfuscate(encoded) {
  const key = 'NISER2024SITU';
  try { return atob(encoded).split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join(''); }
  catch { return '[decode error]'; }
}

// ════════════════════════════════════════
// FOOD CLASSIFICATION
// ════════════════════════════════════════
const KW = {
  nonveg:  ['chicken','fish','mutton','prawn','keema','tuna','beef','pork','meat'],
  egg:     ['egg'],
  dessert: ['kheer','halwa','gulab','laddu','payasam','pudding','cake','sweet','barfi',
            'jalebi','rabri','ice cream','launglata','malpua','sewai khir','moong dal halwa',
            'bhalu shahi','bhalusahi','gulab jamun'],
  salad:   ['salad','kachumber','raita','boondi'],
  fruit:   ['banana','apple','orange','fruit'],
};
function classify(n) {
  const l = n.toLowerCase();
  const isNV  = KW.nonveg.some(k => l.includes(k));
  const isEgg = KW.egg.some(k => l.includes(k));
  if (isEgg) return { type: 'nonveg', emoji: '🥚', size: 'md' };
  if (isNV)  return { type: 'nonveg', emoji: '', size: 'md' };
  return { type: 'veg', emoji: '', size: 'md' };
}
function getBadges(n) {
  const l = n.toLowerCase();
  const b = [];
  const hits = (l, arr) => arr.some(k => l.includes(k));
  if (hits(l, KW.salad))   b.push({ cls: 'badge-salad',   txt: 'Salad' });
  if (hits(l, KW.dessert)) b.push({ cls: 'badge-dessert', txt: 'Dessert' });
  return b;
}

// ════════════════════════════════════════
// RATINGS CORE
// ════════════════════════════════════════
function foodKey(n) { return n.trim().toUpperCase().replace(/\s+/g, '_'); }

function getAvgRating(itemName) {
  const reviews = DB.getReviews(), key = foodKey(itemName);
  if (!reviews[key] || !reviews[key].ratings || !reviews[key].ratings.length) return { avg: 0, count: 0 };
  const ratings = reviews[key].ratings;
  const avg = ratings.reduce((s, r) => s + r.value, 0) / ratings.length;
  return { avg: Math.round(avg * 10) / 10, count: ratings.length };
}

function getUserRating(itemName) {
  if (!currentUser) return null;
  const reviews = DB.getReviews(), key = foodKey(itemName);
  if (!reviews[key] || !reviews[key].ratings) return null;
  return reviews[key].ratings.find(r => r.email === currentUser.email) || null;
}

function saveRating(itemName, meal, value, comment) {
  if (!currentUser) return false;
  const reviews = DB.getReviews(), key = foodKey(itemName);
  if (!reviews[key]) reviews[key] = { itemName, meal, ratings: [], comments: [] };
  reviews[key].ratings = reviews[key].ratings.filter(r => r.email !== currentUser.email);
  const displayName = currentUser.isAnon ? currentUser.codeName : currentUser.name;
  reviews[key].ratings.push({ email: currentUser.email, name: displayName, value, ts: Date.now(), date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) });
  if (comment && comment.trim()) {
    reviews[key].comments = (reviews[key].comments || []).filter(c => c.email !== currentUser.email);
    reviews[key].comments.push({ email: currentUser.email, name: displayName, value, comment: comment.trim(), ts: Date.now(), date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) });
  }
  DB.setReviews(reviews);
  return true;
}

function isTrending(itemName) {
  const reviews = DB.getReviews(), key = foodKey(itemName);
  if (!reviews[key]?.ratings) return false;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return reviews[key].ratings.filter(r => r.ts && r.ts > cutoff).length >= 3;
}

function toggleAteThis(itemName) {
  if (!currentUser) { showToast('Log in to log your meal'); return; }
  const ate = DB.getAteThis(), key = currentUser.email + '::' + foodKey(itemName), today = new Date().toLocaleDateString('en-IN');
  if (ate[key] === today) { delete ate[key]; showToast('Removed from today\'s log'); }
  else { ate[key] = today; showToast('🍽 Logged: ' + itemName); }
  DB.setAteThis(ate);
  document.querySelectorAll('.ate-this-btn[data-item="' + foodKey(itemName) + '"]').forEach(btn => {
    const isAte = ate[key] === today;
    btn.classList.toggle('ate', isAte);
    btn.textContent = isAte ? '✓ Ate' : '🍽';
  });
}

function didAteThis(itemName) {
  if (!currentUser) return false;
  const ate = DB.getAteThis(), key = currentUser.email + '::' + foodKey(itemName);
  return ate[key] === new Date().toLocaleDateString('en-IN');
}

function toggleHelpful(reviewId) {
  if (!currentUser) { showToast('Log in to vote'); return; }
  const helpful = DB.getHelpful(), myKey = currentUser.email + '::' + reviewId;
  if (helpful[myKey]) delete helpful[myKey]; else helpful[myKey] = true;
  DB.setHelpful(helpful);
  const cnt = getHelpfulCount(reviewId);
  const btn = document.getElementById('hbtn-' + reviewId);
  const cntEl = document.getElementById('hcnt-' + reviewId);
  if (btn) btn.classList.toggle('voted', !!helpful[myKey]);
  if (cntEl) cntEl.textContent = cnt > 0 ? cnt + ' found helpful' : '';
}

function getHelpfulCount(reviewId) {
  return Object.keys(DB.getHelpful()).filter(k => k.endsWith('::' + reviewId)).length;
}

// ════════════════════════════════════════
// IST TIME HELPERS (used for day navigation)
// ════════════════════════════════════════
function istDateTime(year, month0, day, hour, minute) {
  const pad = n => String(n).padStart(2, '0');
  const isoStr = `${year}-${pad(month0+1)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+05:30`;
  return new Date(isoStr);
}

function nowIST() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), ts: d };
}

// ════════════════════════════════════════
// COUNTDOWN TIMER
// ════════════════════════════════════════
function formatCountdown(msLeft) {
  if (msLeft <= 0) return 'Closed';
  const totalSec = Math.floor(msLeft / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = n => String(n).padStart(2, '0');
  if (h >= 24) {
    const days = Math.floor(h / 24), hrs = h % 24;
    return `${days}d ${pad(hrs)}h ${pad(m)}m`;
  }
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

// Countdown tick (updates .poll-countdown elements on polls pages)
let _countdownInterval = null;
function startCountdownTick() {
  if (_countdownInterval) return;
  _countdownInterval = setInterval(() => {
    document.querySelectorAll('.poll-countdown[data-expires]').forEach(el => {
      const exp = parseInt(el.dataset.expires);
      if (!exp) return;
      const left = exp - Date.now();
      el.textContent = left > 0 ? '⏳ Poll closes in: ' + formatCountdown(left) : '🔒 Poll closed';
      if (left <= 0) el.style.color = 'var(--muted)';
    });
  }, 1000);
}

// ════════════════════════════════════════
// STARS HTML
// ════════════════════════════════════════
function starsHTML(val, size = 12) {
  let h = '';
  for (let i = 1; i <= 5; i++) {
    if (val >= i) h += `<span style="font-size:${size}px;color:var(--star)">★</span>`;
    else if (val >= i - 0.5) h += `<span style="font-size:${size}px;background:linear-gradient(90deg,var(--star) 50%,var(--star-bg) 50%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">★</span>`;
    else h += `<span style="font-size:${size}px;color:var(--star-bg)">★</span>`;
  }
  return h;
}

// ════════════════════════════════════════
// CSV PARSE
// ════════════════════════════════════════
function parseCSV(text) {
  function splitRow(line) {
    const cols = []; let cur = ''; let q = false;
    for (const ch of line) { if (ch === '"') { q = !q; } else if (ch === ',' && !q) { cols.push(cur.trim()); cur = ''; } else cur += ch; }
    cols.push(cur.trim()); return cols;
  }
  const rows = text.split('\n').map(splitRow);
  const updateTime = rows[0]?.[0] || '';
  const headerRow = rows[2] || [];
  const dayNames = [];
  for (let c = 1; c <= 7; c++) dayNames.push(headerRow[c] || `Day ${c}`);
  const days = Array.from({ length: 7 }, () => ({ BREAKFAST: [], LUNCH: [], DINNER: [] }));
  let section = null;
  for (let r = 3; r < rows.length; r++) {
    const row = rows[r], colA = (row[0] || '').trim().toUpperCase();
    if (['BREAKFAST', 'LUNCH', 'DINNER'].includes(colA)) { section = colA; continue; }
    if (colA === 'SWEET' || colA === 'NONVEG') { section = colA; continue; }
    if (!section) continue;
    const target = (section === 'SWEET' || section === 'NONVEG') ? 'DINNER' : section;
    for (let c = 0; c < 7; c++) { const val = (row[c + 1] || '').trim(); if (val) days[c][target].push(val); }
  }
  return { updateTime, dayNames, days };
}

const DEMO = `April 2026,,,,,,,
Week Menu,,,,,,,
Meal,14.Apr.2026 (Mon),15.Apr.2026 (Tue),16.Apr.2026 (Wed),17.Apr.2026 (Thu),18.Apr.2026 (Fri),19.Apr.2026 (Sat),20.Apr.2026 (Sun)
BREAKFAST,Idli Sambar,Poha,Upma,Bread Butter,Dosa Chutney,Puri Sabji,Paratha
,Boiled Egg,Boiled Egg,Boiled Egg,Boiled Egg,Boiled Egg,Boiled Egg,Boiled Egg
,Banana,Apple,Orange,Banana,Apple,Orange,Banana
LUNCH,Rice,Rice,Rice,Rice,Rice,Rice,Rice
,Dal Tadka,Rajma,Chana Masala,Moong Dal,Dal Fry,Sambar,Dal Makhani
,Aloo Gobi,Palak Paneer,Mix Veg,Bhindi Fry,Matar Paneer,Aloo Sabji,Jeera Aloo
,Salad,Kachumber,Salad,Raita,Salad,Kachumber,Boondi Raita
,Fruit / Egg,Fruit / Egg,Fruit / Egg,Fruit / Egg,Fruit / Egg,Fruit / Egg,Fruit / Egg
DINNER,Rice,Rice,Rice,Rice,Rice,Rice,Rice
,Dal,Dal Fry,Rajma,Chana,Dal,Sambar,Dal
,Paneer Butter Masala,Aloo Matar,Palak Paneer,Egg Curry,Mix Veg,Fish Curry,Chicken Curry
,Chapati,Chapati,Chapati,Chapati,Chapati,Chapati,Chapati
SWEET,Kheer,Halwa,Gulab Jamun,Kheer,Halwa,,
NONVEG,Chicken Curry,,Fish Curry,,Egg Masala,,`;

let appData = null;
let activeDay = 0;
let reviewActiveDay = 0;
let currentRankFilter = 'all';
let currentTimeFilter = 'all';

// ════════════════════════════════════════
// SHEET PUSH HELPERS
// FIX: Use Content-Type: text/plain so no-cors requests
// don't trigger a CORS preflight (application/json does).
// Apps Script reads e.postData.contents as a string regardless.
// ════════════════════════════════════════
function pushToSheet(payload) {
  if (typeof APPS_SCRIPT_URL === 'undefined' || !APPS_SCRIPT_URL) return;
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

function pushReviewToSheet(data) {
  pushToSheet({ action: 'addReview', ...data });
}

function pushAnonReviewToSheet(data) {
  const anonUsers = DB.getAnonUsers();
  const rawEmail = (data.email || '').replace(/^anon::/, '');
  const anonUser = anonUsers[rawEmail];
  const encEmail = anonUser ? anonUser.encEmail : obfuscate(rawEmail);
  pushToSheet({
    action:      'addAnonReview',
    codeName:    data.displayName,
    encEmail:    encEmail,
    foodItem:    data.foodItem,
    meal:        data.meal,
    rating:      data.rating,
    comment:     data.comment || '',
    date:        data.date,
  });
}

// ════════════════════════════════════════
// MENU PAGE
// ════════════════════════════════════════
function buildItem(name) {
  const c = classify(name), bb = getBadges(name), { avg, count } = getAvgRating(name);
  const trending = isTrending(name), ateThis = didAteThis(name);
  const displayName = c.emoji ? c.emoji + ' ' + name : name;
  const key = foodKey(name);
  const trendBadge = trending ? '<span class="badge badge-trending">🔥</span>' : '';
  const badgesHTML = bb.length ? '<div class="badges">' + bb.map(b => `<span class="badge ${b.cls}">${b.txt}</span>`).join('') + '</div>' : '';
  const ratingHTML = avg > 0 ? `<div class="item-rating-inline" title="${avg}/5 from ${count} ratings"><span class="star-icon">★</span><span class="star-val">${avg}</span><span class="count">(${count})</span></div>` : '';
  const ateBtn = currentUser ? `<button class="ate-this-btn${ateThis ? ' ate' : ''}" data-item="${key}" onclick="event.stopPropagation();toggleAteThis('${name.replace(/'/g, "\\'")}')">${ateThis ? '✓ Ate' : '🍽'}</button>` : '';
  const row = document.createElement('div');
  row.className = 'item-row ' + c.type + ' size-' + c.size;
  row.innerHTML = `<div class="item-inner"><div class="item-name-row"><span class="item-name">${displayName}</span>${trendBadge}${ratingHTML}${ateBtn}</div>${badgesHTML}</div>`;
  return row;
}

function buildCol(meal, items) {
  const labels  = { BREAKFAST: 'Breakfast', LUNCH: 'Lunch', DINNER: 'Dinner' };
  const timings = { BREAKFAST: '8:00–10:00 AM', LUNCH: '12:30–2:30 PM', DINNER: '8:00–10:00 PM' };
  const valid = items.filter(i => i && i.trim());
  const col = document.createElement('div');
  col.className = 'meal-card';
  col.innerHTML = `
    <div class="meal-header">
      <span class="meal-title">${labels[meal]}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="meal-count">${valid.length} items</span>
        <a href="reviews.html" style="background:var(--accent2);color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer;text-decoration:none;">⭐ Review</a>
      </div>
    </div>
    <div class="meal-timing"><span class="meal-timing-label">🕐 ${timings[meal]}</span></div>
    <div class="items-list" id="il-${meal}"></div>`;
  const list = col.querySelector('.items-list');
  if (!valid.length) list.innerHTML = '<div class="empty-state">No items listed</div>';
  else valid.forEach(item => list.appendChild(buildItem(item)));
  return col;
}

function renderMenuDay(dayData) {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;
  grid.innerHTML = '';
  ['BREAKFAST', 'LUNCH', 'DINNER'].forEach(m => grid.appendChild(buildCol(m, dayData[m] || [])));
}

function shortLabel(raw) {
  const m = raw.match(/(\d+)\.\w+\.\d+\s*\((\w+)\)/);
  return m ? m[2].slice(0, 3) + ' ' + m[1] : raw.slice(0, 10);
}

function todayIdx(dayNames) {
  const ist = nowIST();
  const dd = ist.day;
  for (let i = 0; i < dayNames.length; i++) { const m = dayNames[i].match(/^(\d+)\./); if (m && parseInt(m[1]) === dd) return i; }
  const d = ist.ts.getDay();
  return d === 0 ? 6 : d - 1;
}

function setMenuDay(idx) {
  activeDay = idx;
  document.querySelectorAll('#day-nav .day-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
  if (appData) renderMenuDay(appData.days[idx]);
}

function buildMenuNav(dayNames) {
  const nav = document.getElementById('day-nav');
  if (!nav) return;
  nav.innerHTML = '';
  dayNames.forEach((n, i) => {
    const b = document.createElement('button');
    b.className = 'day-btn'; b.textContent = shortLabel(n); b.onclick = () => setMenuDay(i);
    nav.appendChild(b);
  });
}

async function initMenuPage() {
  let csv = (typeof SHEET_CSV_URL !== 'undefined' && SHEET_CSV_URL)
    ? await fetch(SHEET_CSV_URL).then(r => r.text()).catch(() => null)
    : null;
  if (!csv) csv = DEMO;
  appData = parseCSV(csv);
  const timeEl = document.getElementById('update-time');
  if (timeEl) timeEl.textContent = 'Week of ' + (appData.updateTime || 'April 2026');
  buildMenuNav(appData.dayNames);
  const ti = Math.min(todayIdx(appData.dayNames), appData.days.length - 1);
  reviewActiveDay = ti;
  setMenuDay(ti);
}

// ════════════════════════════════════════
// REVIEW PAGE
// Reviews are always open — no time-window restrictions.
// ════════════════════════════════════════
function buildReviewDayNav(dayNames) {
  const nav = document.getElementById('review-day-nav');
  if (!nav) return;
  nav.innerHTML = '';
  dayNames.forEach((n, i) => {
    const b = document.createElement('button');
    b.className = 'review-day-btn' + (i === reviewActiveDay ? ' active' : '');
    b.textContent = shortLabel(n);
    b.onclick = () => { reviewActiveDay = i; buildReviewDay(); buildReviewDayNav(dayNames); };
    nav.appendChild(b);
  });
}

function parseDayDate(dayLabel) {
  const m = dayLabel.match(/^(\d+)\.(\w+)\.(\d+)/);
  if (!m) return null;
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  return new Date(parseInt(m[3]), months[m[2]] || 0, parseInt(m[1]));
}

function buildReviewDay() {
  const content = document.getElementById('review-content');
  if (!content) return;
  content.innerHTML = '';
  const day = appData.days[reviewActiveDay];
  const dayLabel = appData.dayNames[reviewActiveDay] || '';

  ['BREAKFAST', 'LUNCH', 'DINNER'].forEach(meal => {
    const items = (day[meal] || []).filter(i => i && i.trim());
    if (!items.length) return;

    const sec = document.createElement('div');
    sec.className = 'meal-review-section';
    const mealLabel = meal.charAt(0) + meal.slice(1).toLowerCase();
    const timings = { BREAKFAST: '8:00–10:00 AM', LUNCH: '12:30–2:30 PM', DINNER: '8:00–10:00 PM' };

    sec.innerHTML = `<div class="meal-review-title">${mealLabel} <span style="font-size:11px;color:var(--muted);font-weight:400;">🕐 ${timings[meal]}</span></div>`;

    if (!currentUser) {
      const gate = document.createElement('div');
      gate.className = 'login-gate';
      gate.innerHTML = `<p>Log in to rate ${mealLabel} dishes</p>
        <a href="login.html">Log In</a> · <a href="login.html#signup">Sign Up</a>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
          <a href="anon-login.html" style="display:inline-block;background:rgba(124,92,191,0.1);color:var(--accent2);border:1px solid rgba(124,92,191,0.25);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;text-decoration:none;">🕵️ Review Anonymously</a>
        </div>`;
      sec.appendChild(gate);
      const grid = document.createElement('div');
      grid.className = 'food-review-grid';
      items.forEach(item => grid.appendChild(buildFoodRatingDisplay(item)));
      sec.appendChild(grid);
      content.appendChild(sec);
      return;
    }

    const anonBar = currentUser.isAnon ? `<div class="anon-session-bar" style="margin-bottom:12px;">🕵️ Reviewing as <strong>${currentUser.codeName}</strong></div>` : '';
    const batchId = 'batch-' + meal;

    const itemRowsHTML = items.map(item => {
      const key = foodKey(item);
      const userRating = getUserRating(item);
      const reviews = DB.getReviews();
      const existingVal = userRating ? userRating.value : 0;
      const existingCmt = (reviews[key]?.comments?.find(c => c.email === currentUser.email) || {}).comment || '';
      const stars = [1,2,3,4,5].map(i =>
        `<span class="frc-star${existingVal >= i ? ' filled' : ''}" onclick="starClick('${key}',${i})" onmouseover="starHover('${key}',${i})" onmouseout="starOut('${key}')">★</span>`
      ).join('');
      const c = classify(item);
      const displayName = c.emoji ? c.emoji + ' ' + item : item;
      return `<div class="batch-item-row" data-key="${key}" data-item="${item.replace(/"/g,'&quot;')}" data-meal="${meal}" data-val="${existingVal}">
        <div class="batch-item-name">${displayName}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <div class="frc-stars" id="frc-stars-${key}">${stars}</div>
          <input class="frc-decimal-inp" type="number" min="0" max="5" step="0.1" id="frc-dec-${key}" value="${existingVal || ''}"
            oninput="decimalUpdate('${key}',this.value)" placeholder="4.2">
          ${userRating ? `<span style="font-size:11px;color:var(--green);font-weight:700;">✓ Rated ${existingVal}/5</span>` : ''}
        </div>
        <textarea class="frc-comment-inp batch-cmt" id="frc-cmt-${key}" placeholder="Comment on ${item} (optional)…" rows="2">${existingCmt}</textarea>
      </div>`;
    }).join('');

    const batchWrap = document.createElement('div');
    batchWrap.className = 'batch-review-wrap';
    batchWrap.id = batchId;
    batchWrap.innerHTML = `${anonBar}
      <div class="batch-items">${itemRowsHTML}</div>
      <button class="batch-submit-btn" onclick="submitBatchRating('${meal}','${batchId}')">⭐ Submit ${mealLabel} Ratings</button>
      <div class="batch-submit-done" id="done-${batchId}"></div>`;

    sec.appendChild(batchWrap);

    // Show existing comments below
    const cmtSec = document.createElement('div');
    cmtSec.className = 'food-review-grid';
    cmtSec.style.marginTop = '12px';
    items.forEach(item => {
      const reviews = DB.getReviews();
      const hidden = DB.getHidden();
      const key = foodKey(item);
      const allComments = (reviews[key]?.comments || []).filter(c => !hidden[key + '::' + c.email]);
      if (!allComments.length) return;
      const card = document.createElement('div');
      card.className = 'food-review-card';
      const cmtItems = allComments.map(c => {
        const rid = key + '::' + c.email;
        const helpful = DB.getHelpful();
        const myVoted = currentUser && !!helpful[currentUser.email + '::' + rid];
        const hCount = getHelpfulCount(rid);
        const isAnon = c.email.startsWith('anon::');
        return `<div class="review-entry">
          <div class="re-header">
            <span class="re-name">${isAnon ? '🕵️ ' : ''}${c.name.split(' ')[0]}</span>
            ${starsHTML(c.value, 11)}<span class="re-val">${c.value.toFixed(1)}</span>
            <span class="re-date">${c.date}</span>
          </div>
          <div class="re-comment">"${c.comment}"</div>
          <div class="helpful-row">
            <button class="helpful-btn${myVoted ? ' voted' : ''}" id="hbtn-${rid}" onclick="toggleHelpful('${rid}')">👍 Helpful</button>
            <span class="helpful-count" id="hcnt-${rid}">${hCount > 0 ? hCount + ' found helpful' : ''}</span>
          </div>
        </div>`;
      }).join('');
      card.innerHTML = `<div class="frc-name" style="margin-bottom:6px;">${item}</div>${cmtItems}`;
      cmtSec.appendChild(card);
    });
    if (cmtSec.children.length) sec.appendChild(cmtSec);

    content.appendChild(sec);
  });

  startCountdownTick();
}

// Display-only card for past/future days (ratings visible, no submit)
function buildFoodRatingDisplay(itemName) {
  const card = document.createElement('div');
  card.className = 'food-review-card';
  const { avg, count } = getAvgRating(itemName);
  const key = foodKey(itemName);
  const reviews = DB.getReviews();
  const hidden = DB.getHidden();
  const allComments = (reviews[key]?.comments || []).filter(c => !hidden[key + '::' + c.email]);
  const avgStarsHTML = starsHTML(avg, 14);

  let cmtHTML = '';
  if (allComments.length) {
    const items = allComments.map(c => {
      const isAnon = c.email.startsWith('anon::');
      return `<div class="review-entry">
        <div class="re-header"><span class="re-name">${isAnon ? '🕵️ ':''}${c.name.split(' ')[0]}</span>${starsHTML(c.value,11)}<span class="re-val">${c.value.toFixed(1)}</span><span class="re-date">${c.date}</span></div>
        <div class="re-comment">"${c.comment}"</div></div>`;
    }).join('');
    cmtHTML = `<button class="frc-reviews-toggle" onclick="toggleReviews('${key}')">💬 ${allComments.length} comment${allComments.length!==1?'s':''}</button>
      <div class="frc-reviews-list" id="rcl-${key}">${items}</div>`;
  }
  card.innerHTML = `<div class="frc-name">${itemName}</div>
    <div class="frc-avg">${avgStarsHTML}<span class="frc-avg-val" style="margin-left:6px;">${avg>0?avg.toFixed(1):'—'}</span><span class="frc-count">(${count} rating${count!==1?'s':''})</span></div>
    ${cmtHTML}`;
  return card;
}

// Batch submit — one Submit button per meal
function submitBatchRating(meal, batchId) {
  const wrap = document.getElementById(batchId);
  if (!wrap) return;
  const rows = wrap.querySelectorAll('.batch-item-row');
  let submitted = 0, skipped = 0;

  rows.forEach(row => {
    const key = row.dataset.key;
    const itemName = row.dataset.item;
    const val = parseFloat(document.getElementById('frc-dec-' + key)?.value) || parseFloat(row.dataset.val) || 0;
    const cmt = document.getElementById('frc-cmt-' + key)?.value || '';
    if (!val) { skipped++; return; }

    saveRating(itemName, meal, val, cmt);
    submitted++;

    const displayName = currentUser.isAnon ? currentUser.codeName : currentUser.name;
    const reviewData = {
      displayName, email: currentUser.email, foodItem: itemName, meal,
      rating: val, comment: cmt.trim(), isAnon: currentUser.isAnon || false,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    };
    if (currentUser.isAnon) pushAnonReviewToSheet(reviewData);
    else pushReviewToSheet(reviewData);
  });

  const doneEl = document.getElementById('done-' + batchId);
  if (doneEl) {
    if (submitted > 0) {
      doneEl.textContent = `✓ Submitted ${submitted} rating${submitted!==1?'s':''}!${skipped>0?' ('+skipped+' skipped — no star selected)':''}`;
      doneEl.style.color = 'var(--green)';
    } else {
      doneEl.textContent = 'Please select at least one star rating.';
      doneEl.style.color = 'var(--red)';
    }
    doneEl.style.display = 'block';
    if (submitted > 0) showToast(`✅ ${submitted} rating${submitted!==1?'s':''} saved for ${meal.charAt(0)+meal.slice(1).toLowerCase()}!`);
  }
}

function starClick(key, i) { const inp = document.getElementById('frc-dec-' + key); if (inp) inp.value = i; updateStarDisplay(key, i); const row = document.querySelector('[data-key="' + key + '"]'); if (row) row.dataset.val = String(i); }
function starHover(key, i) { document.querySelectorAll('#frc-stars-' + key + ' .frc-star').forEach((s, idx) => s.classList.toggle('filled', idx < i)); }
function starOut(key) { const row = document.querySelector('[data-key="' + key + '"]'); updateStarDisplay(key, row ? parseFloat(row.dataset.val) : 0); }
function updateStarDisplay(key, val) { document.querySelectorAll('#frc-stars-' + key + ' .frc-star').forEach((s, idx) => s.classList.toggle('filled', idx + 1 <= val)); }
function decimalUpdate(key, val) { const v = Math.min(5, Math.max(0, parseFloat(val) || 0)); updateStarDisplay(key, v); const row = document.querySelector('[data-key="' + key + '"]'); if (row) row.dataset.val = String(v); }

function toggleReviews(key) { const list = document.getElementById('rcl-' + key); if (list) list.classList.toggle('open'); }

async function initReviewPage() {
  let csv = (typeof SHEET_CSV_URL !== 'undefined' && SHEET_CSV_URL)
    ? await fetch(SHEET_CSV_URL).then(r => r.text()).catch(() => null)
    : null;
  if (!csv) csv = DEMO;
  appData = parseCSV(csv);
  const ti = Math.min(todayIdx(appData.dayNames), appData.days.length - 1);
  reviewActiveDay = ti;
  buildReviewDayNav(appData.dayNames);
  buildReviewDay();
}

// ════════════════════════════════════════
// RANKING PAGE
// ════════════════════════════════════════
function setRankFilter(btn, filter) {
  document.querySelectorAll('.rank-filter-btn:not(.time-filter-btn)').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); currentRankFilter = filter; renderRanking();
}
function setTimeFilter(btn, filter) {
  document.querySelectorAll('.time-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); currentTimeFilter = filter; renderRanking();
}

function renderRanking() {
  const list = document.getElementById('ranking-list');
  if (!list) return;
  const reviews = DB.getReviews();
  let items = Object.values(reviews).filter(r => r.ratings?.length);
  if (currentRankFilter !== 'all') items = items.filter(r => r.meal === currentRankFilter);
  if (currentTimeFilter !== 'all') {
    const cutoff = Date.now() - (currentTimeFilter === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000;
    items = items.map(r => ({ ...r, ratings: r.ratings.filter(rt => rt.ts && rt.ts > cutoff) })).filter(r => r.ratings.length);
  }
  items.sort((a, b) => {
    const avgA = a.ratings.reduce((s, r) => s + r.value, 0) / a.ratings.length;
    const avgB = b.ratings.reduce((s, r) => s + r.value, 0) / b.ratings.length;
    return avgB - avgA;
  });
  if (!items.length) { list.innerHTML = '<div class="state-box">No ratings yet for this filter.</div>'; return; }
  list.innerHTML = '';
  items.slice(0, 20).forEach((item, idx) => {
    const avg = item.ratings.reduce((s, r) => s + r.value, 0) / item.ratings.length;
    const medals = ['gold', 'silver', 'bronze'];
    const posClass = idx < 3 ? medals[idx] : 'other';
    const posText  = idx < 3 ? ['🥇', '🥈', '🥉'][idx] : (idx + 1);
    const hidden = DB.getHidden();
    const comments = (item.comments || []).filter(c => !hidden[foodKey(item.itemName) + '::' + c.email]);
    const cmtsHTML = comments.map(c => {
      const isAnon = c.email.startsWith('anon::');
      return `<div class="rc-entry">
        <div class="rc-avatar">${isAnon ? '🕵' : c.name[0]}</div>
        <div style="flex:1;"><div class="rc-name">${isAnon ? '🕵️ ' : ''}${c.name.split(' ')[0]}</div>
        <div class="rc-comment">"${c.comment}"</div></div>
        <div class="rc-val">${c.value.toFixed(1)}★</div>
        <div class="rc-date">${c.date}</div>
      </div>`;
    }).join('');
    const el = document.createElement('div');
    el.className = 'rank-item';
    el.innerHTML = `
      <div class="rank-pos ${posClass}">${posText}</div>
      <div class="rank-info">
        <div class="rank-name">${item.itemName}</div>
        <div class="rank-meta">
          <span class="rm-tag">${item.meal ? item.meal.charAt(0) + item.meal.slice(1).toLowerCase() : 'Mixed'}</span>
          <span>${item.ratings.length} rating${item.ratings.length !== 1 ? 's' : ''}</span>
          ${comments.length ? `<button class="rank-comments-toggle" onclick="toggleRankComments('rcc-${idx}')">💬 ${comments.length} comment${comments.length !== 1 ? 's' : ''}</button>` : ''}
        </div>
        <div class="rank-stars-row">${starsHTML(avg, 13)}</div>
        ${comments.length ? `<div class="rank-comments" id="rcc-${idx}">${cmtsHTML}</div>` : ''}
      </div>
      <div class="rank-score-wrap">
        <div class="rank-score">${avg.toFixed(1)}</div>
        <div class="rank-score-label">/ 5.0</div>
      </div>`;
    list.appendChild(el);
  });
}

function toggleRankComments(id) { const el = document.getElementById(id); if (el) el.classList.toggle('open'); }
function initRankingPage() { renderRanking(); }
