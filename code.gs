/**
 * ═══════════════════════════════════════════════════════════════════
 *  NISER MESS PORTAL — code.gs  (Google Apps Script)  v6
 *  Spreadsheet ID: 1utHhJJYewerK99XcD2LJPSuxRz5Q65mNadJI_4bTZbo
 *
 *  SHEETS:
 *   Sheet1  → "Reviews"        — Public food reviews (regular + anon)
 *   Sheet2  → "Users"          — Registered user credentials
 *   Sheet3  → "AnonUsers"      — Anonymous user registry (obfuscated)
 *   Sheet4  → "AnonReviews"    — Anonymous review submissions
 *   Sheet5  → "Complaints"     — Mess complaints with photo URLs
 *   Sheet6  → "PollVotes"      — User poll votes (community + official)
 *   Sheet7  → "Updates"        — Admin-posted updates/notifications
 *   Sheet8  → "OfficialPolls"  — Admin-created official polls (NEW)
 *   Sheet9  → "UserPolls"      — Student-created community polls
 *   Sheet10 → "UserPollVotes"  — Votes cast on student polls
 *   Sheet11 → "FoodPolls"      — Admin-created food item polls (NEW)
 *
 *  SETUP (one-time):
 *   1. Open Spreadsheet → Extensions → Apps Script
 *   2. Paste this file (replace ALL existing code) → Save
 *   3. Select function setupSheets → Click Run → Grant permissions
 *   4. Deploy → Manage Deployments → New Deployment
 *        Type: Web App | Execute as: Me | Who has access: Anyone
 *   5. Copy the /exec URL → paste into every HTML page as APPS_SCRIPT_URL
 *
 *  COLUMNS:
 *   Reviews       → Display Name | Food Item | Meal | Rating | Comment | Date | Timestamp | Is Anonymous
 *   Users         → Full Name | Email | Mobile | Programme | Transaction ID | Ref No. | Joined At | Password Hash
 *   AnonUsers     → Code Name | Enc. Name | Enc. Roll No. | Enc. Email | Programme | Joined At | Pass Hash
 *   AnonReviews   → Code Name | Enc. Email | Food Item | Meal | Rating | Comment | Date | Timestamp
 *   Complaints    → Type | Title | Description | Name | Email | Photos | Status | Admin Note | Date | Timestamp | User Email
 *   PollVotes     → Poll ID | Poll Type | Option Index | Voter Key | Date | Timestamp
 *   Updates       → Type | Title | Body | Related Complaint | Posted By | Date | Timestamp
 *   OfficialPolls → Poll ID | Question | Description | Options | Min Votes | Expires At | Active | Created At
 *   UserPolls     → Poll ID | Question | Description | Options | Created By | Created By Email | Min Votes | Expires At | Active | Created At
 *   UserPollVotes → Poll ID | Question | Option Text | Option Index | Voter Key | Date
 *   FoodPolls     → Poll ID | Food Item | Question | Options | Min Votes | Expires At | Active | Created At
 * ═══════════════════════════════════════════════════════════════════
 */

const SPREADSHEET_ID = '1utHhJJYewerK99XcD2LJPSuxRz5Q65mNadJI_4bTZbo';

const SH = {
  REVIEWS:          'Reviews',
  USERS:            'Users',
  ANON_USERS:       'AnonUsers',
  ANON_REVIEWS:     'AnonReviews',
  COMPLAINTS:       'Complaints',
  POLL_VOTES:       'PollVotes',
  UPDATES:          'Updates',
  OFFICIAL_POLLS:   'OfficialPolls',
  USER_POLLS:       'UserPolls',
  USER_POLL_VOTES:  'UserPollVotes',
  FOOD_POLLS:       'FoodPolls',
};

