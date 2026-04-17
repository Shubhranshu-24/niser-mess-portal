/**
 * ═══════════════════════════════════════════════════════════════════
 *  NISER MESS PORTAL — code.gs  (Google Apps Script)  v4
 *  Spreadsheet ID: 1utHhJJYewerK99XcD2LJPSuxRz5Q65mNadJI_4bTZbo
 *
 *  SHEETS:
 *   Sheet1  → "Reviews"      — Public food reviews (regular + anon)
 *   Sheet2  → "Users"        — Registered user credentials
 *   Sheet3  → "AnonUsers"    — Anonymous user registry (obfuscated)
 *   Sheet4  → "AnonReviews"  — Anonymous review submissions (full columns)
 *   Sheet5  → "Complaints"   — Mess complaints with photo URLs
 *   Sheet6  → "PollVotes"    — Per-item food poll votes (keep/remove/noProblem)
 *   Sheet7  → "Updates"      — Admin-posted updates/notifications
 *   Sheet8  → "ItemPolls"    — Auto-created food item polls (metadata)
 *   Sheet9  → "UserPolls"    — Student-created community polls (#5)
 *   Sheet10 → "UserPollVotes"— Votes cast on student polls (#5)
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
 *   AnonUsers     → Code Name | Enc. Name | Enc. Roll No. | Enc. Email | Programme | Joined At
 *   AnonReviews   → Code Name | Enc. Email | Food Item | Meal | Rating | Comment | Date | Timestamp
 *   Complaints    → Type | Title | Description | Name | Email | Photos | Status | Date | Timestamp | User Email
 *   PollVotes     → Food Item | Option | User Email | Date | Timestamp
 *   Updates       → Type | Title | Body | Related Complaint | Posted By | Date | Timestamp
 *   ItemPolls     → Item Key | Item Name | Meal | Created At | Poll Expires At
 *   UserPolls     → Poll ID | Question | Description | Options (pipe-sep) | Created By | Created By Email | Created At | Expires At
 *   UserPollVotes → Poll ID | Question | Option | Opt Index | User Email | Date
 * ═══════════════════════════════════════════════════════════════════
 */

const SPREADSHEET_ID = '1utHhJJYewerK99XcD2LJPSuxRz5Q65mNadJI_4bTZbo';

const SH = {
  REVIEWS:         'Reviews',
  USERS:           'Users',
  ANON_USERS:      'AnonUsers',
  ANON_REVIEWS:    'AnonReviews',
  COMPLAINTS:      'Complaints',
  POLL_VOTES:      'PollVotes',
  UPDATES:         'Updates',
  ITEM_POLLS:      'ItemPolls',
  USER_POLLS:      'UserPolls',
  USER_POLL_VOTES: 'UserPollVotes',
};

