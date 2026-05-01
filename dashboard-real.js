import { loadClan, loadMembers, formatNumber, periodLabelNow, warWindowState } from './real-data.js';
import { syncWarSilently, loadCurrentWarForUi, getWarWeekContext } from './war-logic.js';
import { isCurrentUserMember, getAvatarForMember, findCurrentMemberProfile, saveClanBadgeEverywhere } from './identity.js';

const clan=await loadClan();
const members=(await loadMembers()).filter(m=>!m.removed);
const currentProfile = await findCurrentMemberProfile();
const name=document.querySelector('.dash-clan strong');
const tag=document.querySelector('.dash-clan span');
const badge=document.querySelector('.dash-badge img');
if(name) name.textContent=clan?.name||'TopBRS';
if(tag) tag.textContent=clan?.clanTag||clan?.tag||'#ABC123';
if(badge){ badge.src=clan?.badge || clan?.badgeSrc || clan?.badgeUrl || 'assets/icons/clan.svg'; badge.onerror=()=>badge.src='assets/icons/clan.svg'; }

const ctxDash=getWarWeekContext(new Date());
const monthsDash=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const monthIdxDash=Number(String(ctxDash.monthKey||'').split('-')[1])-1;
const warDashLabel=`${monthsDash[monthIdxDash] || 'Maio'} • Semana ${String(ctxDash.weekKey||'S1').replace('S','')}`;
document.querySelectorAll('[data-war-month-week]').forEach(el=>el.textContent=warDashLabel);
const war=warWindowState();
const currentWar = await loadCurrentWarForUi();
const total=(members.length||Number(clan?.members||0)||0)*16;
const realUsedAttacks=Object.values(currentWar.members||{}).reduce((sum,m)=>sum+Number(m.weeklyAttacks||0),0);
const realWarFame=Object.values(currentWar.members||{}).reduce((sum,m)=>sum+Object.values(m.days||{}).reduce((s,d)=>s+Number(d?.fame||0),0),0);
document.querySelectorAll('[data-war-status]').forEach(el=>el.textContent=war.status==='EM ANDAMENTO'?'Em andamento':'Fora da janela');
document.querySelectorAll('[data-war-attacks]').forEach(el=>el.textContent=`${realUsedAttacks} / ${total}`);
document.querySelectorAll('[data-war-fame]').forEach(el=>el.textContent=formatNumber(realWarFame));
document.querySelectorAll('.progress-line span,.dash-progress span').forEach(el=>{ const pct=total?Math.min(100,(realUsedAttacks/total)*100):0; el.style.width=pct+'%'; });

const top=[...members].sort((a,b)=>(b.trophies||0)-(a.trophies||0))[0];
const don=[...members].sort((a,b)=>(b.donations||0)-(a.donations||0))[0];
document.querySelectorAll('[data-highlight-top-name]').forEach(el=>el.innerHTML=top ? `${top.name}${isCurrentUserMember(top) ? ' <em class="you-badge">VOCÊ</em>' : ''}` : 'Sem dados');
document.querySelectorAll('[data-highlight-top-value]').forEach(el=>el.textContent=top?formatNumber(top.trophies):'0');
document.querySelectorAll('[data-highlight-active-name]').forEach(el=>el.textContent='Em breve');
document.querySelectorAll('[data-highlight-active-value]').forEach(el=>el.textContent='0 ataques');
document.querySelectorAll('[data-highlight-donations-name]').forEach(el=>el.innerHTML=don ? `${don.name}${isCurrentUserMember(don) ? ' <em class="you-badge">VOCÊ</em>' : ''}` : 'Sem dados');
document.querySelectorAll('[data-highlight-donations-value]').forEach(el=>el.textContent=don?formatNumber(don.donations||0):'0');

document.querySelectorAll('.highlight-grid article')[0]?.addEventListener('click',()=>location.href='classification.html#geral');
document.querySelectorAll('.highlight-grid article')[2]?.addEventListener('click',()=>location.href='classification.html#doacoes');

// Não remove última notificação ao expandir: apenas impede propagação destrutiva.
document.querySelectorAll('.notification-row,.notification-item').forEach(row=>{
 row.addEventListener('click', e=>{ row.classList.toggle('expanded'); e.stopImmediatePropagation(); }, true);
});


syncWarSilently().then(()=>console.log('guerra sincronizada')).catch(()=>{});





function getStoredUserSafe(){
  try{return JSON.parse(localStorage.getItem("topbrs_user")||"{}")}catch{return {}}
}
function canEditClanBadge(){
  const u=getStoredUserSafe();
  const role=String(u.role||u.systemRole||u.clanRole||"").toLowerCase();
  return Boolean(
    u.saasOwner || u.systemOwner || u.owner || u.isOwner || u.isAdmin ||
    role.includes("owner") || role.includes("admin") || role.includes("lider") || role.includes("líder") ||
    role.includes("leader")
  );
}

const clanBadgeOptions = Array.from({length:80}, (_,i)=>`assets/badges/clanbadge${i+1}.webp`);

function fallbackBadgeOptions(){
  return [
    "assets/icons/clan.svg",
    "assets/icons/war.svg",
    "assets/icons/shield.svg"
  ];
}

function openClanBadgePicker(){
  if(!canEditClanBadge()) return;

  const overlay=document.querySelector("#clanBadgePickerOverlay");
  const grid=document.querySelector("#clanBadgePickerGrid");
  if(!overlay || !grid) return;

  const options=[...clanBadgeOptions, ...fallbackBadgeOptions()];
  grid.innerHTML=options.map(src=>`
    <button type="button" class="clan-badge-choice" data-src="${src}">
      <img src="${src}" alt="" loading="lazy" onerror="this.closest('button').remove()">
    </button>
  `).join("");

  grid.querySelectorAll(".clan-badge-choice").forEach(btn=>{
    btn.addEventListener("click",()=>selectClanBadge(btn.dataset.src));
  });

  document.body.classList.add("modal-open");
  document.documentElement.classList.add("modal-open");
  overlay.classList.add("show");
}

function closeClanBadgePicker(){
  const overlay=document.querySelector("#clanBadgePickerOverlay");
  overlay?.classList.remove("show");
  document.body.classList.remove("modal-open");
  document.documentElement.classList.remove("modal-open");
}

async function selectClanBadge(src){
  document.querySelectorAll("[data-dashboard-clan-badge],[data-clan-badge],.dash-badge > img:first-child").forEach(img=>{
    img.src=src;
  });

  try{
    await saveClanBadgeEverywhere(src);
  }catch(error){
    console.warn("Emblema salvo localmente. Firestore indisponível:", error);
    const localClan=JSON.parse(localStorage.getItem("topbrs_clan")||"{}");
    localStorage.setItem("topbrs_clan", JSON.stringify({...localClan, badge:src, badgeSrc:src}));
  }

  closeClanBadgePicker();
}

document.querySelectorAll(".dash-badge-edit").forEach(btn=>{
  btn.hidden = !canEditClanBadge();
  btn.addEventListener("click", (event)=>{
    event.preventDefault();
    event.stopPropagation();
    openClanBadgePicker();
  });
});
document.querySelector("#closeClanBadgePicker")?.addEventListener("click", closeClanBadgePicker);
document.querySelector("#clanBadgePickerOverlay")?.addEventListener("click", event=>{
  if(event.target.id==="clanBadgePickerOverlay") closeClanBadgePicker();
});
window.addEventListener("topbrs:open-clan-badge-picker", openClanBadgePicker);