// ─────────────────────────────────────────────────────────────────
//  ONE-TIME SETUP — run manually once from Apps Script editor
// ─────────────────────────────────────────────────────────────────
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const s1 = getOrCreate(ss, SH.REVIEWS, 0);
  s1.clearContents();
  writeHeader(s1, ['Display Name','Food Item','Meal','Rating (0-5)','Comment','Date','Timestamp','Is Anonymous']);
  styleHeader(s1, '#1a1917', '#ffffff'); s1.setFrozenRows(1);

  const s2 = getOrCreate(ss, SH.USERS, 1);
  s2.clearContents();
  writeHeader(s2, ['Full Name','Email','Mobile','Programme','Transaction ID','Ref No.','Joined At','Password Hash']);
  styleHeader(s2, '#2e3830', '#ffffff'); s2.setFrozenRows(1);

  const s3 = getOrCreate(ss, SH.ANON_USERS, 2);
  s3.clearContents();
  writeHeader(s3, ['Code Name','Enc. Name','Enc. Roll No.','Enc. Email','Programme','Joined At','Pass Hash']);
  styleHeader(s3, '#4a1942', '#ffffff'); s3.setFrozenRows(1);

  const s4 = getOrCreate(ss, SH.ANON_REVIEWS, 3);
  s4.clearContents();
  writeHeader(s4, ['Code Name','Enc. Email','Food Item','Meal','Rating','Comment','Date','Timestamp']);
  styleHeader(s4, '#3a2060', '#ffffff'); s4.setFrozenRows(1);

  const s5 = getOrCreate(ss, SH.COMPLAINTS, 4);
  s5.clearContents();
  writeHeader(s5, ['Type','Title','Description','Name','Email','Photo URLs','Status','Admin Note','Date','Timestamp','User Email']);
  styleHeader(s5, '#7a2020', '#ffffff'); s5.setFrozenRows(1);

  const s6 = getOrCreate(ss, SH.POLL_VOTES, 5);
  s6.clearContents();
  writeHeader(s6, ['Poll ID','Poll Type (user/official/food)','Option Index','Voter Key','Date','Timestamp']);
  styleHeader(s6, '#1a4060', '#ffffff'); s6.setFrozenRows(1);

  const s7 = getOrCreate(ss, SH.UPDATES, 6);
  s7.clearContents();
  writeHeader(s7, ['Type','Title','Body','Related Complaint ID','Posted By','Date','Timestamp']);
  styleHeader(s7, '#1a3020', '#ffffff'); s7.setFrozenRows(1);

  const s8 = getOrCreate(ss, SH.OFFICIAL_POLLS, 7);
  s8.clearContents();
  writeHeader(s8, ['Poll ID','Question','Description','Options (pipe-sep)','Min Votes Required','Expires At','Active','Created At']);
  styleHeader(s8, '#2a3060', '#ffffff'); s8.setFrozenRows(1);

  const s9 = getOrCreate(ss, SH.USER_POLLS, 8);
  s9.clearContents();
  writeHeader(s9, ['Poll ID','Question','Description','Options (pipe-sep)','Created By','Created By Email','Min Votes Required','Expires At','Active','Created At']);
  styleHeader(s9, '#403010', '#ffffff'); s9.setFrozenRows(1);

  const s10 = getOrCreate(ss, SH.USER_POLL_VOTES, 9);
  s10.clearContents();
  writeHeader(s10, ['Poll ID','Question','Option Text','Option Index','Voter Key','Date']);
  styleHeader(s10, '#301840', '#ffffff'); s10.setFrozenRows(1);

  const s11 = getOrCreate(ss, SH.FOOD_POLLS, 10);
  s11.clearContents();
  writeHeader(s11, ['Poll ID','Food Item','Question','Options (pipe-sep)','Min Votes Required','Expires At','Active','Created At']);
  styleHeader(s11, '#1a4040', '#ffffff'); s11.setFrozenRows(1);

  Logger.log('✅ All 11 sheets created and formatted successfully.');
}

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────
function getOrCreate(ss, name, position) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name, position);
  return sheet;
}
function writeHeader(sheet, cols) {
  sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
}
function styleHeader(sheet, bg, fg) {
  const lastCol = sheet.getLastColumn() || 12;
  sheet.getRange(1, 1, 1, lastCol).setBackground(bg).setFontColor(fg);
}
function sheetToObjects(sheet, keyMap) {
  // keyMap: array of field names matching column order (index 0 = col A)
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(row => {
    const obj = {};
    keyMap.forEach((k, i) => { obj[k] = row[i] !== undefined ? String(row[i]) : ''; });
    return obj;
  }).filter(o => Object.values(o).some(v => v !== ''));
}
function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────
//  WEB APP ENTRY POINTS
// ─────────────────────────────────────────────────────────────────
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(12000);
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = {};
    switch (action) {
      case 'addReview':          addReview(data);                   break;
      case 'addUser':            addUser(data);                     break;
      case 'addAnonUser':        addAnonUser(data);                 break;
      case 'addAnonReview':      addAnonReview(data);               break;
      case 'addComplaint':       addComplaint(data);                break;
      case 'addPollVote':        addPollVote(data);                 break;
      case 'addUpdate':          addUpdate(data);                   break;
      case 'addOfficialPoll':    addOfficialPoll(data);             break;
      case 'updateOfficialPoll': updateOfficialPoll(data);          break;
      case 'addUserPoll':        addUserPoll(data);                 break;
      case 'updateUserPoll':     updateUserPoll(data);              break;
      case 'addUserPollVote':    addUserPollVote(data);             break;
      case 'addFoodPoll':        addFoodPoll(data);                 break;
      case 'updateFoodPoll':     updateFoodPoll(data);              break;
      case 'updateComplaint':    updateComplaint(data);             break;
      case 'changeUserPassword':   result = changeUserPassword(data);   break;
      case 'changeAnonPassword':   result = changeAnonPassword(data);   break;
      default: Logger.log('Unknown action: ' + action);
    }
    return respond({ status: 'ok', ...result });
  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    return respond({ status: 'error', message: err.message });
  } finally {
    lock.releaseLock();
  }
}

