import { loadMembers, warWindowState } from './real-data.js';
import { syncWarSilently, loadCurrentWarForUi, getDailyAttackDots, getWarWeekContext } from './war-logic.js';
import { isCurrentUserMember, getAvatarForMember } from './identity.js';
let warMembers=[];

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
const SYSTEM_ELIGIBLE_MEMBERS=20;
const WEEKLY_ATTACKS_PER_MEMBER=16;

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
function sortWarMembersForActiveTab(list){
 return [...list].sort((a,b)=>{
  const fameDiff = Number(b.fame || b.dayFame || 0) - Number(a.fame || a.dayFame || 0);
  if(fameDiff) return fameDiff;
  return memberAttackMetric(b) - memberAttackMetric(a);
 });
}

function dots(n){return '<div class="attack-dots">'+[0,1,2,3].map(i=>`<i class="${i<n?'done':''}"></i>`).join('')+'</div>'}

function weekNumber(week){
 return Number(String(week).replace('S','')) || 1;
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
  if(label) label.textContent='FINALIZADO';
 }else if(state==='future'){
  pill.classList.add('future');
  if(label) label.textContent='FUTURO';
 }else{
  pill.classList.add(ctx.active ? 'em' : 'final');
  if(label) label.textContent=ctx.active?'EM ANDAMENTO':'FORA DA JANELA';
 }
}

