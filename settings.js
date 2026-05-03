import {
  parseLocalJSON,
  findCurrentMemberProfile,
  saveAvatarEverywhere,
  getCurrentClanTag,
  getCurrentUserTag,
  cleanTag,
  normalizeTag
} from "./identity.js";

import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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
  if(value === "admin" || value === "leader") return "Admin";
  if(value === "coleader" || value === "co-leader") return "Co-líder";
  if(value === "elder") return "Ancião";
  return "Membro";
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
      if(clanPremium) span.textContent = "Liberado pelo Premium do clã";
      else if(isSameActive) span.textContent = `Add-On ${planLabel(btnPlan)} ativo`;
      else if(blockedByPremiumAddon) span.textContent = "Premium já ativo";
      else span.textContent = `Solicitar Add-On ${planLabel(btnPlan)}`;
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
  icon.alt = "Pendente";
  const label = row.querySelector("span");
  if(label) label.textContent = `Aguardando liberação do ${planLabel(status.plan)} no SaaS`;
}

function applyPlanVisual(){
  effectiveProfilePlan = getEffectiveProfilePlan();

  if(els.settingsPlan) els.settingsPlan.textContent = planLabel(currentPlan);
  if(els.settingsExpire) els.settingsExpire.textContent = countdownText(currentPlan, currentPlanData.planExpiresAt || currentPlanData.expiresAt);

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
    trial:["Acesso de teste", "2 avatares liberados", "Emblemas limitados"],
    basic:["Acesso básico ao sistema", "2 avatares liberados", "Add-On individual disponível"],
    plus:["Fundos simples liberados", "Avatares liberados", "Add-On Premium disponível por membro"],
    premium:["Tudo liberado para todos os membros", "Add-On individual desabilitado", "Fundos premium inclusos"]
  };
  benefits.innerHTML = (planBenefits[currentPlan] || planBenefits.trial).map(x=>`<span>${x}</span>`).join("");

  const addonPlan = getAddonPlan();
  const current = document.querySelector("#addonCurrentCard");
  if(currentPlan === "premium"){
    current.innerHTML = `<strong>Clã Premium ativo</strong><span>Todos os membros já têm avatares e fundos liberados. Add-On individual desabilitado.</span>`;
  }else if(addonPlan === "plus" || addonPlan === "premium"){
    current.innerHTML = `<strong>Add-On ${planLabel(addonPlan)} ativo</strong><span>${addonPlan === "premium" ? "Todos os recursos de perfil liberados." : "Avatares e fundos Plus liberados."}</span>`;
  }else{
    current.innerHTML = `<strong>Nenhum Add-On ativo</strong><span>Você pode solicitar Add-On Plus ou Premium para liberar personalizações no seu perfil.</span>`;
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

  if(subtitle) subtitle.textContent = "Selecione uma imagem para o seu perfil ou faça UPGRADE de seu plano para liberar todos os avatares e fundos.";

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
    <div class="modal-eyebrow">Personalização</div>
    <h3>Fundo do perfil</h3>
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
