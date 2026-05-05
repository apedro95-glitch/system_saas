import { loadClan, loadMembers, formatNumber, warWindowState, cleanTag } from './real-data.js';
import { syncWarSilently, loadCurrentWarForUi, getWarWeekContext } from './war-logic.js';
import { isCurrentUserMember, saveClanBadgeEverywhere } from './identity.js';

/*
  Dashboard-only repair:
  - no top-level await blocking the page;
  - paint cached/local data immediately;
  - refresh clan/members/war asynchronously when each source responds;
  - do not touch other menus or shared flows.
*/

function safeJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch{
    return fallback;
  }
}

function setTextAll(selector, value){
  document.querySelectorAll(selector).forEach(el=>{ el.textContent = value; });
}

function setHTMLAll(selector, value){
  document.querySelectorAll(selector).forEach(el=>{ el.innerHTML = value; });
}

function fmt(value){
  try{ return formatNumber(value || 0); }catch{ return Number(value || 0).toLocaleString('pt-BR'); }
}

function cleanMembers(list){
  return Array.isArray(list) ? list.filter(m=>m && !m.removed) : [];
}

let dashClan = safeJSON('topbrs_clan', {});
let dashMembers = cleanMembers(safeJSON('topbrs_members', []));
let dashWar = { members:{} };

function dashboardPlanKey(value){
  const p=String(value||'basic').toLowerCase();
  if(p.includes('premium')) return 'premium';
  if(p.includes('plus')) return 'plus';
  return 'basic';
}

function getClanBadge(clan){
  return localStorage.getItem('topbrs_clan_badge')
    || clan?.badge
    || clan?.badgeSrc
    || clan?.badgeUrl
    || clan?.badgeUrls?.medium
    || clan?.badgeUrls?.large
    || clan?.badgeUrls?.small
    || 'assets/icons/clan.svg';
}

function applyClanHeader(clan){
  const name=document.querySelector('[data-dashboard-clan-name], .dash-clan strong');
  const tag=document.querySelector('[data-dashboard-clan-tag], .dash-clan [data-clan-tag], .dash-clan span span');
  const badge=document.querySelector('[data-dashboard-clan-badge], .dash-badge img');
  const phone=document.querySelector('.dashboard-phone');

  if(phone){
    phone.classList.remove('dash-plan-basic','dash-plan-plus','dash-plan-premium');
    phone.classList.add(`dash-plan-${dashboardPlanKey(clan?.plan || clan?.planLabel || clan?.subscriptionPlan || clan?.subscriptionStatus || localStorage.getItem('topbrs_plan'))}`);
  }

  if(name) name.textContent = clan?.name || clan?.clanName || clan?.title || name.textContent || 'TopBRS';
  if(tag) tag.textContent = clan?.clanTag || clan?.tag || localStorage.getItem('topbrs_clan_tag') || localStorage.getItem('selectedClan') || tag.textContent || '#ABC123';
  if(badge){
    badge.src = getClanBadge(clan);
    badge.onerror = ()=>{ badge.src='assets/icons/clan.svg'; };
  }
}

function getWarMembers(war){
  return war?.members || war?.history?.members || {};
}

function warMemberFor(member, war){
  const id = cleanTag(member?.tag || member?.id || member?.name || '');
  const warMembers = getWarMembers(war);
  return warMembers[id] || Object.values(warMembers).find(w=>cleanTag(w?.tag || w?.name || '') === id || String(w?.name||'').toLowerCase() === String(member?.name||'').toLowerCase()) || {};
}

function weeklyFameFor(member, war){
  const warMember = warMemberFor(member, war);
  const days = warMember.days || {};
  const byDays = Object.values(days).reduce((sum,d)=>sum+Number(d?.fame||0),0);
  return Number(warMember.weeklyFame ?? warMember.fame ?? member.weeklyFame ?? byDays ?? 0);
}

function weeklyAttacksFor(member, war){
  const warMember = warMemberFor(member, war);
  const days = warMember.days || {};
  const byDays = Object.values(days).reduce((sum,d)=>sum+Number(d?.attacks||0),0);
  return Number(warMember.weeklyAttacks ?? member.weeklyAttacks ?? byDays ?? 0);
}

function weeklyDonationsFor(member){
  return Number(member.donations ?? member.donationsSent ?? member.weeklyDonations ?? member.cardsDonated ?? 0);
}

