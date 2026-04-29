import { loadMembers, formatNumber, periodLabelNow } from './real-data.js';
import { syncWarSilently } from './war-logic.js';
import { isCurrentUserMember, getAvatarForMember } from './identity.js';
const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fullMonths={Jan:'Janeiro',Fev:'Fevereiro',Mar:'Março',Abr:'Abril',Mai:'Maio',Jun:'Junho',Jul:'Julho',Ago:'Agosto',Set:'Setembro',Out:'Outubro',Nov:'Novembro',Dez:'Dezembro'};
const params=new URLSearchParams(window.location.search);
let selectedMonth='Abr', selectedWeek='S4', activeTab='general';
let rankingData=[];
function crownSvg(p){
 const color=p===1?'#ffd65f':p===2?'#dbeafe':'#ffb070';
 return `<svg class="rank-crown crown-${p}" viewBox="0 0 64 52" aria-hidden="true">
  <path d="M7 42h50l3-27-15 10L32 5 19 25 4 15l3 27Z" fill="${color}"/>
  <path d="M11 42h42v6H11v-6Z" fill="${color}" opacity=".92"/>
  <circle cx="19" cy="24" r="3" fill="rgba(255,255,255,.55)"/>
  <circle cx="32" cy="14" r="3" fill="rgba(255,255,255,.55)"/>
  <circle cx="45" cy="24" r="3" fill="rgba(255,255,255,.55)"/>
  <path d="M13 36h38" stroke="rgba(0,0,0,.22)" stroke-width="3" stroke-linecap="round"/>
 </svg>`;
}
function isTournamentEligible(item){
 const role=String(item.role || '').toLowerCase();
 return role.includes('elder') || role.includes('ancião') || role.includes('co') || role.includes('leader') || role.includes('líder') || role.includes('admin');
}
function rows(){
 const k=activeTab==='general'?'general':activeTab==='tournament'?'tournament':'donSent';
 const base=activeTab==='tournament' ? rankingData.filter(isTournamentEligible) : rankingData;
 return [...base].sort((a,b)=>b[k]-a[k]);
}
function value(item){if(activeTab==='general')return item.general.toLocaleString('pt-BR'); if(activeTab==='tournament')return `${item.tournament} PTS`; return {sent:item.donSent,rec:item.donReceived}}
function renderPodium(){
 const order=[rows()[1],rows()[0],rows()[2]];
 document.querySelector('#podium').innerHTML=order.map((it,i)=>{
  const p=i===1?1:i===0?2:3,v=value(it),d=typeof v==='object'?v.sent:v;
  return `<article class="podium-card podium-${p}" data-name="${it.name}">
   ${crownSvg(p)}
   <div class="podium-avatar avatar-${p}"><img src="${it.avatarSrc || 'assets/icons/profile-user.svg'}" alt="" aria-hidden="true"></div>
   <span class="podium-place">${p}</span>
   <strong>${it.name}${it.current ? ' <em class="you-badge">VOCÊ</em>' : ''}</strong>
   <small>${d}</small>
  </article>`;
 }).join('');
 if(activeTab==='tournament'){
  document.querySelectorAll('.podium-card').forEach(card=>{
   card.addEventListener('click',()=>openDetail(card.dataset.name));
  });
 }
}
function renderTable(){const head=document.querySelector('#rankingTableHead'),list=document.querySelector('#rankingList'),r=rows().slice(3); if(activeTab==='donations'){head.className='ranking-table-head donations-head';head.innerHTML='<span>Posição</span><span>Membro</span><span>Env</span><span>Rec</span>';list.innerHTML=r.map((it,i)=>`<button class="ranking-row donation-row"><span>${i+4}</span><strong>${it.name}</strong><b>${it.donSent}</b><b>${it.donReceived}</b></button>`).join('')}else{head.className='ranking-table-head';head.innerHTML='<span>Posição</span><span>Membro</span><span>Pontos</span>';list.innerHTML=r.map((it,i)=>`<button class="ranking-row" data-name="${it.name}"><span>${i+4}</span><strong>${it.name}</strong><b>${value(it)}</b></button>`).join(''); if(activeTab==='tournament')list.querySelectorAll('.ranking-row').forEach(x=>x.onclick=()=>openDetail(x.dataset.name))}}
function renderAll(){renderPodium();renderTable()}
document.querySelectorAll('.ranking-tab').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.ranking-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeTab=btn.dataset.tab;renderAll()});
function updateRankingPeriod(){
 const el=document.querySelector('#rankingPeriodLabel');
 if(el) el.innerHTML=`<strong>${fullMonths[selectedMonth]}</strong><span>Semana ${selectedWeek.replace('S','')}</span>`;
}
function renderCalendar(){const m=document.querySelector('#rankingMonths'),w=document.querySelector('#rankingWeeks');m.innerHTML=months.map(x=>`<button data-value="${x}" class="${x===selectedMonth?'active':''}">${x}</button>`).join('');w.innerHTML=['S1','S2','S3','S4'].map(x=>`<button data-value="${x}" class="${x===selectedWeek?'active':''}">${x}</button>`).join('');[m,w].forEach(box=>box.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(box===m)selectedMonth=b.dataset.value;else selectedWeek=b.dataset.value;box.querySelectorAll('button').forEach(z=>z.classList.remove('active'));b.classList.add('active');document.querySelector('#rankingCalendarTitle').textContent=`${fullMonths[selectedMonth]} • Semana ${selectedWeek.replace('S','')}`;updateRankingPeriod()}));document.querySelector('#rankingCalendarTitle').textContent=`${fullMonths[selectedMonth]} • Semana ${selectedWeek.replace('S','')}`;updateRankingPeriod()}
function openOverlay(id){document.body.classList.add('modal-open');document.documentElement.classList.add('modal-open');document.querySelector(id).classList.add('show')}
function closeOverlay(id){document.querySelector(id).classList.remove('show');document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open')}
document.querySelector('#openRankingCalendar').onclick=()=>{renderCalendar();openOverlay('#rankingCalendarOverlay')};document.querySelector('#closeRankingCalendar').onclick=()=>closeOverlay('#rankingCalendarOverlay');document.querySelector('#rankingCalendarOverlay').onclick=e=>{if(e.target.id==='rankingCalendarOverlay')closeOverlay('#rankingCalendarOverlay')};
function openDetail(name){const it=rankingData.find(x=>x.name===name);document.querySelector('#detailName').textContent=it.name;document.querySelector('#detailRole').textContent=`${it.role} • Pontuação semanal do mês vigente`;document.querySelector('#detailTotal').textContent=`${it.tournament} PTS`;document.querySelector('#detailWeeks').innerHTML=['S1','S2','S3','S4'].map(w=>`<div><span>${w}</span><strong>${it.weeks[w]}</strong></div>`).join('');openOverlay('#rankingDetailOverlay')}
document.querySelector('#closeRankingDetail').onclick=()=>closeOverlay('#rankingDetailOverlay');document.querySelector('#rankingDetailOverlay').onclick=e=>{if(e.target.id==='rankingDetailOverlay')closeOverlay('#rankingDetailOverlay')};
document.addEventListener('gesturestart',e=>e.preventDefault());document.addEventListener('gesturechange',e=>e.preventDefault());document.addEventListener('gestureend',e=>e.preventDefault());async function loadRealRankingData(){
 const p=periodLabelNow();
 selectedMonth=p.short; selectedWeek=p.weekCode;
 try{ await syncWarSilently(); }catch(error){ console.warn('Sync guerra offline:', error); }
 rankingData=(await loadMembers()).filter(m=>!m.removed).map(m=>({
  name:m.name||'Membro',
  role:m.role||'Membro',
  avatar:(m.name||'?').slice(0,1),
  avatarSrc:getAvatarForMember(m),
  current:isCurrentUserMember(m),
  general:Number(m.generalPoints || m.warPoints || 0),
  tournament:Number(m.tournamentPoints || 0),
  donSent:m.donations||0,
  donReceived:m.donationsReceived||0,
  weeks:{S1:0,S2:0,S3:0,S4:0}
 }));
}
await loadRealRankingData();
updateRankingPeriod();document.querySelectorAll('.ranking-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===activeTab));renderAll();
let lastTouchEndRanking=0;
document.addEventListener('touchend',e=>{
 const now=Date.now();
 if(now-lastTouchEndRanking<=300)e.preventDefault();
 lastTouchEndRanking=now;
},{passive:false});
document.addEventListener('touchmove',e=>{
 if(e.touches && e.touches.length>1)e.preventDefault();
},{passive:false});