function updateWarBlock(){
 const period=document.querySelector('#warBlockPeriod');
 const day=document.querySelector('#warBlockDay');
 const attacks=document.querySelector('#warAttacksUsed');
 const fame=document.querySelector('#warBlockFame');
 const progress=document.querySelector('#warBlockProgressBar');

 const totalAttacks=Math.max(warMembers.length, SYSTEM_ELIGIBLE_MEMBERS) * WEEKLY_ATTACKS_PER_MEMBER;
 const usedAttacks=warMembers.reduce((sum,m)=>{
  const done=Number(String(m.weekly).split('/')[0]) || 0;
  return sum+done;
 },0);
 const totalFame=warMembers.reduce((sum,m)=>sum+m.fame,0);

 if(period) period.textContent=`${fullMonths[selectedMonth]} • Semana ${selectedWeek.replace('S','')}`;

 if(day){
  if(activeWarTab==='attacks'){
   day.hidden=false;
   day.textContent=days[selectedDay];
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
 if(period) period.innerHTML=`<strong>${fullMonths[selectedMonth]}</strong><span>Semana ${selectedWeek.replace('S','')}</span>`;
 updateWarBlock();
}

function renderWarList(){
 const list=document.querySelector('#warList'),head=document.querySelector('#warTableHead');
 updateWarHeader();

 if(activeWarTab==='members'){
  head.innerHTML='<span>Membro</span><span>Fame</span><span>Ataques</span>';
  list.innerHTML=sortWarMembersForActiveTab(warMembers).map((m,i)=>`<div class="war-row members-row ${m.current ? 'is-current-member' : ''}"><div class="war-member-cell"><span class="war-avatar tier-${Math.min(i+1,4)}"><img src="${m.avatarSrc || 'assets/icons/profile-user.svg'}" alt="" aria-hidden="true"></span><strong>${m.name}${m.current ? ' <em class="you-badge">VOCÊ</em>' : ''}</strong></div><strong class="fame ${fameClass(m.fame)}">${fmt(m.fame)}</strong><strong class="attack-count">${m.weekly}</strong></div>`).join('');
 }else{
  head.innerHTML='<span>Membro</span><span>Fame</span><span>Ataques</span>';
  list.innerHTML=sortWarMembersForActiveTab(warMembers).map((m,i)=>`<div class="war-row attacks-row ${m.current ? 'is-current-member' : ''}"><div class="war-member-cell"><span class="war-avatar tier-${Math.min(i+1,4)}"><img src="${m.avatarSrc || 'assets/icons/profile-user.svg'}" alt="" aria-hidden="true"></span><strong>${m.name}${m.current ? ' <em class="you-badge">VOCÊ</em>' : ''}</strong></div><strong class="day-fame ${fameClass(m.dayFame*4)}">${fmt(m.dayFame)}</strong>${dots(m.days?.[['D1','D2','D3','D4'][selectedDay]]?.attacks || m.dayAttacks || 0)}</div>`).join('');
 }
}

function updateCalendarText(){
 const title=document.querySelector('.war-calendar-modal h2');
 const subtitle=document.querySelector('#calendarSubtitle');
 if(title) title.textContent=`${fullMonths[selectedMonth]} • Semana ${selectedWeek.replace('S','')}`;
 if(subtitle) subtitle.textContent=activeWarTab==='members'?'Semana atual da guerra':`${days[selectedDay]} da janela de guerra`;
}

function bindCalendar(){
 document.querySelectorAll('.calendar-months button').forEach(btn=>{
  btn.addEventListener('click',()=>{
   selectedMonth=btn.dataset.value;
   document.querySelectorAll('.calendar-months button').forEach(b=>b.classList.remove('active'));
   btn.classList.add('active');
   updateWarHeader();
   updateCalendarText();
  });
 });

 document.querySelectorAll('.calendar-weeks button').forEach(btn=>{
  if(!btn.dataset.value) btn.dataset.value=btn.textContent.trim();
  btn.addEventListener('click',()=>{
   selectedWeek=btn.dataset.value;
   document.querySelectorAll('.calendar-weeks button').forEach(b=>b.classList.remove('active'));
   btn.classList.add('active');
   updateWarHeader();
   updateCalendarText();
  });
 });

 const daysBox=document.querySelector('#calendarDays');
 if(daysBox){
  daysBox.innerHTML=shortDays.map((d,i)=>`<button data-value="${i}" class="${i===selectedDay?'active':''}">${d}</button>`).join('');
  daysBox.querySelectorAll('button').forEach(btn=>{
   btn.addEventListener('click',()=>{
    selectedDay=Number(btn.dataset.value);
    daysBox.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    updateWarHeader();
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

async function loadRealWarMembers(){
 const ctx=getWarWeekContext(new Date());
 CURRENT_MONTH=shortMonthFromMonthKey(ctx.monthKey);
 CURRENT_WEEK=ctx.weekKey;
 selectedMonth=CURRENT_MONTH;
 selectedWeek=CURRENT_WEEK;
 selectedDay=Math.max(0, ctx.dayIndex || 0);

 try{ await syncWarSilently(); }catch(error){ console.warn('Sync guerra offline:', error); }

 let loaded = {};
 try{ loaded = await loadCurrentWarForUi(); }catch(error){ console.warn('Histórico guerra offline:', error); }
 currentWarHistoryMembers = loaded.members || {};

 const apiMembers = (await loadMembers()).filter(m=>!m.removed);

 warMembers=apiMembers.map(m=>{
  const id=String(m.tag || m.id || m.name || '').replace('#','').toUpperCase();
  const saved=currentWarHistoryMembers[id] || {};
  const daysData=saved.days || {D1:{attacks:0,fame:0},D2:{attacks:0,fame:0},D3:{attacks:0,fame:0},D4:{attacks:0,fame:0}};
  const dayKey=['D1','D2','D3','D4'][selectedDay] || ctx.dayKey || 'D1';
  const weeklyAttacks=saved.weeklyAttacks || Object.values(daysData).reduce((sum,d)=>sum + Number(d?.attacks || 0),0);
  const totalFame=Object.values(daysData).reduce((sum,d)=>sum + Number(d?.fame || 0),0);
  const todayFame=Number(daysData?.[dayKey]?.fame || 0);

  return {
   name:m.name||saved.name||'Membro',
   tag:m.tag||saved.tag||'',
   avatar:(m.name||'?').slice(0,1),
   avatarSrc:getAvatarForMember({...m, ...saved}),
   current:isCurrentUserMember({...m, ...saved}),
   weekly:`${weeklyAttacks}/16`,
   fame:totalFame,
   dayFame:todayFame,
   dayAttacks:getDailyAttackDots(saved, dayKey),
   days:daysData,
   warPoints:saved.warPoints || 0
  };
 });
}


await loadRealWarMembers();
bindCalendar();
renderWarList();

