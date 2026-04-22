/**
 * NISER MESS PORTAL — code.gs  v6
 * See inline comments for full documentation.
 */

const SPREADSHEET_ID = '1utHhJJYewerK99XcD2LJPSuxRz5Q65mNadJI_4bTZbo';
const SH = {
  REVIEWS:'Reviews', USERS:'Users', ANON_USERS:'AnonUsers', ANON_REVIEWS:'AnonReviews',
  COMPLAINTS:'Complaints', POLL_VOTES:'PollVotes', UPDATES:'Updates',
  ITEM_POLLS:'ItemPolls', USER_POLLS:'UserPolls', USER_POLL_VOTES:'UserPollVotes',
};

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const s1=getOrCreate(ss,SH.REVIEWS,0); s1.clearContents();
  writeHeader(s1,['Display Name','Food Item','Meal','Rating','Comment','Date','Timestamp','Is Anonymous','User Email']);
  styleHeader(s1,'#1a1917','#ffffff'); s1.setFrozenRows(1);
  const s2=getOrCreate(ss,SH.USERS,1); s2.clearContents();
  writeHeader(s2,['Full Name','Email','Mobile','Programme','Transaction ID','Ref No.','Joined At','Password']);
  styleHeader(s2,'#2e3830','#ffffff'); s2.setFrozenRows(1);
  const s3=getOrCreate(ss,SH.ANON_USERS,2); s3.clearContents();
  writeHeader(s3,['Code Name','Enc. Name','Enc. Roll No.','Enc. Email','Programme','Joined At','Pass Hash','Email Plain']);
  styleHeader(s3,'#4a1942','#ffffff'); s3.setFrozenRows(1);
  const s4=getOrCreate(ss,SH.ANON_REVIEWS,3); s4.clearContents();
  writeHeader(s4,['Code Name','Enc. Email','Food Item','Meal','Rating','Comment','Date','Timestamp','User Email']);
  styleHeader(s4,'#3a2060','#ffffff'); s4.setFrozenRows(1);
  const s5=getOrCreate(ss,SH.COMPLAINTS,4); s5.clearContents();
  writeHeader(s5,['Type','Title','Description','Name','Email','Photo URLs','Status','Date','Timestamp','User Email','Admin Note']);
  styleHeader(s5,'#7a2020','#ffffff'); s5.setFrozenRows(1);
  const s6=getOrCreate(ss,SH.POLL_VOTES,5); s6.clearContents();
  writeHeader(s6,['Poll ID','Poll Type','Option Index','Voter Key','Date','Timestamp']);
  styleHeader(s6,'#1a4060','#ffffff'); s6.setFrozenRows(1);
  const s7=getOrCreate(ss,SH.UPDATES,6); s7.clearContents();
  writeHeader(s7,['Type','Title','Body','Related Complaint ID','Posted By','Date','Timestamp']);
  styleHeader(s7,'#1a3020','#ffffff'); s7.setFrozenRows(1);
  const s8=getOrCreate(ss,SH.ITEM_POLLS,7); s8.clearContents();
  writeHeader(s8,['Item Key','Item Name','Meal','Created At','Poll Expires At']);
  styleHeader(s8,'#1a4040','#ffffff'); s8.setFrozenRows(1);
  const s9=getOrCreate(ss,SH.USER_POLLS,8); s9.clearContents();
  writeHeader(s9,['Poll ID','Type','Question','Description','Options','Created By','Created By Email','Created At','Expires At','Active','Admin Remark','Remark Type','Remark By','Closed At']);
  styleHeader(s9,'#403010','#ffffff'); s9.setFrozenRows(1);
  const s10=getOrCreate(ss,SH.USER_POLL_VOTES,9); s10.clearContents();
  writeHeader(s10,['Poll ID','Question','Option Text','Option Index','User Email','Date']);
  styleHeader(s10,'#301840','#ffffff'); s10.setFrozenRows(1);
  Logger.log('All 10 sheets created.');
}

function getOrCreate(ss,name,pos){let s=ss.getSheetByName(name);if(!s)s=ss.insertSheet(name,pos);return s;}
function writeHeader(sheet,cols){sheet.getRange(1,1,1,cols.length).setValues([cols]).setFontWeight('bold');}
function styleHeader(sheet,bg,fg){const c=sheet.getLastColumn()||14;sheet.getRange(1,1,1,c).setBackground(bg).setFontColor(fg);}
function respond(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}

