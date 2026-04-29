import { loadClan, loadMembers, formatNumber, applyClanHeader } from "./real-data.js";

const clan = await loadClan();
const members = await loadMembers();
applyClanHeader(clan);

function memberRows(mode){
  const sorted = [...members].sort((a,b)=>{
    if(mode === "doacoes") return (b.donations || 0) - (a.donations || 0);
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return sorted.map((m, i)=>{
    if(mode === "doacoes"){
      return `<tr><td>${i+1}</td><td>${m.name || "Membro"}</td><td>${formatNumber(m.donations || 0)}</td><td>${formatNumber(m.donationsReceived || 0)}</td></tr>`;
    }

    return `<tr><td>${i+1}</td><td>${m.name || "Membro"}</td><td>0</td></tr>`;
  }).join("");
}

function paintTables(){
  document.querySelectorAll("[data-classification-general]").forEach(el => el.innerHTML = memberRows("geral"));
  document.querySelectorAll("[data-classification-tournament]").forEach(el => el.innerHTML = memberRows("torneio"));
  document.querySelectorAll("[data-classification-donations]").forEach(el => el.innerHTML = memberRows("doacoes"));
}

paintTables();

const hash = location.hash.replace("#","");
if(hash){
  document.querySelector(`[data-tab="${hash}"]`)?.click();
}
