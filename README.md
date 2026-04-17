# 🍽 NISER Mess Portal — README & Setup Guide (v5)

## 📁 File Structure

```
niser-mess/
├── index.html          ← Main landing page (Menu)
├── login.html          ← Login + Signup + OTP + Forgot Password
├── anon-login.html     ← Anonymous account creation & login
├── reviews.html        ← Star ratings & batch comments per meal
├── ranking.html        ← Top-rated food items leaderboard
├── polls.html          ← Community polls + Official polls (share links, guest voting)
├── complaints.html     ← Complaint submission with photo upload
├── updates.html        ← Admin notifications & resolved issue feed
├── admin.html          ← Full admin panel (7 tabs)
├── shared.js           ← Header/footer injection, DB helpers, guest ID, EmailJS rotation
├── app.js              ← Menu/review/ranking logic (v5)
├── style.css           ← All styles (responsive, all components)
├── code.gs             ← Google Apps Script backend (10-sheet data store)
└── README.md           ← This file
```

---

## ⚡ Quick Start

1. Upload all `.html`, `.js`, `.css` files to your web server or GitHub Pages.
2. Complete **Google Sheet Setup** and **EmailJS Setup** below.
3. The URLs in each page's `<script>` block are pre-filled — no extra config needed.
4. Deploy and you're live!

---

## 🔧 Configuration

All constants are pre-filled. Here's what they are:

```js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/...exec';
const SHEET_CSV_URL   = 'https://docs.google.com/spreadsheets/d/e/...output=csv';

// Cloudinary (for complaint photo uploads)
const CLOUDINARY_CLOUD_NAME    = 'dquiexkla';
const CLOUDINARY_UPLOAD_PRESET = 'eventpass_unsigned';
```

---

## 📊 Google Sheet Setup

### Step 1 — Open Apps Script
1. Open your Google Sheet (ID: `1utHhJJYewerK99XcD2LJPSuxRz5Q65mNadJI_4bTZbo`)
2. Go to **Extensions → Apps Script**
3. Delete all existing code
4. Paste the entire contents of `code.gs`
5. Save (Ctrl+S)

### Step 2 — Run Setup Once
1. Select function `setupSheets` → Click **Run**
2. Grant all permissions when prompted
3. This creates **10 sheets**:

| Sheet | Name | Purpose |
|-------|------|---------|
| Sheet1 | Reviews | All food ratings (regular + anon) |
| Sheet2 | Users | Registered user credentials |
| Sheet3 | AnonUsers | Anonymous registry (obfuscated) |
| Sheet4 | AnonReviews | Anonymous review submissions |
| Sheet5 | Complaints | Mess complaints with Cloudinary photo URLs |
| Sheet6 | PollVotes | Item-level keep/remove/no-problem votes (legacy) |
| Sheet7 | Updates | Admin-posted notifications & announcements |
| Sheet8 | ItemPolls | Legacy — no longer auto-populated |
| Sheet9 | UserPolls | Student-created community polls |
| Sheet10 | UserPollVotes | Votes cast on student-created polls |

### Step 3 — Deploy as Web App
1. **Deploy → Manage Deployments → New Deployment**
2. Settings:
   - **Type**: Web App
   - **Execute as**: Me
   - **Who has access**: Anyone
3. Click **Deploy** → Copy the `/exec` URL → paste as `APPS_SCRIPT_URL`

### Step 4 — Enable Daily Auto-Format (Optional)
Run function `installTrigger` once → sets up a 3 AM daily job to auto-resize and stripe all 10 sheets.

---

## 🔑 Critical Fix: Sheet Updates (v5)

The **root cause** of sheets not updating (Reviews, Users, AnonUsers, AnonReviews, PollVotes, ItemPolls) was a browser CORS restriction:

> When using `fetch(..., { mode: 'no-cors' })`, the browser only allows simple request content types: `text/plain`, `application/x-www-form-urlencoded`, or `multipart/form-data`. Using `Content-Type: application/json` triggers a CORS preflight that **silently fails** with `no-cors` mode.

**Fix applied in v5:** All `fetch` calls to Apps Script now use `Content-Type: text/plain;charset=utf-8`. Apps Script reads `e.postData.contents` as a raw string and `JSON.parse()` it regardless of Content-Type, so the backend required **zero changes**.

Files fixed: `app.js`, `shared.js`, `anon-login.html`, `complaints.html`, `login.html`, `admin.html`, `polls.html`.

---

## 📧 EmailJS Multi-Account Rotation System

The portal uses **4 EmailJS accounts** in a rotating loop to stay within monthly limits.

### Rotation Logic
```
System 1 → 180 verifications → Switch to System 2
System 2 → 190 verifications → Switch to System 3
System 3 → 190 verifications → Switch to System 4
System 4 → 190 verifications → Cycle back to System 1
```

All accounts renew with 200 fresh emails on the **14th of every month**.

Email System Status panel is in **Admin → Statistics tab** only.

---

## 🍽 Reviews Always Open (v5 — Change #1)

Reviews are no longer gated by meal time windows. **Any user can review any meal at any time** — past, present, or future meals. The 48-hour window restriction has been completely removed. Meal timing labels are still shown for reference but do not restrict access.

