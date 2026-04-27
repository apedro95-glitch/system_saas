import { loadClan, loadMembers, formatNumber, applyClanHeader, getRealWarState } from "./real-data.js";

const clan = await loadClan();
const members = await loadMembers();
applyClanHeader(clan);

const activeMembers = members.length || Number(clan.members || 0) || 0;
const totalAttacks = activeMembers * 16;
const war = getRealWarState();

const clanName = document.querySelector("[data-dashboard-clan-name]");
if(clanName) clanName.textContent = clan?.name || "TopBRS";

const clanTag = document.querySelector("[data-dashboard-clan-tag]");
if(clanTag) clanTag.textContent = clan?.clanTag || clan?.tag || "#ABC123";

const badge = document.querySelector("[data-dashboard-clan-badge]");
if(badge){
  badge.src = clan?.badge || "assets/icons/clan.svg";
  badge.onerror = () => badge.src = "assets/icons/clan.svg";
}

document.querySelectorAll("[data-war-month-week]").forEach(el => {
  el.textContent = "Abril • Semana 4";
});

document.querySelectorAll("[data-war-attacks]").forEach(el => {
  el.textContent = `${war.attacksUsed} / ${totalAttacks || 0}`;
});

document.querySelectorAll("[data-war-fame]").forEach(el => {
  el.textContent = formatNumber(war.fame);
});

document.querySelectorAll("[data-war-status]").forEach(el => {
  el.textContent = war.active ? "Em andamento" : "Fora da janela";
  el.classList.toggle("is-muted", !war.active);
});

const donationsSorted = [...members].sort((a,b)=>(b.donations || 0) - (a.donations || 0));
const topTrophy = members[0];
const topDonation = donationsSorted[0];

document.querySelectorAll("[data-highlight-top-name]").forEach(el => el.textContent = topTrophy?.name || "Sem dados");
document.querySelectorAll("[data-highlight-top-value]").forEach(el => el.textContent = topTrophy ? formatNumber(topTrophy.trophies) : "0");

document.querySelectorAll("[data-highlight-donations-name]").forEach(el => el.textContent = topDonation?.name || "Sem dados");
document.querySelectorAll("[data-highlight-donations-value]").forEach(el => el.textContent = topDonation ? formatNumber(topDonation.donations || 0) : "0");

// Mais ativo fica estático por enquanto, sem dado fictício enganoso.
document.querySelectorAll("[data-highlight-active-name]").forEach(el => el.textContent = "Em breve");
document.querySelectorAll("[data-highlight-active-value]").forEach(el => el.textContent = "0 ataques");

document.querySelectorAll("[data-go-war]").forEach(el => el.addEventListener("click", ()=> location.href = "war.html"));
document.querySelectorAll("[data-go-classification-general]").forEach(el => el.addEventListener("click", ()=> location.href = "classification.html#geral"));
document.querySelectorAll("[data-go-classification-donations]").forEach(el => el.addEventListener("click", ()=> location.href = "classification.html#doacoes"));

// Últimas notificações: uma mensagem de teste fixa, expandir não remove.
const notificationList = document.querySelector("[data-notification-list]");
if(notificationList){
  notificationList.innerHTML = `
    <div class="notification-item" data-test-notification>
      <div class="notification-icon">🔔</div>
      <div class="notification-copy">
        <strong>Notificação de teste</strong>
        <span>Agora</span>
        <p class="notification-body" hidden>Esta mensagem deve permanecer nas últimas notificações mesmo depois de expandida.</p>
      </div>
      <span class="notification-dot"></span>
      <button class="notification-chevron" type="button" aria-label="Expandir">⌄</button>
    </div>
  `;
  notificationList.querySelector(".notification-chevron")?.addEventListener("click", ()=>{
    const body = notificationList.querySelector(".notification-body");
    if(body) body.hidden = !body.hidden;
  });
}
