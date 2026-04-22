/* ═══════════════════════════════════════════════════
   NISER MESS PORTAL — app.js  v6
   All data fetched from Google Sheets via Apps Script.
   No localStorage caching. Session only in sessionStorage.
   ═══════════════════════════════════════════════════ */

// ── OBFUSCATION ──────────────────────────────────────
function obfuscate(str) {
  const key = 'NISER2024SITU';
  return btoa(str.split('').map((c,i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i%key.length))).join(''));
}
function deobfuscate(encoded) {
  const key = 'NISER2024SITU';
  try { return atob(encoded).split('').map((c,i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i%key.length))).join(''); }
  catch { return '[decode error]'; }
}

// ── FOOD CLASSIFICATION ───────────────────────────────
const KW = {
  nonveg:  ['chicken','fish','mutton','prawn','keema','tuna','beef','pork','meat'],
  egg:     ['egg'],
  dessert: ['kheer','halwa','gulab','laddu','payasam','pudding','cake','sweet','barfi','jalebi','rabri','ice cream','launglata','malpua','sewai khir','moong dal halwa','bhalu shahi','bhalusahi','gulab jamun'],
  salad:   ['salad','kachumber','raita','boondi'],
};
function classify(n) {
  const l = n.toLowerCase();
  if (KW.egg.some(k => l.includes(k)))    return { type:'nonveg', emoji:'🥚' };
  if (KW.nonveg.some(k => l.includes(k))) return { type:'nonveg', emoji:'' };
  return { type:'veg', emoji:'' };
}
function getBadges(n) {
  const l = n.toLowerCase(), b = [];
  if (KW.salad.some(k => l.includes(k)))   b.push({ cls:'badge-salad',   txt:'Salad' });
  if (KW.dessert.some(k => l.includes(k))) b.push({ cls:'badge-dessert', txt:'Dessert' });
  return b;
}

// ── RATINGS HELPERS ──────────────────────────────────
function foodKey(n) { return n.trim().toUpperCase().replace(/\s+/g,'_'); }

function getAvgRating(itemName, reviewsData) {
  const key = foodKey(itemName);
  const r = reviewsData[key];
  if (!r || !r.ratings || !r.ratings.length) return { avg:0, count:0 };
  const avg = r.ratings.reduce((s,x) => s+x.value, 0) / r.ratings.length;
  return { avg: Math.round(avg*10)/10, count: r.ratings.length };
}

function getUserRating(itemName, reviewsData) {
  if (!currentUser) return null;
  const key = foodKey(itemName), r = reviewsData[key];
  if (!r || !r.ratings) return null;
  return r.ratings.find(x => x.email === currentUser.email) || null;
}

function isTrending(itemName, reviewsData) {
  const key = foodKey(itemName), r = reviewsData[key];
  if (!r?.ratings) return false;
  const cutoff = Date.now() - 7*24*60*60*1000;
  return r.ratings.filter(x => x.ts && x.ts > cutoff).length >= 3;
}

// ── STARS HTML ────────────────────────────────────────
function starsHTML(val, size=12) {
  let h = '';
  for (let i=1; i<=5; i++) {
    if (val>=i) h += `<span style="font-size:${size}px;color:var(--star)">★</span>`;
    else if (val>=i-0.5) h += `<span style="font-size:${size}px;background:linear-gradient(90deg,var(--star) 50%,var(--star-bg) 50%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;">★</span>`;
    else h += `<span style="font-size:${size}px;color:var(--star-bg)">★</span>`;
  }
  return h;
}

