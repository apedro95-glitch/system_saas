import { loadClan, loadMembers, formatNumber, applyClanHeader, getRealWarState } from "./real-data.js";

const clan = await loadClan();
const members = await loadMembers();
applyClanHeader(clan);

const war = getRealWarState();
const totalAttacks = (members.length || Number(clan.members || 0) || 0) * 16;

document.querySelectorAll("[data-war-attacks]").forEach(el => el.textContent = `${war.attacksUsed} / ${totalAttacks}`);
document.querySelectorAll("[data-war-fame]").forEach(el => el.textContent = formatNumber(war.fame));
document.querySelectorAll("[data-war-status]").forEach(el => {
  el.textContent = war.active ? "Em andamento" : "Fora da janela";
  el.classList.toggle("is-muted", !war.active);
});

const membersBody = document.querySelector("[data-war-members]");
if(membersBody){
  membersBody.innerHTML = members.map(m => `
    <tr>
      <td>${m.name || "Membro"}</td>
      <td>0/16</td>
      <td>0</td>
    </tr>
  `).join("");
}

const attacksBody = document.querySelector("[data-war-attacks-list]");
if(attacksBody){
  attacksBody.innerHTML = members.map(m => `
    <tr>
      <td>${m.name || "Membro"}</td>
      <td>0</td>
      <td><span class="dot empty"></span><span class="dot empty"></span><span class="dot empty"></span><span class="dot empty"></span></td>
    </tr>
  `).join("");
}
