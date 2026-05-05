import {
  parseLocalJSON,
  findCurrentMemberProfile,
  saveAvatarEverywhere,
  getCurrentClanTag,
  getCurrentUserTag,
  cleanTag,
  normalizeTag,
  getAvatarForMember
} from "./identity.js";

import { auth, db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { updatePassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { loadMembers, syncClanAndMembersFromApi } from "./real-data.js";
import { syncWarSilently } from "./war-logic.js";

function i18nS(key, values = {}){
  let text = window.TopBRSI18n?.t ? window.TopBRSI18n.t(key, values) : key;
  const fallback = {
    'pt-BR': {'settings.thisDevice':'Este dispositivo','settings.active':'ativa','settings.local':'local','settings.device':'Dispositivo','settings.ended':'encerrada','settings.endSession':'Encerrar','settings.syncing':'Em sincronização','settings.connected':'Conectado','settings.error':'Erro'},
    'en-US': {'settings.thisDevice':'This device','settings.active':'active','settings.local':'local','settings.device':'Device','settings.ended':'ended','settings.endSession':'End','settings.syncing':'Syncing','settings.connected':'Connected','settings.error':'Error'},
    'es-ES': {'settings.thisDevice':'Este dispositivo','settings.active':'activa','settings.local':'local','settings.device':'Dispositivo','settings.ended':'cerrada','settings.endSession':'Cerrar','settings.syncing':'Sincronizando','settings.connected':'Conectado','settings.error':'Error'}
  };
  const lang = window.TopBRSI18n?.getLanguage?.() || localStorage.getItem('topbrs_language') || 'pt-BR';
  if(text === key) text = fallback[lang]?.[key] || fallback['pt-BR']?.[key] || key;
  Object.entries(values || {}).forEach(([k,v])=>{ text = String(text).replaceAll(`{{${k}}}`, v); });
  return text;
}
function applyInternalI18n(){ setTimeout(()=>window.dispatchEvent(new CustomEvent('topbrs:languagechange')), 0); }


const avatarOptions = [
  "assets/icons/profile-user.svg",
  ...Array.from({length:300}, (_,i)=>`assets/avatars/avatar-${i+1}.webp`)
];

const plusBackgroundOptions = [
  { id:"premium-bg-royal", type:"class", label:"Azul Royal" },
  { id:"premium-bg-gold", type:"class", label:"Dourado" },
  { id:"premium-bg-blue", type:"class", label:"Azul" },
  { id:"premium-bg-purple", type:"class", label:"Roxo" }
];

const premiumBackgroundOptions = Array.from({length:32}, (_,i)=>({
  id:`assets/profile-backgrounds/profile-bg-premium-${i+1}.webp`,
  type:"image",
  label:`Premium ${i+1}`
}));

const allBgClasses = plusBackgroundOptions.map(bg=>bg.id);
const clanLocal = parseLocalJSON("topbrs_clan");

const els = {
  userAvatar: document.querySelector("#userAvatar"),
  settingsNick: document.querySelector("#settingsNick"),
  settingsMeta: document.querySelector("#settingsMeta"),
  settingsClan: document.querySelector("#settingsClan"),
  settingsClanTag: document.querySelector("#settingsClanTag"),
  settingsClanBadge: document.querySelector("[data-settings-clan-badge], #settingsClanBadge"),
  settingsAddonBadge: document.querySelector("#settingsAddonBadge"),
  settingsPlan: document.querySelector("#settingsPlan"),
  settingsExpire: document.querySelector("#settingsExpire"),
  planCard: document.querySelector(".plan-card"),
  planOverlay: document.querySelector("#planManagerOverlay")
};

let currentPlan = "trial";
let currentPlanData = {};
let currentProfile = {};
let currentMemberDoc = {};
let currentAddon = null;
let effectiveProfilePlan = "trial";

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

function formatDate(value){
  const d = dateFromAny(value);
  return d ? d.toLocaleDateString("pt-BR") : "—";
}

function diffParts(targetDate){
  const end = dateFromAny(targetDate);
  if(!end) return null;
  const ms = end - new Date();
  if(ms <= 0) return { expired:true, days:0, hours:0, minutes:0, months:0, years:0, remMonths:0, remDays:0 };
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);
  return { expired:false, days, hours, minutes, months, years, remMonths: months % 12, remDays: days % 30 };
}

function countdownText(plan, expiresAt){
  const d = diffParts(expiresAt);
  if(!d) return "Expiração pendente";
  if(d.expired) return "Plano expirado";
  const p = normalizePlan(plan);
  if(p === "trial") return `Expiração: ${d.days}d ${d.hours}h ${d.minutes}min`;
  if(p === "basic") return `Expiração: ${Math.max(1,d.months)} ${Math.max(1,d.months) === 1 ? "mês" : "meses"}`;
  if(p === "plus") return `Expiração: ${d.months} ${d.months === 1 ? "mês" : "meses"} e ${d.remDays} dias`;
  const y = d.years > 0 ? `${d.years} ${d.years === 1 ? "ano" : "anos"}` : "";
  const m = d.remMonths > 0 ? `${d.remMonths} ${d.remMonths === 1 ? "mês" : "meses"}` : "";
  return `Expiração: ${[y,m].filter(Boolean).join(" e ") || `${d.days} dias`}`;
}

function roleLabel(role){
  const value = String(role || "member").toLowerCase();
  if(value === "admin") return "Admin";
  if(value === "leader") return i18nS("members.leader");
  if(value === "coleader" || value === "co-leader") return i18nS("members.coLeader");
  if(value === "elder") return i18nS("members.elder");
  return i18nS("members.member");
}

function addonIsActive(addon){
  if(!addon || addon.status !== "active") return false;
  const exp = dateFromAny(addon.expiresAt);
  return !exp || exp > new Date();
}

function getAddonPlan(){
  return addonIsActive(currentAddon) ? normalizePlan(currentAddon.plan) : "none";
}

function getEffectiveProfilePlan(){
  if(currentPlan === "premium") return "premium";
  const addonPlan = getAddonPlan();
  if(addonPlan === "premium") return "premium";
  if(addonPlan === "plus") return "plus";
  if(currentPlan === "plus") return "plus";
  return currentPlan;
}

function getAvatarNumber(src){
  const match = String(src || "").match(/avatar-(\d+)\.webp/i);
  return match ? Number(match[1]) : null;
}

function avatarAllowedSrc(src){
  const p = normalizePlan(effectiveProfilePlan);
  if(String(src || "").includes("profile-user.svg")) return true;
  if(p === "premium") return true;
  if(p === "plus"){
    const n = getAvatarNumber(src);
    return [5,6,7,8].includes(n);
  }
  return false;
}

function avatarAllowed(index){
  return avatarAllowedSrc(avatarOptions[index] || "");
}

function bgOptionsForEffectivePlan(){
  const p = normalizePlan(effectiveProfilePlan);
  if(p === "premium") return [...plusBackgroundOptions, ...premiumBackgroundOptions];
  if(p === "plus") return plusBackgroundOptions;
  return [];
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

async function loadMemberAddon(){
  const clanTag = getCurrentClanTag();
  const playerDocId = cleanTag(getCurrentUserTag());
  if(!clanTag || !playerDocId) return null;
  try{
    const memberSnap = await getDoc(doc(db, "clans", clanTag, "members", playerDocId));
    if(memberSnap.exists()){
      currentMemberDoc = memberSnap.data();
      return currentMemberDoc.profileAddon || null;
    }
  }catch(error){
    console.warn("Add-On do membro indisponível:", error);
  }
  return null;
}

function setProfileBackground(src){
  const hero = document.querySelector(".settings-profile-hero");
  if(!hero) return;
  hero.classList.remove(...allBgClasses, "premium-avatar-bg-enabled");
  hero.style.backgroundImage = "";

  if(!src) return;
  const opt = [...plusBackgroundOptions, ...premiumBackgroundOptions].find(bg=>bg.id === src);
  if(!opt) return;

  hero.classList.add("premium-avatar-bg-enabled");
  if(opt.type === "class"){
    hero.classList.add(opt.id);
  }else{
    hero.style.backgroundImage = `linear-gradient(180deg,rgba(5,11,22,.08),rgba(5,11,22,.48)), url('${opt.id}')`;
  }
}

async function saveProfileBackground(src){
  localStorage.setItem("topbrs_profile_bg", src);
  setProfileBackground(src);

  const clanTag = getCurrentClanTag();
  const playerDocId = cleanTag(getCurrentUserTag());
  if(clanTag && playerDocId){
    try{
      await setDoc(doc(db, "clans", clanTag, "members", playerDocId), {
        profileBackground: src,
        updatedAt: serverTimestamp()
      }, { merge:true });
    }catch(error){
      console.warn("Fundo salvo localmente. Firestore indisponível:", error);
    }
  }
}

function isPlanAdmin(){
  const role = String(currentProfile.role || currentProfile.systemRole || currentMemberDoc.role || "").toLowerCase();
  const email = String(currentProfile.email || currentProfile.buyerEmail || "").toLowerCase();
  const buyerEmail = String(currentPlanData.buyerEmail || currentPlanData.email || "").toLowerCase();
  return Boolean(
    currentProfile.saasOwner || currentProfile.systemOwner || currentProfile.owner || currentProfile.isAdmin ||
    currentMemberDoc.saasOwner || currentMemberDoc.systemOwner || currentMemberDoc.owner || currentMemberDoc.isAdmin ||
    role === "admin" || role === "leader" || role === "líder" || role === "lider" || role === "owner" ||
    (email && buyerEmail && email === buyerEmail)
  );
}

function setPaymentAccess(){
  const allowed = isPlanAdmin();
  const paymentTab = document.querySelector('[data-plan-tab="payment"]');
  const paymentPanel = document.querySelector('[data-plan-panel="payment"]');
  if(paymentTab) paymentTab.hidden = !allowed;
  if(paymentPanel) paymentPanel.dataset.adminOnly = allowed ? "false" : "true";
  return allowed;
}

function getPlanRequestStatus(){
  try{ return JSON.parse(localStorage.getItem("topbrs_plan_request_status") || "{}"); }catch{return {};}
}

function setPlanRequestStatus(data){
  localStorage.setItem("topbrs_plan_request_status", JSON.stringify(data || {}));
}

function clearPlanRequestStatus(){
  localStorage.removeItem("topbrs_plan_request_status");
}

function clearFeedbackAfterDelay(el, delay = 4200){
  if(!el) return;
  const token = String(Date.now());
  el.dataset.clearToken = token;
  window.setTimeout(()=>{
    if(el.dataset.clearToken === token){
      el.textContent = "";
      el.className = "tag-feedback";
      delete el.dataset.clearToken;
    }
  }, delay);
}

function updateAddonButtons(){
  const addonPlan = getAddonPlan();
  const clanPremium = currentPlan === "premium";
  document.querySelectorAll(".addon-request-btn").forEach(btn=>{
    const btnPlan = normalizePlan(btn.dataset.addonPlan);
    const isSameActive = addonPlan === btnPlan;
    const blockedByPremiumAddon = addonPlan === "premium";
    const disabled = clanPremium || isSameActive || blockedByPremiumAddon;
    btn.disabled = disabled;
    btn.classList.toggle("addon-active-choice", isSameActive || (blockedByPremiumAddon && btnPlan === "premium"));
    const span = btn.querySelector("span");
    if(span){
      if(clanPremium) span.textContent = i18nS("settings.releasedByClanPremium");
      else if(isSameActive) span.textContent = i18nS("settings.addonActive", {plan: planLabel(btnPlan)});
      else if(blockedByPremiumAddon) span.textContent = i18nS("settings.premiumAlreadyActive");
      else span.textContent = i18nS(btnPlan === "premium" ? "settings.requestAddonPremium" : "settings.requestAddonPlus");
    }
  });
}

function updatePaymentStatus(){
  const status = getPlanRequestStatus();
  const row = document.querySelector("#paymentRequestStatus");
  const icon = document.querySelector("#paymentRequestStatusIcon");
  if(!row || !icon) return;

  const requestedPlan = normalizePlan(status.plan);
  const hasPending = status.status === "pending" && requestedPlan && requestedPlan !== "trial";
  const completed = hasPending && normalizePlan(currentPlan) === requestedPlan;

  if(completed){
    clearPlanRequestStatus();
    row.hidden = true;
    row.classList.remove("pending","complete");
    return;
  }

  row.hidden = !hasPending;
  if(!hasPending){
    row.classList.remove("pending","complete");
    return;
  }

  row.classList.add("pending");
  row.classList.remove("complete");
  icon.src = "assets/icons/history-clock.svg";
  icon.alt = i18nS("settings.pending");
  const label = row.querySelector("span");
  if(label) label.textContent = i18nS("settings.waitingSaasRelease", {plan: planLabel(status.plan)});
}

function applyPlanVisual(){
  effectiveProfilePlan = getEffectiveProfilePlan();

  if(els.settingsPlan) els.settingsPlan.textContent = planLabel(currentPlan);
  if(els.settingsExpire) els.settingsExpire.textContent = countdownText(currentPlan, currentPlanData.planExpiresAt || currentPlanData.expiresAt);

  document.querySelector(".settings-phone")?.classList.remove("plan-trial","plan-basic","plan-plus","plan-premium");
  document.querySelector(".settings-phone")?.classList.add(`plan-${currentPlan}`);
  els.planCard?.classList.remove("plan-trial","plan-basic","plan-plus","plan-premium");
  els.planCard?.classList.add(`plan-${currentPlan}`);

  const addonPlan = getAddonPlan();
  if(els.settingsAddonBadge){
    if(currentPlan === "premium"){
      els.settingsAddonBadge.src = "assets/icons/status-premium.svg";
      els.settingsAddonBadge.hidden = false;
      els.settingsAddonBadge.title = "Premium liberado pelo plano do clã";
    }else if(addonPlan === "plus" || addonPlan === "premium"){
      els.settingsAddonBadge.src = addonPlan === "premium" ? "assets/icons/status-premium.svg" : "assets/icons/status-defense.svg";
      els.settingsAddonBadge.hidden = false;
      els.settingsAddonBadge.title = `Add-On ${planLabel(addonPlan)}`;
    }else{
      els.settingsAddonBadge.hidden = true;
      els.settingsAddonBadge.removeAttribute("src");
    }
  }
  updatePaymentStatus();
}

function renderPlanModal(){
  setPaymentAccess();
  const activeIcon = document.querySelector("#planStatusActiveIcon");
  if(activeIcon){
    activeIcon.src = "assets/icons/status-active.svg";
    activeIcon.alt = "Plano ativo";
  }
  document.querySelector("#planModalCurrent").textContent = planLabel(currentPlan);
  document.querySelector("#planModalStatus").textContent = `Status: ${currentPlanData.status || currentPlanData.subscriptionStatus || "ativo"}`;
  document.querySelector("#planModalRemaining").textContent = countdownText(currentPlan, currentPlanData.planExpiresAt || currentPlanData.expiresAt).replace("Expiração: ","");
  document.querySelector("#planModalRenewal").textContent = formatDate(currentPlanData.planExpiresAt || currentPlanData.expiresAt);

  const benefits = document.querySelector("#planModalBenefits");
  const planBenefits = {
    trial:[i18nS("settings.benefit.trial1"), i18nS("settings.benefit.trial2"), i18nS("settings.benefit.trial3")],
    basic:[i18nS("settings.benefit.basic1"), i18nS("settings.benefit.basic2"), i18nS("settings.benefit.basic3")],
    plus:[i18nS("settings.benefit.plus1"), i18nS("settings.benefit.plus2"), i18nS("settings.benefit.plus3")],
    premium:[i18nS("settings.benefit.premium1"), i18nS("settings.benefit.premium2"), i18nS("settings.benefit.premium3")]
  };
  benefits.innerHTML = (planBenefits[currentPlan] || planBenefits.trial).map(x=>`<span>${x}</span>`).join("");

  const addonPlan = getAddonPlan();
  const current = document.querySelector("#addonCurrentCard");
  if(currentPlan === "premium"){
    current.innerHTML = `<strong>${i18nS("settings.clanPremiumActive")}</strong><span>${i18nS("settings.clanPremiumActiveText")}</span>`;
  }else if(addonPlan === "plus" || addonPlan === "premium"){
    current.innerHTML = `<strong>${i18nS("settings.addonActive", {plan: planLabel(addonPlan)})}</strong><span>${addonPlan === "premium" ? i18nS("settings.addonPremiumText") : i18nS("settings.addonPlusText")}</span>`;
  }else{
    current.innerHTML = `<strong>${i18nS("settings.noAddonActive")}</strong><span>${i18nS("settings.noAddonActiveText")}</span>`;
  }

  const disabled = currentPlan === "premium";
  document.querySelector("#addonDisabledNote").hidden = !disabled;
  updateAddonButtons();
}

async function hydrateSettings(){
  currentProfile = await findCurrentMemberProfile();
  const clanData = parseLocalJSON("topbrs_clan");
  currentPlanData = await loadRealPlan(currentProfile, clanData);
  currentPlan = normalizePlan(currentPlanData.plan || currentPlanData.planType || "trial");
  currentAddon = await loadMemberAddon();
  effectiveProfilePlan = getEffectiveProfilePlan();

  const preferredAvatar = currentProfile.avatar || localStorage.getItem("topbrs_avatar") || avatarOptions[0];
  const savedAvatar = avatarAllowedSrc(preferredAvatar) ? preferredAvatar : "assets/icons/profile-user.svg";

  els.userAvatar.src = savedAvatar;
  els.settingsNick.textContent = currentProfile.displayName || currentProfile.nick || currentProfile.name || currentProfile.nome || currentProfile.email || "Usuário";
  els.settingsMeta.textContent = `${roleLabel(currentProfile.role)} • ${currentProfile.playerTag || "sem tag"}`;
  els.settingsClan.textContent = currentPlanData.clanName || currentPlanData.name || clanLocal.name || "TopBRS";
  els.settingsClanTag.textContent = currentPlanData.clanTag || clanLocal.clanTag || clanLocal.tag || "#ABC123";

  if(els.settingsClanBadge){
    els.settingsClanBadge.src = currentPlanData.badge || currentPlanData.badgeSrc || currentPlanData.badgeUrl || clanLocal.badge || clanLocal.badgeSrc || "assets/icons/clan.svg";
    els.settingsClanBadge.onerror = () => els.settingsClanBadge.src = "assets/icons/clan.svg";
  }

  const savedBg = currentMemberDoc.profileBackground || localStorage.getItem("topbrs_profile_bg") || "";
  const available = bgOptionsForEffectivePlan().map(bg=>bg.id);
  setProfileBackground(available.includes(savedBg) ? savedBg : "");

  applyPlanVisual();
  renderPlanModal();
}

function lockSvg(){
  return `<span class="avatar-lock"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2.4" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>`;
}

function openAvatarPicker(){
  const overlay = document.querySelector("#avatarPickerOverlay");
  const grid = document.querySelector("#avatarPickerGrid");
  const subtitle = document.querySelector("#avatarPickerSubtitle");
  const bgSection = document.querySelector("#premiumBgSelector");

  if(subtitle) subtitle.textContent = i18nS("avatar.text");

  grid.innerHTML = avatarOptions.map((src,index)=>{
    const locked = !avatarAllowed(index);
    return `
      <button type="button" class="avatar-choice ${locked ? "locked" : ""}" data-src="${src}" ${locked ? "disabled" : ""}>
        <img src="${src}" alt="" loading="lazy" onerror="this.closest('button').remove()">
        ${locked ? lockSvg() : ""}
      </button>`;
  }).join("");

  grid.querySelectorAll(".avatar-choice:not(.locked)").forEach(btn=>{
    btn.addEventListener("click", ()=>selectAvatar(btn.dataset.src));
  });

  const visibleBgs = [...plusBackgroundOptions, ...premiumBackgroundOptions];
  const available = bgOptionsForEffectivePlan().map(bg=>bg.id);
  bgSection.hidden = false;
  bgSection.innerHTML = `
    <div class="modal-eyebrow">${i18nS("avatar.customization")}</div>
    <h3>${i18nS("avatar.background")}</h3>
    <div class="premium-bg-grid">
      ${visibleBgs.map(bg=>{
        const locked = !available.includes(bg.id);
        const style = bg.type === "image" ? `style="background-image:url('${bg.id}')"` : "";
        return `<button type="button" class="premium-bg-choice ${bg.type === "class" ? bg.id : "premium-image-bg"} ${locked ? "locked" : ""}" data-bg="${bg.id}" ${style} ${locked ? "disabled" : ""}>${locked ? lockSvg() : ""}</button>`;
      }).join("")}
    </div>`;

  bgSection.querySelectorAll(".premium-bg-choice:not(.locked)").forEach(btn=>{
    btn.addEventListener("click", ()=>saveProfileBackground(btn.dataset.bg));
  });

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
  els.userAvatar.src = src;
  try{
    await saveAvatarEverywhere(src);
  }catch(error){
    console.warn("Avatar salvo localmente. Firestore indisponível:", error);
    localStorage.setItem("topbrs_avatar", src);
  }
  closeAvatarPicker();
}

function openPlanManager(tab="subscription"){
  renderPlanModal();
  document.body.classList.add("modal-open");
  els.planOverlay.classList.add("show");
  if(tab === "payment" && !setPaymentAccess()) tab = "subscription";
  switchPlanTab(tab);
}

function closePlanManager(){
  els.planOverlay.classList.remove("show");
  document.body.classList.remove("modal-open");
}

function switchPlanTab(tab){
  if(tab === "payment" && !setPaymentAccess()) tab = "subscription";
  document.querySelectorAll(".plan-tab").forEach(btn=>btn.classList.toggle("active", btn.dataset.planTab === tab));
  document.querySelectorAll(".plan-panel").forEach(panel=>panel.classList.toggle("active", panel.dataset.planPanel === tab));
  updatePaymentStatus();
}

async function requestAddon(plan){
  const addonPlan = normalizePlan(plan);
  const feedback = document.querySelector("#addonRequestFeedback");
  feedback.textContent = "";

  if(currentPlan === "premium"){
    feedback.textContent = "O plano Premium do clã já libera tudo para todos.";
    feedback.className = "tag-feedback success";
    clearFeedbackAfterDelay(feedback);
    return;
  }

  const activeAddonPlan = getAddonPlan();
  if(activeAddonPlan === addonPlan || activeAddonPlan === "premium"){
    feedback.textContent = activeAddonPlan === "premium" ? "Seu Add-On Premium já está ativo." : `Seu Add-On ${planLabel(addonPlan)} já está ativo.`;
    feedback.className = "tag-feedback success";
    updateAddonButtons();
    clearFeedbackAfterDelay(feedback);
    return;
  }

  const clanTag = getCurrentClanTag();
  const playerTag = normalizeTag(getCurrentUserTag());
  const playerDocId = cleanTag(playerTag);
  const playerName = currentProfile.nick || currentProfile.name || currentProfile.displayName || "Membro";

  if(!clanTag || !playerDocId){
    feedback.textContent = "Não foi possível identificar o membro atual.";
    feedback.className = "tag-feedback error";
    return;
  }

  try{
    await addDoc(collection(db, "addonRequests"), {
      clanTag,
      clanName: currentPlanData.clanName || currentPlanData.name || clanLocal.name || "",
      playerTag,
      playerDocId,
      playerName,
      addonPlan,
      addonLabel: planLabel(addonPlan),
      status: "pending",
      createdAt: serverTimestamp()
    });
    feedback.textContent = `Solicitação de Add-On ${planLabel(addonPlan)} enviada para o Painel SaaS.`;
    feedback.className = "tag-feedback success";
    clearFeedbackAfterDelay(feedback);
  }catch(error){
    console.error(error);
    feedback.textContent = "Erro ao enviar solicitação. Verifique as regras do Firestore.";
    feedback.className = "tag-feedback error";
    clearFeedbackAfterDelay(feedback, 6500);
  }
}

async function requestClanPlan(){
  const feedback = document.querySelector("#paymentRequestFeedback");
  if(feedback){ feedback.textContent = ""; feedback.className = "tag-feedback"; }
  if(!isPlanAdmin()){
    if(feedback){ feedback.textContent = "Somente o comprador/admin pode solicitar renovação ou upgrade."; feedback.className = "tag-feedback error"; }
    return;
  }
  const select = document.querySelector("#paymentPlanSelect");
  const plan = normalizePlan(select?.value || "basic");
  const clanTag = getCurrentClanTag();
  if(!clanTag){
    if(feedback){ feedback.textContent = "Não foi possível identificar o clã."; feedback.className = "tag-feedback error"; }
    return;
  }
  const prices = { basic:"R$ 19,90", plus:"R$ 39,90", premium:"R$ 79,90" };
  try{
    await addDoc(collection(db, "subscriptionRequests"), {
      requestType:"planUpgrade",
      clanTag,
      clanName: currentPlanData.clanName || currentPlanData.name || clanLocal.name || "",
      currentPlan,
      plan,
      planLabel: planLabel(plan),
      price: prices[plan] || "",
      buyerEmail: currentPlanData.buyerEmail || currentProfile.email || "",
      requestedByTag: normalizeTag(getCurrentUserTag()),
      requestedByName: currentProfile.nick || currentProfile.name || currentProfile.displayName || "Admin",
      status:"pending",
      createdAt: serverTimestamp()
    });
    setPlanRequestStatus({ plan, status:"pending", requestedAt: Date.now() });
    updatePaymentStatus();
    if(feedback){ feedback.textContent = `Solicitação do plano ${planLabel(plan)} enviada ao Painel SaaS.`; feedback.className = "tag-feedback success"; clearFeedbackAfterDelay(feedback); }
  }catch(error){
    console.error(error);
    if(feedback){ feedback.textContent = "Erro ao enviar solicitação. Verifique as regras do Firestore."; feedback.className = "tag-feedback error"; clearFeedbackAfterDelay(feedback, 6500); }
  }
}


function escapeHtml(value=""){
  return String(value ?? "").replace(/[&<>'"]/g, char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}
function formatDateTime(value){
  const raw = value?.toDate ? value.toDate() : value;
  const date = raw ? new Date(raw) : null;
  if(!date || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}
let settingsScrollLockY = 0;
function lockSettingsScroll(){
  if(document.body.classList.contains('settings-scroll-locked')) return;
  settingsScrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${settingsScrollLockY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.classList.add('settings-scroll-locked');
}
function unlockSettingsScroll(){
  if(!document.body.classList.contains('settings-scroll-locked')) return;
  document.body.classList.remove('settings-scroll-locked');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  requestAnimationFrame(()=>window.scrollTo(0, settingsScrollLockY));
}
function openSettingsPopup(id){
  const overlay = document.querySelector(id);
  if(!overlay) return;
  lockSettingsScroll();
  document.body.classList.add("modal-open");
  document.documentElement.classList.add("modal-open");
  overlay.classList.add("show");
}
function closeSettingsPopup(overlay){
  const el = typeof overlay === "string" ? document.querySelector(overlay) : overlay?.closest?.(".settings-popup-overlay") || overlay;
  el?.classList.remove("show");
  if(!document.querySelector(".settings-popup-overlay.show,.avatar-picker-overlay.show,.plan-manager-overlay.show")){
    document.body.classList.remove("modal-open");
    document.documentElement.classList.remove("modal-open");
    unlockSettingsScroll();
  }
}
function currentRoleRaw(){ return String(currentProfile.role || currentProfile.clashRole || currentProfile.systemRole || currentMemberDoc.role || "member"); }
function hasFullPermission(profile=currentProfile){
  const role = String(profile.role || profile.clashRole || profile.systemRole || "").toLowerCase();
  return Boolean(profile.saasOwner || profile.systemOwner || profile.owner || profile.isAdmin || ["admin","owner","lider","líder","leader","co-leader","coleader","co-líder","co-lider"].some(r=>role.includes(r)));
}
function permissionLabel(profile){
  if(hasFullPermission(profile)) return i18nS("members.fullPermission");
  return i18nS("members.member");
}
function fillProfilePopup(){
  document.querySelector("#profileRealName").value = currentProfile.realName || currentProfile.nome || currentProfile.name || currentProfile.displayName || "";
  document.querySelector("#profileNick").value = currentProfile.nick || currentProfile.displayName || currentProfile.name || "";
  document.querySelector("#profileTag").value = normalizeTag(currentProfile.playerTag || getCurrentUserTag() || "");
  document.querySelector("#profileEmail").value = currentProfile.email || auth.currentUser?.email || "";
  const fb=document.querySelector("#profilePopupFeedback"); if(fb){ fb.textContent=""; fb.className="tag-feedback"; }
}
async function saveProfilePopup(){
  const feedback=document.querySelector("#profilePopupFeedback");
  const user=auth.currentUser;
  const data={
    realName:document.querySelector("#profileRealName")?.value?.trim() || "",
    nome:document.querySelector("#profileRealName")?.value?.trim() || "",
    email:document.querySelector("#profileEmail")?.value?.trim() || user?.email || "",
    updatedAt:serverTimestamp()
  };
  try{
    if(user?.uid) await setDoc(doc(db,"users",user.uid),data,{merge:true});
    const tag=cleanTag(getCurrentUserTag());
    const clanTag=getCurrentClanTag();
    if(clanTag && tag) await setDoc(doc(db,"clans",clanTag,"members",tag),data,{merge:true});
    if(user?.uid && clanTag){
      await setDoc(doc(db,"clans",clanTag,"users",user.uid),{
        ...data,
        uid:user.uid,
        linkedUserUid:user.uid,
        playerTag: tag ? normalizeTag(tag) : normalizeTag(currentProfile.playerTag || getCurrentUserTag() || ""),
        tag: tag ? normalizeTag(tag) : normalizeTag(currentProfile.playerTag || getCurrentUserTag() || ""),
        nick: currentProfile.nick || currentProfile.name || "",
        role: currentProfile.role || currentMemberDoc.role || "member",
        clanTag,
        syncedFrom:"settingsProfile",
        linkedAt:serverTimestamp()
      },{merge:true});
    }
    currentProfile={...currentProfile,...data};
    if(feedback){ feedback.textContent="Perfil salvo com sucesso."; feedback.className="tag-feedback success"; }
  }catch(error){
    console.error(error);
    if(feedback){ feedback.textContent="Não foi possível salvar agora. Verifique a conexão/regras do Firestore."; feedback.className="tag-feedback error"; }
  }
}
async function getRealMemberCount(){
  try{
    const members=(await loadMembers()).filter(m=>!m.removed);
    if(members.length) return members.length;
  }catch{}
  try{
    const clanTag=getCurrentClanTag();
    if(clanTag){
      const snap=await getDocs(collection(db,"clans",clanTag,"members"));
      if(snap.size) return snap.size;
    }
  }catch{}
  return Number(currentPlanData.membersCount || currentPlanData.memberCount || 0) || "—";
}
function apiStatusState(updated){
  const raw = updated?.toDate ? updated.toDate() : updated;
  const date = raw ? new Date(raw) : null;
  if(currentPlanData.apiError || currentPlanData.lastError) return {label:i18nS("settings.error"), kind:"error"};
  if(!date || Number.isNaN(date.getTime())) return {label:i18nS("settings.syncing"), kind:"sync"};
  const minutes=(Date.now()-date.getTime())/60000;
  if(minutes > 90) return {label:i18nS("settings.syncing"), kind:"sync"};
  return {label:i18nS("settings.connected"), kind:"online"};
}
async function renderApiInfo(){
  const grid=document.querySelector("#settingsApiGrid");
  if(!grid) return;
  grid.innerHTML=`<div class="settings-api-loading">${i18nS("common.loading")}</div>`;
  const clanTag=currentPlanData.clanTag || clanLocal.clanTag || clanLocal.tag || getCurrentClanTag() || "—";
  const updated=currentPlanData.updatedAt || currentPlanData.syncedAt || localStorage.getItem("topbrs_last_sync") || Date.now();
  const status=apiStatusState(updated);
  const memberCount=await getRealMemberCount();
  const currentTag=normalizeTag(getCurrentUserTag() || currentProfile.playerTag || "");
  const rows=[
    [i18nS("settings.status"), `<span class="settings-api-status ${status.kind}"><i></i>${escapeHtml(status.label)}</span>`],
    [i18nS("settings.clan"), escapeHtml(clanTag)],
    [i18nS("settings.yourLink"), escapeHtml(currentTag || "—")],
    [i18nS("settings.plan"), `<b class="settings-api-plan plan-${normalizePlan(currentPlan)}">${escapeHtml(planLabel(currentPlan))}</b>`],
    [i18nS("settings.members"), escapeHtml(memberCount)],
    [i18nS("settings.lastUpdate"), escapeHtml(formatDateTime(updated))],
    [i18nS("settings.server"), "Firestore + API/VPS"],
    [i18nS("settings.mode"), escapeHtml(hasFullPermission()?"Admin":i18nS("members.member"))]
  ];
  grid.innerHTML=rows.map(([label,value])=>`<div><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`).join("");
}
function uniq(values){ return [...new Set(values.filter(Boolean))]; }
function clanDocCandidates(){
  const raw=getCurrentClanTag();
  const clean=cleanTag(raw);
  const local=parseLocalJSON("topbrs_clan");
  return uniq([
    raw,
    clean,
    clean ? `#${clean}` : "",
    local.id,
    local.clanId,
    local.docId,
    local.clanTag,
    local.tag
  ].map(v=>String(v||"").trim()).filter(Boolean));
}
function normalizeRegisteredMember(raw={}){
  return {
    ...raw,
    playerTag: normalizeTag(raw.playerTag || raw.tag || raw.memberTag || raw.id || ""),
    tag: normalizeTag(raw.tag || raw.playerTag || raw.memberTag || raw.id || ""),
    uid: raw.uid || raw.userUid || raw.linkedUserUid || raw.linkedUid || raw.userId || "",
    email: raw.email || raw.linkedEmail || raw.userEmail || "",
    nome: raw.nome || raw.realName || raw.nameReal || raw.ownerName || raw.displayName || raw.name || "",
    nick: raw.nick || raw.nickname || raw.clashName || raw.name || raw.apiNick || "",
    linkedAt: raw.linkedAt || raw.registeredAt || raw.createdAt || raw.updatedAt || ""
  };
}
function hasRegistrationFields(u={}){
  const tag=cleanTag(u.playerTag || u.tag || u.memberTag || u.id || "");
  const hasLinked=Boolean(
    u.linkedEmail || u.linkedUserUid || u.linkedUid || u.linkedAt ||
    u.email || u.userEmail || u.uid || u.userUid || u.userId
  );
  // Não considerar createdAt/updatedAt de importação da API como cadastro.
  // Só aparece aqui quem vinculou e-mail/uid ao cadastro ou veio de users/{uid}.
  return Boolean(hasLinked && tag);
}
function isRegisteredSource(u={}){
  return hasRegistrationFields(u) || (u.source === "user" && cleanTag(u.playerTag||u.tag||u.memberTag||"") && (u.email || u.uid || u.id));
}
function isOwnUser(u={}){
  const myTag=cleanTag(getCurrentUserTag() || currentProfile.playerTag || "");
  const myUid=String(auth.currentUser?.uid || currentProfile.uid || currentProfile.linkedUserUid || "");
  const myEmail=String(auth.currentUser?.email || currentProfile.email || "").toLowerCase();
  const tag=cleanTag(u.playerTag || u.tag || u.memberTag || u.id || "");
  const uid=String(u.uid || u.linkedUserUid || u.userUid || u.id || "");
  const email=String(u.email || u.linkedEmail || u.userEmail || "").toLowerCase();
  return Boolean((myTag && tag && myTag===tag) || (myUid && uid && myUid===uid) || (myEmail && email && myEmail===email));
}
function canViewUserDetails(u={}){ return hasFullPermission() || isOwnUser(u); }
function avatarForRegisteredUser(u={}, api={}){
  return u.avatar || u.avatarSrc || u.photoURL || u.profileAvatar || api.avatar || getAvatarForMember({...api,...u});
}
function compactTag(tag){ return normalizeTag(tag || ""); }
function showUserDetail(encoded){
  let u={};
  try{ u=JSON.parse(decodeURIComponent(encoded)); }catch{}
  const box=document.querySelector("#settingsUserDetailBox");
  const title=document.querySelector("#settingsUserDetailTitle");
  if(!box) return;
  const role=u.apiRole || u.role || u.clashRole || "member";
  const realName=u.nome||u.realName||u.displayName||u.name||u.apiNick||"Usuário";
  const nick=u.apiNick||u.nick||u.clashName||u.name||"—";
  const tag=compactTag(u.playerTag||u.tag||u.memberTag||u.id||"");
  const email=u.email||u.linkedEmail||u.userEmail||"—";
  const uid=u.uid||u.linkedUserUid||u.userUid||u.id||"—";
  if(title) title.textContent=realName;
  const rows=[
    [i18nS("settings.name"), realName],
    [i18nS("settings.nick"), nick],
    [i18nS("settings.tag"), tag || "—"],
    [i18nS("settings.clashRole"), roleLabel(role)],
    [i18nS("settings.permission"), permissionLabel({...u, role})],
    [i18nS("settings.email"), email],
    ["UID", uid],
    [i18nS("settings.linkedAt"), formatDateTime(u.linkedAt || u.registeredAt || u.createdAt || u.updatedAt)]
  ];
  box.innerHTML=rows.map(([label,value])=>`<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value||"—")}</strong></div>`).join("");
  openSettingsPopup("#settingsUserDetailOverlay");
}
window.__topbrsShowUserDetail = showUserDetail;
function mergeKey(u={}){
  return cleanTag(u.playerTag || u.tag || u.memberTag || u.id || "") || String(u.uid || u.linkedUserUid || u.email || u.nome || u.nick || u.name || "").toLowerCase();
}
async function renderUsersList(){
  const box=document.querySelector("#settingsUsersList");
  if(!box) return;
  box.innerHTML=`<div class="settings-popup-empty">${i18nS("settings.loadingUsers")}</div>`;
  const clanTag=getCurrentClanTag();
  const cleanClan=cleanTag(clanTag);
  try{
    const apiMembers=(await loadMembers()).filter(m=>!m.removed);
    const byTag=new Map(apiMembers.map(m=>[cleanTag(m.tag||m.playerTag||m.id),m]));
    const byName=new Map(apiMembers.map(m=>[String(m.name||"").toLowerCase(),m]));
    const clanMemberDocs=[];
    const clanUserDocs=[];

    for(const cId of clanDocCandidates()){
      try{
        const memberSnap=await getDocs(collection(db,"clans",cId,"members"));
        memberSnap.docs.forEach(d=>clanMemberDocs.push({id:d.id,clanDoc:cId,...d.data(), source:"clanMember"}));
      }catch(error){ console.warn("Não foi possível ler members do clã", cId, error); }
      try{
        const userSnap=await getDocs(collection(db,"clans",cId,"users"));
        userSnap.docs.forEach(d=>clanUserDocs.push({id:d.id,clanDoc:cId,...d.data(), source:"clanUser"}));
      }catch(error){ console.warn("Não foi possível ler users do clã", cId, error); }
    }

    let users=[];
    try{
      const snap=await getDocs(collection(db,"users"));
      users=snap.docs.map(d=>({id:d.id,...d.data(), source:"user"})).filter(u=>{
        const uClan=cleanTag(u.clanTag || u.currentClanTag || u.clan || "");
        const tag=cleanTag(u.playerTag||u.tag||u.memberTag||"");
        const email=String(u.email||"").toLowerCase();
        const uid=String(u.uid||u.id||"");
        return !cleanClan || !uClan || uClan===cleanClan || byTag.has(tag) || clanMemberDocs.some(m=>String(m.linkedEmail||m.email||"").toLowerCase()===email || String(m.linkedUserUid||m.uid||"")===uid || cleanTag(m.tag||m.playerTag||m.id)===tag);
      });
    }catch(error){ console.warn("Não foi possível ler coleção users", error); }

    const mergedMap=new Map();
    function pushUser(raw){
      const u=normalizeRegisteredMember(raw);
      const key=mergeKey(u);
      if(!key) return;
      const api=byTag.get(cleanTag(u.playerTag||u.tag||u.memberTag||u.id)) || byName.get(String(u.nick||u.name||u.nome||"").toLowerCase()) || {};
      const previous=mergedMap.get(key) || {};
      mergedMap.set(key,{...api,...previous,...u, apiRole:api.role||previous.apiRole||u.role, apiNick:api.name||previous.apiNick||u.nick});
    }

    // 1) Fonte principal: member docs do próprio clã que já têm vínculo/cadastro.
    clanMemberDocs.filter(isRegisteredSource).forEach(pushUser);
    // 2) Fonte recomendada daqui para frente: clans/{clanTag}/users/{uid}.
    clanUserDocs.filter(isRegisteredSource).forEach(pushUser);
    // 3) Fonte global de login: users/{uid}.
    users.forEach(pushUser);

    const merged=[...mergedMap.values()]
      .filter(isRegisteredSource)
      .sort((a,b)=>String(a.nome||a.realName||a.apiNick||a.name||"").localeCompare(String(b.nome||b.realName||b.apiNick||b.name||"")));
    box.innerHTML=merged.length? merged.map(u=>{
      const role=u.apiRole || u.role || u.clashRole || "member";
      const profile={...u, role};
      const realName=u.nome||u.realName||u.displayName||u.name||u.apiNick||"Usuário";
      const nick=u.apiNick||u.nick||u.clashName||u.name||"Nick não vinculado";
      const tag=normalizeTag(u.playerTag||u.tag||u.memberTag||u.id||"sem tag");
      const api=byTag.get(cleanTag(u.playerTag||u.tag||u.memberTag||u.id)) || {};
      const avatar=avatarForRegisteredUser(u, api);
      const canOpen=canViewUserDetails(u);
      const payload=encodeURIComponent(JSON.stringify({...u, apiRole:role, apiNick:nick}));
      const tagLine=`${escapeHtml(nick)} • ${escapeHtml(tag)}`;
      return `<article class="settings-user-row ${canOpen?"is-clickable":"is-locked"}" ${canOpen?`role="button" tabindex="0" onclick="window.__topbrsShowUserDetail('${payload}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.__topbrsShowUserDetail('${payload}')}"`:""}>
        <div class="settings-user-avatar">${avatar?`<img src="${escapeHtml(avatar)}" alt="">`:escapeHtml(String(realName||nick||"?").slice(0,1).toUpperCase())}</div>
        <div class="settings-user-main"><strong>${escapeHtml(realName)}</strong><span>${tagLine}</span></div>
        <div class="settings-user-meta"><b>${escapeHtml(roleLabel(role))}</b><small>${escapeHtml(permissionLabel(profile))}</small></div>
      </article>`;
    }).join("") : `<div class="settings-popup-empty">${i18nS("settings.noUsers")}</div>`;
  }catch(error){
    console.error(error);
    box.innerHTML=`<div class="settings-popup-empty error">${i18nS("settings.usersLoadError")}</div>`;
  }
}
function sessionDeviceLabel(){
  const ua=navigator.userAgent||"";
  const ios=/iPhone|iPad|iPod/i.test(ua)?"iPhone/iPad":/Android/i.test(ua)?"Android":i18nS("settings.device");
  const browser=/CriOS/i.test(ua)?"Chrome iOS":/Safari/i.test(ua)?"Safari":/Chrome/i.test(ua)?"Chrome":"Navegador";
  return `${ios} • ${browser}`;
}
function getSessionId(){
  let id=localStorage.getItem("topbrs_session_id");
  if(!id){ id=`sess_${Date.now()}_${Math.random().toString(36).slice(2,8)}`; localStorage.setItem("topbrs_session_id",id); }
  return id;
}
function localSessionRecord(){
  return {id:getSessionId(),device:sessionDeviceLabel(),current:true,status:"active",lastSeenAt:new Date(),userAgent:navigator.userAgent||"",local:true};
}
async function registerCurrentSession(){
  const local=localSessionRecord();
  localStorage.setItem("topbrs_current_session", JSON.stringify({...local,lastSeenAt:new Date().toISOString()}));
  const user=auth.currentUser; if(!user?.uid) return local;
  try{
    await setDoc(doc(db,"users",user.uid,"sessions",local.id),{device:local.device,current:true,status:"active",lastSeenAt:serverTimestamp(),userAgent:local.userAgent},{merge:true});
  }catch(error){ console.warn("Sessão salva apenas localmente", error); }
  return local;
}
async function renderSessions(){
  const list=document.querySelector("#settingsSessionsList"); if(!list) return;
  const user=auth.currentUser;
  const current=getSessionId();
  const local=await registerCurrentSession();
  let sessions=[local];
  if(user?.uid){
    try{
      const snap=await getDocs(collection(db,"users",user.uid,"sessions"));
      sessions=snap.docs.map(d=>({id:d.id,...d.data()}));
      if(!sessions.some(s=>s.id===current)) sessions.unshift(local);
    }catch(error){ console.warn("Sessões Firestore indisponíveis, usando sessão local", error); }
  }
  sessions=sessions.sort((a,b)=>(a.id===current?-1:b.id===current?1:0));
  list.innerHTML=sessions.map(s=>{
    const isCurrent=s.id===current;
    const status=s.status||"active";
    return `<article class="settings-session-row ${isCurrent?'current':''}"><div><strong>${escapeHtml(isCurrent?i18nS('settings.thisDevice'):s.device||i18nS('settings.device'))}</strong><span>${escapeHtml(formatDateTime(s.lastSeenAt))}${s.local?' • '+i18nS('settings.local'):''}</span></div><em>${escapeHtml(status==='ended'?i18nS('settings.ended'):i18nS('settings.active'))}</em>${!isCurrent&&status!=='ended'?`<button type="button" data-end-session="${escapeHtml(s.id)}">${i18nS('settings.endSession')}</button>`:''}</article>`;
  }).join("");
  list.querySelectorAll("[data-end-session]").forEach(btn=>btn.addEventListener("click",async()=>{
    try{ if(user?.uid) await updateDoc(doc(db,"users",user.uid,"sessions",btn.dataset.endSession),{status:"ended",endedAt:serverTimestamp()}); }catch{}
    renderSessions();
  }));
}
async function savePassword(){
  const feedback=document.querySelector("#securityPopupFeedback");
  const pass=document.querySelector("#newPassword")?.value || "";
  const confirm=document.querySelector("#confirmPassword")?.value || "";
  if(pass.length<6){ if(feedback){feedback.textContent=i18nS("settings.passwordTooShort");feedback.className="tag-feedback error";} return; }
  if(pass!==confirm){ if(feedback){feedback.textContent=i18nS("settings.passwordMismatch");feedback.className="tag-feedback error";} return; }
  try{
    if(!auth.currentUser) throw new Error("Usuário não autenticado");
    await updatePassword(auth.currentUser, pass);
    document.querySelector("#newPassword").value="";
    document.querySelector("#confirmPassword").value="";
    if(feedback){feedback.textContent=i18nS("settings.passwordChanged");feedback.className="tag-feedback success";}
  }catch(error){
    console.error(error);
    if(feedback){feedback.textContent=i18nS("settings.passwordSaveError");feedback.className="tag-feedback error";}
  }
}





async function refreshWholeSystemFromApi(){
  const btn=document.querySelector('#refreshApiInfo');
  const oldText=btn?.textContent;
  try{
    if(btn){ btn.disabled=true; btn.textContent=i18nS('settings.syncing'); }
    await syncClanAndMembersFromApi().catch(error=>console.warn('Falha ao sincronizar clã/membros:', error));
    await syncWarSilently().catch(error=>console.warn('Falha ao sincronizar guerra:', error));
    localStorage.setItem('topbrs_last_sync', new Date().toISOString());
    await hydrateSettings();
    await renderApiInfo();
    window.dispatchEvent(new CustomEvent('topbrs:datarefresh'));
  }finally{
    if(btn){ btn.disabled=false; btn.textContent=oldText || i18nS('settings.refreshData'); }
  }
}

document.querySelector("#openProfilePopup")?.addEventListener("click", ()=>{ fillProfilePopup(); openSettingsPopup("#settingsProfileOverlay"); });
document.querySelector("#saveProfilePopup")?.addEventListener("click", saveProfilePopup);
document.querySelector("#openApiPopup")?.addEventListener("click", ()=>{ renderApiInfo(); openSettingsPopup("#settingsApiOverlay"); });
document.querySelector("#refreshApiInfo")?.addEventListener("click", refreshWholeSystemFromApi);
document.querySelector("#openUsersPopup")?.addEventListener("click", ()=>{ openSettingsPopup("#settingsUsersOverlay"); renderUsersList(); });
document.querySelector("#refreshUsersList")?.addEventListener("click", renderUsersList);
document.querySelector("#openSecurityPopup")?.addEventListener("click", ()=>{ openSettingsPopup("#settingsSecurityOverlay"); renderSessions(); });
document.querySelector("#savePasswordBtn")?.addEventListener("click", savePassword);
document.querySelectorAll("[data-close-settings-popup]").forEach(btn=>btn.addEventListener("click", ()=>closeSettingsPopup(btn)));
document.querySelectorAll(".settings-popup-overlay").forEach(overlay=>overlay.addEventListener("click", event=>{ if(event.target === overlay) closeSettingsPopup(overlay); }));
document.querySelectorAll("[data-clear-password]").forEach(btn=>btn.addEventListener("click", ()=>{ document.querySelector("#newPassword").value=""; document.querySelector("#confirmPassword").value=""; closeSettingsPopup(btn); }));

document.querySelector("#openAvatarPicker")?.addEventListener("click", openAvatarPicker);
document.querySelector("#closeAvatarPicker")?.addEventListener("click", closeAvatarPicker);
document.querySelector("#avatarPickerOverlay")?.addEventListener("click", event=>{
  if(event.target.id === "avatarPickerOverlay") closeAvatarPicker();
});

document.querySelector("#openPlanManager")?.addEventListener("click", ()=>openPlanManager("subscription"));
document.querySelector("#openPlanManagerMini")?.addEventListener("click", ()=>openPlanManager("subscription"));
document.querySelector("#closePlanManager")?.addEventListener("click", closePlanManager);
document.querySelector("#planManagerOverlay")?.addEventListener("click", event=>{
  if(event.target.id === "planManagerOverlay") closePlanManager();
});
document.querySelectorAll(".plan-tab").forEach(btn=>{
  btn.addEventListener("click", ()=>switchPlanTab(btn.dataset.planTab));
});
document.querySelectorAll(".addon-request-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>requestAddon(btn.dataset.addonPlan));
});
document.querySelector("#requestPlanUpgrade")?.addEventListener("click", requestClanPlan);
document.querySelector("#paymentPlanSelect")?.addEventListener("change", updatePaymentStatus);

document.querySelector("#logoutSettings")?.addEventListener("click", ()=>{
  if(typeof logoutUser === "function") logoutUser();
  else window.location.href = "index.html";
});

hydrateSettings();

window.addEventListener("topbrs:languagechange", ()=>{ try{ renderPlanModal(); renderSessions(); }catch{} });
