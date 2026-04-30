import { db } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { parseLocalJSON, findCurrentMemberProfile, saveAvatarEverywhere } from "./identity.js";

const avatarOptions = ["assets/avatars/avatar-1.webp", "assets/avatars/avatar-2.webp", "assets/avatars/avatar-3.webp", "assets/avatars/avatar-4.webp", "assets/avatars/avatar-5.webp", "assets/avatars/avatar-6.webp", "assets/avatars/avatar-7.webp", "assets/avatars/avatar-8.webp"];
const clan = parseLocalJSON("topbrs_clan");
const userAvatar = document.querySelector("#userAvatar");
const settingsNick = document.querySelector("#settingsNick");
const settingsMeta = document.querySelector("#settingsMeta");
const settingsClan = document.querySelector("#settingsClan");
const settingsClanTag = document.querySelector("#settingsClanTag");

function roleLabel(role){ const value=String(role||"member").toLowerCase(); if(value==="admin"||value==="leader")return"Admin"; if(value==="coleader"||value==="co-leader")return"Co-líder"; if(value==="elder")return"Ancião"; return"Membro"; }
function normalizeTag(value){ const cleaned=String(value||"").trim().toUpperCase().replace(/\s+/g,""); return cleaned ? (cleaned.startsWith("#")?cleaned:`#${cleaned}`) : ""; }
function toDate(value){ if(!value)return null; if(value?.toDate)return value.toDate(); const d=new Date(value); return Number.isNaN(d.getTime())?null:d; }
function planLabel(plan){ const p=String(plan||"trial").toLowerCase(); if(p==="basic")return"Básico"; if(p==="plus")return"Plus"; if(p==="premium")return"Premium"; return"Trial"; }
function countdownText(value){
  const exp=toDate(value); if(!exp)return"Expiração pendente";
  const diff=exp.getTime()-Date.now(); if(diff<=0)return"Plano expirado";
  const days=Math.floor(diff/86400000), hours=Math.floor((diff%86400000)/3600000), mins=Math.floor((diff%3600000)/60000);
  if(days>1)return`Expira em ${days} dias`;
  if(days===1)return`Expira em 1 dia e ${hours}h`;
  if(hours>0)return`Expira em ${hours}h ${mins}min`;
  return`Expira em ${mins}min`;
}
async function findSaasAccess(tag){
  const normalized=normalizeTag(tag); if(!normalized)return null;
  const variants=[normalized, normalized.replace("#","")];
  for(const id of variants){
    try{ const snap=await getDoc(doc(db,"saasAccess",id)); if(snap.exists())return {id,...snap.data()}; }catch(error){ console.warn("SaaS access indisponível:", error); }
  }
  return null;
}
function applyPlanVisual(access, fallbackPlan){
  const plan=String(access?.plan||fallbackPlan||"trial").toLowerCase();
  const card=document.querySelector("#settingsPlan")?.closest(".settings-mini-card");
  if(card){ card.classList.remove("plan-trial","plan-basic","plan-plus","plan-premium","plan-expired"); card.classList.add(`plan-${plan}`); if(countdownText(access?.planExpiresAt)==="Plano expirado")card.classList.add("plan-expired"); }
  const planEl=document.querySelector("#settingsPlan"); if(planEl) planEl.textContent=planLabel(plan);
  const expEl=document.querySelector("#settingsExpire"); if(expEl) expEl.textContent=countdownText(access?.planExpiresAt);
}
async function hydrateSettings(){
  const profile = await findCurrentMemberProfile();
  const clanData = parseLocalJSON("topbrs_clan");
  const savedAvatar = profile.avatar || localStorage.getItem("topbrs_avatar") || avatarOptions[0] || "assets/icons/profile-user.svg";
  userAvatar.src = savedAvatar;
  settingsNick.textContent = profile.displayName || profile.nick || profile.name || profile.nome || profile.email || "Usuário";
  settingsMeta.textContent = `${roleLabel(profile.role)} • ${profile.playerTag || "sem tag"}`;
  settingsClan.textContent = clanData.name || clan.name || "TopBRS";
  const clanTag = normalizeTag(clanData.clanTag || clanData.tag || clan.clanTag || clan.tag || profile.clanTag || localStorage.getItem("topbrs_clan_tag") || "#ABC123");
  settingsClanTag.textContent = clanTag;
  const access = await findSaasAccess(clanTag);
  applyPlanVisual(access, profile.plan || clanData.plan || "trial");
  setInterval(()=>applyPlanVisual(access, profile.plan || clanData.plan || "trial"), 60000);
}
function openAvatarPicker(){
  const overlay=document.querySelector("#avatarPickerOverlay"), grid=document.querySelector("#avatarPickerGrid");
  grid.innerHTML=avatarOptions.map(src=>`<button type="button" class="avatar-choice" data-avatar="${src}"><img src="${src}" alt="Avatar"></button>`).join("");
  overlay.classList.add("show"); document.body.classList.add("modal-open");
  grid.querySelectorAll(".avatar-choice").forEach(btn=>btn.addEventListener("click",async()=>{ const src=btn.dataset.avatar; userAvatar.src=src; localStorage.setItem("topbrs_avatar",src); await saveAvatarEverywhere(src); closeAvatarPicker(); }));
}
function closeAvatarPicker(){ document.querySelector("#avatarPickerOverlay")?.classList.remove("show"); document.body.classList.remove("modal-open"); }
document.querySelector("#openAvatarPicker")?.addEventListener("click", openAvatarPicker);
document.querySelector("#closeAvatarPicker")?.addEventListener("click", closeAvatarPicker);
document.querySelector("#avatarPickerOverlay")?.addEventListener("click", e=>{ if(e.target.id==="avatarPickerOverlay") closeAvatarPicker(); });
document.querySelector("#themeToggle")?.addEventListener("click",()=>document.documentElement.classList.toggle("light-theme"));
hydrateSettings();
