import { db } from './firebase-config.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  loadMembers,
  formatNumber,
  getCurrentClanTag,
  cleanTag,
  syncClanAndMembersFromApi
} from './real-data.js';
import { syncWarSilently, loadWarHistory, getWarWeekContext } from './war-logic.js';
import { isCurrentUserMember, getAvatarForMember } from './identity.js';

const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fullMonths={Jan:'Janeiro',Fev:'Fevereiro',Mar:'Março',Abr:'Abril',Mai:'Maio',Jun:'Junho',Jul:'Julho',Ago:'Agosto',Set:'Setembro',Out:'Outubro',Nov:'Novembro',Dez:'Dezembro'};
const monthNumbers={Jan:'01',Fev:'02',Mar:'03',Abr:'04',Mai:'05',Jun:'06',Jul:'07',Ago:'08',Set:'09',Out:'10',Nov:'11',Dez:'12'};
const numberToShort={1:'Jan',2:'Fev',3:'Mar',4:'Abr',5:'Mai',6:'Jun',7:'Jul',8:'Ago',9:'Set',10:'Out',11:'Nov',12:'Dez'};
const params=new URLSearchParams(window.location.search);
let selectedMonth='Abr', selectedWeek='S4', activeTab='general';
let selectedYear=new Date().getFullYear();
let rankingData=[];

