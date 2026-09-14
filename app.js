let DB=null;
const $=id=>document.getElementById(id);
const money=n=>Number.isFinite(Number(n))?"₹"+Number(n).toLocaleString("en-IN",{maximumFractionDigits:2}):"—";
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const num=v=>Number(v)||0;
const isoMonth=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}`};
const monthName=m=>{const d=new Date(m+"-01T00:00:00");return d.toLocaleString("en-US",{month:"long"})};
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const currentMonth=()=>isoMonth(new Date());

async function init(){
  const saved=localStorage.getItem("monthly-tally-db-v2");
  if(saved){DB=JSON.parse(saved);$("sourceBadge").textContent="Saved local data";}
  else {DB=await fetch("seed-data.json").then(r=>r.json());save();$("sourceBadge").textContent="Historical Excel imported";}
  bindNav();renderAll();
  if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
}
function save(){localStorage.setItem("monthly-tally-db-v2",JSON.stringify(DB));}
function bindNav(){document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll("nav button").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll("main>section").forEach(s=>s.classList.add("hidden"));$(b.dataset.page).classList.remove("hidden");});}
function renderAll(){renderDashboard();renderWork();renderTally();renderPeople();renderAccounts();}

function renderDashboard(){
  const allMonths=DB.tallyMonths||[],t=allMonths.slice(-5);
  const today=new Date(),todayMonth=currentMonth(),todayDay=String(today.getDate());
  const att=(DB.attendance||[]).filter(a=>a.month===todayMonth);
  const todayAttendance=att.reduce((count,a)=>count+(a.days&&a.days[todayDay]==="P"?1:0),0);
  $("dashboard").innerHTML=`
  <div class="card"><div class="label">Source</div><div class="metric">Monthly tally.xlsx</div><p class="note">Historical workbook data is loaded into the app. New entries are stored locally on this device.</p></div>
  <div class="grid">
    <div class="card"><div class="label">Total profit</div><div class="metric">${money(DB.summary.totalProfit)}</div></div>
    <div class="card"><div class="label">Today's attendance</div><div class="metric">${todayAttendance}</div><div class="note">${today.getDate()} ${monthName(todayMonth)} ${today.getFullYear()}</div></div>
    <div class="card"><div class="label">Work entries</div><div class="metric">${DB.dailyWork.length}</div></div>
    <div class="card"><div class="label">Employees / advances</div><div class="metric">${DB.advances.length}</div></div>
  </div>
  <div class="section-title">Last 5 months</div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Month</th><th>Expenses</th><th>Payments</th><th>Net profit</th></tr></thead><tbody>
  ${t.map(m=>`<tr><td>${monthName(m.month)}</td><td>${money(m.expenseTotal)}</td><td>${money(m.paymentTotal)}</td><td class="${num(m.netProfit)>=0?"positive":"negative"}">${money(m.netProfit)}</td></tr>`).join("")}
  </tbody></table></div></div>
  <div class="section-title">Backup</div>
  <div class="card"><div class="actions"><button class="primary" onclick="downloadBackup()">Export app data</button><button onclick="resetToHistorical()">Reset to imported workbook</button></div></div>`;
}

function renderWork(){
  const rows=DB.dailyWork||[],cm=currentMonth();
  const grouped={};
  rows.forEach((r,i)=>{const m=(r.date||"").slice(0,7)||cm;(grouped[m]??=[]).push({...r,_i:i});});
  const months=Object.keys(grouped).sort().reverse();
  if(!grouped[cm])grouped[cm]=[],months.unshift(cm);
  const total=grouped[cm].reduce((a,r)=>a+(r.total!=null?num(r.total):num(r.L)*num(r.B)*num(r.H)*num(r.rate)),0);
  $("work").innerHTML=`
  <div class="section-title">Daily Work</div>
  <div class="carousel card"><div class="carousel-head"><div><div class="label">This month total</div><div class="carousel-total">${money(total)}</div></div><div class="carousel-controls"><button onclick="shiftCarousel(-1,'workCarousel')">‹</button><span>Current month</span><button onclick="shiftCarousel(1,'workCarousel')">›</button></div></div></div>
  <div class="card"><div class="formgrid">
    <label>Date<input id="wDate" type="date" value="${todayISO()}"></label><label>Job<input id="wJob" placeholder="Job description"></label>
    <label>L<input id="wL" type="number" step="any"></label><label>B<input id="wB" type="number" step="any"></label><label>H<input id="wH" type="number" step="any"></label><label>Rate<input id="wRate" type="number" step="any" value="54"></label>
  </div><br><button class="primary" onclick="addWork()">Add work entry</button></div>
  <div id="workCarousel" class="month-list">${months.map((m,i)=>workMonthCard(m,grouped[m],m===cm||i===0)).join("")}</div>`;
}
function workMonthCard(m,rows,open){
  const total=rows.reduce((a,r)=>a+(r.total!=null?num(r.total):num(r.L)*num(r.B)*num(r.H)*num(r.rate)),0);
  return `<details class="month-card" ${open?"open":""}><summary><span><b>${monthName(m)}</b><small>${m}</small></span><strong>${money(total)}</strong></summary><div class="details-body"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Job</th><th>L</th><th>B</th><th>H</th><th>Rate</th><th>Total</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr>
    <td><input class="cell" type="date" value="${esc(r.date)}" onchange="editWork(${r._i},'date',this.value)"></td>
    <td><input class="cell wide" value="${esc(r.job)}" onchange="editWork(${r._i},'job',this.value)"></td>
    <td><input class="cell small" type="number" step="any" value="${esc(r.L)}" onchange="editWork(${r._i},'L',this.value)"></td>
    <td><input class="cell small" type="number" step="any" value="${esc(r.B)}" onchange="editWork(${r._i},'B',this.value)"></td>
    <td><input class="cell small" type="number" step="any" value="${esc(r.H)}" onchange="editWork(${r._i},'H',this.value)"></td>
    <td><input class="cell small" type="number" step="any" value="${esc(r.rate)}" onchange="editWork(${r._i},'rate',this.value)"></td>
    <td><b>${money(num(r.L)*num(r.B)*num(r.H)*num(r.rate))}</b></td><td><button class="danger" onclick="deleteWork(${r._i})">Delete</button></td>
  </tr>`).join("")}</tbody></table></div></div></details>`;
}
function addWork(){const r={date:$('wDate').value,job:$('wJob').value.trim(),L:num($('wL').value),B:num($('wB').value),H:num($('wH').value),rate:num($('wRate').value)};r.total=r.L*r.B*r.H*r.rate;if(!r.date||!r.job)return alert("Enter a date and job.");DB.dailyWork.push(r);save();renderAll();}
function editWork(i,k,v){if(!DB.dailyWork[i])return;DB.dailyWork[i][k]=["L","B","H","rate"].includes(k)?num(v):v;DB.dailyWork[i].total=num(DB.dailyWork[i].L)*num(DB.dailyWork[i].B)*num(DB.dailyWork[i].H)*num(DB.dailyWork[i].rate);save();renderWork();}
function deleteWork(i){if(confirm("Delete this work entry?")){DB.dailyWork.splice(i,1);save();renderAll();}}
function shiftCarousel(delta,id){const el=$(id);if(!el)return;const open=[...el.querySelectorAll("details")];const idx=open.findIndex(x=>x.open);const next=Math.max(0,Math.min(open.length-1,(idx<0?0:idx)+delta));open.forEach(x=>x.open=false);if(open[next])open[next].open=true;open[next]?.scrollIntoView({behavior:"smooth",block:"nearest"});}

