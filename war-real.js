import { loadClan, loadMembers, formatNumber, applyClanHeader, getRealWarState, syncClanAndMembersFromApi } from "./real-data.js";
import { syncWarSilently, loadCurrentWarForUi, getDailyAttackDots } from "./war-logic.js";

async function hydrateWar(){
  const clan = await loadClan();
  const members = await loadMembers();
  applyClanHeader(clan);
  const war = getRealWarState();
  const current = await loadCurrentWarForUi();
  const totalAttacks = (members.length || Number(clan.members || 0) || 0) * 16;
  const used = Object.values(current.members||{}).reduce((sum,m)=>sum+Number(m.weeklyAttacks||0),0);
  const fame = Object.values(current.members||{}).reduce((sum,m)=>sum+Number(m.warPoints||0),0);
  document.querySelectorAll("[data-war-attacks], #warAttacksUsed").forEach(el => el.textContent = `${used} / ${totalAttacks}`);
  document.querySelectorAll("[data-war-fame]").forEach(el => el.textContent = formatNumber(fame));
  document.querySelectorAll("[data-war-status]").forEach(el => { el.textContent = war.active ? "Em andamento" : "Fora da janela"; el.classList.toggle("is-muted", !war.active); });
  const bar=document.querySelector('#warBlockProgressBar'); if(bar) bar.style.width=(totalAttacks?Math.min(100,(used/totalAttacks)*100):0)+'%';
  const membersBody = document.querySelector("[data-war-members], #warList");
  if(membersBody){
    membersBody.innerHTML = members.map(m => { const id=String(m.tag||'').replace('#',''); const w=current.members?.[id]||{}; return `<div class="war-row"><span>${m.name || "Membro"}</span><b>${Number(w.weeklyAttacks||0)}/16</b><strong>${Number(w.warPoints||0)}</strong></div>`; }).join("");
  }
  const attacksBody = document.querySelector("[data-war-attacks-list]");
  if(attacksBody){ attacksBody.innerHTML = members.map(m => { const id=String(m.tag||'').replace('#',''); const w=current.members?.[id]||{}; const dots=[1,2,3,4].map(i=>`<span class="dot ${i<=getDailyAttackDots(w,current.ctx.dayKey)?'filled':'empty'}"></span>`).join(''); return `<tr><td>${m.name||'Membro'}</td><td>${Number(w.weeklyAttacks||0)}</td><td>${dots}</td></tr>`; }).join(""); }
}
window.topbrsAfterRefresh=hydrateWar;
await hydrateWar();
syncClanAndMembersFromApi().then(()=>syncWarSilently()).then(()=>hydrateWar()).catch(()=>{});