// ── CSV PARSE ─────────────────────────────────────────
function parseCSV(text) {
  function splitRow(line) {
    const cols=[]; let cur=''; let q=false;
    for (const ch of line) { if(ch==='"'){q=!q;}else if(ch===','&&!q){cols.push(cur.trim());cur='';}else cur+=ch; }
    cols.push(cur.trim()); return cols;
  }
  const rows = text.split('\n').map(splitRow);
  const updateTime = rows[0]?.[0] || '';
  const headerRow = rows[2] || [];
  const dayNames = [];
  for (let c=1; c<=7; c++) dayNames.push(headerRow[c]||`Day ${c}`);
  const days = Array.from({length:7}, () => ({BREAKFAST:[],LUNCH:[],DINNER:[]}));
  let section = null;
  for (let r=3; r<rows.length; r++) {
    const row=rows[r], colA=(row[0]||'').trim().toUpperCase();
    if(['BREAKFAST','LUNCH','DINNER'].includes(colA)){section=colA;continue;}
    if(colA==='SWEET'||colA==='NONVEG'){section=colA;continue;}
    if(!section) continue;
    const target=(section==='SWEET'||section==='NONVEG')?'DINNER':section;
    for(let c=0;c<7;c++){const val=(row[c+1]||'').trim();if(val)days[c][target].push(val);}
  }
  return {updateTime,dayNames,days};
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

let appData=null, activeDay=0, reviewActiveDay=0;
let currentRankFilter='all', currentTimeFilter='all';
let _reviewsCache=null; // in-page cache only (cleared on reload)

// ── IST TIME ──────────────────────────────────────────
function nowIST() {
  const d=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Kolkata'}));
  return {year:d.getFullYear(),month:d.getMonth(),day:d.getDate(),hour:d.getHours(),minute:d.getMinutes(),ts:d};
}
function todayIdx(dayNames) {
  const ist=nowIST(), dd=ist.day;
  for(let i=0;i<dayNames.length;i++){const m=dayNames[i].match(/^(\d+)\./);if(m&&parseInt(m[1])===dd)return i;}
  const d=ist.ts.getDay(); return d===0?6:d-1;
}
function shortLabel(raw) {
  const m=raw.match(/(\d+)\.\w+\.\d+\s*\((\w+)\)/);
  return m ? m[2].slice(0,3)+' '+m[1] : raw.slice(0,10);
}

// ── SHEET PUSH ────────────────────────────────────────
async function pushReviewToSheet(data) {
  await sheetPost({ action:'addReview', ...data });
}
async function pushAnonReviewToSheet(data) {
  await sheetPost({ action:'addAnonReview', ...data });
}

// ── MENU PAGE ─────────────────────────────────────────
function buildItem(name, reviewsData) {
  const c=classify(name), bb=getBadges(name), {avg,count}=getAvgRating(name,reviewsData);
  const trending=isTrending(name,reviewsData);
  const displayName=c.emoji?c.emoji+' '+name:name;
  const key=foodKey(name);
  const trendBadge=trending?'<span class="badge badge-trending">🔥</span>':'';
  const badgesHTML=bb.length?'<div class="badges">'+bb.map(b=>`<span class="badge ${b.cls}">${b.txt}</span>`).join('')+'</div>':'';
  const ratingHTML=avg>0?`<div class="item-rating-inline" title="${avg}/5 from ${count} ratings"><span class="star-icon">★</span><span class="star-val">${avg}</span><span class="count">(${count})</span></div>`:'';
  const row=document.createElement('div');
  row.className='item-row '+c.type;
  row.innerHTML=`<div class="item-inner"><div class="item-name-row"><span class="item-name">${displayName}</span>${trendBadge}${ratingHTML}</div>${badgesHTML}</div>`;
  return row;
}

function buildCol(meal, items, reviewsData) {
  const labels={BREAKFAST:'Breakfast',LUNCH:'Lunch',DINNER:'Dinner'};
  const timings={BREAKFAST:'8:00–10:00 AM',LUNCH:'12:30–2:30 PM',DINNER:'8:00–10:00 PM'};
  const valid=items.filter(i=>i&&i.trim());
  const col=document.createElement('div'); col.className='meal-card';
  col.innerHTML=`
    <div class="meal-header">
      <span class="meal-title">${labels[meal]}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="meal-count">${valid.length} items</span>
        <a href="reviews.html" style="background:var(--accent2);color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:700;cursor:pointer;text-decoration:none;">⭐ Review</a>
      </div>
    </div>
    <div class="meal-timing"><span class="meal-timing-label">🕐 ${timings[meal]}</span></div>
    <div class="items-list" id="il-${meal}"></div>`;
  const list=col.querySelector('.items-list');
  if (!valid.length) list.innerHTML='<div class="empty-state">No items listed</div>';
  else valid.forEach(item => list.appendChild(buildItem(item,reviewsData)));
  return col;
}

function renderMenuDay(dayData, reviewsData) {
  const grid=document.getElementById('menu-grid'); if(!grid) return;
  grid.innerHTML='';
  ['BREAKFAST','LUNCH','DINNER'].forEach(m => grid.appendChild(buildCol(m,dayData[m]||[],reviewsData)));
}

function setMenuDay(idx, reviewsData) {
  activeDay=idx;
  document.querySelectorAll('#day-nav .day-btn').forEach((b,i)=>b.classList.toggle('active',i===idx));
  if (appData) renderMenuDay(appData.days[idx], reviewsData||{});
}

function buildMenuNav(dayNames, reviewsData) {
  const nav=document.getElementById('day-nav'); if(!nav) return;
  nav.innerHTML='';
  dayNames.forEach((n,i)=>{
    const b=document.createElement('button');
    b.className='day-btn'; b.textContent=shortLabel(n); b.onclick=()=>setMenuDay(i,reviewsData);
    nav.appendChild(b);
  });
}

async function initMenuPage() {
  let csv=(typeof SHEET_CSV_URL!=='undefined'&&SHEET_CSV_URL)
    ? await fetch(SHEET_CSV_URL).then(r=>r.text()).catch(()=>null) : null;
  if (!csv) csv=DEMO;
  appData=parseCSV(csv);
  const timeEl=document.getElementById('update-time');
  if (timeEl) timeEl.textContent='Week of '+(appData.updateTime||'April 2026');

  // Fetch reviews from sheet
  let reviewsData={};
  try {
    const rv=await fetchReviews();
    if(rv.status==='ok') reviewsData=rv.reviews;
  } catch(e){}
  _reviewsCache=reviewsData;

  buildMenuNav(appData.dayNames, reviewsData);
  const ti=Math.min(todayIdx(appData.dayNames),appData.days.length-1);
  setMenuDay(ti, reviewsData);
}

// ── REVIEW PAGE ──────────────────────────────────────
function buildReviewDayNav(dayNames) {
  const nav=document.getElementById('review-day-nav'); if(!nav) return;
  nav.innerHTML='';
  dayNames.forEach((n,i)=>{
    const b=document.createElement('button');
    b.className='review-day-btn'+(i===reviewActiveDay?' active':'');
    b.textContent=shortLabel(n);
    b.onclick=()=>{ reviewActiveDay=i; buildReviewDay(_reviewsCache||{}); buildReviewDayNav(dayNames); };
    nav.appendChild(b);
  });
}

function buildReviewDay(reviewsData) {
  const content=document.getElementById('review-content'); if(!content) return;
  content.innerHTML='';
  const day=appData.days[reviewActiveDay];
  ['BREAKFAST','LUNCH','DINNER'].forEach(meal=>{
    const items=(day[meal]||[]).filter(i=>i&&i.trim()); if(!items.length) return;
    const sec=document.createElement('div'); sec.className='meal-review-section';
    const mealLabel=meal.charAt(0)+meal.slice(1).toLowerCase();
    const timings={BREAKFAST:'8:00–10:00 AM',LUNCH:'12:30–2:30 PM',DINNER:'8:00–10:00 PM'};
    sec.innerHTML=`<div class="meal-review-title">${mealLabel} <span style="font-size:11px;color:var(--muted);font-weight:400;">🕐 ${timings[meal]}</span></div>`;

    if (!currentUser) {
      const gate=document.createElement('div'); gate.className='login-gate';
      gate.innerHTML=`<p>Log in to rate ${mealLabel} dishes</p>
        <a href="login.html">Log In</a> · <a href="login.html#signup">Sign Up</a>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
          <a href="anon-login.html" style="display:inline-block;background:rgba(124,92,191,0.1);color:var(--accent2);border:1px solid rgba(124,92,191,0.25);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:700;text-decoration:none;">🕵️ Review Anonymously</a>
        </div>`;
      sec.appendChild(gate);
      const grid=document.createElement('div'); grid.className='food-review-grid';
      items.forEach(item=>grid.appendChild(buildFoodRatingDisplay(item,reviewsData)));
      sec.appendChild(grid);
      content.appendChild(sec); return;
    }

    const anonBar=currentUser.isAnon?`<div class="anon-session-bar" style="margin-bottom:12px;">🕵️ Reviewing as <strong>${currentUser.codeName}</strong></div>`:'';
    const batchId='batch-'+meal;

    const itemRowsHTML=items.map(item=>{
      const key=foodKey(item);
      const userRating=getUserRating(item,reviewsData);
      const existingVal=userRating?userRating.value:0;
      const rData=reviewsData[key];
      const existingCmt=(rData?.comments?.find(c=>c.email===currentUser.email)||{}).comment||'';
      const stars=[1,2,3,4,5].map(i=>`<span class="frc-star${existingVal>=i?' filled':''}" onclick="starClick('${key}',${i})" onmouseover="starHover('${key}',${i})" onmouseout="starOut('${key}')">★</span>`).join('');
      const c=classify(item), displayName=c.emoji?c.emoji+' '+item:item;
      return `<div class="batch-item-row" data-key="${key}" data-item="${item.replace(/"/g,'&quot;')}" data-meal="${meal}" data-val="${existingVal}">
        <div class="batch-item-name">${displayName}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <div class="frc-stars" id="frc-stars-${key}">${stars}</div>
          <input class="frc-decimal-inp" type="number" min="0" max="5" step="0.1" id="frc-dec-${key}" value="${existingVal||''}" oninput="decimalUpdate('${key}',this.value)" placeholder="4.2">
          ${userRating?`<span style="font-size:11px;color:var(--green);font-weight:700;">✓ Rated ${existingVal}/5</span>`:''}
        </div>
        <textarea class="frc-comment-inp batch-cmt" id="frc-cmt-${key}" placeholder="Comment on ${item} (optional)…" rows="2">${existingCmt}</textarea>
      </div>`;
    }).join('');

    const batchWrap=document.createElement('div'); batchWrap.className='batch-review-wrap'; batchWrap.id=batchId;
    batchWrap.innerHTML=`${anonBar}
      <div class="batch-items">${itemRowsHTML}</div>
      <button class="batch-submit-btn" onclick="submitBatchRating('${meal}','${batchId}')">⭐ Submit ${mealLabel} Ratings</button>
      <div class="batch-submit-done" id="done-${batchId}"></div>`;
    sec.appendChild(batchWrap);

    // Existing comments
    const cmtSec=document.createElement('div'); cmtSec.className='food-review-grid'; cmtSec.style.marginTop='12px';
    items.forEach(item=>{
      const key=foodKey(item), rData=reviewsData[key];
      const allComments=(rData?.comments||[]);
      if(!allComments.length) return;
      const card=document.createElement('div'); card.className='food-review-card';
      const cmtItems=allComments.map(c=>{
        const isAnon=c.email.startsWith('anon::');
        return `<div class="review-entry">
          <div class="re-header"><span class="re-name">${isAnon?'🕵️ ':''}${c.name.split(' ')[0]}</span>${starsHTML(c.value,11)}<span class="re-val">${c.value.toFixed(1)}</span><span class="re-date">${c.date}</span></div>
          <div class="re-comment">"${c.comment}"</div>
        </div>`;
      }).join('');
      card.innerHTML=`<div class="frc-name" style="margin-bottom:6px;">${item}</div>${cmtItems}`;
      cmtSec.appendChild(card);
    });
    if(cmtSec.children.length) sec.appendChild(cmtSec);
    content.appendChild(sec);
  });
}

function buildFoodRatingDisplay(itemName, reviewsData) {
  const card=document.createElement('div'); card.className='food-review-card';
  const {avg,count}=getAvgRating(itemName,reviewsData);
  const key=foodKey(itemName), rData=reviewsData[key];
  const allComments=rData?.comments||[];
  const avgStarsHTML=starsHTML(avg,14);
  let cmtHTML='';
  if(allComments.length){
    const items=allComments.map(c=>{
      const isAnon=c.email.startsWith('anon::');
      return `<div class="review-entry">
        <div class="re-header"><span class="re-name">${isAnon?'🕵️ ':''}${c.name.split(' ')[0]}</span>${starsHTML(c.value,11)}<span class="re-val">${c.value.toFixed(1)}</span><span class="re-date">${c.date}</span></div>
        <div class="re-comment">"${c.comment}"</div></div>`;
    }).join('');
    cmtHTML=`<button class="frc-reviews-toggle" onclick="toggleReviews('${key}')">💬 ${allComments.length} comment${allComments.length!==1?'s':''}</button>
      <div class="frc-reviews-list" id="rcl-${key}">${items}</div>`;
  }
  card.innerHTML=`<div class="frc-name">${itemName}</div>
    <div class="frc-avg">${avgStarsHTML}<span class="frc-avg-val" style="margin-left:6px;">${avg>0?avg.toFixed(1):'—'}</span><span class="frc-count">(${count} rating${count!==1?'s':''})</span></div>
    ${cmtHTML}`;
  return card;
}

async function submitBatchRating(meal, batchId) {
  const wrap=document.getElementById(batchId); if(!wrap) return;
  const rows=wrap.querySelectorAll('.batch-item-row');
  let submitted=0, skipped=0;
  const reviewDate=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
  for (const row of rows) {
    const key=row.dataset.key, itemName=row.dataset.item;
    const val=parseFloat(document.getElementById('frc-dec-'+key)?.value)||parseFloat(row.dataset.val)||0;
    const cmt=document.getElementById('frc-cmt-'+key)?.value||'';
    if (!val) { skipped++; continue; }
    const displayName=currentUser.isAnon?currentUser.codeName:currentUser.name;
    const payload={displayName,email:currentUser.email,foodItem:itemName,meal,rating:val,comment:cmt.trim(),isAnon:currentUser.isAnon||false,date:reviewDate};
    if (currentUser.isAnon) {
      const rawEmail=currentUser.email.replace('anon::','');
      await pushAnonReviewToSheet({...payload,codeName:displayName,encEmail:obfuscate(rawEmail),userEmail:currentUser.email});
    } else {
      await pushReviewToSheet(payload);
    }
    submitted++;
  }
  const doneEl=document.getElementById('done-'+batchId);
  if(doneEl){
    if(submitted>0){doneEl.textContent=`✓ Submitted ${submitted} rating${submitted!==1?'s':''}!${skipped>0?' ('+skipped+' skipped)':''}`;doneEl.style.color='var(--green)';}
    else{doneEl.textContent='Please select at least one star rating.';doneEl.style.color='var(--red)';}
    doneEl.style.display='block';
    if(submitted>0) showToast(`✅ ${submitted} rating${submitted!==1?'s':''} saved for ${meal.charAt(0)+meal.slice(1).toLowerCase()}!`);
  }
}

function starClick(key,i){const inp=document.getElementById('frc-dec-'+key);if(inp)inp.value=i;updateStarDisplay(key,i);const row=document.querySelector('[data-key="'+key+'"]');if(row)row.dataset.val=String(i);}
function starHover(key,i){document.querySelectorAll('#frc-stars-'+key+' .frc-star').forEach((s,idx)=>s.classList.toggle('filled',idx<i));}
function starOut(key){const row=document.querySelector('[data-key="'+key+'"]');updateStarDisplay(key,row?parseFloat(row.dataset.val):0);}
function updateStarDisplay(key,val){document.querySelectorAll('#frc-stars-'+key+' .frc-star').forEach((s,idx)=>s.classList.toggle('filled',idx+1<=val));}
function decimalUpdate(key,val){const v=Math.min(5,Math.max(0,parseFloat(val)||0));updateStarDisplay(key,v);const row=document.querySelector('[data-key="'+key+'"]');if(row)row.dataset.val=String(v);}
function toggleReviews(key){const list=document.getElementById('rcl-'+key);if(list)list.classList.toggle('open');}

async function initReviewPage() {
  let csv=(typeof SHEET_CSV_URL!=='undefined'&&SHEET_CSV_URL)
    ? await fetch(SHEET_CSV_URL).then(r=>r.text()).catch(()=>null):null;
  if(!csv) csv=DEMO;
  appData=parseCSV(csv);
  const ti=Math.min(todayIdx(appData.dayNames),appData.days.length-1);
  reviewActiveDay=ti;

  let reviewsData={};
  try {
    const rv=await fetchReviews();
    if(rv.status==='ok') reviewsData=rv.reviews;
  } catch(e){}
  _reviewsCache=reviewsData;

  buildReviewDayNav(appData.dayNames);
  buildReviewDay(reviewsData);
}

// ── RANKING PAGE ──────────────────────────────────────
function setRankFilter(btn,filter){document.querySelectorAll('.rank-filter-btn:not(.time-filter-btn)').forEach(b=>b.classList.remove('active'));btn.classList.add('active');currentRankFilter=filter;renderRanking(_reviewsCache||{});}
function setTimeFilter(btn,filter){document.querySelectorAll('.time-filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');currentTimeFilter=filter;renderRanking(_reviewsCache||{});}

function renderRanking(reviewsData) {
  const list=document.getElementById('ranking-list'); if(!list) return;
  let items=Object.values(reviewsData).filter(r=>r.ratings?.length);
  if(currentRankFilter!=='all') items=items.filter(r=>r.meal===currentRankFilter);
  if(currentTimeFilter!=='all'){
    const cutoff=Date.now()-(currentTimeFilter==='week'?7:30)*86400000;
    items=items.map(r=>({...r,ratings:r.ratings.filter(rt=>rt.ts&&rt.ts>cutoff)})).filter(r=>r.ratings.length);
  }
  items.sort((a,b)=>{
    const avgA=a.ratings.reduce((s,r)=>s+r.value,0)/a.ratings.length;
    const avgB=b.ratings.reduce((s,r)=>s+r.value,0)/b.ratings.length;
    return avgB-avgA;
  });
  if(!items.length){list.innerHTML='<div class="state-box">No ratings yet for this filter.</div>';return;}
  list.innerHTML='';
  items.slice(0,20).forEach((item,idx)=>{
    const avg=item.ratings.reduce((s,r)=>s+r.value,0)/item.ratings.length;
    const medals=['gold','silver','bronze'], posClass=idx<3?medals[idx]:'other';
    const posText=idx<3?['🥇','🥈','🥉'][idx]:(idx+1);
    const comments=item.comments||[];
    const cmtsHTML=comments.map(c=>{
      const isAnon=c.email.startsWith('anon::');
      return `<div class="rc-entry"><div class="rc-avatar">${isAnon?'🕵':c.name[0]}</div>
        <div style="flex:1;"><div class="rc-name">${isAnon?'🕵️ ':''}${c.name.split(' ')[0]}</div>
        <div class="rc-comment">"${c.comment}"</div></div>
        <div class="rc-val">${c.value.toFixed(1)}★</div><div class="rc-date">${c.date}</div></div>`;
    }).join('');
    const el=document.createElement('div'); el.className='rank-item';
    el.innerHTML=`
      <div class="rank-pos ${posClass}">${posText}</div>
      <div class="rank-info">
        <div class="rank-name">${item.itemName}</div>
        <div class="rank-meta">
          <span class="rm-tag">${item.meal?item.meal.charAt(0)+item.meal.slice(1).toLowerCase():'Mixed'}</span>
          <span>${item.ratings.length} rating${item.ratings.length!==1?'s':''}</span>
          ${comments.length?`<button class="rank-comments-toggle" onclick="toggleRankComments('rcc-${idx}')">💬 ${comments.length} comment${comments.length!==1?'s':''}</button>`:''}
        </div>
        <div class="rank-stars-row">${starsHTML(avg,13)}</div>
        ${comments.length?`<div class="rank-comments" id="rcc-${idx}">${cmtsHTML}</div>`:''}
      </div>
      <div class="rank-score-wrap">
        <div class="rank-score">${avg.toFixed(1)}</div>
        <div class="rank-score-label">/ 5.0</div>
      </div>`;
    list.appendChild(el);
  });
}

function toggleRankComments(id){const el=document.getElementById(id);if(el)el.classList.toggle('open');}

async function initRankingPage() {
  const list=document.getElementById('ranking-list');
  list.innerHTML='<div class="state-box"><div class="spinner"></div><span>Loading rankings…</span></div>';
  let reviewsData={};
  try {
    const rv=await fetchReviews();
    if(rv.status==='ok') reviewsData=rv.reviews;
  } catch(e){}
  _reviewsCache=reviewsData;
  renderRanking(reviewsData);
}