function ensureCurrentTally(){let m=DB.tallyMonths.find(x=>x.month===currentMonth());if(!m){m={month:currentMonth(),sourceRow:null,expenses:[],payments:[],expenseTotal:0,paymentTotal:0,netProfit:0};DB.tallyMonths.push(m);DB.tallyMonths.sort((a,b)=>a.month.localeCompare(b.month));}return m;}
function recalcMonth(m){m.expenseTotal=m.expenses.reduce((a,x)=>a+num(x.amount),0);m.paymentTotal=m.payments.reduce((a,x)=>a+num(x.amount),0);m.netProfit=m.paymentTotal-m.expenseTotal;}
function renderTally(){
  const cm=currentMonth(),current=ensureCurrentTally();recalcMonth(current);save();
  const months=[...DB.tallyMonths].sort((a,b)=>b.month.localeCompare(a.month));
  $("tally").innerHTML=`<div class="section-title">Monthly Tally</div>
  <div class="carousel card"><div class="carousel-head"><div><div class="label">${monthName(cm)} total</div><div class="carousel-total">${money(current.netProfit)}</div><div class="note">Payments ${money(current.paymentTotal)} − Expenses ${money(current.expenseTotal)}</div></div><div class="carousel-controls"><button onclick="shiftCarousel(-1,'tallyMonths')">‹</button><span>Input</span><button onclick="shiftCarousel(1,'tallyMonths')">›</button></div></div>
  <div class="entry-carousel"><div class="entry-panel"><h3>Add expense</h3><div class="formgrid"><label>Date<input id="tExpDate" type="date" value="${todayISO()}"></label><label>Description<input id="tExpDesc" placeholder="Expense description"></label><label>Amount<input id="tExpAmt" type="number" step="any"></label><label>Note<input id="tExpNote" placeholder="Optional"></label></div><br><button class="primary" onclick="addTallyEntry('expense')">Add expense</button></div>
  <div class="entry-panel"><h3>Add payment</h3><div class="formgrid"><label>Date<input id="tPayDate" type="date" value="${todayISO()}"></label><label>Description<input id="tPayDesc" placeholder="Payment description"></label><label>Bill no.<input id="tPayBill" placeholder="Optional"></label><label>Amount<input id="tPayAmt" type="number" step="any"></label></div><br><button class="primary" onclick="addTallyEntry('payment')">Add payment</button></div></div></div>
  <div id="tallyMonths" class="month-list">${months.map((m,i)=>tallyMonthCard(m,m.month===cm||i===0)).join("")}</div>`;
}
function tallyMonthCard(m,open){
  recalcMonth(m);
  return `<details class="month-card" ${open?"open":""}><summary><span><b>${monthName(m.month)}</b><small>${m.month}</small></span><strong>${money(m.netProfit)}</strong></summary><div class="details-body">
  <div class="grid"><div><span class="label">Expenses</span><br><b>${money(m.expenseTotal)}</b></div><div><span class="label">Payments</span><br><b>${money(m.paymentTotal)}</b></div><div><span class="label">Net profit</span><br><b class="${m.netProfit>=0?'positive':'negative'}">${money(m.netProfit)}</b></div></div>
  <div class="section-title" style="font-size:14px">Expenses</div><div class="table-wrap"><table><thead><tr><th>#</th><th>Description</th><th>Amount</th><th>Date</th><th>Note</th><th></th></tr></thead><tbody>${m.expenses.map((x,i)=>`<tr><td>${esc(x.sr)}</td><td><input class="cell wide" value="${esc(x.description)}" onchange="editTally('${m.month}','expense',${i},'description',this.value)"></td><td><input class="cell small" type="number" step="any" value="${esc(x.amount)}" onchange="editTally('${m.month}','expense',${i},'amount',this.value)"></td><td><input class="cell" type="date" value="${esc(x.date||'')}" onchange="editTally('${m.month}','expense',${i},'date',this.value)"></td><td><input class="cell wide" value="${esc(x.note)}" onchange="editTally('${m.month}','expense',${i},'note',this.value)"></td><td><button class="danger" onclick="deleteTally('${m.month}','expense',${i})">Delete</button></td></tr>`).join("")}</tbody></table></div>
  <div class="section-title" style="font-size:14px">Payments</div><div class="table-wrap"><table><thead><tr><th>#</th><th>Date</th><th>Description</th><th>Bill</th><th>Amount</th><th></th></tr></thead><tbody>${m.payments.map((x,i)=>`<tr><td>${esc(x.sr)}</td><td><input class="cell" type="date" value="${esc(x.date||'')}" onchange="editTally('${m.month}','payment',${i},'date',this.value)"></td><td><input class="cell wide" value="${esc(x.description)}" onchange="editTally('${m.month}','payment',${i},'description',this.value)"></td><td><input class="cell" value="${esc(x.billNo)}" onchange="editTally('${m.month}','payment',${i},'billNo',this.value)"></td><td><input class="cell small" type="number" step="any" value="${esc(x.amount)}" onchange="editTally('${m.month}','payment',${i},'amount',this.value)"></td><td><button class="danger" onclick="deleteTally('${m.month}','payment',${i})">Delete</button></td></tr>`).join("")}</tbody></table></div></div></details>`;
}
function addTallyEntry(type){const m=ensureCurrentTally();if(type==='expense'){const amount=num($('tExpAmt').value),desc=$('tExpDesc').value.trim();if(!amount||!desc)return alert('Enter an expense description and amount.');m.expenses.push({sr:m.expenses.length+1,description:desc,amount,date:$('tExpDate').value,balance:null,note:$('tExpNote').value.trim()});}else{const amount=num($('tPayAmt').value),desc=$('tPayDesc').value.trim();if(!amount||!desc)return alert('Enter a payment description and amount.');m.payments.push({sr:m.payments.length+1,date:$('tPayDate').value,description:desc,billNo:$('tPayBill').value.trim(),amount,balance:null});}recalcMonth(m);save();renderAll();}
function findMonth(m){return DB.tallyMonths.find(x=>x.month===m)}
function editTally(mn,type,i,k,v){const m=findMonth(mn);if(!m||!m[type+'s']?.[i])return;const arr=m[type+'s'];arr[i][k]=k==='amount'?num(v):v;recalcMonth(m);save();renderTally();}
function deleteTally(mn,type,i){const m=findMonth(mn);if(!m)return;if(confirm('Delete this tally entry?')){m[type+'s'].splice(i,1);m[type+'s'].forEach((x,j)=>x.sr=j+1);recalcMonth(m);save();renderAll();}}