---

## 📊 Polls System (v5)

### Community Polls (student-created)
- Any logged-in user (regular or anonymous) can create a poll
- Stored in `user_polls` key → pushed to **Sheet9 (UserPolls)**
- Votes pushed to **Sheet10 (UserPollVotes)**

### Official Polls (admin-created)
- Admin creates from the Polls tab in Admin Panel
- Stored in `custom_polls` key

### What's NEW in v5:
1. **No login required to vote** — Any visitor can vote using a persistent browser-based guest ID (one vote per browser per poll). Logged-in users vote via their email.
2. **Share button on every poll** — Copies a direct link (`polls.html#pollId`). The linked poll is highlighted and scrolled to when opened.
3. **Admin can edit, close, and reopen any poll** — both Official and Community polls can be modified from Admin → Polls tab.
4. **Food Item Polls removed** — The auto-created "Should it stay on the menu?" section is removed. If needed, create a regular community/official poll instead.

---

## 🟢 LIVE Badge Removed (v5 — Change #7)

The pulsing LIVE meal badge and the 30-second live tick have been removed. Meal timing labels (e.g. "🕐 8:00–10:00 AM") are still shown on the menu page for reference.

---

## 🧭 Navigation Structure

```
index.html          ← Menu
reviews.html        ← Food rating cards + batch submit (always open)
ranking.html        ← Leaderboard
polls.html          ← Community polls + Official polls (share + guest vote)
complaints.html     ← Submit & view complaints
updates.html        ← Admin notifications

login.html          ← Login / Signup / OTP / Forgot Password
anon-login.html     ← Anonymous account creation & login

admin.html          ← Admin panel (link only in footer)
```

---

## 👤 User System

### Regular Users
- Sign up with `@niser.ac.in` email only
- OTP sent via rotating EmailJS system (4 accounts)

### Anonymous Users
- `anon-login.html` — assigned a code name like **NISERite-4829**
- Real identity XOR-obfuscated

### Guest (no account)
- Can **browse** menu, reviews, rankings
- Can **vote on polls** (one vote per browser via guest ID)
- Cannot submit reviews or complaints

---

## 🛠 Admin Access

### Admin Credentials
| User | Email | Password |
|------|-------|----------|
| SITU (Primary) | `situ@niser.ac.in` | `situ123` |
| Legacy Admin | `admin@niser.ac.in` | `SHUBU-24` |

### Admin Tabs (7 total)
| Tab | Contents |
|-----|----------|
| 📊 Statistics | Stat cards, email system status, top/bottom food bars |
| 💬 Reviews | Hide/unhide comments, most-reviewed items |
| 👥 Users | Full user table, remove user |
| 🕵️ Anonymous | Anon accounts, 🔓 Decrypt |
| 📊 Polls | Create official polls; edit/close/reopen/delete both official and community polls |
| 📣 Complaints | View complaints with photos, update status & add notes |
| 🔔 Updates | Post announcements/notices |

---

## 🔄 Data Flow (v5)

```
User Visits Reviews Page
  → Loads menu CSV
  → All meals always open for review (no time window)
  → Batch review form shown for logged-in users

User Votes on Poll (logged in or guest)
  → Vote saved to localStorage (keyed by email or guest ID)
  → Pushed to Sheet9/Sheet10 via Apps Script

Share Poll
  → Copies polls.html#pollId to clipboard (or navigator.share)
  → Recipient opens link, poll is highlighted automatically

Admin Reopens Poll
  → Sets active=true, clears expiresAt
  → Poll is live again immediately

Sheet Update Fix
  → All fetch() calls now use Content-Type: text/plain;charset=utf-8
  → Bypasses CORS preflight failure with mode: no-cors
```

---

## 📱 Responsive Breakpoints

| Width | Layout |
|-------|--------|
| > 900px | 3-column menu grid, desktop maps |
| 560–900px | 2-column menu grid |
| < 640px | Hamburger menu, map links instead of iframes |
| < 560px | 1-column menu grid |

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Sheets not updating | Fixed in v5 — Content-Type changed to text/plain in all fetch calls |
| Reviews showing as closed | Fixed in v5 — review window restriction removed entirely |
| LIVE badge missing | Removed in v5 — this is intentional |
| Item polls missing | Removed in v5 — create a community poll instead |
| Guest can't vote | Check that shared.js v5 is loaded (provides getGuestId) |
| Poll share link not working | Ensure polls.html URL is accessible and hash matches poll ID |
| Admin can't reopen poll | Use Admin → Polls → Reopen button (new in v5) |
| OTP not received | Check EmailJS — system status is in Admin → Statistics |
| Sheet not updating | Verify APPS_SCRIPT_URL is correct and deployment access is "Anyone" |
| Admin can't log in | Use `situ@niser.ac.in` / `situ123` |

---

## 👨‍💻 Developer

Built by **Boss** · [shubhranshu-24.github.io/shubhranshu](https://shubhranshu-24.github.io/shubhranshu/)

---

*NISER Mess Portal v5 · National Institute of Science Education and Research, Bhubaneswar*