function doGet(e) {
  const action = e.parameter.action || '';
  try {
    if(action==='loginUser')      return respond(loginUser(e.parameter));
    if(action==='loginAnon')      return respond(loginAnon(e.parameter));
    if(action==='checkUser')      return respond(checkUser(e.parameter));
    if(action==='getReviews')     return respond(getReviewsData());
    if(action==='getPolls')       return respond(getPollsData());
    if(action==='getAllPollVotes') return respond(getAllPollVotesData(e.parameter));
    if(action==='getComplaints')  return respond(getComplaintsData());
    if(action==='getUpdates')     return respond(getUpdatesData());
    if(action==='getMenuItems')   return respond(getMenuItemsData());
    return respond({status:'ok',message:'NISER Mess Portal API v6'});
  } catch(err){return respond({status:'error',message:err.message});}
}

function doPost(e) {
  const lock=LockService.getScriptLock(); lock.tryLock(12000);
  try {
    const data=JSON.parse(e.postData.contents), action=data.action;
    if(action==='addReview')         return respond(addReview(data));
    if(action==='addUser')           return respond(addUser(data));
    if(action==='addAnonUser')       return respond(addAnonUser(data));
    if(action==='addAnonReview')     return respond(addAnonReview(data));
    if(action==='addComplaint')      return respond(addComplaint(data));
    if(action==='addUpdate')         return respond(addUpdate(data));
    if(action==='deleteUpdate')      return respond(deleteUpdate(data));
    if(action==='addPoll')           return respond(addPoll(data));
    if(action==='votePoll')          return respond(votePoll(data));
    if(action==='updatePoll')        return respond(updatePollData(data));
    if(action==='closePoll')         return respond(closePoll(data));
    if(action==='reopenPoll')        return respond(reopenPoll(data));
    if(action==='deletePoll')        return respond(deletePoll(data));
    if(action==='addPollRemark')     return respond(addPollRemark(data));
    if(action==='updateComplaint')   return respond(updateComplaintAction(data));
    return respond({status:'error',message:'Unknown action'});
  } catch(err){Logger.log('doPost error: '+err.message);return respond({status:'error',message:err.message});}
  finally{lock.releaseLock();}
}

// ── AUTH ──────────────────────────────────────────────────────────
function loginUser(p) {
  const email=(p.email||'').toLowerCase().trim(), pass=p.pass||'';
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.USERS); if(!sheet) return {status:'error',message:'Sheet not found'};
  const data=sheet.getDataRange().getValues();
  for(let i=1;i<data.length;i++){
    if((data[i][1]||'').toLowerCase()===email){
      if(data[i][7]===pass) return {status:'ok',user:{name:data[i][0],email:data[i][1],programme:data[i][3],mobile:data[i][2]}};
      return {status:'error',message:'Wrong password'};
    }
  }
  return {status:'error',message:'User not found'};
}

function loginAnon(p) {
  const email=(p.email||'').toLowerCase().trim(), pass=p.pass||'';
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.ANON_USERS); if(!sheet) return {status:'error',message:'Sheet not found'};
  const data=sheet.getDataRange().getValues();
  for(let i=1;i<data.length;i++){
    const storedEmail=(data[i][7]||'').toLowerCase().trim();
    if(storedEmail===email){
      const dp=xorDec(data[i][6]||'');
      if(dp===pass) return {status:'ok',user:{codeName:data[i][0],encName:data[i][1],encRoll:data[i][2],encEmail:data[i][3],programme:data[i][4],joinedAt:data[i][5],isAnon:true,email:'anon::'+email}};
      return {status:'error',message:'Wrong password'};
    }
  }
  return {status:'error',message:'Anon account not found'};
}

function checkUser(p) {
  const email=(p.email||'').toLowerCase().trim();
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const s2=ss.getSheetByName(SH.USERS);
  if(s2){const d=s2.getDataRange().getValues();for(let i=1;i<d.length;i++){if((d[i][1]||'').toLowerCase()===email)return{exists:true};}}
  const s3=ss.getSheetByName(SH.ANON_USERS);
  if(s3){const d=s3.getDataRange().getValues();for(let i=1;i<d.length;i++){if((d[i][7]||'').toLowerCase()===email)return{exists:true,isAnon:true};}}
  return{exists:false};
}