// ─────────────────────────────────────────────────────────────────
//  ONE-TIME SETUP — run manually once from Apps Script editor
// ─────────────────────────────────────────────────────────────────
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ── Sheet 1: Reviews ────────────────────────────────────────────
  const s1 = getOrCreate(ss, SH.REVIEWS, 0);
  s1.clearContents();
  writeHeader(s1, ['Display Name', 'Food Item', 'Meal', 'Rating (0-5)', 'Comment', 'Date', 'Timestamp', 'Is Anonymous']);
  styleHeader(s1, '#1a1917', '#ffffff');
  s1.setFrozenRows(1);

  // ── Sheet 2: Users ──────────────────────────────────────────────
  const s2 = getOrCreate(ss, SH.USERS, 1);
  s2.clearContents();
  writeHeader(s2, ['Full Name', 'Email', 'Mobile', 'Programme', 'Transaction ID', 'Ref No.', 'Joined At', 'Password Hash']);
  styleHeader(s2, '#2e3830', '#ffffff');
  s2.setFrozenRows(1);

  // ── Sheet 3: AnonUsers ──────────────────────────────────────────
  const s3 = getOrCreate(ss, SH.ANON_USERS, 2);
  s3.clearContents();
  writeHeader(s3, ['Code Name', 'Enc. Name', 'Enc. Roll No.', 'Enc. Email', 'Programme', 'Joined At']);
  styleHeader(s3, '#4a1942', '#ffffff');
  s3.setFrozenRows(1);

  // ── Sheet 4: AnonReviews ────────────────────────────────────────
  const s4 = getOrCreate(ss, SH.ANON_REVIEWS, 3);
  s4.clearContents();
  writeHeader(s4, ['Code Name', 'Enc. Email', 'Food Item', 'Meal', 'Rating', 'Comment', 'Date', 'Timestamp']);
  styleHeader(s4, '#3a2060', '#ffffff');
  s4.setFrozenRows(1);

  // ── Sheet 5: Complaints ─────────────────────────────────────────
  const s5 = getOrCreate(ss, SH.COMPLAINTS, 4);
  s5.clearContents();
  writeHeader(s5, ['Type', 'Title', 'Description', 'Name', 'Email', 'Photo URLs', 'Status', 'Date', 'Timestamp', 'User Email']);
  styleHeader(s5, '#7a2020', '#ffffff');
  s5.setFrozenRows(1);

  // ── Sheet 6: PollVotes ──────────────────────────────────────────
  const s6 = getOrCreate(ss, SH.POLL_VOTES, 5);
  s6.clearContents();
  writeHeader(s6, ['Food Item', 'Option (keep/remove/noProblem)', 'User Email', 'Date', 'Timestamp']);
  styleHeader(s6, '#1a4060', '#ffffff');
  s6.setFrozenRows(1);

  // ── Sheet 7: Updates ────────────────────────────────────────────
  const s7 = getOrCreate(ss, SH.UPDATES, 6);
  s7.clearContents();
  writeHeader(s7, ['Type', 'Title', 'Body', 'Related Complaint ID', 'Posted By', 'Date', 'Timestamp']);
  styleHeader(s7, '#1a3020', '#ffffff');
  s7.setFrozenRows(1);

  // ── Sheet 8: ItemPolls ──────────────────────────────────────────
  const s8 = getOrCreate(ss, SH.ITEM_POLLS, 7);
  s8.clearContents();
  writeHeader(s8, ['Item Key', 'Item Name', 'Meal', 'Created At (IST)', 'Poll Expires At (IST)']);
  styleHeader(s8, '#1a4040', '#ffffff');
  s8.setFrozenRows(1);

  // ── Sheet 9: UserPolls ──────────────────────────────────────────
  const s9 = getOrCreate(ss, SH.USER_POLLS, 8);
  s9.clearContents();
  writeHeader(s9, ['Poll ID', 'Question', 'Description', 'Options (pipe-separated)', 'Created By', 'Created By Email', 'Created At', 'Expires At']);
  styleHeader(s9, '#403010', '#ffffff');
  s9.setFrozenRows(1);

  // ── Sheet 10: UserPollVotes ─────────────────────────────────────
  const s10 = getOrCreate(ss, SH.USER_POLL_VOTES, 9);
  s10.clearContents();
  writeHeader(s10, ['Poll ID', 'Question', 'Option Text', 'Option Index', 'User Email', 'Date']);
  styleHeader(s10, '#301840', '#ffffff');
  s10.setFrozenRows(1);

  Logger.log('✅ All 10 sheets created and formatted successfully.');
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
  const lastCol = sheet.getLastColumn() || 10;
  sheet.getRange(1, 1, 1, lastCol).setBackground(bg).setFontColor(fg);
}

