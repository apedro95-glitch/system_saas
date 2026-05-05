import { loadMembers, getCurrentClanTag } from './real-data.js';
import { syncWarSilently, loadCurrentWarForUi, loadWarHistory, getDailyAttackDots, getWarWeekContext } from './war-logic.js?v=war-period-isolation-fix-v3';
import { isCurrentUserMember, getAvatarForMember } from './identity.js';
let warMembers=[];
function tr(key, vars={}){ return window.TopBRSI18n?.t ? window.TopBRSI18n.t(key, vars) : key; }
function currentLang(){ return window.TopBRSI18n?.getLanguage?.() || localStorage.getItem('topbrs_language') || 'pt-BR'; }
const MONTHS_I18N={
 'pt-BR':['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
 'en-US':['January','February','March','April','May','June','July','August','September','October','November','December'],
 'es-ES':['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
};
const SHORT_MONTHS_I18N={
 'pt-BR':['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
 'en-US':['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
 'es-ES':['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
};
const DAYS_I18N={
 'pt-BR':['Quinta-feira','Sexta-feira','Sábado','Domingo'],
 'en-US':['Thursday','Friday','Saturday','Sunday'],
 'es-ES':['Jueves','Viernes','Sábado','Domingo']
};
const SHORT_DAYS_I18N={
 'pt-BR':['Qui','Sex','Sáb','Dom'],
 'en-US':['Thu','Fri','Sat','Sun'],
 'es-ES':['Jue','Vie','Sáb','Dom']
};
function monthName(short){ const i=monthOrder.indexOf(short); return (MONTHS_I18N[currentLang()]||MONTHS_I18N['pt-BR'])[i] || fullMonths[short]; }
function monthShort(short){ const i=monthOrder.indexOf(short); return (SHORT_MONTHS_I18N[currentLang()]||SHORT_MONTHS_I18N['pt-BR'])[i] || short; }
function weekLabel(){ const n=selectedWeek.replace('S',''); return currentLang()==='en-US' ? `Week ${n}` : `Semana ${n}`; }
function dayName(i=selectedDay){ return (DAYS_I18N[currentLang()]||DAYS_I18N['pt-BR'])[i] || days[i]; }
function shortDayName(i=selectedDay){ return (SHORT_DAYS_I18N[currentLang()]||SHORT_DAYS_I18N['pt-BR'])[i] || shortDays[i]; }


const fullMonths={Jan:'Janeiro',Fev:'Fevereiro',Mar:'Março',Abr:'Abril',Mai:'Maio',Jun:'Junho',Jul:'Julho',Ago:'Agosto',Set:'Setembro',Out:'Outubro',Nov:'Novembro',Dez:'Dezembro'};
const monthOrder=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
function shortMonthFromMonthKey(monthKey){
 const n = Number(String(monthKey || '').split('-')[1]);
 return monthOrder[Math.max(0, Math.min(11, (n || 1) - 1))] || 'Jan';
}

const days=['Quinta-feira','Sexta-feira','Sábado','Domingo'];
const shortDays=['Qui','Sex','Sáb','Dom'];

let CURRENT_MONTH='Abr';
let CURRENT_WEEK='S4';
const WEEKLY_ATTACKS_PER_MEMBER=16;
const DAILY_ATTACKS_PER_MEMBER=4;

let activeWarTab='members';
let selectedMonth='Abr';
let selectedWeek='S4';
let selectedDay=0;
let currentWarHistoryMembers = {};

function fameClass(v){return v>=11000?'green':v>=9500?'yellow':'red'}
function fmt(v){return v.toLocaleString('pt-BR')}

function memberAttackMetric(m){
 const dayKey=['D1','D2','D3','D4'][selectedDay] || 'D1';
 if(activeWarTab==='attacks') return Number(m.days?.[dayKey]?.attacks || m.dayAttacks || 0);
 return Number(String(m.weekly || '0/16').split('/')[0]) || 0;
}
function memberFameMetric(m){
 const dayKey=['D1','D2','D3','D4'][selectedDay] || 'D1';
 if(activeWarTab==='attacks') return Number(m.days?.[dayKey]?.fame ?? m.dayFame ?? 0);
 return Number(m.weeklyFame ?? m.fame ?? 0);
}

function sortWarMembersForActiveTab(list){
 return [...list].sort((a,b)=>{
  const fameDiff = memberFameMetric(b) - memberFameMetric(a);
  if(fameDiff) return fameDiff;
  return memberAttackMetric(b) - memberAttackMetric(a);
 });
}

function dots(n){return '<div class="attack-dots">'+[0,1,2,3].map(i=>`<i class="${i<n?'done':''}"></i>`).join('')+'</div>'}

function weekNumber(week){
 return Number(String(week).replace('S','')) || 1;
}

function monthKeyFromShort(shortMonth){
 const currentCtx = getWarWeekContext(new Date());
 const year = String(currentCtx.monthKey || '').split('-')[0] || String(new Date().getFullYear());
 const monthNumber = monthOrder.indexOf(shortMonth) + 1;
 return `${year}-${String(Math.max(1, monthNumber)).padStart(2,'0')}`;
}

function isSelectedCurrentPeriod(){
 return selectedMonth === CURRENT_MONTH && selectedWeek === CURRENT_WEEK;
}

function emptyDays(){
 return {D1:{attacks:0,fame:0},D2:{attacks:0,fame:0},D3:{attacks:0,fame:0},D4:{attacks:0,fame:0}};
}

function normalizeSavedDays(saved){
 return {
  D1:{attacks:Number(saved?.days?.D1?.attacks || 0), fame:Number(saved?.days?.D1?.fame || 0)},
  D2:{attacks:Number(saved?.days?.D2?.attacks || 0), fame:Number(saved?.days?.D2?.fame || 0)},
  D3:{attacks:Number(saved?.days?.D3?.attacks || 0), fame:Number(saved?.days?.D3?.fame || 0)},
  D4:{attacks:Number(saved?.days?.D4?.attacks || 0), fame:Number(saved?.days?.D4?.fame || 0)}
 };
}

function buildWarMember(m, saved={}, dayKey='D1'){
 const daysData = saved?.days ? normalizeSavedDays(saved) : emptyDays();
 const weeklyAttacks = Number(saved.weeklyAttacks ?? Object.values(daysData).reduce((sum,d)=>sum + Number(d?.attacks || 0),0));
 const totalFame = Number(saved.weeklyFame ?? Object.values(daysData).reduce((sum,d)=>sum + Number(d?.fame || 0),0));
 const todayFame = Number(daysData?.[dayKey]?.fame || 0);
 return {
  name:m.name||saved.name||'Membro',
  tag:m.tag||saved.tag||'',
  avatar:(m.name||saved.name||'?').slice(0,1),
  avatarSrc:getAvatarForMember({...m, ...saved}),
  current:isCurrentUserMember({...m, ...saved}),
  weekly:`${weeklyAttacks}/16`,
  fame:totalFame,
  weeklyFame:totalFame,
  dayFame:todayFame,
  dayAttacks:getDailyAttackDots({days:daysData}, dayKey),
  days:daysData,
  warPoints:saved.warPoints || 0
 };
}

function getWarState(){
 const selectedMonthIndex=monthOrder.indexOf(selectedMonth);
 const currentMonthIndex=monthOrder.indexOf(CURRENT_MONTH);
 const selectedWeekNumber=weekNumber(selectedWeek);
 const currentWeekNumber=weekNumber(CURRENT_WEEK);

 if(selectedMonthIndex < currentMonthIndex) return 'finished';
 if(selectedMonthIndex > currentMonthIndex) return 'future';
 if(selectedWeekNumber < currentWeekNumber) return 'finished';
 if(selectedWeekNumber > currentWeekNumber) return 'future';
 return 'current';
}

function updateWarStatus(){
 const pill=document.querySelector('#warStatusPill');
 if(!pill) return;

 const label=pill.querySelector('b');
 const state=getWarState();
 const ctx=getWarWeekContext(new Date());

 pill.classList.remove('state-current','state-finished','state-future','em','final','future');

 if(state==='finished'){
  pill.classList.add('final');
  if(label) label.textContent=tr('war.finished');
 }else if(state==='future'){
  pill.classList.add('future');
  if(label) label.textContent=tr('war.future');
 }else{
  pill.classList.add(ctx.active ? 'em' : 'final');
  if(label) label.textContent=ctx.active?tr('war.inProgress'):tr('war.outside');
 }
}

function updateWarBlock(){
 const period=document.querySelector('#warBlockPeriod');
 const day=document.querySelector('#warBlockDay');
 const attacks=document.querySelector('#warAttacksUsed');
 const fame=document.querySelector('#warBlockFame');
 const progress=document.querySelector('#warBlockProgressBar');

 const eligibleMembers=warMembers.length;
 const dayKey=['D1','D2','D3','D4'][selectedDay] || 'D1';
 const isDayTab=activeWarTab==='attacks';
 const totalAttacks=eligibleMembers * (isDayTab ? DAILY_ATTACKS_PER_MEMBER : WEEKLY_ATTACKS_PER_MEMBER);
 const usedAttacks=warMembers.reduce((sum,m)=>{
  if(isDayTab) return sum + Number(m.days?.[dayKey]?.attacks || m.dayAttacks || 0);
  const done=Number(String(m.weekly).split('/')[0]) || 0;
  return sum+done;
 },0);
 const totalFame=warMembers.reduce((sum,m)=>sum + (isDayTab ? Number(m.days?.[dayKey]?.fame || m.dayFame || 0) : Number(m.weeklyFame ?? m.fame ?? 0)),0);

 if(period) period.textContent=`${monthName(selectedMonth)} • ${weekLabel()}`;

 if(day){
  if(isDayTab){
   day.hidden=false;
   day.textContent=dayName(selectedDay);
  }else{
   day.hidden=true;
   day.textContent='';
  }
 }

 if(attacks) attacks.textContent=`${usedAttacks} / ${totalAttacks}`;
 if(fame) fame.textContent=fmt(totalFame);
 if(progress) progress.style.width=`${totalAttacks ? Math.min(100,(usedAttacks/totalAttacks)*100) : 0}%`;

 updateWarStatus();
}

function updateWarHeader(){
 const period=document.querySelector('#warPeriodLabel');
 if(period) period.innerHTML=`<strong>${monthName(selectedMonth)}</strong><span>${weekLabel()}</span>`;
 updateWarBlock();
}

function renderWarList(){
 const list=document.querySelector('#warList'),head=document.querySelector('#warTableHead');
 updateWarHeader();

 if(activeWarTab==='members'){
  head.innerHTML=`<span>${tr('war.member')}</span><span>${tr('war.fame')}</span><span>${tr('war.attacks')}</span>`;
  list.innerHTML=sortWarMembersForActiveTab(warMembers).map((m,i)=>`<div class="war-row members-row ${m.current ? 'is-current-member' : ''}"><div class="war-member-cell"><span class="war-avatar tier-${Math.min(i+1,4)}"><img src="${m.avatarSrc || 'assets/icons/profile-user.svg'}" alt="" aria-hidden="true"></span><strong>${m.name}${m.current ? ` <em class="you-badge">${tr('common.you')}</em>` : ''}</strong></div><strong class="fame ${fameClass(m.fame)}">${fmt(m.weeklyFame ?? m.fame)}</strong><strong class="attack-count">${m.weekly}</strong></div>`).join('');
 }else{
  head.innerHTML=`<span>${tr('war.member')}</span><span>${tr('war.fame')}</span><span>${tr('war.attacks')}</span>`;
  list.innerHTML=sortWarMembersForActiveTab(warMembers).map((m,i)=>`<div class="war-row attacks-row ${m.current ? 'is-current-member' : ''}"><div class="war-member-cell"><span class="war-avatar tier-${Math.min(i+1,4)}"><img src="${m.avatarSrc || 'assets/icons/profile-user.svg'}" alt="" aria-hidden="true"></span><strong>${m.name}${m.current ? ` <em class="you-badge">${tr('common.you')}</em>` : ''}</strong></div><strong class="day-fame ${fameClass(m.days?.[['D1','D2','D3','D4'][selectedDay]]?.fame ?? m.dayFame ?? 0)}">${fmt(m.days?.[['D1','D2','D3','D4'][selectedDay]]?.fame ?? m.dayFame ?? 0)}</strong>${dots(m.days?.[['D1','D2','D3','D4'][selectedDay]]?.attacks || m.dayAttacks || 0)}</div>`).join('');
 }
}

function updateCalendarText(){
 const title=document.querySelector('.war-calendar-modal h2');
 const subtitle=document.querySelector('#calendarSubtitle');
 if(title) title.textContent=`${monthName(selectedMonth)} • ${weekLabel()}`;
 if(subtitle) subtitle.textContent=activeWarTab==='members'?tr('war.calendarSubtitleWeek'):tr('war.calendarSubtitleDay',{day:dayName(selectedDay)});
}

function bindCalendar(){
 document.querySelectorAll('.calendar-months button').forEach(btn=>{
  btn.classList.toggle('active', btn.dataset.value === selectedMonth);
  btn.addEventListener('click',async ()=>{
   selectedMonth=btn.dataset.value;
   document.querySelectorAll('.calendar-months button').forEach(b=>b.classList.remove('active'));
   btn.classList.add('active');
   await loadSelectedWarMembers();
   updateWarHeader();
   updateCalendarText();
   renderWarList();
  });
 });

 document.querySelectorAll('.calendar-weeks button').forEach(btn=>{
  if(!btn.dataset.value) btn.dataset.value=btn.textContent.trim();
  btn.classList.toggle('active', btn.dataset.value === selectedWeek);
  btn.addEventListener('click',async ()=>{
   selectedWeek=btn.dataset.value;
   document.querySelectorAll('.calendar-weeks button').forEach(b=>b.classList.remove('active'));
   btn.classList.add('active');
   await loadSelectedWarMembers();
   updateWarHeader();
   updateCalendarText();
   renderWarList();
  });
 });

 const daysBox=document.querySelector('#calendarDays');
 if(daysBox){
  daysBox.innerHTML=shortDays.map((d,i)=>`<button data-value="${i}" class="${i===selectedDay?'active':''}">${shortDayName(i)}</button>`).join('');
  daysBox.querySelectorAll('button').forEach(btn=>{
   btn.addEventListener('click',()=>{
    selectedDay=Number(btn.dataset.value);
    daysBox.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderWarList();
    updateCalendarText();
   });
  });
 }
}

document.querySelectorAll('.war-tab').forEach(btn=>btn.addEventListener('click',()=>{
 document.querySelectorAll('.war-tab').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active');
 activeWarTab=btn.dataset.tab;
 renderWarList();
}));

document.querySelector('#openWarCalendar')?.addEventListener('click',()=>{
 document.body.classList.add('modal-open');
 document.documentElement.classList.add('modal-open');
 bindCalendar();
 document.querySelector('#calendarDays')?.classList.toggle('hidden',activeWarTab==='members');
 updateCalendarText();
 document.querySelector('#warCalendarOverlay')?.classList.add('show');
});

function closeCal(){
 document.querySelector('#warCalendarOverlay')?.classList.remove('show');
 document.body.classList.remove('modal-open');
 document.documentElement.classList.remove('modal-open');
}

document.querySelector('#closeWarCalendar')?.addEventListener('click',closeCal);
document.querySelector('#warCalendarOverlay')?.addEventListener('click',e=>{if(e.target.id==='warCalendarOverlay')closeCal()});

document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('gesturechange',e=>e.preventDefault());
document.addEventListener('gestureend',e=>e.preventDefault());

let lastTouchEndWar=0;
document.addEventListener('touchend',e=>{
 const now=Date.now();
 if(now-lastTouchEndWar<=300)e.preventDefault();
 lastTouchEndWar=now;
},{passive:false});

document.addEventListener('touchmove',e=>{
 if(e.touches && e.touches.length>1)e.preventDefault();
},{passive:false});

async function loadSelectedWarMembers(){
 const apiMembers = (await loadMembers()).filter(m=>!m.removed);
 const dayKey=['D1','D2','D3','D4'][selectedDay] || 'D1';
 const state = getWarState();

 // Período futuro nunca deve herdar dados da janela atual.
 if(state === 'future'){
  currentWarHistoryMembers = {};
  warMembers = apiMembers.map(m=>buildWarMember(m, {}, dayKey));
  return;
 }

 const clanTag = getCurrentClanTag();
 const monthKey = monthKeyFromShort(selectedMonth);
 const weekKey = selectedWeek;
 let loadedMembers = {};

 // Só a semana atual pode sincronizar com a API. Meses/semanas selecionados usam histórico salvo.
 if(isSelectedCurrentPeriod()){
  try{ await syncWarSilently(); }catch(error){ console.warn('Sync guerra offline:', error); }
  try{
   const loaded = await loadCurrentWarForUi();
   loadedMembers = loaded.members || {};
  }catch(error){ console.warn('Histórico guerra offline:', error); }
 }else if(clanTag){
  try{
   const history = await loadWarHistory(clanTag, monthKey, weekKey);
   loadedMembers = history?.members || {};
  }catch(error){ console.warn('Histórico selecionado indisponível:', error); }
 }

 currentWarHistoryMembers = loadedMembers;
 warMembers = apiMembers.map(m=>{
  const id=String(m.tag || m.id || m.name || '').replace('#','').toUpperCase();
  const saved=loadedMembers[id] || {};
  return buildWarMember(m, saved, dayKey);
 });
}

async function loadRealWarMembers(){
 const ctx=getWarWeekContext(new Date());
 CURRENT_MONTH=shortMonthFromMonthKey(ctx.monthKey);
 CURRENT_WEEK=ctx.weekKey;
 selectedMonth=CURRENT_MONTH;
 selectedWeek=CURRENT_WEEK;
 selectedDay=Math.max(0, ctx.dayIndex || 0);
 await loadSelectedWarMembers();
}



await loadRealWarMembers();
bindCalendar();
renderWarList();


window.addEventListener('topbrs:languagechange',()=>{ updateWarHeader(); updateCalendarText(); bindCalendar(); renderWarList(); });