// ── REVIEWS ──────────────────────────────────────────────────────
function getReviewsData() {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.REVIEWS); if(!sheet) return {status:'ok',reviews:{}};
  const data=sheet.getDataRange().getValues();
  const reviews={};
  for(let i=1;i<data.length;i++){
    const row=data[i], name=row[1]||''; if(!name) continue;
    const key=name.trim().toUpperCase().replace(/\s+/g,'_');
    if(!reviews[key]) reviews[key]={itemName:name,meal:row[2]||'',ratings:[],comments:[]};
    const rating=parseFloat(row[3])||0, comment=row[4]||'', email=row[8]||'';
    const ts=row[6]?new Date(row[6]).getTime():0;
    if(rating>0) reviews[key].ratings.push({email,name:row[0]||'',value:rating,date:row[5]||'',ts});
    if(comment) reviews[key].comments.push({email,name:row[0]||'',value:rating,comment,date:row[5]||'',ts});
  }
  return {status:'ok',reviews};
}

// ── POLLS ────────────────────────────────────────────────────────
function getPollsData() {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.USER_POLLS); if(!sheet) return {status:'ok',polls:[]};
  const data=sheet.getDataRange().getValues();
  const polls=[];
  for(let i=1;i<data.length;i++){
    const row=data[i]; if(!row[0]) continue;
    polls.push({
      id:String(row[0]),type:row[1]||'user',question:row[2],desc:row[3]||'',
      options:(row[4]||'').split('|').filter(Boolean),
      createdBy:row[5]||'',createdByEmail:row[6]||'',
      createdAt:row[7]?new Date(row[7]).getTime():0,
      expiresAt:row[8]?new Date(row[8]).getTime():null,
      active:row[9]===true||row[9]==='TRUE'||row[9]===1||row[9]==='true',
      adminRemark:row[10]||'',remarkType:row[11]||'',remarkBy:row[12]||'',
      closedAt:row[13]?new Date(row[13]).getTime():null,
      rowIdx:i+1,
    });
  }
  return {status:'ok',polls};
}

function getAllPollVotesData(p) {
  const pollId=p.pollId||'', voterKey=p.voterKey||'';
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.POLL_VOTES); if(!sheet) return {status:'ok',votes:{},myVote:null};
  const data=sheet.getDataRange().getValues();
  const votes={}; let myVote=null;
  for(let i=1;i<data.length;i++){
    const row=data[i]; if(String(row[0])!==pollId) continue;
    const opt=String(row[2]), voter=String(row[3]||'');
    votes[opt]=(votes[opt]||0)+1;
    if(voterKey && voter===voterKey) myVote=opt;
  }
  return {status:'ok',votes,myVote};
}

// Vote upsert - one vote per voter per poll
function votePoll(data) {
  const pollId=String(data.pollId||''), optIdx=String(data.optIdx??''), voterKey=String(data.voterKey||'');
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.POLL_VOTES); if(!sheet) return {status:'error'};
  const rows=sheet.getDataRange().getValues(); let foundRow=-1;
  for(let i=1;i<rows.length;i++){if(String(rows[i][0])===pollId && String(rows[i][3])===voterKey){foundRow=i+1;break;}}
  const now=new Date(), date=Utilities.formatDate(now,'Asia/Kolkata','dd-MMM-yyyy');
  if(foundRow>0){sheet.getRange(foundRow,3).setValue(optIdx);sheet.getRange(foundRow,5).setValue(date);sheet.getRange(foundRow,6).setValue(now.toISOString());}
  else{sheet.appendRow([pollId,data.pollType||'user',optIdx,voterKey,date,now.toISOString()]);}
  return {status:'ok',myVote:optIdx};
}