function activeScore(member, war){
  const attacks = weeklyAttacksFor(member, war);
  const donations = weeklyDonationsFor(member);
  const fame = weeklyFameFor(member, war);
  return (attacks * 1000000) + (donations * 1000) + fame;
}

function renderWar(clan, members, warData){
  const ctxDash=getWarWeekContext(new Date());
  const monthsDash=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const monthIdxDash=Number(String(ctxDash.monthKey||'').split('-')[1])-1;
  const now = new Date();
  const fallbackWeek = `S${Math.min(4, Math.max(1, Math.ceil(now.getDate()/7)))}`;
  const warDashLabel=`${monthsDash[(monthIdxDash>=0 && monthIdxDash<12) ? monthIdxDash : now.getMonth()]} • Semana ${String(ctxDash.weekKey||fallbackWeek).replace('S','')}`;
  setTextAll('[data-war-month-week]', warDashLabel);

  const war=warWindowState();
  setTextAll('[data-war-status]', war.status==='EM ANDAMENTO'?'Em andamento':'Fora da janela');

  const warMembers = getWarMembers(warData);
  const total=(members.length || Number(clan?.members||0) || 0) * 16;
  const used=Object.values(warMembers).reduce((sum,m)=>sum+Number(m.weeklyAttacks||0),0);
  const fame=Object.values(warMembers).reduce((sum,m)=>{
    const dayFame = Object.values(m.days||{}).reduce((s,d)=>s+Number(d?.fame||0),0);
    return sum + Number(m.weeklyFame ?? m.fame ?? dayFame ?? 0);
  },0);

  setTextAll('[data-war-attacks]', `${used} / ${total || 0}`);
  setTextAll('[data-war-fame]', fmt(fame));
  document.querySelectorAll('.progress-line span,.dash-progress span').forEach(el=>{
    const pct=total?Math.min(100,(used/total)*100):0;
    el.style.width=pct+'%';
  });
}

function renderHighlights(members, warData){
  const top=[...members].sort((a,b)=>(b.trophies||0)-(a.trophies||0))[0];
  const don=[...members].sort((a,b)=>weeklyDonationsFor(b)-weeklyDonationsFor(a))[0];
  const active=[...members].sort((a,b)=>activeScore(b, warData)-activeScore(a, warData) || String(a.name||'').localeCompare(String(b.name||'')))[0];

  setHTMLAll('[data-highlight-top-name]', top ? `${top.name}${isCurrentUserMember(top) ? ' <em class="you-badge">VOCÊ</em>' : ''}` : 'Sem dados');
  setTextAll('[data-highlight-top-value]', top?fmt(top.trophies):'0');

  setHTMLAll('[data-highlight-active-name]', active ? `${active.name}${isCurrentUserMember(active) ? ' <em class="you-badge">VOCÊ</em>' : ''}` : 'Sem dados');
  setTextAll('[data-highlight-active-value]', active?`${weeklyAttacksFor(active, warData)} ataques`:'0 ataques');

  setHTMLAll('[data-highlight-donations-name]', don ? `${don.name}${isCurrentUserMember(don) ? ' <em class="you-badge">VOCÊ</em>' : ''}` : 'Sem dados');
  setTextAll('[data-highlight-donations-value]', don?fmt(weeklyDonationsFor(don)):'0');
}

function renderDashboard(){
  applyClanHeader(dashClan);
  renderWar(dashClan, dashMembers, dashWar);
  renderHighlights(dashMembers, dashWar);
  window.TopBRSI18n?.apply?.();
}

renderDashboard();

function refreshFromSources(){
  loadClan().then(clan=>{
    if(clan && Object.keys(clan).length){
      dashClan = {...dashClan, ...clan};
      localStorage.setItem('topbrs_clan', JSON.stringify(dashClan));
      renderDashboard();
    }
  }).catch(error=>console.warn('Dashboard: clã indisponível:', error));

  loadMembers().then(members=>{
    const clean = cleanMembers(members);
    if(clean.length){
      dashMembers = clean;
      localStorage.setItem('topbrs_members', JSON.stringify(clean));
      renderDashboard();
    }
  }).catch(error=>console.warn('Dashboard: membros indisponíveis:', error));

  loadCurrentWarForUi().then(war=>{
    dashWar = war || {members:{}};
    renderDashboard();
  }).catch(error=>console.warn('Dashboard: guerra indisponível:', error));

  syncWarSilently()
    .then(()=>loadCurrentWarForUi())
    .then(war=>{
      if(war){ dashWar = war; renderDashboard(); }
    })
    .catch(error=>console.warn('Dashboard: sync guerra indisponível:', error));
}