function autoSort(sheet, col) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 2) return;
  sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).sort({ column: col, ascending: false });
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
    switch (action) {
      case 'addReview':        addReview(data);        break;
      case 'addUser':          addUser(data);          break;
      case 'addAnonUser':      addAnonUser(data);      break;
      case 'addAnonReview':    addAnonReview(data);    break;
      case 'addComplaint':     addComplaint(data);     break;
      case 'addPollVote':      addPollVote(data);      break;
      case 'addUpdate':        addUpdate(data);        break;
      case 'addItemPoll':      addItemPoll(data);      break;
      case 'addUserPoll':      addUserPoll(data);      break;
      case 'addUserPollVote':  addUserPollVote(data);  break;
      default:
        Logger.log('Unknown action: ' + action);
    }
    return respond({ status: 'ok' });
  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    return respond({ status: 'error', message: err.message });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return respond({ status: 'ok', message: 'NISER Mess Portal API v4 is running.' });
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────────
//  ADD PUBLIC REVIEW → Sheet 1 (Reviews)
// ─────────────────────────────────────────────────────────────────
function addReview(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.REVIEWS, 0);
  const now   = new Date();
  sheet.appendRow([
    data.displayName  || '',
    data.foodItem     || '',
    data.meal         || '',
    data.rating       || '',
    data.comment      || '',
    data.date         || Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM-yyyy'),
    now.toISOString(),
    data.isAnon ? 'Yes' : 'No',
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD USER → Sheet 2 (Users)
// ─────────────────────────────────────────────────────────────────
function addUser(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.USERS, 1);
  const now   = new Date();
  sheet.appendRow([
    data.name        || '',
    data.email       || '',
    data.mobile      || '',
    data.programme   || '',
    data.txn         || '',
    data.ref         || '',
    data.joinedAt    || now.toISOString(),
    '',               // Password hash — intentionally blank for privacy
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD ANON USER → Sheet 3 (AnonUsers)
// ─────────────────────────────────────────────────────────────────
function addAnonUser(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.ANON_USERS, 2);
  sheet.appendRow([
    data.codeName   || '',
    data.encName    || '',
    data.encRoll    || '',
    data.encEmail   || '',
    data.programme  || '',
    data.joinedAt   || new Date().toISOString(),
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD ANON REVIEW → Sheet 4 (AnonReviews)
// ─────────────────────────────────────────────────────────────────
function addAnonReview(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.ANON_REVIEWS, 3);
  const now   = new Date();
  sheet.appendRow([
    data.codeName  || '',
    data.encEmail  || '',
    data.foodItem  || '',
    data.meal      || '',
    data.rating    || '',
    data.comment   || '',
    data.date      || Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM-yyyy'),
    now.toISOString(),
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD COMPLAINT → Sheet 5 (Complaints)
// ─────────────────────────────────────────────────────────────────
function addComplaint(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.COMPLAINTS, 4);
  const now   = new Date();
  sheet.appendRow([
    data.type        || '',
    data.title       || '',
    data.desc        || '',
    data.name        || 'Anonymous',
    data.email       || '',
    data.photos      || '',
    data.status      || 'open',
    data.date        || Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM-yyyy'),
    now.toISOString(),
    data.userEmail   || '',
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD POLL VOTE → Sheet 6 (PollVotes)
// ─────────────────────────────────────────────────────────────────
function addPollVote(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.POLL_VOTES, 5);
  const now   = new Date();
  sheet.appendRow([
    data.foodItem   || '',
    data.option     || '',
    data.userEmail  || 'guest',
    Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM-yyyy'),
    now.toISOString(),
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD UPDATE → Sheet 7 (Updates)
// ─────────────────────────────────────────────────────────────────
function addUpdate(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.UPDATES, 6);
  const now   = new Date();
  sheet.appendRow([
    data.type               || 'notice',
    data.title              || '',
    data.body               || '',
    data.relatedComplaint   || '',
    data.postedBy           || 'Admin',
    data.date               || Utilities.formatDate(now, 'Asia/Kolkata', 'dd-MMM-yyyy'),
    now.toISOString(),
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD ITEM POLL → Sheet 8 (ItemPolls)
//  Auto-created when a food item first becomes available for review.
// ─────────────────────────────────────────────────────────────────
function addItemPoll(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.ITEM_POLLS, 7);
  // Avoid duplicate item keys
  const existing = sheet.getDataRange().getValues();
  for (let i = 1; i < existing.length; i++) {
    if (existing[i][0] === data.itemKey) return; // Already exists
  }
  sheet.appendRow([
    data.itemKey      || '',
    data.itemName     || '',
    data.meal         || '',
    data.createdAt    || new Date().toISOString(),
    data.pollExpiresAt || '',
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD USER POLL → Sheet 9 (UserPolls) — #5
// ─────────────────────────────────────────────────────────────────
function addUserPoll(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.USER_POLLS, 8);
  sheet.appendRow([
    data.pollId         || '',
    data.question       || '',
    data.desc           || '',
    data.options        || '',   // Pipe-separated: "Option 1|Option 2|Option 3"
    data.createdBy      || '',
    data.createdByEmail || '',
    data.createdAt      || new Date().toISOString(),
    data.expiresAt      || '',
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  ADD USER POLL VOTE → Sheet 10 (UserPollVotes) — #5
// ─────────────────────────────────────────────────────────────────
function addUserPollVote(data) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreate(ss, SH.USER_POLL_VOTES, 9);
  const now   = new Date();
  sheet.appendRow([
    data.pollId    || '',
    data.question  || '',
    data.option    || '',
    data.optIdx    !== undefined ? data.optIdx : '',
    data.userEmail || '',
    data.date      || now.toISOString(),
  ]);
}

// ─────────────────────────────────────────────────────────────────
//  AUTO-FORMAT TRIGGER — run installTrigger() once to set up
// ─────────────────────────────────────────────────────────────────
function installTrigger() {
  ScriptApp.newTrigger('dailyFormat')
    .timeBased()
    .atHour(3)
    .everyDays(1)
    .create();
  Logger.log('✅ Daily 3 AM trigger installed.');
}

function dailyFormat() {
  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const shNames = Object.values(SH);
  shNames.forEach(name => {
    const s = ss.getSheetByName(name);
    if (!s) return;
    s.autoResizeColumns(1, s.getLastColumn());
    const lastRow = s.getLastRow();
    if (lastRow > 1) {
      for (let r = 2; r <= lastRow; r++) {
        const bg = r % 2 === 0 ? '#f9f8f6' : '#ffffff';
        s.getRange(r, 1, 1, s.getLastColumn()).setBackground(bg);
      }
    }
  });
  Logger.log('✅ Daily format complete: ' + new Date().toISOString());
}

// ─────────────────────────────────────────────────────────────────
//  SERVER-SIDE DECRYPT (for admin use via Apps Script editor)
// ─────────────────────────────────────────────────────────────────
function xorDeobfuscate_(encoded) {
  const key = 'NISER2024SITU';
  try {
    const decoded = Utilities.base64Decode(encoded);
    return decoded.map((b, i) => b ^ key.charCodeAt(i % key.length))
                  .map(b => String.fromCharCode(b))
                  .join('');
  } catch (e) {
    return '[decode error]';
  }
}

function decryptAnonUserRow(rowNumber) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SH.ANON_USERS);
  if (!sheet) { Logger.log('AnonUsers sheet not found'); return; }
  const row = sheet.getRange(rowNumber + 1, 1, 1, 6).getValues()[0];
  Logger.log('Code Name : ' + row[0]);
  Logger.log('Real Name : ' + xorDeobfuscate_(row[1]));
  Logger.log('Roll No.  : ' + xorDeobfuscate_(row[2]));
  Logger.log('Email     : ' + xorDeobfuscate_(row[3]));
  Logger.log('Programme : ' + row[4]);
  Logger.log('Joined At : ' + row[5]);
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