// ── COMPLAINTS ───────────────────────────────────────────────────
function getComplaintsData() {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.COMPLAINTS); if(!sheet) return {status:'ok',complaints:[]};
  const data=sheet.getDataRange().getValues(); const out=[];
  for(let i=1;i<data.length;i++){
    const row=data[i]; if(!row[1]) continue;
    out.push({id:row[8]?String(new Date(row[8]).getTime()):String(i),type:row[0],title:row[1],desc:row[2],name:row[3]||'Anonymous',email:row[4]||'',photos:row[5]?(row[5]).toString().split(',').map(s=>s.trim()).filter(Boolean):[],status:row[6]||'open',date:row[7]||'',ts:row[8]?new Date(row[8]).getTime():i,userEmail:row[9]||'',adminNote:row[10]||'',rowIdx:i+1});
  }
  out.sort((a,b)=>b.ts-a.ts);
  return {status:'ok',complaints:out};
}

function updateComplaintAction(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.COMPLAINTS); if(!sheet||!data.rowIdx) return {status:'error'};
  if(data.status) sheet.getRange(data.rowIdx,7).setValue(data.status);
  if(data.adminNote!==undefined) sheet.getRange(data.rowIdx,11).setValue(data.adminNote);
  return {status:'ok'};
}

// ── UPDATES ──────────────────────────────────────────────────────
function getUpdatesData() {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.UPDATES); if(!sheet) return {status:'ok',updates:[]};
  const data=sheet.getDataRange().getValues(); const out=[];
  for(let i=1;i<data.length;i++){
    const row=data[i]; if(!row[1]) continue;
    out.push({id:String(i),type:row[0]||'notice',title:row[1],body:row[2],relatedComplaint:row[3]||'',postedBy:row[4]||'Mess Committee',date:row[5]||'',ts:row[6]?new Date(row[6]).getTime():i,rowIdx:i+1});
  }
  out.sort((a,b)=>b.ts-a.ts);
  return {status:'ok',updates:out};
}

function getMenuItemsData() {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.REVIEWS); if(!sheet) return {status:'ok',items:[]};
  const data=sheet.getDataRange().getValues(); const items=new Set();
  for(let i=1;i<data.length;i++){if(data[i][1])items.add(data[i][1].trim());}
  return {status:'ok',items:Array.from(items).sort()};
}

// ── WRITE OPERATIONS ─────────────────────────────────────────────
function addReview(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=getOrCreate(ss,SH.REVIEWS,0); const now=new Date();
  // Remove existing review for same user + same food item
  const existing=sheet.getDataRange().getValues();
  for(let i=existing.length-1;i>=1;i--){if((existing[i][1]||'')===data.foodItem&&(existing[i][8]||'')===data.email){sheet.deleteRow(i+1);}}
  sheet.appendRow([data.displayName||'',data.foodItem||'',data.meal||'',data.rating||0,data.comment||'',data.date||Utilities.formatDate(now,'Asia/Kolkata','dd-MMM-yyyy'),now.toISOString(),data.isAnon?'Yes':'No',data.email||'']);
  return {status:'ok'};
}

function addUser(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=getOrCreate(ss,SH.USERS,1);
  const existing=sheet.getDataRange().getValues();
  for(let i=1;i<existing.length;i++){if((existing[i][1]||'').toLowerCase()===(data.email||'').toLowerCase())return{status:'error',message:'Email already registered'};}
  sheet.appendRow([data.name||'',data.email||'',data.mobile||'',data.programme||'',data.txn||'',data.ref||'',data.joinedAt||new Date().toISOString(),data.password||'']);
  return {status:'ok'};
}

function addAnonUser(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=getOrCreate(ss,SH.ANON_USERS,2);
  sheet.appendRow([data.codeName||'',data.encName||'',data.encRoll||'',data.encEmail||'',data.programme||'',data.joinedAt||new Date().toISOString(),data.passHash||'',data.emailPlain||'']);
  return {status:'ok'};
}

function addAnonReview(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=getOrCreate(ss,SH.ANON_REVIEWS,3); const now=new Date();
  const existing=sheet.getDataRange().getValues();
  for(let i=existing.length-1;i>=1;i--){if((existing[i][2]||'')===data.foodItem&&(existing[i][8]||'')===data.userEmail){sheet.deleteRow(i+1);}}
  sheet.appendRow([data.codeName||'',data.encEmail||'',data.foodItem||'',data.meal||'',data.rating||'',data.comment||'',data.date||Utilities.formatDate(now,'Asia/Kolkata','dd-MMM-yyyy'),now.toISOString(),data.userEmail||'']);
  return {status:'ok'};
}