function pad(n){return String(n).padStart(2,'0');}
function mondayOfWeek(date){const d=new Date(date);const day=d.getDay();const diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);d.setHours(0,0,0,0);return d;}
function getDonationWeekContext(date=new Date()){
 const monday=mondayOfWeek(date);
 const monthKey=`${monday.getFullYear()}-${pad(monday.getMonth()+1)}`;
 const week=Math.min(4, Math.max(1, Math.ceil(monday.getDate()/7)));
 return {monthKey, weekKey:`S${week}`, short:numberToShort[monday.getMonth()+1], week, monday};
}
function getClassificationPeriodContext(date=new Date()){
 const d=new Date(date);
 const monthKey=`${d.getFullYear()}-${pad(d.getMonth()+1)}`;
 const week=Math.min(4, Math.max(1, Math.ceil(d.getDate()/7)));
 return {monthKey, weekKey:`S${week}`, short:numberToShort[d.getMonth()+1], week};
}
function selectedMonthKey(){return `${selectedYear}-${monthNumbers[selectedMonth]}`;}
function selectedPeriodKey(){return {monthKey:selectedMonthKey(), weekKey:selectedWeek};}
function isCurrentSelectedPeriod(){const p=getClassificationPeriodContext(new Date());return selectedMonthKey()===p.monthKey && selectedWeek===p.weekKey;}
function isFutureSelectedPeriod(){const {monthKey,weekKey}=selectedPeriodKey();const now=getClassificationPeriodContext(new Date());return `${monthKey}_${weekKey}` > `${now.monthKey}_${now.weekKey}`;}
function zeroMember(m){return {name:m.name||'Membro',role:m.role||'Membro',tag:m.tag||'',avatarSrc:getAvatarForMember(m),current:isCurrentUserMember(m),general:0,tournament:0,donSent:0,donReceived:0,weeks:{S1:0,S2:0,S3:0,S4:0}};}
function emptyRowsFromMembers(members){return members.filter(m=>!m.removed).map(zeroMember);}
function medalSvg(p){const medal=p===1?'🥇':p===2?'🥈':'🥉';return `<span class="podium-medal-emoji podium-medal-${p}" aria-hidden="true">${medal}</span>`;}
function isTournamentEligible(item){const role=String(item.role || '').toLowerCase();return role.includes('elder') || role.includes('ancião') || role.includes('co') || role.includes('leader') || role.includes('líder') || role.includes('admin');}
function rows(){const k=activeTab==='general'?'general':activeTab==='tournament'?'tournament':'donSent';const base=activeTab==='tournament'?rankingData.filter(isTournamentEligible):rankingData;return [...base].sort((a,b)=>(Number(b[k]||0)-Number(a[k]||0)) || String(a.name||'').localeCompare(String(b.name||'')));}
function value(item){if(activeTab==='general')return Number(item.general||0).toLocaleString('pt-BR'); if(activeTab==='tournament')return `${Number(item.tournament||0).toLocaleString('pt-BR')} PTS`; return {sent:Number(item.donSent||0),rec:Number(item.donReceived||0)}}
function renderPodium(){
 const topRows=rows();
 const order=[topRows[1],topRows[0],topRows[2]];
 document.querySelector('#podium').innerHTML=order.map((it,i)=>{
  if(!it) return `<article class="podium-card podium-${i===1?1:i===0?2:3} is-empty"><span class="podium-place">${i===1?1:i===0?2:3}</span><strong>Sem dados</strong><small>0</small></article>`;
  const p=i===1?1:i===0?2:3,v=value(it),d=typeof v==='object'?v.sent:v;
  return `<article class="podium-card podium-${p}" data-name="${it.name}">${medalSvg(p)}<div class="podium-avatar avatar-${p}"><img src="${it.avatarSrc || 'assets/icons/profile-user.svg'}" alt="" aria-hidden="true"></div><span class="podium-place">${p}</span><strong>${it.name}${it.current ? ' <em class="you-badge">VOCÊ</em>' : ''}</strong><small>${d}</small></article>`;
 }).join('');
 if(activeTab==='tournament')document.querySelectorAll('.podium-card[data-name]').forEach(card=>card.addEventListener('click',()=>openDetail(card.dataset.name)));
}
function renderTable(){const head=document.querySelector('#rankingTableHead'),list=document.querySelector('#rankingList'),r=rows().slice(3);if(activeTab==='donations'){head.className='ranking-table-head donations-head';head.innerHTML='<span>Pos</span><span>Membro</span><span>Env</span><span>Rec</span>';list.innerHTML=r.map((it,i)=>`<button class="ranking-row donation-row ${it.current ? 'is-current-member' : ''}"><span>${i+4}</span><strong>${it.name}${it.current ? ' <em class="you-badge">VOCÊ</em>' : ''}</strong><b>${Number(it.donSent||0).toLocaleString('pt-BR')}</b><b>${Number(it.donReceived||0).toLocaleString('pt-BR')}</b></button>`).join('') || '<div class="ranking-empty">Sem histórico para este período.</div>'}else{head.className='ranking-table-head';head.innerHTML='<span>Pos</span><span>Membro</span><span>Pontos</span>';list.innerHTML=r.map((it,i)=>`<button class="ranking-row ${it.current ? 'is-current-member' : ''}" data-name="${it.name}"><span>${i+4}</span><strong>${it.name}${it.current ? ' <em class="you-badge">VOCÊ</em>' : ''}</strong><b>${value(it)}</b></button>`).join('') || '<div class="ranking-empty">Sem histórico para este período.</div>';if(activeTab==='tournament')list.querySelectorAll('.ranking-row[data-name]').forEach(x=>x.onclick=()=>openDetail(x.dataset.name))}}
function renderAll(){document.querySelector('.ranking-phone')?.classList.add('ranking-refined');renderPodium();renderTable()}
function updateRankingPeriod(){const el=document.querySelector('#rankingPeriodLabel');if(el) el.innerHTML=`<strong>${fullMonths[selectedMonth]}</strong><span>Semana ${selectedWeek.replace('S','')}</span>`;}
async function onPeriodChanged(){document.querySelector('#rankingCalendarTitle').textContent=`${fullMonths[selectedMonth]} • Semana ${selectedWeek.replace('S','')}`;updateRankingPeriod();await loadRankingForSelectedPeriod();renderAll();}
function renderCalendar(){const m=document.querySelector('#rankingMonths'),w=document.querySelector('#rankingWeeks');m.innerHTML=months.map(x=>`<button data-value="${x}" class="${x===selectedMonth?'active':''}">${x}</button>`).join('');w.innerHTML=['S1','S2','S3','S4'].map(x=>`<button data-value="${x}" class="${x===selectedWeek?'active':''}">${x}</button>`).join('');m.querySelectorAll('button').forEach(b=>b.onclick=async()=>{selectedMonth=b.dataset.value;m.querySelectorAll('button').forEach(z=>z.classList.remove('active'));b.classList.add('active');await onPeriodChanged();});w.querySelectorAll('button').forEach(b=>b.onclick=async()=>{selectedWeek=b.dataset.value;w.querySelectorAll('button').forEach(z=>z.classList.remove('active'));b.classList.add('active');await onPeriodChanged();});document.querySelector('#rankingCalendarTitle').textContent=`${fullMonths[selectedMonth]} • Semana ${selectedWeek.replace('S','')}`;updateRankingPeriod()}
function openOverlay(id){document.body.classList.add('modal-open');document.documentElement.classList.add('modal-open');document.querySelector(id).classList.add('show')}
function closeOverlay(id){document.querySelector(id).classList.remove('show');document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open')}
document.querySelectorAll('.ranking-tab').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.ranking-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeTab=btn.dataset.tab;renderAll()});
document.querySelector('#openRankingCalendar').onclick=()=>{renderCalendar();openOverlay('#rankingCalendarOverlay')};document.querySelector('#closeRankingCalendar').onclick=()=>closeOverlay('#rankingCalendarOverlay');document.querySelector('#rankingCalendarOverlay').onclick=e=>{if(e.target.id==='rankingCalendarOverlay')closeOverlay('#rankingCalendarOverlay')};
function openDetail(name){const it=rankingData.find(x=>x.name===name);if(!it)return;document.querySelector('#detailName').textContent=it.name;document.querySelector('#detailRole').textContent=`${it.role} • Pontuação do período selecionado`;document.querySelector('#detailTotal').textContent=`${it.tournament} PTS`;document.querySelector('#detailWeeks').innerHTML=['S1','S2','S3','S4'].map(w=>`<div><span>${w}</span><strong>${it.weeks?.[w]||0}</strong></div>`).join('');openOverlay('#rankingDetailOverlay')}
document.querySelector('#closeRankingDetail').onclick=()=>closeOverlay('#rankingDetailOverlay');document.querySelector('#rankingDetailOverlay').onclick=e=>{if(e.target.id==='rankingDetailOverlay')closeOverlay('#rankingDetailOverlay')};

