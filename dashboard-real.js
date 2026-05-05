import { loadClan, loadMembers, formatNumber, periodLabelNow, warWindowState, cleanTag } from './real-data.js';
import { syncWarSilently, loadCurrentWarForUi, getWarWeekContext } from './war-logic.js';
import { isCurrentUserMember, getAvatarForMember, findCurrentMemberProfile, saveClanBadgeEverywhere } from './identity.js';

const clan=await loadClan();
const members=(await loadMembers()).filter(m=>!m.removed);
const currentProfile = await findCurrentMemberProfile();
function dashboardPlanKey(value){
 const p=String(value||'basic').toLowerCase();
 if(p.includes('premium')) return 'premium';
 if(p.includes('plus')) return 'plus';
 return 'basic';
}
const dashPlan=dashboardPlanKey(clan?.plan || clan?.planLabel || clan?.subscriptionPlan || clan?.subscriptionStatus || localStorage.getItem('topbrs_plan'));
document.querySelector('.dashboard-phone')?.classList.add(`dash-plan-${dashPlan}`);
const name=document.querySelector('[data-dashboard-clan-name], .dash-clan strong');
const tag=document.querySelector('[data-dashboard-clan-tag], .dash-clan [data-clan-tag], .dash-clan span span');
const badge=document.querySelector('[data-dashboard-clan-badge], .dash-badge img');
if(name) name.textContent=clan?.name || clan?.clanName || clan?.title || 'TopBRS';
if(tag) tag.textContent=clan?.clanTag || clan?.tag || localStorage.getItem('topbrs_clan_tag') || localStorage.getItem('selectedClan') || '#ABC123';
if(badge){ badge.src=clan?.badge || clan?.badgeSrc || clan?.badgeUrl || clan?.badgeUrls?.medium || clan?.badgeUrls?.large || clan?.badgeUrls?.small || 'assets/icons/clan.svg'; badge.onerror=()=>badge.src='assets/icons/clan.svg'; }

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

function warMemberFor(member){
 const id = cleanTag(member?.tag || member?.id || member?.name || '');
 const warMembers = currentWar?.members || {};
 return warMembers[id] || Object.values(warMembers).find(w=>cleanTag(w?.tag || w?.name || '') === id || String(w?.name||'').toLowerCase() === String(member?.name||'').toLowerCase()) || {};
}
function weeklyFameFor(member){
 const warMember = warMemberFor(member);
 const days = warMember.days || {};
 const byDays = Object.values(days).reduce((sum,d)=>sum+Number(d?.fame||0),0);
 return Number(warMember.weeklyFame ?? warMember.fame ?? member.weeklyFame ?? byDays ?? 0);
}
function weeklyAttacksFor(member){
 const warMember = warMemberFor(member);
 const days = warMember.days || {};
 const byDays = Object.values(days).reduce((sum,d)=>sum+Number(d?.attacks||0),0);
 return Number(warMember.weeklyAttacks ?? member.weeklyAttacks ?? byDays ?? 0);
}
function weeklyDonationsFor(member){
 return Number(member.donations ?? member.donationsSent ?? member.weeklyDonations ?? member.cardsDonated ?? 0);
}
function activeScore(member){
 const attacks = weeklyAttacksFor(member);
 const donations = weeklyDonationsFor(member);
 const fame = weeklyFameFor(member);
 // Critério combinado semanal: ataques têm maior peso, depois doações e Fame.
 return (attacks * 1000000) + (donations * 1000) + fame;
}
const top=[...members].sort((a,b)=>(b.trophies||0)-(a.trophies||0))[0];
const don=[...members].sort((a,b)=>weeklyDonationsFor(b)-weeklyDonationsFor(a))[0];
const active=[...members].sort((a,b)=>activeScore(b)-activeScore(a) || String(a.name||'').localeCompare(String(b.name||'')))[0];
const activeAttacks = active ? weeklyAttacksFor(active) : 0;
const activeFame = active ? weeklyFameFor(active) : 0;
const activeDonations = active ? weeklyDonationsFor(active) : 0;
document.querySelectorAll('[data-highlight-top-name]').forEach(el=>el.innerHTML=top ? `${top.name}${isCurrentUserMember(top) ? ' <em class="you-badge">VOCÊ</em>' : ''}` : 'Sem dados');
document.querySelectorAll('[data-highlight-top-value]').forEach(el=>el.textContent=top?formatNumber(top.trophies):'0');
document.querySelectorAll('[data-highlight-active-name]').forEach(el=>el.innerHTML=active ? `${active.name}${isCurrentUserMember(active) ? ' <em class="you-badge">VOCÊ</em>' : ''}` : 'Sem dados');
document.querySelectorAll('[data-highlight-active-value]').forEach(el=>el.textContent=active?`${activeAttacks} ataques`:'0 ataques');
document.querySelectorAll('[data-highlight-donations-name]').forEach(el=>el.innerHTML=don ? `${don.name}${isCurrentUserMember(don) ? ' <em class="you-badge">VOCÊ</em>' : ''}` : 'Sem dados');
document.querySelectorAll('[data-highlight-donations-value]').forEach(el=>el.textContent=don?formatNumber(weeklyDonationsFor(don)):'0');

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

