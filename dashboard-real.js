import { loadClan, loadMembers, syncClanAndMembersFromApi, formatNumber, periodLabelNow, warWindowState } from "./real-data.js";

async function initDashboard(){
  let clan = await loadClan();
  let members = (await loadMembers()).filter(m=>!m.removed);

  // Cabeçalho real
  const nameEl = document.querySelector(".dash-clan strong");
  const tagEl = document.querySelector(".dash-clan span");
  const badge = document.querySelector(".dash-badge img");
  if(nameEl) nameEl.textContent = clan?.name || "TopBRS";
  if(tagEl) tagEl.textContent = clan?.clanTag || clan?.tag || "#ABC123";
  if(badge){
    badge.src = clan?.badge || "assets/icons/clan.svg";
    badge.onerror = () => badge.src = "assets/icons/clan.svg";
  }

  const period = periodLabelNow();
  document.querySelectorAll("[data-war-month-week]").forEach(el=>el.textContent=period.label);
  document.querySelectorAll(".dash-card h2").forEach(el=>{
    if(el.textContent.includes("Abril") || el.querySelector("[data-war-month-week]")) el.innerHTML = `<span data-war-month-week>${period.label}</span>`;
  });

  const war = warWindowState();
  const totalAttacks = (members.length || Number(clan?.members || 0) || 0) * 16;

  document.querySelectorAll("[data-war-status]").forEach(el=>el.textContent = war.status);
  document.querySelectorAll("[data-war-attacks]").forEach(el=>el.textContent = `${war.attacksUsed} / ${totalAttacks}`);
  document.querySelectorAll("[data-war-fame]").forEach(el=>el.textContent = formatNumber(war.fame));
  document.querySelectorAll(".progress-line span,.dash-progress span").forEach(el=>el.style.width="0%");

  // Destaques reais/sem fake
  const top = [...members].sort((a,b)=>(b.trophies||0)-(a.trophies||0))[0];
  const donations = [...members].sort((a,b)=>(b.donations||0)-(a.donations||0))[0];

  document.querySelectorAll("[data-highlight-top-name]").forEach(el=>el.textContent=top?.name || "Sem dados");
  document.querySelectorAll("[data-highlight-top-value]").forEach(el=>el.textContent=top ? formatNumber(top.trophies) : "0");
  document.querySelectorAll("[data-highlight-active-name]").forEach(el=>el.textContent="Em breve");
  document.querySelectorAll("[data-highlight-active-value]").forEach(el=>el.textContent="0 ataques");
  document.querySelectorAll("[data-highlight-donations-name]").forEach(el=>el.textContent=donations?.name || "Sem dados");
  document.querySelectorAll("[data-highlight-donations-value]").forEach(el=>el.textContent=donations ? formatNumber(donations.donations||0) : "0");

  // Corrige cards clicáveis sem mexer visual
  const highlightCards = document.querySelectorAll(".highlight-grid article");
  highlightCards[0]?.addEventListener("click", ()=>location.href="classification.html#geral");
  highlightCards[2]?.addEventListener("click", ()=>location.href="classification.html#doacoes");

  // Notificações: mantém formato original do bloco, só garante que expandir não apague.
  document.querySelectorAll(".notification-row,.notification-item").forEach(row=>{
    row.addEventListener("click", event=>{
      row.classList.toggle("expanded");
      event.stopPropagation();
    });
  });
}

initDashboard();