refreshFromSources();
window.addEventListener('topbrs:datarefresh', refreshFromSources);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) refreshFromSources(); });

document.querySelectorAll('.highlight-grid article')[0]?.addEventListener('click',()=>location.href='classification.html#geral');
document.querySelectorAll('.highlight-grid article')[2]?.addEventListener('click',()=>location.href='classification.html#doacoes');

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

  dashClan = {...dashClan, badge:src, badgeSrc:src, badgeUrl:src};
  localStorage.setItem("topbrs_clan_badge", src);
  localStorage.setItem("topbrs_clan", JSON.stringify(dashClan));

  try{
    await saveClanBadgeEverywhere(src);
  }catch(error){
    console.warn("Emblema salvo localmente. Firestore indisponível:", error);
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

/* Notifications */
function dashT(key, vars={}){
  return window.TopBRSI18n?.t ? window.TopBRSI18n.t(key, vars) : key;
}

function getDashboardNotifications(){
  try{
    const raw = JSON.parse(localStorage.getItem('topbrs_notifications') || '[]');
    if(Array.isArray(raw) && raw.length) return raw;
  }catch{}
  return [
    {type:'war', titleKey:'dashboard.currentWar', message:'Acompanhe a janela de guerra e os ataques da semana.', createdAt:new Date().toISOString(), unread:true},
    {type:'sync', titleKey:'settings.api', message:'Sincronização API/VPS conectada ao clã atual.', createdAt:new Date().toISOString(), unread:true}
  ];
}

function saveDashboardNotifications(items){
  try{ localStorage.setItem('topbrs_notifications', JSON.stringify(items || [])); }catch{}
}

function notificationTitle(n){ return n.titleKey ? dashT(n.titleKey) : (n.title || dashT('dashboard.notifications')); }
function notificationMessage(n){ return n.message || n.messageOriginal || ''; }
function notificationDate(n){ try{ return new Date(n.createdAt || n.date || Date.now()).toLocaleString(); }catch{return '';} }

function notificationMarkup(n, idx){
  const unread = n.unread !== false;
  return `<article class="notification-item compact ${unread ? 'is-unread' : ''}" data-notification-index="${idx}">
    <i class="notification-dot" aria-hidden="true"></i>
    <div class="notification-copy">
      <strong>${notificationTitle(n)}</strong>
      <span>${notificationDate(n)}</span>
      <p class="notification-message" hidden>${notificationMessage(n)}</p>
    </div>
    <button type="button" class="notification-toggle" aria-expanded="false" aria-label="Expandir notificação">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </article>`;
}

function bindNotificationToggles(){
  document.querySelectorAll('.notification-toggle').forEach(btn=>{
    if(btn.dataset.bound) return;
    btn.dataset.bound='1';
    btn.addEventListener('click', e=>{
      e.preventDefault();
      e.stopPropagation();
      const item=btn.closest('.notification-item');
      const msg=item?.querySelector('.notification-message');
      const expanded=btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      item?.classList.toggle('is-open', !expanded);
      if(msg) msg.hidden = expanded;
      if(!expanded){
        const idx=Number(item?.dataset.notificationIndex);
        const all=getDashboardNotifications();
        if(all[idx]) all[idx].unread=false;
        saveDashboardNotifications(all);
        item?.classList.remove('is-unread');
      }
    });
  });
}

function renderDashboardNotifications(){
  const latest = getDashboardNotifications().slice(0,3);
  const small = document.querySelector('#dashboardNotificationList');
  const modal = document.querySelector('#modalNotificationList');
  const html = latest.length ? latest.map(notificationMarkup).join('') : `<div class="empty-notifications">${dashT('dashboard.noNotifications')}</div>`;
  if(small) small.innerHTML = html;
  if(modal) modal.innerHTML = html;
  bindNotificationToggles();
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
document.querySelector('#clearDashNotifications')?.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); saveDashboardNotifications([]); renderDashboardNotifications(); });
window.addEventListener('topbrs:languagechange', renderDashboardNotifications);
renderDashboardNotifications();