const clanBadgeOptions = Array.from({length:300}, (_,i)=>`assets/badges/clanbadge${i+1}.webp`);

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
  btn.hidden = true;
  btn.setAttribute("aria-hidden","true");
});
document.querySelectorAll(".clan-badge-editable,.dash-badge").forEach(badge=>{
  if(!canEditClanBadge()) return;
  badge.setAttribute("role","button");
  badge.setAttribute("tabindex","0");
  badge.setAttribute("aria-label","Alterar emblema do clã");
  const open = event => {
    event.preventDefault();
    event.stopPropagation();
    openClanBadgePicker();
  };
  badge.addEventListener("click", open);
  badge.addEventListener("keydown", event=>{
    if(event.key === "Enter" || event.key === " ") open(event);
  });
});
document.querySelector("#closeClanBadgePicker")?.addEventListener("click", closeClanBadgePicker);
document.querySelector("#clanBadgePickerOverlay")?.addEventListener("click", event=>{
  if(event.target.id==="clanBadgePickerOverlay") closeClanBadgePicker();
});
window.addEventListener("topbrs:open-clan-badge-picker", openClanBadgePicker);


/* ===== Stage 4 final: notification bell popup restored ===== */
function dashT(key, vars={}){ return window.TopBRSI18n?.t ? window.TopBRSI18n.t(key, vars) : key; }
function getDashboardNotifications(){
  try{
    const raw = JSON.parse(localStorage.getItem('topbrs_notifications') || '[]');
    if(Array.isArray(raw) && raw.length) return raw;
  }catch{}
  return [
    {type:'system', titleKey:'dashboard.notifications', message:'Sistema pronto para receber avisos do clã.', createdAt:new Date().toISOString()},
    {type:'war', titleKey:'dashboard.currentWar', message:'Acompanhe a janela de guerra e os ataques da semana.', createdAt:new Date().toISOString()},
    {type:'sync', titleKey:'settings.api', message:'Sincronização API/VPS conectada ao clã atual.', createdAt:new Date().toISOString()}
  ];
}
function notificationTitle(n){ return n.titleKey ? dashT(n.titleKey) : (n.title || dashT('dashboard.notifications')); }
function notificationMessage(n){ return n.message || n.messageOriginal || ''; }
function notificationDate(n){ try{ return new Date(n.createdAt || n.date || Date.now()).toLocaleString(); }catch{return '';} }
function notificationMarkup(n){
  return `<article class="notification-item"><i class="notification-dot" aria-hidden="true"></i><div class="notification-copy"><strong>${notificationTitle(n)}</strong><span>${notificationDate(n)}</span><p>${notificationMessage(n)}</p></div></article>`;
}
function renderDashboardNotifications(){
  const latest = getDashboardNotifications().slice(0,3);
  const small = document.querySelector('#dashboardNotificationList');
  const modal = document.querySelector('#modalNotificationList');
  const html = latest.length ? latest.map(notificationMarkup).join('') : `<div class="empty-notifications">${dashT('dashboard.noNotifications')}</div>`;
  if(small) small.innerHTML = html;
  if(modal) modal.innerHTML = html;
  document.querySelectorAll('.notifications-modal-head .modal-eyebrow,.dash-notification-head .dash-section-label').forEach(el=>el.textContent=dashT('dashboard.latestNotifications'));
  const h2=document.querySelector('.notifications-modal-head h2'); if(h2) h2.textContent=dashT('dashboard.notifications');
  const p=document.querySelector('.notifications-modal-head p'); if(p) p.textContent=dashT('dashboard.notificationsText');
}
function openNotificationsPopup(){
  renderDashboardNotifications();
  const overlay=document.querySelector('#notificationsOverlay');
  if(!overlay) return;
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  document.documentElement.classList.add('modal-open');
}
function closeNotificationsPopup(){
  const overlay=document.querySelector('#notificationsOverlay');
  overlay?.classList.remove('show');
  overlay?.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
  document.documentElement.classList.remove('modal-open');
}
document.querySelector('.dash-bell')?.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); openNotificationsPopup(); });
document.querySelector('#closeNotifications')?.addEventListener('click', closeNotificationsPopup);
document.querySelector('#notificationsOverlay')?.addEventListener('click', e=>{ if(e.target.id==='notificationsOverlay') closeNotificationsPopup(); });
document.querySelector('#clearDashNotifications')?.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); localStorage.setItem('topbrs_notifications','[]'); renderDashboardNotifications(); });
window.addEventListener('topbrs:languagechange', renderDashboardNotifications);
renderDashboardNotifications();