// doGet — returns public data for a requested resource
// Usage: APPS_SCRIPT_URL + '?resource=complaints'  (etc.)
function doGet(e) {
  const resource = (e && e.parameter && e.parameter.resource) || '';
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  try {
    switch (resource) {
      case 'reviews': {
        const sheet = ss.getSheetByName(SH.REVIEWS);
        if (!sheet) return respond({ status: 'ok', data: [] });
        const rows = sheetToObjects(sheet, ['displayName','foodItem','meal','rating','comment','date','timestamp','isAnon']);
        return respond({ status: 'ok', data: rows });
      }
      case 'complaints': {
        const sheet = ss.getSheetByName(SH.COMPLAINTS);
        if (!sheet) return respond({ status: 'ok', data: [] });
        const rows = sheetToObjects(sheet, ['type','title','desc','name','email','photos','status','adminNote','date','timestamp','userEmail']);
        return respond({ status: 'ok', data: rows });
      }
      case 'updates': {
        const sheet = ss.getSheetByName(SH.UPDATES);
        if (!sheet) return respond({ status: 'ok', data: [] });
        const rows = sheetToObjects(sheet, ['type','title','body','relatedComplaint','postedBy','date','timestamp']);
        return respond({ status: 'ok', data: rows });
      }
      case 'userPolls': {
        const sheet = ss.getSheetByName(SH.USER_POLLS);
        if (!sheet) return respond({ status: 'ok', data: [] });
        const rows = sheetToObjects(sheet, ['id','question','desc','options','createdBy','createdByEmail','minVotes','expiresAt','active','createdAt']);
        // Parse options back from pipe-separated
        rows.forEach(r => {
          r.options = r.options ? r.options.split('|').filter(Boolean) : [];
          r.active  = r.active === 'TRUE' || r.active === 'true' || r.active === '1';
          r.minVotes = r.minVotes ? parseInt(r.minVotes) || 0 : 0;
          r.expiresAt = r.expiresAt ? new Date(r.expiresAt).getTime() || null : null;
          r.type = 'user';
        });
        return respond({ status: 'ok', data: rows });
      }
      case 'userPollVotes': {
        const sheet = ss.getSheetByName(SH.USER_POLL_VOTES);
        if (!sheet) return respond({ status: 'ok', data: [] });
        const rows = sheetToObjects(sheet, ['pollId','question','option','optIdx','voterKey','date']);
        return respond({ status: 'ok', data: rows });
      }
      case 'officialPolls': {
        const sheet = ss.getSheetByName(SH.OFFICIAL_POLLS);
        if (!sheet) return respond({ status: 'ok', data: [] });
        const rows = sheetToObjects(sheet, ['id','question','desc','options','minVotes','expiresAt','active','createdAt']);
        rows.forEach(r => {
          r.options  = r.options ? r.options.split('|').filter(Boolean) : [];
          r.active   = r.active === 'TRUE' || r.active === 'true' || r.active === '1';
          r.minVotes = r.minVotes ? parseInt(r.minVotes) || 0 : 0;
          r.expiresAt = r.expiresAt ? new Date(r.expiresAt).getTime() || null : null;
        });
        return respond({ status: 'ok', data: rows });
      }
      case 'pollVotes': {
        const sheet = ss.getSheetByName(SH.POLL_VOTES);
        if (!sheet) return respond({ status: 'ok', data: [] });
        const rows = sheetToObjects(sheet, ['pollId','pollType','optIdx','voterKey','date','timestamp']);
        return respond({ status: 'ok', data: rows });
      }
      case 'foodPolls': {
        const sheet = ss.getSheetByName(SH.FOOD_POLLS);
        if (!sheet) return respond({ status: 'ok', data: [] });
        const rows = sheetToObjects(sheet, ['id','foodItem','question','options','minVotes','expiresAt','active','createdAt']);
        rows.forEach(r => {
          r.options  = r.options ? r.options.split('|').filter(Boolean) : [];
          r.active   = r.active === 'TRUE' || r.active === 'true' || r.active === '1';
          r.minVotes = r.minVotes ? parseInt(r.minVotes) || 0 : 0;
          r.expiresAt = r.expiresAt ? new Date(r.expiresAt).getTime() || null : null;
        });
        return respond({ status: 'ok', data: rows });
      }
      default:
        return respond({ status: 'ok', message: 'NISER Mess Portal API v6 is running.' });
    }
  } catch(err) {
    Logger.log('doGet error: ' + err.message);
    return respond({ status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────
//  ADD PUBLIC REVIEW → Sheet 1
// ─────────────────────────────────────────────────────────────────
function addReview(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.REVIEWS, 0);
  const now   = new Date();
  sheet.appendRow([
    data.displayName || '',
    data.foodItem    || '',
    data.meal        || '',
    data.rating      || '',
    data.comment     || '',
    data.date        || Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM-yyyy'),
    now.toISOString(),
    data.isAnon ? 'Yes' : 'No',
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD USER → Sheet 2
// ─────────────────────────────────────────────────────────────────
function addUser(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.USERS, 1);
  const now   = new Date();
  sheet.appendRow([
    data.name      || '',
    data.email     || '',
    data.mobile    || '',
    data.programme || '',
    data.txn       || '',
    data.ref       || '',
    data.joinedAt  || now.toISOString(),
    data.passHash  || '',
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD ANON USER → Sheet 3
// ─────────────────────────────────────────────────────────────────
function addAnonUser(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.ANON_USERS, 2);
  sheet.appendRow([
    data.codeName  || '',
    data.encName   || '',
    data.encRoll   || '',
    data.encEmail  || '',
    data.programme || '',
    data.joinedAt  || new Date().toISOString(),
    data.passHash  || '',
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD ANON REVIEW → Sheet 4
// ─────────────────────────────────────────────────────────────────
function addAnonReview(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.ANON_REVIEWS, 3);
  const now   = new Date();
  sheet.appendRow([
    data.codeName || '',
    data.encEmail || '',
    data.foodItem || '',
    data.meal     || '',
    data.rating   || '',
    data.comment  || '',
    data.date     || Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM-yyyy'),
    now.toISOString(),
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD COMPLAINT → Sheet 5
// ─────────────────────────────────────────────────────────────────
function addComplaint(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.COMPLAINTS, 4);
  const now   = new Date();
  sheet.appendRow([
    data.type      || '',
    data.title     || '',
    data.desc      || '',
    data.name      || 'Anonymous',
    data.email     || '',
    data.photos    || '',
    data.status    || 'open',
    '',              // Admin Note — blank initially
    data.date      || Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM-yyyy'),
    now.toISOString(),
    data.userEmail || '',
  ]);
}

// Update complaint status/note by ID (ts-based)
function updateComplaint(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SH.COMPLAINTS);
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  // col index: 0=type,1=title,2=desc,3=name,4=email,5=photos,6=status,7=adminNote,8=date,9=timestamp,10=userEmail
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][9]) === String(data.timestamp) || String(rows[i][1]) === String(data.title)) {
      if (data.status    !== undefined) sheet.getRange(i+1, 7).setValue(data.status);
      if (data.adminNote !== undefined) sheet.getRange(i+1, 8).setValue(data.adminNote);
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  ADD POLL VOTE → Sheet 6 (unified for all poll types)
// ─────────────────────────────────────────────────────────────────
function addPollVote(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.POLL_VOTES, 5);
  const now   = new Date();
  sheet.appendRow([
    data.pollId    || '',
    data.pollType  || 'user',  // 'user' | 'official' | 'food'
    data.optIdx    !== undefined ? data.optIdx : '',
    data.voterKey  || '',
    Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM-yyyy hh:mm a'),
    now.toISOString(),
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD UPDATE → Sheet 7
// ─────────────────────────────────────────────────────────────────
function addUpdate(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.UPDATES, 6);
  const now   = new Date();
  sheet.appendRow([
    data.type             || 'notice',
    data.title            || '',
    data.body             || '',
    data.relatedComplaint || '',
    data.postedBy         || 'Admin',
    data.date             || Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM-yyyy'),
    now.toISOString(),
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  OFFICIAL POLLS → Sheet 8
// ─────────────────────────────────────────────────────────────────
function addOfficialPoll(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.OFFICIAL_POLLS, 7);
  // Deduplicate by poll ID
  const existing = sheet.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    if (existing[i][0] === data.pollId) return;
  }
  sheet.appendRow([
    data.pollId    || '',
    data.question  || '',
    data.desc      || '',
    Array.isArray(data.options) ? data.options.join('|') : (data.options || ''),
    data.minVotes  || 0,
    data.expiresAt || '',
    'TRUE',
    new Date().toISOString(),
  ]);
}

function updateOfficialPoll(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SH.OFFICIAL_POLLS);
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.pollId) {
      if (data.question  !== undefined) sheet.getRange(i+1, 2).setValue(data.question);
      if (data.desc      !== undefined) sheet.getRange(i+1, 3).setValue(data.desc);
      if (data.options   !== undefined) sheet.getRange(i+1, 4).setValue(Array.isArray(data.options) ? data.options.join('|') : data.options);
      if (data.minVotes  !== undefined) sheet.getRange(i+1, 5).setValue(data.minVotes);
      if (data.expiresAt !== undefined) sheet.getRange(i+1, 6).setValue(data.expiresAt);
      if (data.active    !== undefined) sheet.getRange(i+1, 7).setValue(data.active ? 'TRUE' : 'FALSE');
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  USER POLLS → Sheet 9
// ─────────────────────────────────────────────────────────────────
function addUserPoll(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.USER_POLLS, 8);
  const existing = sheet.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    if (existing[i][0] === data.pollId) return;
  }
  sheet.appendRow([
    data.pollId         || '',
    data.question       || '',
    data.desc           || '',
    Array.isArray(data.options) ? data.options.join('|') : (data.options || ''),
    data.createdBy      || '',
    data.createdByEmail || '',
    data.minVotes       || 0,
    data.expiresAt      || '',
    'TRUE',
    data.createdAt      || new Date().toISOString(),
  ]);
}

function updateUserPoll(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SH.USER_POLLS);
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.pollId) {
      if (data.question  !== undefined) sheet.getRange(i+1, 2).setValue(data.question);
      if (data.desc      !== undefined) sheet.getRange(i+1, 3).setValue(data.desc);
      if (data.minVotes  !== undefined) sheet.getRange(i+1, 7).setValue(data.minVotes);
      if (data.expiresAt !== undefined) sheet.getRange(i+1, 8).setValue(data.expiresAt);
      if (data.active    !== undefined) sheet.getRange(i+1, 9).setValue(data.active ? 'TRUE' : 'FALSE');
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  USER POLL VOTES → Sheet 10
// ─────────────────────────────────────────────────────────────────
function addUserPollVote(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.USER_POLL_VOTES, 9);
  const now   = new Date();
  sheet.appendRow([
    data.pollId   || '',
    data.question || '',
    data.option   || '',
    data.optIdx   !== undefined ? data.optIdx : '',
    data.voterKey || data.userEmail || '',
    data.date     || now.toISOString(),
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  FOOD POLLS → Sheet 11
// ─────────────────────────────────────────────────────────────────
function addFoodPoll(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.FOOD_POLLS, 10);
  const existing = sheet.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    if (existing[i][0] === data.pollId) return;
  }
  sheet.appendRow([
    data.pollId    || '',
    data.foodItem  || '',
    data.question  || '',
    Array.isArray(data.options) ? data.options.join('|') : (data.options || ''),
    data.minVotes  || 0,
    data.expiresAt || '',
    'TRUE',
    new Date().toISOString(),
  ]);
}

function updateFoodPoll(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SH.FOOD_POLLS);
  if (!sheet) return;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.pollId) {
      if (data.question  !== undefined) sheet.getRange(i+1, 3).setValue(data.question);
      if (data.minVotes  !== undefined) sheet.getRange(i+1, 5).setValue(data.minVotes);
      if (data.expiresAt !== undefined) sheet.getRange(i+1, 6).setValue(data.expiresAt);
      if (data.active    !== undefined) sheet.getRange(i+1, 7).setValue(data.active ? 'TRUE' : 'FALSE');
      break;
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  CHANGE USER PASSWORD (admin action)
// ─────────────────────────────────────────────────────────────────
function changeUserPassword(data) {
  // data: { email, newPassHash }
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SH.USERS);
  if (!sheet) return { changed: false };
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === String(data.email).toLowerCase()) {
      sheet.getRange(i+1, 8).setValue(data.newPassHash || '');
      return { changed: true };
    }
  }
  return { changed: false };
}

// ─────────────────────────────────────────────────────────────────
//  CHANGE ANON USER PASSWORD (admin action)
// ─────────────────────────────────────────────────────────────────
function changeAnonPassword(data) {
  // data: { codeName, newPassHash }
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SH.ANON_USERS);
  if (!sheet) return { changed: false };
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.codeName)) {
      sheet.getRange(i+1, 7).setValue(data.newPassHash || '');
      return { changed: true };
    }
  }
  return { changed: false };
}

// ─────────────────────────────────────────────────────────────────
//  AUTO-FORMAT TRIGGER — run installTrigger() once to set up
// ─────────────────────────────────────────────────────────────────
function installTrigger() {
  ScriptApp.newTrigger('dailyFormat').timeBased().atHour(3).everyDays(1).create();
  Logger.log('✅ Daily 3 AM trigger installed.');
}

function dailyFormat() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.values(SH).forEach(name => {
    const s = ss.getSheetByName(name);
    if (!s) return;
    s.autoResizeColumns(1, s.getLastColumn());
    const lastRow = s.getLastRow();
    if (lastRow > 1) {
      for (let r = 2; r <= lastRow; r++) {
        s.getRange(r, 1, 1, s.getLastColumn()).setBackground(r % 2 === 0 ? '#f9f8f6' : '#ffffff');
      }
    }
  });
  Logger.log('✅ Daily format: ' + new Date().toISOString());
}

// ─────────────────────────────────────────────────────────────────
//  SERVER-SIDE DECRYPT HELPERS (run from Apps Script editor only)
// ─────────────────────────────────────────────────────────────────
function xorDeobfuscate_(encoded) {
  const key = 'NISER2024SITU';
  try {
    const decoded = Utilities.base64Decode(encoded);
    return decoded.map((b, i) => b ^ key.charCodeAt(i % key.length))
                  .map(b => String.fromCharCode(b)).join('');
  } catch (e) { return '[decode error]'; }
}

function decryptAllAnonUsers() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SH.ANON_USERS);
  if (!sheet) { Logger.log('AnonUsers sheet not found'); return; }
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('Code Name : ' + row[0]);
    Logger.log('Real Name : ' + xorDeobfuscate_(row[1]));
    Logger.log('Roll No.  : ' + xorDeobfuscate_(row[2]));
    Logger.log('Email     : ' + xorDeobfuscate_(row[3]));
    Logger.log('Programme : ' + row[4]);
    Logger.log('Joined At : ' + row[5]);
  }
}


https://script.google.com/macros/s/AKfycbx1JA6dSewmUyMKfQdMpes7JlFytfB9wcCAUc7nmHF3u42yhuUQ3gC_RQ4CGf8n_zEp/exec