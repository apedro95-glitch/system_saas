import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const OWNER_EMAILS = ["silva12.anderson@gmail.com"];
let activeTab = "sales";
let requestsCache = [];
let accessCache = [];
let addonRequestsCache = [];

function normalizeEmail(value){ return String(value || "").trim().toLowerCase(); }
function normalizeTag(value){
  const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  return cleaned ? (cleaned.startsWith("#") ? cleaned : `#${cleaned}`) : "";
}
function cleanTag(value){ return normalizeTag(value).replace("#", ""); }
function planLabel(plan){
  const p = String(plan || "trial").toLowerCase();
  if(p === "basic" || p === "basico" || p === "básico") return "Básico";
  if(p === "plus") return "Plus";
  if(p === "premium") return "Premium";
  return "Trial";
}
function addPlanDuration(plan, baseDate = new Date()){
  const d = new Date(baseDate);
  const p = String(plan || "trial").toLowerCase();
  if(p === "trial") d.setDate(d.getDate()+7);
  else if(p === "basic" || p === "basico" || p === "básico") d.setMonth(d.getMonth()+1);
  else if(p === "plus") d.setMonth(d.getMonth()+6);
  else if(p === "premium") d.setFullYear(d.getFullYear()+1);
  else d.setDate(d.getDate()+7);
  return d;
}
function toDate(value){
  if(!value) return null;
  if(value?.toDate) return value.toDate();
  if(value?.seconds) return new Date(value.seconds*1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function formatDate(value){
  const d = toDate(value);
  return d ? d.toLocaleDateString("pt-BR") : "—";
}
function statusBucket(item){
  const status = String(item.status || "released").toLowerCase();
  const expires = toDate(item.planExpiresAt);
  if(["blocked","expired","revoked"].includes(status)) return "expired";
  if(expires && expires < new Date()) return "expired";
  if(String(item.plan || "").toLowerCase() === "trial") return "trial";
  return "active";
}
function setPanelVisible(visible){
  document.querySelector("#saasAccessDenied")?.setAttribute("hidden","");
  const content = document.querySelector("#saasAdminContent");
  if(content) content.hidden = !visible;
}
function showGate(message=""){
  const gate = document.querySelector("#saasLocalGate");
  const error = document.querySelector("#saasGateError");
  if(error) error.textContent = message;
  if(gate) gate.hidden = false;
  setPanelVisible(false);
}
function hideGate(){
  const gate = document.querySelector("#saasLocalGate");
  if(gate) gate.hidden = true;
  setPanelVisible(true);
}
async function canAccess(user){
  if(!user) return false;
  if(OWNER_EMAILS.includes(normalizeEmail(user.email))) return true;
  try{
    const userSnap = await getDoc(doc(db,"users",user.uid));
    const data = userSnap.exists() ? userSnap.data() : {};
    return Boolean(data.saasOwner || data.systemOwner || data.role === "systemOwner");
  }catch{return false;}
}
async function handleGate(){
  const email = normalizeEmail(document.querySelector("#saasGateEmail")?.value);
  const password = String(document.querySelector("#saasGatePassword")?.value || "");
  const error = document.querySelector("#saasGateError");
  const btn = document.querySelector("#saasGateBtn");
  if(error) error.textContent = "";
  if(!OWNER_EMAILS.includes(email)){ if(error) error.textContent = "E-mail admin não autorizado."; return; }
  if(!password){ if(error) error.textContent = "Informe a senha do admin."; return; }
  try{
    if(btn){ btn.disabled=true; btn.textContent="Entrando..."; }
    const credential = await signInWithEmailAndPassword(auth,email,password);
    if(!(await canAccess(credential.user))){
      await signOut(auth);
      if(error) error.textContent = "Este usuário não tem permissão SaaS.";
      return;
    }
    hideGate();
    await loadAll();
  }catch(err){
    console.error(err);
    if(error) error.textContent = "E-mail ou senha inválidos, ou regras do Firestore bloqueando.";
  }finally{
    if(btn){ btn.disabled=false; btn.textContent="Entrar"; }
  }
}
function openReleaseModal(){
  document.querySelector("#saasReleaseOverlay")?.classList.add("show");
  document.body.classList.add("modal-open");
}
function closeReleaseModal(){
  document.querySelector("#saasReleaseOverlay")?.classList.remove("show");
  document.body.classList.remove("modal-open");
}
function fillReleaseForm(item){
  document.querySelector("#saasClanTag").value = normalizeTag(item.clanTag || "");
  document.querySelector("#saasClanName").value = item.clanName || item.name || "";
  document.querySelector("#saasBuyerEmail").value = item.email || item.buyerEmail || "";
  document.querySelector("#saasBuyerPhone").value = item.phone || item.buyerPhone || "";
  document.querySelector("#saasPlan").value = item.plan || "trial";
  document.querySelector("#saasStatus").value = "released";
  openReleaseModal();
}
window.fillSaasReleaseFromRequest = encoded => {
  try{ fillReleaseForm(JSON.parse(decodeURIComponent(encoded))); }catch(error){ console.error(error); }
};
window.deleteSaasRequest = async id => {
  if(!id || !confirm("Excluir esta solicitação?")) return;
  await deleteDoc(doc(db,"subscriptionRequests",id));
  await loadAll();
};
window.revokeSaasAccess = async tag => {
  const clanTag = normalizeTag(tag);
  if(!clanTag || !confirm(`Revogar assinatura/liberação do clã ${clanTag}?`)) return;
  await setDoc(doc(db,"saasAccess",clanTag),{
    status:"blocked",
    allowedOnboarding:false,
    revokedAt:serverTimestamp(),
    updatedAt:serverTimestamp()
  },{merge:true});
  await setDoc(doc(db,"clans",clanTag),{
    subscriptionStatus:"blocked",
    active:false,
    blockedAt:serverTimestamp(),
    updatedAt:serverTimestamp()
  },{merge:true});
  await loadAll();
};
async function saveSaasPlan(clanTag,current,plan,expiresAt){
  await setDoc(doc(db,"saasAccess",clanTag),{
    clanTag,
    clanName: current.clanName || current.name || clanTag,
    buyerEmail: current.buyerEmail || current.email || "",
    buyerPhone: current.buyerPhone || current.phone || "",
    plan,
    planLabel: planLabel(plan),
    status:"active",
    allowedOnboarding:true,
    planExpiresAt:Timestamp.fromDate(expiresAt),
    updatedAt:serverTimestamp()
  },{merge:true});
  await setDoc(doc(db,"clans",clanTag),{
    clanTag,
    plan,
    planLabel:planLabel(plan),
    subscriptionStatus:"active",
    active:true,
    planExpiresAt:Timestamp.fromDate(expiresAt),
    updatedAt:serverTimestamp()
  },{merge:true});
  await loadAll();
}
window.extendSaasPlan = async (tag,selectId) => {
  const clanTag = normalizeTag(tag);
  const plan = document.querySelector(`#${selectId}`)?.value || "basic";
  const current = accessCache.find(i=>normalizeTag(i.clanTag||i.id)===clanTag) || {};
  const currentExp = toDate(current.planExpiresAt);
  const base = currentExp && currentExp > new Date() ? currentExp : new Date();
  await saveSaasPlan(clanTag,current,plan,addPlanDuration(plan,base));
};
window.resetSaasPlan = async (tag,selectId) => {
  const clanTag = normalizeTag(tag);
  const plan = document.querySelector(`#${selectId}`)?.value || "basic";
  const current = accessCache.find(i=>normalizeTag(i.clanTag||i.id)===clanTag) || {};
  await saveSaasPlan(clanTag,current,plan,addPlanDuration(plan,new Date()));
};

async function loadRequests(){
  const snap = await getDocs(query(collection(db,"subscriptionRequests"),orderBy("createdAt","desc")));
  requestsCache = snap.docs.map(d=>({id:d.id,...d.data()}));
}
async function loadAccess(){
  const snap = await getDocs(query(collection(db,"saasAccess"),orderBy("updatedAt","desc")));
  accessCache = snap.docs.map(d=>({id:d.id,...d.data()}));
}
async function loadAddonRequests(){
  try{
    const snap = await getDocs(query(collection(db,"addonRequests"),orderBy("createdAt","desc")));
    addonRequestsCache = snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(error){
    console.warn("Solicitações de Add-On indisponíveis:", error);
    addonRequestsCache = [];
  }
}
async function loadAll(){
  try{
    await Promise.all([loadRequests(), loadAccess(), loadAddonRequests()]);
    renderActiveTab();
  }catch(error){
    console.error(error);
    const list = document.querySelector("#saasUnifiedList");
    if(list) list.innerHTML = `<div class="saas-row empty">Erro ao carregar dados. Verifique regras do Firestore.</div>`;
  }
}

function renderSales(){
  const list = document.querySelector("#saasUnifiedList");
  if(!requestsCache.length){
    list.innerHTML = `<div class="saas-row empty">Nenhuma venda/solicitação recebida.</div>`;
    return;
  }
  list.innerHTML = requestsCache.map(item=>{
    const encoded = encodeURIComponent(JSON.stringify(item));
    return `<article class="saas-row saas-request-row">
      <div class="saas-main-info"><strong>${item.name||item.clanName||item.clanTag||"Solicitação"}</strong><span>${item.clanTag||"sem tag"} • ${item.email||"sem email"}</span></div>
      <div class="saas-pill plan-${item.plan||"trial"}">${planLabel(item.plan)}</div>
      <div class="saas-actions"><button class="saas-small-action" onclick="fillSaasReleaseFromRequest('${encoded}')">Liberar</button><button class="saas-small-action danger" onclick="deleteSaasRequest('${item.id}')">Excluir</button></div>
    </article>`;
  }).join("");
}
function renderAccess(bucket){
  const list = document.querySelector("#saasUnifiedList");
  const items = accessCache.filter(i=>statusBucket(i)===bucket);
  if(!items.length){
    list.innerHTML = `<div class="saas-row empty">Nenhum clã nesta aba.</div>`;
    return;
  }
  list.innerHTML = items.map((item,idx)=>{
    const tag = item.clanTag || item.id;
    const id = `planSelect${idx}`;
    return `<article class="saas-row saas-access-row plan-${item.plan||"trial"}">
      <div class="saas-main-info"><strong>${item.clanName||tag}</strong><span>${tag} • ${item.buyerEmail||"sem email"}</span><small>${item.status||"released"} até ${formatDate(item.planExpiresAt)}</small></div>
      <div class="saas-pill plan-${item.plan||"trial"}">${item.planLabel||planLabel(item.plan)}</div>
      <div class="saas-plan-edit">
        <select id="${id}"><option value="trial">Trial</option><option value="basic">Básico</option><option value="plus">Plus</option><option value="premium">Premium</option></select>
        <button class="saas-small-action" onclick="extendSaasPlan('${tag}','${id}')">Estender</button>
        <button class="saas-small-action secondary" onclick="resetSaasPlan('${tag}','${id}')">Trocar plano</button>
        <button class="saas-small-action danger" onclick="revokeSaasAccess('${tag}')">Revogar</button>
      </div>
    </article>`;
  }).join("");
}

function groupAddonRequests(){
  return addonRequestsCache.reduce((acc,item)=>{
    const clanTag = normalizeTag(item.clanTag || "sem-clã");
    if(!acc[clanTag]) acc[clanTag] = { clanName:item.clanName || clanTag, items:[] };
    acc[clanTag].items.push(item);
    return acc;
  },{});
}
window.approveAddonRequest = async requestId => {
  const req = addonRequestsCache.find(r=>r.id===requestId);
  if(!req) return;
  const clanTag = normalizeTag(req.clanTag);
  const memberId = req.playerDocId || cleanTag(req.playerTag);
  const addonPlan = String(req.addonPlan || "plus").toLowerCase();
  const expiresAt = addPlanDuration(addonPlan,new Date());

  if(!clanTag || !memberId){
    alert("Solicitação sem clã ou membro.");
    return;
  }

  await setDoc(doc(db,"clans",clanTag,"members",memberId),{
    profileAddon:{
      plan:addonPlan,
      status:"active",
      startedAt:serverTimestamp(),
      expiresAt:Timestamp.fromDate(expiresAt),
      source:"manual-saas",
      requestId
    },
    updatedAt:serverTimestamp()
  },{merge:true});

  await setDoc(doc(db,"addonRequests",requestId),{
    status:"approved",
    approvedAt:serverTimestamp(),
    expiresAt:Timestamp.fromDate(expiresAt)
  },{merge:true});

  await loadAll();
};
window.archiveAddonRequest = async requestId => {
  if(!requestId) return;
  await setDoc(doc(db,"addonRequests",requestId),{
    status:"archived",
    archivedAt:serverTimestamp(),
    updatedAt:serverTimestamp()
  },{merge:true});
  await loadAll();
};
function renderAddons(){
  const list = document.querySelector("#saasUnifiedList");
  const pending = addonRequestsCache.filter(item=>String(item.status||"pending").toLowerCase()==="pending");
  if(!pending.length){
    list.innerHTML = `<div class="saas-row empty">Nenhuma solicitação de Add-On pendente.</div>`;
    return;
  }
  const grouped = pending.reduce((acc,item)=>{
    const clanTag = normalizeTag(item.clanTag || "sem-clã");
    if(!acc[clanTag]) acc[clanTag] = { clanName:item.clanName || clanTag, items:[] };
    acc[clanTag].items.push(item);
    return acc;
  },{});
  list.innerHTML = Object.entries(grouped).map(([clanTag,group])=>`
    <section class="saas-addon-clan">
      <div class="saas-addon-clan-head"><strong>${group.clanName}</strong><span>${clanTag} • ${group.items.length} solicitação(ões)</span></div>
      ${group.items.map(item=>`
        <article class="saas-row addon-request-row plan-${item.addonPlan||"plus"}">
          <div class="saas-main-info">
            <strong>${item.playerName || "Membro"}</strong>
            <span>${item.playerTag || "sem tag"} • Add-On ${planLabel(item.addonPlan)}</span>
            <small>Solicitado em ${formatDate(item.createdAt)}</small>
          </div>
          <div class="saas-pill plan-${item.addonPlan||"plus"}">${planLabel(item.addonPlan)}</div>
          <div class="saas-actions">
            <button class="saas-small-action" onclick="approveAddonRequest('${item.id}')">Liberar</button>
            <button class="saas-small-action danger" onclick="archiveAddonRequest('${item.id}')">Arquivar</button>
          </div>
        </article>`).join("")}
    </section>`).join("");
}

function renderActiveTab(){
  document.querySelectorAll(".saas-tab").forEach(btn=>btn.classList.toggle("active",btn.dataset.saasTab===activeTab));
  const title = document.querySelector("#saasListTitle");
  if(title){
    title.textContent = activeTab==="sales" ? "VENDAS" : activeTab==="trial" ? "TRIAL" : activeTab==="active" ? "ATIVOS" : activeTab==="addons" ? "ADD-ONS" : "EXPIRADOS";
  }
  if(activeTab==="sales") renderSales();
  else if(activeTab==="addons") renderAddons();
  else renderAccess(activeTab);
}
async function saveAccess(event){
  event.preventDefault();
  const feedback = document.querySelector("#saasFeedback");
  const tag = normalizeTag(document.querySelector("#saasClanTag")?.value);
  const plan = document.querySelector("#saasPlan")?.value || "trial";
  const status = document.querySelector("#saasStatus")?.value || "released";
  const expires = addPlanDuration(plan,new Date());

  if(!tag){
    feedback.textContent = "Informe a tag do clã.";
    feedback.className = "tag-feedback error";
    return;
  }

  try{
    await setDoc(doc(db,"saasAccess",tag),{
      clanTag:tag,
      clanName:document.querySelector("#saasClanName").value,
      buyerEmail:document.querySelector("#saasBuyerEmail").value,
      buyerPhone:document.querySelector("#saasBuyerPhone").value,
      plan,
      planLabel:planLabel(plan),
      status,
      allowedOnboarding:status==="released"||status==="active",
      planExpiresAt:Timestamp.fromDate(expires),
      updatedAt:serverTimestamp(),
      createdAt:serverTimestamp()
    },{merge:true});
    await setDoc(doc(db,"clans",tag),{
      clanTag:tag,
      name:document.querySelector("#saasClanName").value,
      plan,
      planLabel:planLabel(plan),
      planExpiresAt:Timestamp.fromDate(expires),
      subscriptionStatus:status,
      active:status==="active",
      updatedAt:serverTimestamp()
    },{merge:true});
    feedback.textContent = `${tag} liberado como ${planLabel(plan)} até ${expires.toLocaleDateString("pt-BR")}.`;
    feedback.className = "tag-feedback success";
    event.currentTarget.reset();
    closeReleaseModal();
    await loadAll();
  }catch(error){
    console.error(error);
    feedback.textContent = "Erro ao liberar assinatura.";
    feedback.className = "tag-feedback error";
  }
}

document.querySelector("#saasGateBtn")?.addEventListener("click",handleGate);
document.querySelector("#saasGatePassword")?.addEventListener("keydown",event=>{ if(event.key==="Enter") handleGate(); });
document.querySelector("#openNewRelease")?.addEventListener("click",openReleaseModal);
document.querySelector("#closeNewRelease")?.addEventListener("click",closeReleaseModal);
document.querySelector("#saasReleaseForm")?.addEventListener("submit",saveAccess);
document.querySelector("#saasLogoutBtn")?.addEventListener("click",async()=>{
  const email = document.querySelector("#saasGateEmail");
  const pass = document.querySelector("#saasGatePassword");
  if(email) email.value = "";
  if(pass) pass.value = "";
  await signOut(auth);
  showGate();
});
document.querySelectorAll(".saas-tab").forEach(btn=>btn.addEventListener("click",()=>{
  activeTab = btn.dataset.saasTab;
  renderActiveTab();
}));

showGate();
onAuthStateChanged(auth,async user=>{
  if(await canAccess(user)){
    hideGate();
    await loadAll();
  }else{
    showGate();
  }
});