function addComplaint(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=getOrCreate(ss,SH.COMPLAINTS,4); const now=new Date();
  sheet.appendRow([data.type||'',data.title||'',data.desc||'',data.name||'Anonymous',data.email||'',data.photos||'',data.status||'open',data.date||Utilities.formatDate(now,'Asia/Kolkata','dd-MMM-yyyy'),now.toISOString(),data.userEmail||'','']);
  return {status:'ok'};
}

function addUpdate(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=getOrCreate(ss,SH.UPDATES,6); const now=new Date();
  sheet.appendRow([data.type||'notice',data.title||'',data.body||'',data.relatedComplaint||'',data.postedBy||'Mess Committee',data.date||Utilities.formatDate(now,'Asia/Kolkata','dd-MMM-yyyy'),now.toISOString()]);
  return {status:'ok'};
}

function deleteUpdate(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.UPDATES); if(!sheet||!data.rowIdx) return {status:'error'};
  sheet.deleteRow(data.rowIdx); return {status:'ok'};
}

function addPoll(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=getOrCreate(ss,SH.USER_POLLS,8);
  sheet.appendRow([data.pollId||'',data.type||'user',data.question||'',data.desc||'',(data.options||[]).join('|'),data.createdBy||'',data.createdByEmail||'',data.createdAt||new Date().toISOString(),data.expiresAt||'',true,'','','','']);
  return {status:'ok'};
}

function _findPollRow(sheet,pollId){
  const data=sheet.getDataRange().getValues();
  for(let i=1;i<data.length;i++){if(String(data[i][0])===String(pollId))return i+1;}
  return -1;
}

function updatePollData(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.USER_POLLS); if(!sheet) return {status:'error'};
  const row=_findPollRow(sheet,data.pollId); if(row<0) return {status:'error',message:'Poll not found'};
  if(data.question) sheet.getRange(row,3).setValue(data.question);
  if(data.desc!==undefined) sheet.getRange(row,4).setValue(data.desc);
  if(data.expiresAt!==undefined) sheet.getRange(row,9).setValue(data.expiresAt||'');
  return {status:'ok'};
}

function closePoll(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.USER_POLLS); if(!sheet) return {status:'error'};
  const row=_findPollRow(sheet,data.pollId); if(row<0) return {status:'error'};
  sheet.getRange(row,10).setValue(false); sheet.getRange(row,14).setValue(new Date().toISOString());
  return {status:'ok'};
}

function reopenPoll(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.USER_POLLS); if(!sheet) return {status:'error'};
  const row=_findPollRow(sheet,data.pollId); if(row<0) return {status:'error'};
  sheet.getRange(row,10).setValue(true); sheet.getRange(row,9).setValue(''); sheet.getRange(row,14).setValue('');
  return {status:'ok'};
}

function deletePoll(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.USER_POLLS); if(!sheet) return {status:'error'};
  const row=_findPollRow(sheet,data.pollId); if(row<0) return {status:'error'};
  sheet.deleteRow(row); return {status:'ok'};
}

function addPollRemark(data) {
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet=ss.getSheetByName(SH.USER_POLLS); if(!sheet) return {status:'error'};
  const row=_findPollRow(sheet,data.pollId); if(row<0) return {status:'error'};
  sheet.getRange(row,11).setValue(data.remark||'');
  sheet.getRange(row,12).setValue(data.remarkType||'');
  sheet.getRange(row,13).setValue(data.remarkBy||'SITU Mess Committee');
  return {status:'ok'};
}

function xorDec(encoded) {
  const key='NISER2024SITU';
  try{const d=Utilities.base64Decode(encoded);return d.map((b,i)=>b^key.charCodeAt(i%key.length)).map(b=>String.fromCharCode(b)).join('');}
  catch(e){return '[decode error]';}
}

function installTrigger(){ScriptApp.newTrigger('dailyFormat').timeBased().atHour(3).everyDays(1).create();}
function dailyFormat(){const ss=SpreadsheetApp.openById(SPREADSHEET_ID);Object.values(SH).forEach(name=>{const s=ss.getSheetByName(name);if(!s)return;s.autoResizeColumns(1,s.getLastColumn());const lr=s.getLastRow();if(lr>1)for(let r=2;r<=lr;r++)s.getRange(r,1,1,s.getLastColumn()).setBackground(r%2===0?'#f9f8f6':'#ffffff');});}
