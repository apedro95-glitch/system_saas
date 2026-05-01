import {
  parseLocalJSON,
  findCurrentMemberProfile,
  saveAvatarEverywhere,
  getCurrentClanTag
} from "./identity.js";

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const avatarOptions = [
  "assets/icons/profile-user.svg",
  "assets/avatars/avatar-1.webp",
  "assets/avatars/avatar-2.webp",
  "assets/avatars/avatar-3.webp",
  "assets/avatars/avatar-4.webp",
  "assets/avatars/avatar-5.webp",
  "assets/avatars/avatar-6.webp",
  "assets/avatars/avatar-7.webp",
  "assets/avatars/avatar-8.webp"
];

const profileBackgroundOptions = ["premium-bg-royal","premium-bg-gold","premium-bg-blue","premium-bg-purple"];

const clan = parseLocalJSON("topbrs_clan");
const userAvatar = document.querySelector("#userAvatar");
const settingsNick = document.querySelector("#settingsNick");
const settingsMeta = document.querySelector("#settingsMeta");
const settingsClan = document.querySelector("#settingsClan");
const settingsClanTag = document.querySelector("#settingsClanTag");

let currentPlan = "trial";
let currentPlanData = {};

function roleLabel(role){
  const value = String(role || "member").toLowerCase();
  if(value === "admin" || value === "leader") return "Admin";
  if(value === "coleader" || value === "co-leader") return "Co-líder";
  if(value === "elder") return "Ancião";
  return "Membro";
}
function normalizePlan(plan){
  const p = String(plan || "trial").toLowerCase();
  if(["basic","basico","básico"].includes(p)) return "basic";
  if(p === "plus") return "plus";
  if(p === "premium") return "premium";
  return "trial";
}
function planLabel(plan){
  const p = normalizePlan(plan);
  if(p === "basic") return "Básico";
  if(p === "plus") return "Plus";
  if(p === "premium") return "Premium";
  return "Trial";
}
function dateFromAny(value){
  if(!value) return null;
  if(value?.toDate) return value.toDate();
  if(value?.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function diffParts(targetDate){
  const end = dateFromAny(targetDate);
  if(!end) return null;
  const now = new Date();
  const ms = end - now;
  if(ms <= 0) return { expired:true, days:0, hours:0, minutes:0, months:0, years:0, remMonths:0, remDays:0 };
  const daysTotal = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const months = Math.floor(daysTotal / 30);
  const years = Math.floor(months / 12);
  return { expired:false, days:daysTotal, hours, minutes, months, years, remMonths: months % 12, remDays: daysTotal % 30 };
}
function countdownText(plan, expiresAt){
  const diff = diffParts(expiresAt);
  if(!diff) return "Expiração pendente";
  if(diff.expired) return "Plano expirado";
  const p = normalizePlan(plan);
  if(p === "trial") return `Expiração: ${diff.days}d ${diff.hours}h ${diff.minutes}min`;
  if(p === "basic") return `Expiração: ${Math.max(1,diff.months)} ${Math.max(1,diff.months) === 1 ? "mês" : "meses"}`;
  if(p === "plus") return `Expiração: ${diff.months} ${diff.months === 1 ? "mês" : "meses"} e ${diff.remDays} dias`;
  const yearText = diff.years > 0 ? `${diff.years} ${diff.years === 1 ? "ano" : "anos"}` : "";
  const monthText = diff.remMonths > 0 ? `${diff.remMonths} ${diff.remMonths === 1 ? "mês" : "meses"}` : "";
  return `Expiração: ${[yearText, monthText].filter(Boolean).join(" e ") || `${diff.days} dias`}`;
}
async function loadRealPlan(profile, clanData){
  const clanTag = getCurrentClanTag?.() || clanData.clanTag || clanData.tag || "";
  let data = {...clanData, ...profile};
  if(clanTag){
    try{
      const clanSnap = await getDoc(doc(db, "clans", clanTag));
      if(clanSnap.exists()) data = {...data, ...clanSnap.data()};
    }catch(error){ console.warn("Plano do clã indisponível:", error); }
    try{
      const accessSnap = await getDoc(doc(db, "saasAccess", clanTag));
      if(accessSnap.exists()) data = {...data, ...accessSnap.data()};
    }catch(error){ console.warn("Plano SaaS indisponível:", error); }
  }
  return data;
}
function applyPlanVisual(plan, expiresAt){
  const p = normalizePlan(plan);
  document.documentElement.dataset.plan = p;
  document.body.dataset.plan = p;
  const planEl = document.querySelector("#settingsPlan");
  const expEl = document.querySelector("#settingsExpire");
  const miniCard = planEl?.closest(".settings-mini-card");
  if(planEl) planEl.textContent = planLabel(p);
  if(expEl) expEl.textContent = countdownText(p, expiresAt);
  miniCard?.classList.remove("plan-trial","plan-basic","plan-plus","plan-premium");
  miniCard?.classList.add(`plan-${p}`);
}
function avatarIsAllowed(index){
  const p = normalizePlan(currentPlan);
  if(p === "premium" || p === "plus") return true;
  return index < 2;
}
async function hydrateSettings(){
  const profile = await findCurrentMemberProfile();
  const clanData = parseLocalJSON("topbrs_clan");
  currentPlanData = await loadRealPlan(profile, clanData);
  currentPlan = normalizePlan(currentPlanData.plan || currentPlanData.planType || "trial");
  const savedAvatar = currentPlan === "trial" || currentPlan === "basic"
    ? (profile.avatar && avatarOptions.slice(0,2).includes(profile.avatar) ? profile.avatar : "assets/icons/profile-user.svg")
    : (profile.avatar || localStorage.getItem("topbrs_avatar") || avatarOptions[0]);
  userAvatar.src = savedAvatar;
  settingsNick.textContent = profile.displayName || profile.nick || profile.name || profile.nome || profile.email || "Usuário";
  settingsMeta.textContent = `${roleLabel(profile.role)} • ${profile.playerTag || "sem tag"}`;
  settingsClan.textContent = currentPlanData.clanName || clanData.name || clan.name || "TopBRS";
  settingsClanTag.textContent = currentPlanData.clanTag || clanData.clanTag || clanData.tag || clan.clanTag || clan.tag || "#ABC123";
  applyPlanVisual(currentPlan, currentPlanData.planExpiresAt || currentPlanData.expiresAt);
  applyProfileBackground();
}
function applyProfileBackground(){
  const bg = localStorage.getItem("topbrs_profile_bg") || "premium-bg-royal";
  const hero = document.querySelector(".settings-profile-hero");
  hero?.classList.remove(...profileBackgroundOptions);
  if(normalizePlan(currentPlan) === "premium") hero?.classList.add(bg, "premium-avatar-bg-enabled");
  else hero?.classList.remove("premium-avatar-bg-enabled");
}
function openAvatarPicker(){
  const overlay = document.querySelector("#avatarPickerOverlay");
  const grid = document.querySelector("#avatarPickerGrid");
  const subtitle = document.querySelector("#avatarPickerSubtitle");
  const bgSection = document.querySelector("#premiumBgSelector");
  const p = normalizePlan(currentPlan);
  if(subtitle){
    subtitle.textContent = (p === "trial" || p === "basic")
      ? "Selecione uma imagem para o seu perfil ou faça UPGRADE de seu plano para liberar todos os avatares"
      : "Selecione uma imagem para o seu perfil.";
  }
  grid.innerHTML = avatarOptions.map((src,index)=>{
    const locked = !avatarIsAllowed(index);
    return `<button type="button" class="avatar-choice ${locked ? "locked" : ""}" data-src="${src}" ${locked ? "disabled" : ""}>
      <img src="${src}" alt="">
      ${locked ? `<span class="avatar-lock"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2.4" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>` : ""}
    </button>`;
  }).join("");
  grid.querySelectorAll(".avatar-choice:not(.locked)").forEach(btn=>btn.addEventListener("click", ()=>selectAvatar(btn.dataset.src)));
  if(bgSection){
    bgSection.hidden = p !== "premium";
    bgSection.innerHTML = p === "premium" ? `<div class="modal-eyebrow">Premium</div><h3>Fundo do perfil</h3><div class="premium-bg-grid">${profileBackgroundOptions.map(bg=>`<button type="button" class="premium-bg-choice ${bg}" data-bg="${bg}"></button>`).join("")}</div>` : "";
    bgSection.querySelectorAll(".premium-bg-choice").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        localStorage.setItem("topbrs_profile_bg", btn.dataset.bg);
        applyProfileBackground();
        bgSection.querySelectorAll(".premium-bg-choice").forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }
  document.body.classList.add("modal-open");
  document.documentElement.classList.add("modal-open");
  overlay.classList.add("show");
}
function closeAvatarPicker(){
  const overlay = document.querySelector("#avatarPickerOverlay");
  overlay.classList.remove("show");
  document.body.classList.remove("modal-open");
  document.documentElement.classList.remove("modal-open");
}
async function selectAvatar(src){
  userAvatar.src = src;
  try{ await saveAvatarEverywhere(src); }
  catch(error){ console.warn("Avatar salvo localmente. Firestore indisponível:", error); localStorage.setItem("topbrs_avatar", src); }
  window.dispatchEvent(new CustomEvent("topbrs:avatar-updated", { detail: { src } }));
  closeAvatarPicker();
}
document.querySelector("#openAvatarPicker")?.addEventListener("click", openAvatarPicker);
document.querySelector("#closeAvatarPicker")?.addEventListener("click", closeAvatarPicker);
document.querySelector("#avatarPickerOverlay")?.addEventListener("click", event=>{ if(event.target.id === "avatarPickerOverlay") closeAvatarPicker(); });
document.querySelector("#themeToggle")?.addEventListener("click", ()=>{
  const current = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = current;
  localStorage.setItem("topbrs_theme", current);
});
const savedTheme = localStorage.getItem("topbrs_theme");
if(savedTheme) document.documentElement.dataset.theme = savedTheme;
document.querySelector("#logoutSettings")?.addEventListener("click", ()=>{ if(typeof logoutUser === "function") logoutUser(); else window.location.href = "index.html"; });
hydrateSettings();