async function loadClassificationHistory(clanTag, monthKey, weekKey){const snap=await getDoc(doc(db,'clans',clanTag,'classificationHistory',monthKey,'weeks',weekKey));return snap.exists()?snap.data():null;}
async function saveClassificationHistory(clanTag, monthKey, weekKey, rows){await setDoc(doc(db,'clans',clanTag,'classificationHistory',monthKey,'weeks',weekKey),{monthKey,weekKey,rows,updatedAt:serverTimestamp()},{merge:true});}
function mapHistoryRows(rows=[]){return rows.map(r=>({name:r.name||'Membro',role:r.role||'Membro',tag:r.tag||'',avatarSrc:r.avatarSrc||'assets/icons/profile-user.svg',current:false,general:Number(r.general||0),tournament:Number(r.tournament||0),donSent:Number(r.donSent||0),donReceived:Number(r.donReceived||0),weeks:r.weeks||{S1:0,S2:0,S3:0,S4:0}}));}
function rowsFromCurrentMembers(members, warHistory=null){
 const warMembers=warHistory?.members||{};
 return members.filter(m=>!m.removed).map(m=>{
  const id=cleanTag(m.tag||m.id||m.name);
  const wm=warMembers[id]||{};
  const currentWar=m.currentWar||{};
  const weeklyFame=Number(wm.weeklyFame||currentWar.weeklyFame||m.weeklyFame||0);
  const weeklyAttacks=Number(wm.weeklyAttacks||currentWar.weeklyAttacks||m.weeklyAttacks||0);
  const attackPoints=Number(wm.attackPoints ?? m.attackPoints ?? Math.min(16, weeklyAttacks));
  const completed=(wm.completed !== undefined ? Boolean(wm.completed) : weeklyAttacks>=16);
  const bonusPoints=Number(wm.bonusPoints ?? wm.warBonusPoints ?? m.warBonusPoints ?? (completed?3:0));
  const warScore=Number(wm.warPoints ?? m.warPoints ?? (attackPoints+bonusPoints) ?? 0);
  const tournament=Number(wm.tournamentPoints||m.tournamentPoints||0);
  const general=Number(warScore||0)+tournament;
  return {name:m.name||'Membro',role:m.role||'Membro',tag:m.tag||'',avatarSrc:getAvatarForMember(m),current:isCurrentUserMember(m),general,tournament,donSent:Number(m.donations||m.donationsSent||0),donReceived:Number(m.donationsReceived||m.received||0),weeklyFame,weeklyAttacks,weeks:{S1:Number(m.tournamentS1||0),S2:Number(m.tournamentS2||0),S3:Number(m.tournamentS3||0),S4:Number(m.tournamentS4||0)}};
 });
}
async function loadCurrentRanking(clanTag, monthKey, weekKey){
 let members=[];
 try{ const synced=await syncClanAndMembersFromApi(); members=synced?.members||[]; }catch(error){ console.warn('Sync API classificação indisponível:', error); members=await loadMembers(); }
 try{ await syncWarSilently(); }catch(error){ console.warn('Sync guerra classificação indisponível:', error); }
 let warHistory=null;
 try{ warHistory=await loadWarHistory(clanTag, monthKey, weekKey); }catch(error){ console.warn('Histórico guerra classificação indisponível:', error); }
 const rows=rowsFromCurrentMembers(members, warHistory);
 await saveClassificationHistory(clanTag, monthKey, weekKey, rows);
 return rows;
}
async function loadRankingForSelectedPeriod(){
 const clanTag=getCurrentClanTag();
 const baseMembers=await loadMembers();
 const {monthKey,weekKey}=selectedPeriodKey();
 if(!clanTag){ rankingData=emptyRowsFromMembers(baseMembers); return; }
 if(isFutureSelectedPeriod()){ rankingData=emptyRowsFromMembers(baseMembers); return; }
 if(isCurrentSelectedPeriod()){ rankingData=await loadCurrentRanking(clanTag, monthKey, weekKey); return; }
 const history=await loadClassificationHistory(clanTag, monthKey, weekKey).catch(()=>null);
 rankingData=history?.rows ? mapHistoryRows(history.rows) : emptyRowsFromMembers(baseMembers);
}

const current=getClassificationPeriodContext(new Date());
selectedMonth=current.short; selectedWeek=current.weekKey; selectedYear=Number(current.monthKey.slice(0,4));
await loadRankingForSelectedPeriod();
updateRankingPeriod();document.querySelectorAll('.ranking-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===activeTab));renderAll();
let lastTouchEndRanking=0;
document.addEventListener('touchend',e=>{const now=Date.now();if(now-lastTouchEndRanking<=300)e.preventDefault();lastTouchEndRanking=now;},{passive:false});
document.addEventListener('touchmove',e=>{if(e.touches && e.touches.length>1)e.preventDefault();},{passive:false});