function attendanceRateMap(){
  const map={};
  const rows=DB.rawSheets?.['Attendence ']?.rows||[];
  let month=null;
  for(const row of rows){
    const v=row.values||[];
    if(typeof v[0]==='string' && /^\d{4}-\d{2}-\d{2}T/.test(v[0])){month=v[0].slice(0,7);continue;}
    if(month && v[0] && typeof v[0]==='string' && v[37]!=null && Number(v[37])>0)map[month+'|'+v[0].trim()]=Number(v[37]);
  }
  return map;
}
function ensureAttendanceMonth(month){
  DB.attendance=DB.attendance||[];
  const rows=DB.attendance.filter(a=>a.month===month);
  if(rows.length)return rows;
  const names=[...new Set(DB.attendance.map(a=>a.employee))];
  const created=names.map(employee=>({month,employee,days:{},daysCount:0,ot:0,halfDays:0,total:0,rate:0,wage:0}));
  DB.attendance.push(...created); return created;
}
function recalcAttendance(a){
  const vals=Object.values(a.days||{});
  a.daysCount=vals.filter(v=>v==='P').length;
  a.halfDays=vals.filter(v=>v==='H').length;
  a.total=a.daysCount+num(a.halfDays)*0.5+num(a.ot);
  a.wage=a.total*num(a.rate);
}
function setAttendanceMonth(v){window.attendanceViewMonth=v;renderPeople();}
function setAttendance(i,day,v){const a=DB.attendance[i];if(!a)return;a.days=a.days||{};a.days[String(day)]=v||null;recalcAttendance(a);save();renderPeople();}
function updateAttendance(){const employee=$('attEmployee').value;const date=$('attDate').value;const status=$('attStatus').value;if(!employee||!date)return alert('Select an employee and date.');const month=date.slice(0,7);ensureAttendanceMonth(month);let a=DB.attendance.find(x=>x.month===month&&x.employee===employee);if(!a){a={month,employee,days:{},daysCount:0,ot:0,halfDays:0,total:0,rate:0,wage:0};DB.attendance.push(a);}a.days[String(Number(date.slice(8,10)))]=status||null;recalcAttendance(a);save();window.attendanceViewMonth=month;renderPeople();}
function editAttendanceField(i,k,v){const a=DB.attendance[i];if(!a)return;a[k]=['ot','rate'].includes(k)?num(v):v;recalcAttendance(a);save();renderPeople();}
function addAdvance(){const employee=$('advEmployee').value.trim(),given=num($('advGiven').value),upcoming=num($('advUpcoming').value),second=num($('advSecond').value),third=num($('advThird').value);if(!employee||!given)return alert('Enter an employee name and advance amount.');DB.advances.push({employee,advanceGiven:given,upcomingDeduction:upcoming,secondDeduction:second,thirdDeduction:third,difference:given-upcoming-second-third});save();renderPeople();}
function editAdvance(i,k,v){const a=DB.advances[i];if(!a)return;a[k]=k==='employee'?v:num(v);a.difference=num(a.advanceGiven)-num(a.upcomingDeduction)-num(a.secondDeduction)-num(a.thirdDeduction);save();renderPeople();}
function deleteAdvance(i){if(confirm('Delete this advance entry?')){DB.advances.splice(i,1);save();renderPeople();}}
function attendanceRateMap(){
  const map={};
  const rows=DB.rawSheets?.['Attendence ']?.rows||[];
  let month=null;
  for(const row of rows){
    const v=row.values||[];
    if(typeof v[0]==='string' && /^\d{4}-\d{2}-\d{2}T/.test(v[0])){month=v[0].slice(0,7);continue;}
    if(month && v[0] && typeof v[0]==='string' && v[37]!=null && Number(v[37])>0)map[month+'|'+v[0].trim()]=Number(v[37]);
  }
  return map;
}
function ensureAttendanceMonth(month){
  DB.attendance=DB.attendance||[];
  const rows=DB.attendance.filter(a=>a.month===month);
  if(rows.length)return rows;
  const names=[...new Set(DB.attendance.map(a=>a.employee))];
  const created=names.map(employee=>({month,employee,days:{},daysCount:0,ot:0,halfDays:0,total:0,rate:0,wage:0}));
  DB.attendance.push(...created); return created;
}
function recalcAttendance(a){
  const vals=Object.values(a.days||{});
  a.daysCount=vals.filter(v=>v==='P').length;
  a.halfDays=vals.filter(v=>v==='H').length;
  a.total=a.daysCount+num(a.halfDays)*0.5+num(a.ot);
  a.wage=a.total*num(a.rate);
}
function setAttendanceMonth(v){window.attendanceViewMonth=v;renderPeople();}
function setAttendance(i,day,v){const a=DB.attendance[i];if(!a)return;a.days=a.days||{};a.days[String(day)]=v||null;recalcAttendance(a);save();renderPeople();}
function updateAttendance(){const employee=$('attEmployee').value;const date=$('attDate').value;const status=$('attStatus').value;if(!employee||!date)return alert('Select an employee and date.');const month=date.slice(0,7);ensureAttendanceMonth(month);let a=DB.attendance.find(x=>x.month===month&&x.employee===employee);if(!a){a={month,employee,days:{},daysCount:0,ot:0,halfDays:0,total:0,rate:0,wage:0};DB.attendance.push(a);}a.days[String(Number(date.slice(8,10)))]=status||null;recalcAttendance(a);save();window.attendanceViewMonth=month;renderPeople();}
function editAttendanceField(i,k,v){const a=DB.attendance[i];if(!a)return;a[k]=['ot','rate'].includes(k)?num(v):v;recalcAttendance(a);save();renderPeople();}
function addAdvance(){const employee=$('advEmployee').value.trim(),given=num($('advGiven').value),upcoming=num($('advUpcoming').value),second=num($('advSecond').value),third=num($('advThird').value);if(!employee||!given)return alert('Enter an employee name and advance amount.');DB.advances.push({employee,advanceGiven:given,upcomingDeduction:upcoming,secondDeduction:second,thirdDeduction:third,difference:given-upcoming-second-third});save();renderPeople();}
function editAdvance(i,k,v){const a=DB.advances[i];if(!a)return;a[k]=k==='employee'?v:num(v);a.difference=num(a.advanceGiven)-num(a.upcomingDeduction)-num(a.secondDeduction)-num(a.thirdDeduction);save();renderPeople();}
function deleteAdvance(i){if(confirm('Delete this advance entry?')){DB.advances.splice(i,1);save();renderPeople();}}
function renderPeople(){
  const cm=currentMonth(), rates=attendanceRateMap(); ensureAttendanceMonth(cm);
  (DB.attendance||[]).forEach(a=>{if(!a.rate)a.rate=rates[a.month+'|'+String(a.employee||'').trim()]||0;recalcAttendance(a);}); save();
  const months=[...new Set((DB.attendance||[]).map(a=>a.month).filter(Boolean))].sort().reverse();
  if(!months.includes(cm))months.unshift(cm);
  const active=months.includes(window.attendanceViewMonth)?window.attendanceViewMonth:cm; window.attendanceViewMonth=active;
  const rows=(DB.attendance||[]).map((a,i)=>({...a,_i:i})).filter(a=>a.month===active);
  const daysInMonth=new Date(Number(active.slice(0,4)),Number(active.slice(5,7)),0).getDate();
  const totalWages=rows.reduce((x,a)=>x+num(a.wage),0);
  const employees=[...new Set((DB.attendance||[]).map(a=>a.employee).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const advanceRows=(DB.advances||[]).map((a,i)=>({...a,_i:i,difference:num(a.advanceGiven)-num(a.upcomingDeduction)-num(a.secondDeduction)-num(a.thirdDeduction)})).sort((a,b)=>(a.difference===0)-(b.difference===0));
  $('people').innerHTML=`
  <div class="section-title">Attendance — ${monthName(active)}</div>
  <div class="card"><div class="formgrid"><label>Month<select onchange="setAttendanceMonth(this.value)">${months.map(m=>`<option value="${m}" ${m===active?'selected':''}>${monthName(m)} ${m.slice(0,4)}</option>`).join('')}</select></label><label>Daily update — date<input id="attDate" type="date" value="${todayISO()}"></label><label>Person<select id="attEmployee">${employees.map(n=>`<option>${esc(n)}</option>`).join('')}</select></label><label>Status<select id="attStatus"><option value="P">Present</option><option value="H">Half day</option><option value="">Absent / clear</option></select></label></div><br><button class="primary" onclick="updateAttendance()">Update attendance</button><p class="note">Tap any daily cell below to change it. P = present, H = half day, blank = absent/clear.</p></div>
  <div class="card"><div class="carousel-head"><div><div class="label">${monthName(active)} wages</div><div class="carousel-total">${money(totalWages)}</div></div><div class="note">${rows.length} people</div></div></div>
  <div class="card"><div class="table-wrap"><table class="attendance-table"><thead><tr><th>Employee</th>${Array.from({length:daysInMonth},(_,i)=>`<th>${i+1}</th>`).join('')}<th>Days</th><th>OT</th><th>Half</th><th>Total</th><th>Rate</th><th>Wage</th></tr></thead><tbody>
  ${rows.map(a=>`<tr><th>${esc(a.employee)}</th>${Array.from({length:daysInMonth},(_,d)=>{const day=d+1, val=a.days?.[String(day)]||'';return `<td><select class="att-cell" onchange="setAttendance(${a._i},${day},this.value)"><option value="" ${val===''?'selected':''}></option><option value="P" ${val==='P'?'selected':''}>P</option><option value="H" ${val==='H'?'selected':''}>H</option></select></td>`}).join('')}<td><b>${a.daysCount}</b></td><td><input class="cell tiny" type="number" step="any" value="${esc(a.ot||0)}" onchange="editAttendanceField(${a._i},'ot',this.value)"></td><td>${a.halfDays||0}</td><td><b>${a.total}</b></td><td><input class="cell tiny" type="number" step="any" value="${esc(a.rate||0)}" onchange="editAttendanceField(${a._i},'rate',this.value)"></td><td><b>${money(a.wage)}</b></td></tr>`).join('')}</tbody></table></div></div>

  <div class="section-title">Advances</div>
  <div class="card"><div class="formgrid"><label>Employee<input id="advEmployee" placeholder="Employee name"></label><label>Advance given<input id="advGiven" type="number" step="any"></label><label>Upcoming deduction<input id="advUpcoming" type="number" step="any"></label><label>2nd deduction<input id="advSecond" type="number" step="any"></label><label>3rd deduction<input id="advThird" type="number" step="any"></label></div><br><button class="primary" onclick="addAdvance()">Add advance</button></div>
  <div class="card"><div class="table-wrap"><table><thead><tr><th>Employee</th><th>Given</th><th>Upcoming</th><th>2nd</th><th>3rd</th><th>Difference</th><th></th></tr></thead><tbody>${advanceRows.map(a=>`<tr class="${a.difference===0?'settled':''}"><td><input class="cell wide" value="${esc(a.employee)}" onchange="editAdvance(${a._i},'employee',this.value)"></td><td><input class="cell small" type="number" value="${a.advanceGiven||0}" onchange="editAdvance(${a._i},'advanceGiven',this.value)"></td><td><input class="cell small" type="number" value="${a.upcomingDeduction||0}" onchange="editAdvance(${a._i},'upcomingDeduction',this.value)"></td><td><input class="cell small" type="number" value="${a.secondDeduction||0}" onchange="editAdvance(${a._i},'secondDeduction',this.value)"></td><td><input class="cell small" type="number" value="${a.thirdDeduction||0}" onchange="editAdvance(${a._i},'thirdDeduction',this.value)"></td><td><b>${money(a.difference)}</b></td><td><button class="danger" onclick="deleteAdvance(${a._i})">Delete</button></td></tr>`).join('')}</tbody></table></div><p class="note">Settled advances (difference ₹0) are automatically moved to the bottom and highlighted green.</p></div>

  <div class="section-title">Attendance archive</div>
  <div class="month-list">${months.filter(m=>m!==cm).map(m=>{const rs=(DB.attendance||[]).filter(a=>a.month===m);return `<details class="month-card"><summary><span><b>${monthName(m)}</b><small>${m}</small></span><strong>${rs.length} people</strong></summary><div class="details-body"><button onclick="setAttendanceMonth('${m}')">Open this month</button></div></details>`}).join('')}</div>`;
}
function renderAccounts(){$("accounts").innerHTML=`<div class="section-title">Devki Account</div><div class="card"><div class="table-wrap"><table><thead><tr><th>Date</th><th>In</th><th>Amount</th><th>Out</th><th>Amount</th><th>Pending</th><th>Amount</th></tr></thead><tbody>${DB.devki.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.inDescription)}</td><td>${money(x.inAmount)}</td><td>${esc(x.outDescription)}</td><td>${money(x.outAmount)}</td><td>${esc(x.pendingDescription)}</td><td>${money(x.pendingAmount)}</td></tr>`).join("")}</tbody></table></div></div><div class="section-title">Personal Account</div><div class="card"><div class="table-wrap"><table><thead><tr><th>Date</th><th>In</th><th>Amount</th><th>Out</th><th>Amount</th></tr></thead><tbody>${DB.personal.map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.inDescription)}</td><td>${money(x.inAmount)}</td><td>${esc(x.outDescription)}</td><td>${money(x.outAmount)}</td></tr>`).join("")}</tbody></table></div></div>`;}
function downloadBackup(){const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='monthly-tally-backup.json';a.click();URL.revokeObjectURL(a.href);}
async function resetToHistorical(){if(!confirm('Reset all app changes and restore the imported workbook data?'))return;DB=await fetch('seed-data.json?reset='+Date.now()).then(r=>r.json());save();renderAll();$("sourceBadge").textContent='Historical Excel imported';}
init();
