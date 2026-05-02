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
const PAGE_TITLES = {
  dashboard:"Dashboard",
  subscriptions:"Gestão de Assinaturas",
  addons:"Gestão de Add-Ons",
  clans:"Página de Clãs",
  requests:"Central de Solicitações",
  finance:"Financeiro Manual",
  history:"Histórico de alterações"
};

let activePage = "dashboard";
let requestsCache = [];
let accessCache = [];
let addonRequestsCache = [];
let searchTerm = "";
let planFilter = "all";
let statusFilter = "all";
let typeFilter = "all";
let chartPeriod = 30;

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
  if(p === "pro") return "Pro";
  return "Trial";
}
function planKey(plan){
  const p = String(plan || "trial").toLowerCase();
  if(p === "basico" || p === "básico") return "basic";
  if(["premium","plus","pro","trial","basic"].includes(p)) return p;
  return "trial";
}
function addPlanDuration(plan, baseDate = new Date()){
  const d = new Date(baseDate);
  const p = planKey(plan);
  if(p === "trial") d.setDate(d.getDate()+7);
  else if(p === "basic") d.setMonth(d.getMonth()+1);
  else if(p === "plus") d.setMonth(d.getMonth()+6);
  else if(p === "premium") d.setFullYear(d.getFullYear()+1);
  else d.setMonth(d.getMonth()+1);
  return d;
}
function toDate(value){
  if(!value) return null;
  if(value?.toDate) return value.toDate();
  if(value?.seconds) return new Date(value.seconds*1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
function daysUntil(value){
  const d = toDate(value);
  if(!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
function formatDate(value){
  const d = toDate(value);
  return d ? d.toLocaleDateString("pt-BR") : "—";
}
function money(value){
  if(typeof value === "number") return value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const raw = String(value || "").trim();
  if(raw) return raw.startsWith("R$") ? raw : raw;
  return "R$ 0,00";
}
function statusBucket(item){
  const status = String(item.status || item.subscriptionStatus || "released").toLowerCase();
  const expires = toDate(item.planExpiresAt);
  if(["blocked","expired","revoked","revogado"].includes(status)) return "expired";
  if(expires && expires < new Date()) return "expired";
  if(planKey(item.plan) === "trial") return "trial";
  return "active";
}
function requestStatus(item){ return String(item.status || "pending").toLowerCase(); }
function isPending(item){ return !["approved","archived","deleted","released","liberado"].includes(requestStatus(item)); }
function cx(...classes){ return classes.filter(Boolean).join(" "); }
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}
function textIncludes(item, term){
  if(!term) return true;
  const haystack = JSON.stringify(item).toLowerCase();
  return haystack.includes(term.toLowerCase());
}
function passesFilters(item, kind=""){
  if(!textIncludes(item, searchTerm)) return false;
  const p = planKey(item.plan || item.addonPlan || item.planRequested);
  if(planFilter !== "all" && p !== planFilter) return false;
  const s = String(item.status || item.subscriptionStatus || "pending").toLowerCase();
  if(statusFilter !== "all" && !s.includes(statusFilter)) return false;
  if(typeFilter !== "all" && kind && kind !== typeFilter) return false;
  return true;
}
function displayNameForAccess(item){ return escapeHtml(item.clanName || item.name || item.clanTag || item.id || "Clã"); }
function displayTagForAccess(item){ return escapeHtml(normalizeTag(item.clanTag || item.id || "")); }
function buyerName(item){ return escapeHtml(item.buyerName || item.ownerName || item.buyerEmail || item.email || "Comprador não informado"); }
function planBadge(plan){ return `<span class="saas-pro-badge plan-${planKey(plan)}">${planLabel(plan)}</span>`; }
function statusBadge(status, label){
  const s = String(status || "pending").toLowerCase();
  let kind = "pending";
  if(["active","approved","released","liberado","pago"].some(x=>s.includes(x))) kind = "ok";
  if(["analysis","analise","análise"].some(x=>s.includes(x))) kind = "info";
  if(["expired","blocked","revoked","recusado","atrasado"].some(x=>s.includes(x))) kind = "danger";
  return `<span class="saas-pro-status ${kind}">${escapeHtml(label || translateStatus(status))}</span>`;
}
function translateStatus(status){
  const s = String(status || "pending").toLowerCase();
  if(s === "active") return "Ativo";
  if(s === "approved" || s === "released") return "Liberado";
  if(s === "blocked" || s === "revoked") return "Revogado";
  if(s === "expired") return "Expirado";
  if(s === "archived") return "Arquivado";
  return "Pendente";
}
function initials(value){
  const text = String(value || "TB").replace(/[#_\-]/g," ").trim();
  return text.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase() || "TB";
}
function emblem(text, plan="plus"){
  return `<span class="saas-pro-emblem plan-${planKey(plan)}">${escapeHtml(initials(text))}</span>`;
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
  document.querySelector("#saasPlan").value = planKey(item.plan || "trial");
  document.querySelector("#saasStatus").value = "released";
  document.querySelector("#saasManualNote").value = item.message || item.note || "";
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
window.approveSubscriptionRequest = async id => {
  const req = requestsCache.find(item=>item.id === id);
  if(!req) return;
  const clanTag = normalizeTag(req.clanTag);
  const plan = planKey(req.plan || "basic");
  if(!clanTag){ alert("Solicitação sem tag do clã."); return; }
  const expiresAt = addPlanDuration(plan, new Date());
  await saveSaasPlan(clanTag, {
    clanName:req.clanName || req.name || clanTag,
    buyerEmail:req.buyerEmail || req.email || "",
    buyerPhone:req.buyerPhone || req.phone || ""
  }, plan, expiresAt, "Solicitação liberada diretamente pela Central de Solicitações");
  await setDoc(doc(db,"subscriptionRequests",id),{
    status:"approved",
    approvedAt:serverTimestamp(),
    planExpiresAt:Timestamp.fromDate(expiresAt),
    updatedAt:serverTimestamp()
  },{merge:true});
  await addHistory("Assinatura liberada", `${req.clanName || clanTag} • ${planLabel(plan)}`);
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
  await addHistory("Assinatura revogada", clanTag);
  await loadAll();
};
async function addHistory(title, description){
  try{
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await setDoc(doc(db,"saasHistory",id),{title,description,createdAt:serverTimestamp(),actor:"admin"},{merge:true});
  }catch(error){ console.warn("Histórico indisponível", error); }
}
async function saveSaasPlan(clanTag,current,plan,expiresAt,note=""){
  await setDoc(doc(db,"saasAccess",clanTag),{
    clanTag,
    clanName: current.clanName || current.name || clanTag,
    buyerEmail: current.buyerEmail || current.email || "",
    buyerPhone: current.buyerPhone || current.phone || "",
    manualNote: note || current.manualNote || "",
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
}
window.extendSaasPlan = async (tag,selectId) => {
  const clanTag = normalizeTag(tag);
  const plan = document.querySelector(`#${selectId}`)?.value || "basic";
  const current = accessCache.find(i=>normalizeTag(i.clanTag||i.id)===clanTag) || {};
  const currentExp = toDate(current.planExpiresAt);
  const base = currentExp && currentExp > new Date() ? currentExp : new Date();
  await saveSaasPlan(clanTag,current,planKey(plan),addPlanDuration(plan,base),"Plano renovado pelo Painel SaaS");
  await addHistory("Renovação registrada", `${current.clanName || clanTag} • ${planLabel(plan)}`);
  await loadAll();
};
window.resetSaasPlan = async (tag,selectId) => {
  const clanTag = normalizeTag(tag);
  const plan = document.querySelector(`#${selectId}`)?.value || "basic";
  const current = accessCache.find(i=>normalizeTag(i.clanTag||i.id)===clanTag) || {};
  await saveSaasPlan(clanTag,current,planKey(plan),addPlanDuration(plan,new Date()),"Plano alterado pelo Painel SaaS");
  await addHistory("Upgrade/Downgrade de plano", `${current.clanName || clanTag} • ${planLabel(plan)}`);
  await loadAll();
};
window.approveAddonRequest = async requestId => {
  const req = addonRequestsCache.find(r=>r.id===requestId);
  if(!req) return;
  const clanTag = normalizeTag(req.clanTag);
  const memberId = req.playerDocId || cleanTag(req.playerTag);
  const addonPlan = planKey(req.addonPlan || "plus");
  const expiresAt = addPlanDuration(addonPlan,new Date());
  if(!clanTag || !memberId){ alert("Solicitação sem clã ou membro."); return; }
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
    expiresAt:Timestamp.fromDate(expiresAt),
    updatedAt:serverTimestamp()
  },{merge:true});
  await addHistory("Add-On liberado", `${req.playerName || memberId} • ${planLabel(addonPlan)}`);
  await loadAll();
};
window.archiveAddonRequest = async requestId => {
  if(!requestId) return;
  await setDoc(doc(db,"addonRequests",requestId),{
    status:"archived",
    archivedAt:serverTimestamp(),
    updatedAt:serverTimestamp()
  },{merge:true});
  await addHistory("Add-On recusado/arquivado", requestId);
  await loadAll();
};
window.showSaasPage = page => {
  activePage = page;
  renderActivePage();
};

async function loadRequests(){
  try{
    const snap = await getDocs(query(collection(db,"subscriptionRequests"),orderBy("createdAt","desc")));
    requestsCache = snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(error){ console.warn("Solicitações indisponíveis:", error); requestsCache = []; }
}
async function loadAccess(){
  try{
    const snap = await getDocs(query(collection(db,"saasAccess"),orderBy("updatedAt","desc")));
    accessCache = snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(error){ console.warn("Acessos indisponíveis:", error); accessCache = []; }
}
async function loadAddonRequests(){
  try{
    const snap = await getDocs(query(collection(db,"addonRequests"),orderBy("createdAt","desc")));
    addonRequestsCache = snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(error){ console.warn("Solicitações de Add-On indisponíveis:", error); addonRequestsCache = []; }
}
async function loadAll(){
  await Promise.all([loadRequests(), loadAccess(), loadAddonRequests()]);
  renderAll();
}

function metrics(){
  const now = new Date();
  const active = accessCache.filter(i=>statusBucket(i)==="active");
  const trials = accessCache.filter(i=>statusBucket(i)==="trial");
  const expiring = accessCache.filter(i=>{ const d = daysUntil(i.planExpiresAt); return d !== null && d >= 0 && d <= 7; });
  const pendingSubs = requestsCache.filter(isPending);
  const pendingAddons = addonRequestsCache.filter(i=>String(i.status||"pending").toLowerCase()==="pending");
  const estimatedRevenue = accessCache.reduce((total,item)=>{
    const p = planKey(item.plan);
    const value = p === "premium" ? 89.9 : p === "plus" ? 59.9 : p === "basic" ? 39.9 : 0;
    return total + value;
  },0) + addonRequestsCache.filter(i=>String(i.status||"").toLowerCase()==="approved").length * 29.9;
  const expired = accessCache.filter(i=>statusBucket(i)==="expired");
  return { now, active, trials, expiring, pendingSubs, pendingAddons, estimatedRevenue, expired };
}
function metricCard(label,value,icon,kind="blue",trend="vs. últimos 30 dias"){
  return `<article class="saas-kpi ${kind}"><span>${icon}</span><div><small>${label}</small><strong>${value}</strong><em>${trend}</em></div></article>`;
}
function section(title, content, opts=""){
  return `<section class="saas-pro-card ${opts}"><div class="saas-section-head"><h2>${title}</h2></div>${content}</section>`;
}
function emptyState(text){ return `<div class="saas-pro-empty">${escapeHtml(text)}</div>`; }
function renderChart(){
  const configs = {
    30: {
      revenue:[1.2,1.8,1.6,3.1,5.0,2.2,2.6,1.0,3.4,4.1,1.1,2.2,3.3,5.8,4.7,7.4,6.2,9.6],
      releases:[0.4,0.8,1.3,0.9,2.7,1.2,1.0,0.5,1.6,2.4,0.6,1.2,1.7,2.8,2.3,3.6,3.2,4.2],
      total:"R$ 28,9k", qty:"742", ticket:"R$ 65,49"
    },
    60: {
      revenue:[0.9,1.2,1.6,2.2,2.9,2.1,3.2,3.8,2.7,4.1,4.7,3.3,5.2,4.6,6.1,5.0,6.8,7.3,5.9,8.1,7.4,9.2],
      releases:[0.3,0.6,0.8,1.1,1.4,1.0,1.8,2.0,1.6,2.3,2.1,1.7,2.8,2.4,3.0,2.7,3.4,3.9,3.2,4.3,3.8,4.8],
      total:"R$ 54,7k", qty:"1.284", ticket:"R$ 68,10"
    },
    90: {
      revenue:[0.7,1.0,1.4,1.8,2.5,2.0,3.4,2.8,4.2,3.7,5.4,4.9,6.2,5.6,7.1,6.0,8.8,7.6,9.8,8.9,10.8,9.5,11.7,10.9],
      releases:[0.2,0.5,0.7,0.9,1.2,1.0,1.7,1.5,2.1,1.9,2.6,2.4,3.0,2.7,3.6,3.2,4.4,3.9,5.1,4.6,5.8,5.2,6.4,5.9],
      total:"R$ 82,3k", qty:"1.956", ticket:"R$ 70,42"
    }
  };
  const cfg = configs[chartPeriod] || configs[30];
  const max = 12;
  const left = 13, top = 6, height = 36, width = 85;
  const mapLine = arr => arr.map((v,i)=>`${(left + (i/(arr.length-1)*width)).toFixed(1)},${(top + (1-Math.min(v,max)/max)*height).toFixed(1)}`).join(" ");
  return `<div class="saas-chart saas-chart-refined">
    <div class="saas-chart-top">
      <strong>Receita / Liberações</strong>
      <label class="saas-chart-period"><span class="sr-only">Período do gráfico</span><select id="saasChartPeriod" aria-label="Período do gráfico"><option value="30" ${chartPeriod===30?"selected":""}>Últimos 30 dias</option><option value="60" ${chartPeriod===60?"selected":""}>Últimos 60 dias</option><option value="90" ${chartPeriod===90?"selected":""}>Últimos 90 dias</option></select></label>
    </div>
    <div class="saas-chart-legend"><span class="dot revenue"></span> Receita (R$)<span class="dot releases"></span> Liberações</div>
    <div class="saas-chart-plot">
      <div class="saas-chart-yaxis" aria-hidden="true"><span>+10k</span><span>5k</span><span>3k</span><span>1k</span></div>
      <svg viewBox="0 0 100 52" preserveAspectRatio="none" aria-hidden="true">
        <defs><clipPath id="saasChartClip"><rect x="13" y="4" width="86" height="40" rx="1"/></clipPath></defs>
        <path d="M13 8 H99 M13 20 H99 M13 31 H99 M13 42 H99" class="grid"/>
        <g clip-path="url(#saasChartClip)">
          <polyline points="${mapLine(cfg.revenue)}" class="line revenue"/>
          <polyline points="${mapLine(cfg.releases)}" class="line releases"/>
        </g>
      </svg>
    </div>
    <div class="saas-chart-metrics"><span>Receita total <b>${cfg.total}</b></span><span>Liberações <b>${cfg.qty}</b></span><span>Ticket médio <b>${cfg.ticket}</b></span></div>
  </div>`;
}
function getFilteredAccess(){ return accessCache.filter(i=>passesFilters(i,"subscription")); }
function getFilteredRequests(){ return requestsCache.filter(i=>passesFilters(i,"subscription")); }
function getFilteredAddons(){ return addonRequestsCache.filter(i=>passesFilters(i,"addon")); }
function subscriptionRows(items, limit=8){
  const filtered = items.slice(0,limit);
  if(!filtered.length) return emptyState("Nenhuma assinatura encontrada.");
  return `<div class="saas-pro-table subscriptions">
    ${filtered.map((item,idx)=>{
      const tag = normalizeTag(item.clanTag || item.id || `#CLAN${idx}`);
      const id = `subPlan${idx}`;
      const d = daysUntil(item.planExpiresAt);
      return `<article class="saas-pro-row">
        ${emblem(item.clanName || tag,item.plan)}
        <div class="main"><strong>${displayNameForAccess(item)}</strong><span>${tag} • ${buyerName(item)}</span></div>
        <div>${planBadge(item.plan)}</div>
        <div>${statusBadge(item.status || statusBucket(item), translateStatus(item.status || statusBucket(item)))}</div>
        <div class="muted">${formatDate(item.planExpiresAt)}<small>${d === null ? "sem vencimento" : d < 0 ? `há ${Math.abs(d)} dias` : `em ${d} dias`}</small></div>
        <div class="saas-inline-actions"><select id="${id}"><option value="trial">Trial</option><option value="basic">Básico</option><option value="plus">Plus</option><option value="premium">Premium</option></select><button onclick="extendSaasPlan('${tag}','${id}')">Renovar</button><button class="danger" onclick="revokeSaasAccess('${tag}')">Revogar</button></div>
      </article>`;
    }).join("")}
  </div>`;
}
function addonRows(items, limit=6){
  const filtered = items.slice(0,limit);
  if(!filtered.length) return emptyState("Nenhuma solicitação de Add-On encontrada.");
  return `<div class="saas-addon-grid">
    ${filtered.map(item=>{
      const pending = String(item.status||"pending").toLowerCase()==="pending";
      return `<article class="saas-pro-row addon">
        ${emblem(item.clanName || item.clanTag,item.addonPlan)}
        <div class="main"><strong>${escapeHtml(item.clanName || item.clanTag || "Clã")}</strong><span>${escapeHtml(item.playerName || "Membro")} • ${escapeHtml(item.playerTag || "sem tag")}</span></div>
        <div><small>Solicitado</small>${planBadge(item.addonPlan)}</div>
        <div><small>Ativo</small><span class="muted">${escapeHtml(item.activeAddon || item.currentAddon || "—")}</span></div>
        <div><small>Expiração</small><span class="muted">${formatDate(item.expiresAt)}</span></div>
        <div class="saas-inline-actions compact">${pending ? `<button onclick="approveAddonRequest('${item.id}')">Liberar</button><button class="danger" onclick="archiveAddonRequest('${item.id}')">Recusar</button>` : `<button class="secondary" onclick="approveAddonRequest('${item.id}')">Renovar</button>`}</div>
      </article>`;
    }).join("")}
  </div>`;
}
function requestRows(items, limit=8){
  const filtered = items.slice(0,limit);
  if(!filtered.length) return emptyState("Nenhuma solicitação encontrada.");
  return `<div class="saas-request-list">${filtered.map(item=>{
    const encoded = encodeURIComponent(JSON.stringify(item));
    const plan = planKey(item.plan || "premium");
    const type = item.requestType === "planUpgrade" ? "Upgrade/Renovação" : "Nova assinatura";
    const action = item.requestType === "planUpgrade" ? `approveSubscriptionRequest('${item.id}')` : `fillSaasReleaseFromRequest('${encoded}')`;
    return `<article class="saas-request-item">
      ${emblem(item.clanName || item.clanTag, plan)}
      <div class="main"><strong>${escapeHtml(item.clanName || item.name || item.clanTag || "Solicitação")}</strong><span>${type} • ${planLabel(plan)}</span></div>
      ${statusBadge(item.status || "pending")}
      <button onclick="${action}">Liberar</button>
      <button class="danger" onclick="deleteSaasRequest('${item.id}')">Excluir</button>
    </article>`;
  }).join("")}</div>`;
}
function clanCards(items, limit=4){
  const filtered = items.slice(0,limit);
  if(!filtered.length) return emptyState("Nenhum clã ativo encontrado.");
  return `<div class="saas-clan-cards">${filtered.map((item,idx)=>{
    const tag = normalizeTag(item.clanTag || item.id || `#CLAN${idx}`);
    const d = daysUntil(item.planExpiresAt);
    return `<article class="saas-clan-card">
      <div class="saas-clan-main">${emblem(item.clanName || tag,item.plan)}<div><strong>${displayNameForAccess(item)}</strong><span>${tag}</span>${planBadge(item.plan)}</div>${statusBadge(item.status || "active","Ativo")}</div>
      <div class="saas-clan-meta"><span>Membros <b>${item.membersCount || item.memberCount || "—"}</b></span><span>Dono <b>${buyerName(item)}</b></span><span>Contato <b>${escapeHtml(item.buyerPhone || item.phone || item.buyerEmail || "—")}</b></span><span>Expiração <b>${formatDate(item.planExpiresAt)}</b>${d !== null ? `<small>${d < 0 ? `há ${Math.abs(d)} dias` : `em ${d} dias`}</small>` : ""}</span></div>
      <div class="saas-clan-actions"><button onclick="showSaasPage('subscriptions')">Assinatura</button><button onclick="showSaasPage('addons')">Add-ons</button><button onclick="showSaasPage('requests')">Solicitações</button></div>
    </article>`;
  }).join("")}</div>`;
}
function renderDashboard(){
  const m = metrics();
  const totalReq = m.pendingSubs.length + m.pendingAddons.length;
  const dash = document.querySelector("#saasPageDashboard");
  dash.innerHTML = `
    <div class="saas-kpi-grid">
      ${metricCard("Receita manual estimada", money(m.estimatedRevenue), "R$", "blue", "↑ estimativa atual")}
      ${metricCard("Assinaturas ativas", m.active.length, "👥", "green", "planos em vigor")}
      ${metricCard("Trials ativos", m.trials.length, "⌛", "purple", "em período teste")}
      ${metricCard("Planos expirando", m.expiring.length, "▣", "gold", "próximos 7 dias")}
      ${metricCard("Solicitações pendentes", m.pendingSubs.length, "☷", "blue", "aguardando ação")}
      ${metricCard("Add-Ons pendentes", m.pendingAddons.length, "✚", "purple", "por membro")}
      ${metricCard("Clãs ativos", m.active.length + m.trials.length, "⬟", "teal wide", "total operacional")}
    </div>
    ${renderChart()}
    ${section("Gestão de Assinaturas", `<div class="saas-mini-pills refined"><span><i>🛒</i>Vendas <b>${requestsCache.length}</b></span><span><i>⌛</i>Trial <b>${m.trials.length}</b></span><span><i>✓</i>Ativos <b>${m.active.length}</b></span><span><i>!</i>Expirados <b>${m.expired.length}</b></span><span><i>⊘</i>Revogados <b>${accessCache.filter(i=>String(i.status||"").toLowerCase()==="blocked").length}</b></span><span><i>↻</i>Renovações <b>${m.active.length}</b></span><span><i>↕</i>Upgrades/Downgrades <b>${requestsCache.filter(i=>i.requestType === "planUpgrade").length}</b></span></div>`)}
    ${section("Gestão de Add-Ons", addonRows(getFilteredAddons(),3))}
    ${section("Página de Clãs", clanCards(getFilteredAccess(),2))}
    <div class="saas-two-col">
      ${section("Central de Solicitações", requestRows(getFilteredRequests(),5))}
      ${section("Financeiro Manual", `<div class="saas-finance-lines"><span>Status de pagamento <b>Pago</b></span><span>Valor do plano <b>${money(m.estimatedRevenue)}</b></span><span>Valor do add-on <b>${money(m.pendingAddons.length*29.9)}</b></span><span>Data de liberação <b>${new Date().toLocaleDateString("pt-BR")}</b></span><span>Data de vencimento <b>${m.expiring[0] ? formatDate(m.expiring[0].planExpiresAt) : "—"}</b></span><span>Observação manual <b>Controle sem gateway, via PIX/manual.</b></span></div>`)}
    </div>
    <div class="saas-two-col">
      ${section("Histórico de alterações", renderHistoryList())}
      ${section("Ações rápidas", `<div class="saas-quick-actions"><button onclick="document.querySelector('#openNewRelease').click()">Nova assinatura</button><button onclick="showSaasPage('requests')">Liberar acesso</button><button onclick="showSaasPage('addons')">Adicionar Add-On</button><button onclick="showSaasPage('finance')">Aviso de expiração</button></div>`)}
    </div>`;
  document.querySelector("#saasHeaderBadge").textContent = totalReq;
}
function renderSubscriptions(){
  const m = metrics();
  document.querySelector("#saasPageSubscriptions").innerHTML = `
    <div class="saas-kpi-grid compact">
      ${metricCard("Vendas", requestsCache.length, "🛒", "blue", "solicitações")}
      ${metricCard("Trial", m.trials.length, "⌛", "purple", "clãs")}
      ${metricCard("Ativos", m.active.length, "👥", "green", "em vigor")}
      ${metricCard("Expirados", m.expired.length, "◷", "red", "atenção")}
      ${metricCard("Revogados", accessCache.filter(i=>String(i.status||"").toLowerCase()==="blocked").length, "⊗", "gold", "bloqueados")}
      ${metricCard("Renovações", m.expiring.length, "↻", "teal", "próximos 7 dias")}
      ${metricCard("Upgrades / Downgrades", requestsCache.filter(i=>i.requestType === "planUpgrade").length, "↕", "purple", "pedidos")}
    </div>
    ${section("Lista de Assinaturas", subscriptionRows(getFilteredAccess(),10))}
    <div class="saas-two-col">
      ${section("Funil de Assinaturas", `<div class="saas-funnel"><span style="--w:95%">Visitantes <b>1.245</b></span><span style="--w:68%">Trials iniciados <b>${m.trials.length}</b></span><span style="--w:52%">Conversões <b>${m.active.length}</b></span><span style="--w:38%">Assinaturas ativas <b>${m.active.length}</b></span></div>`)}
      ${section("Próximos vencimentos", clanCards(m.expiring.concat(getFilteredAccess()).slice(0,4),4))}
    </div>
    ${section("Ações rápidas", `<div class="saas-quick-actions"><button onclick="document.querySelector('#openNewRelease').click()">Nova liberação</button><button>Registrar renovação</button><button class="danger">Revogar assinatura</button><button>Converter trial</button></div>`)}
  `;
}
function renderAddonsPage(){
  const pending = addonRequestsCache.filter(i=>String(i.status||"pending").toLowerCase()==="pending");
  const approved = addonRequestsCache.filter(i=>String(i.status||"").toLowerCase()==="approved");
  document.querySelector("#saasPageAddons").innerHTML = `
    <div class="saas-kpi-grid compact">
      ${metricCard("Add-ons pendentes", pending.length, "✚", "gold", "+ hoje")}
      ${metricCard("Add-ons ativos", approved.length, "👥", "green", "liberados")}
      ${metricCard("Renovar hoje", approved.filter(i=>{ const d=daysUntil(i.expiresAt); return d===0; }).length, "↻", "blue", "agenda")}
      ${metricCard("Expirando", approved.filter(i=>{ const d=daysUntil(i.expiresAt); return d!==null && d>=0 && d<=7; }).length, "◷", "purple", "7 dias")}
      ${metricCard("Recusados", addonRequestsCache.filter(i=>String(i.status||"").toLowerCase()==="archived").length, "⊗", "red", "arquivados")}
    </div>
    ${section("Add-Ons por clã e membro", addonRows(getFilteredAddons(),12))}
    ${section("Solicitação selecionada", renderAddonSelected())}
  `;
}
function renderAddonSelected(){
  const selected = getFilteredAddons()[0];
  if(!selected) return emptyState("Selecione ou aguarde uma solicitação de Add-On.");
  return `<div class="saas-selected-panel">
    ${emblem(selected.clanName || selected.clanTag, selected.addonPlan)}
    <div class="main"><strong>${escapeHtml(selected.playerName || "Membro")}</strong><span>${escapeHtml(selected.playerTag || "sem tag")} • ${escapeHtml(selected.clanName || selected.clanTag || "clã")}</span></div>
    <div><small>Add-on solicitado</small>${planBadge(selected.addonPlan)}</div>
    <div><small>Expiração</small><b>${formatDate(selected.expiresAt)}</b></div>
    <div class="saas-inline-actions"><button onclick="approveAddonRequest('${selected.id}')">Liberar ${planLabel(selected.addonPlan)}</button><button class="danger" onclick="archiveAddonRequest('${selected.id}')">Recusar</button></div>
  </div>`;
}
function renderClansPage(){
  const items = getFilteredAccess();
  const premium = items.filter(i=>planKey(i.plan)==="premium").length;
  const plus = items.filter(i=>planKey(i.plan)==="plus").length;
  const trial = items.filter(i=>planKey(i.plan)==="trial").length;
  const expiring = items.filter(i=>{ const d=daysUntil(i.planExpiresAt); return d!==null && d>=0 && d<=7; }).length;
  document.querySelector("#saasPageClans").innerHTML = `
    <div class="saas-kpi-grid compact">
      ${metricCard("Clãs ativos", items.length, "⬟", "teal", "total")}
      ${metricCard("Premium", premium, "♛", "gold", "clãs")}
      ${metricCard("Plus", plus, "★", "purple", "clãs")}
      ${metricCard("Trial", trial, "⌛", "blue", "clãs")}
      ${metricCard("Expirando", expiring, "⚠", "red", "7 dias")}
    </div>
    ${section("Lista premium de clãs", clanCards(items,20))}
    ${section("Clã selecionado", renderClanSelected(items[0]))}
  `;
}
function renderClanSelected(item){
  if(!item) return emptyState("Nenhum clã selecionado.");
  const d = daysUntil(item.planExpiresAt);
  return `<div class="saas-clan-selected">
    <div class="saas-clan-main">${emblem(item.clanName || item.clanTag,item.plan)}<div><strong>${displayNameForAccess(item)}</strong><span>${displayTagForAccess(item)} • ${translateStatus(item.status || "active")}</span>${planBadge(item.plan)}</div><b>${d === null ? "Sem vencimento" : d < 0 ? `Vencido há ${Math.abs(d)} dias` : `Expira em ${d} dias`}</b></div>
    <div class="saas-kpi-grid tiny">${metricCard("Membros ativos", item.membersCount || "—", "👥", "green", "registrados")}${metricCard("Receita manual", money(planKey(item.plan)==="premium"?89.9:59.9), "R$", "blue", "estimada")}${metricCard("Pendências", requestsCache.filter(r=>normalizeTag(r.clanTag)===normalizeTag(item.clanTag)).length, "⚠", "red", "solicitações")}${metricCard("Add-ons ativos", addonRequestsCache.filter(r=>normalizeTag(r.clanTag)===normalizeTag(item.clanTag)).length, "✚", "purple", "membros")}</div>
    <div class="saas-quick-actions"><button onclick="showSaasPage('subscriptions')">Gerenciar</button><button onclick="showSaasPage('addons')">Add-ons</button><button onclick="showSaasPage('requests')">Solicitações</button><button onclick="showSaasPage('finance')">Financeiro</button></div>
  </div>`;
}
function renderRequestsPage(){
  const subs = getFilteredRequests();
  const addons = getFilteredAddons();
  const allItems = [
    ...subs.map(i=>({...i,_kind:"subscription"})),
    ...addons.map(i=>({...i,_kind:"addon"}))
  ].filter(i=>typeFilter==="all" || i._kind===typeFilter).filter(i=>textIncludes(i,searchTerm));
  const pending = allItems.filter(isPending);
  const approved = allItems.filter(i=>["approved","released"].includes(requestStatus(i)));
  const selected = allItems[0];
  document.querySelector("#saasPageRequests").innerHTML = `
    <div class="saas-request-tabs"><span>Todas</span><span>Novas assinaturas</span><span>Renovações</span><span>Upgrade de plano</span><span>Add-ons de membro</span><span>Suporte/manual</span></div>
    <div class="saas-kpi-grid compact">${metricCard("Pendentes", pending.length, "◷", "gold", "aguardando ação")}${metricCard("Em análise", allItems.filter(i=>requestStatus(i).includes("analysis")).length, "▣", "blue", "em avaliação")}${metricCard("Liberadas", approved.length, "✓", "green", "aprovadas")}${metricCard("Recusadas", allItems.filter(i=>requestStatus(i).includes("recus")||requestStatus(i).includes("archived")).length, "×", "red", "negadas")}</div>
    ${section("Solicitações recebidas", `<div class="saas-request-list">${allItems.length ? allItems.slice(0,12).map(i=>renderMixedRequest(i)).join("") : emptyState("Nenhuma solicitação recebida.")}</div>`)}
    ${section("Solicitação selecionada", renderSelectedRequest(selected))}
  `;
}
function renderMixedRequest(item){
  if(item._kind === "addon"){
    return `<article class="saas-request-item">${emblem(item.clanName || item.clanTag,item.addonPlan)}<div class="main"><strong>${escapeHtml(item.clanName || item.clanTag || "Clã")}</strong><span>Add-on de membro • ${escapeHtml(item.playerName || "Membro")}</span></div>${statusBadge(item.status || "pending")}<button onclick="approveAddonRequest('${item.id}')">Liberar</button><button class="danger" onclick="archiveAddonRequest('${item.id}')">Recusar</button></article>`;
  }
  const encoded = encodeURIComponent(JSON.stringify(item));
  const plan = planKey(item.plan || "premium");
  return `<article class="saas-request-item">${emblem(item.clanName || item.clanTag,plan)}<div class="main"><strong>${escapeHtml(item.clanName || item.clanTag || "Solicitação")}</strong><span>${item.requestType === "planUpgrade" ? "Upgrade de plano" : "Nova assinatura"} • ${planLabel(plan)}</span></div>${statusBadge(item.status || "pending")}<button onclick="${item.requestType === "planUpgrade" ? `approveSubscriptionRequest('${item.id}')` : `fillSaasReleaseFromRequest('${encoded}')`}">Liberar</button><button class="danger" onclick="deleteSaasRequest('${item.id}')">Excluir</button></article>`;
}
function renderSelectedRequest(item){
  if(!item) return emptyState("Sem solicitação selecionada.");
  const isAddon = item._kind === "addon";
  return `<div class="saas-selected-panel large">
    ${emblem(item.clanName || item.clanTag, isAddon ? item.addonPlan : item.plan)}
    <div class="main"><strong>${escapeHtml(item.clanName || item.clanTag || "Solicitação")}</strong><span>${isAddon ? `Membro: ${escapeHtml(item.playerName || "Membro")}` : `Comprador: ${buyerName(item)}`}</span></div>
    <div><small>Tipo</small><b>${isAddon ? "Add-on de membro" : (item.requestType === "planUpgrade" ? "Upgrade/Renovação" : "Nova assinatura")}</b></div>
    <div><small>Status</small>${statusBadge(item.status || "pending")}</div>
    <div class="saas-inline-actions">${isAddon ? `<button onclick="approveAddonRequest('${item.id}')">Liberar</button><button class="danger" onclick="archiveAddonRequest('${item.id}')">Recusar</button>` : `<button onclick="approveSubscriptionRequest('${item.id}')">Liberar plano</button><button class="danger" onclick="deleteSaasRequest('${item.id}')">Excluir</button>`}<button class="secondary">Ver histórico</button></div>
  </div>`;
}
function renderFinancePage(){
  const m = metrics();
  document.querySelector("#saasPageFinance").innerHTML = `
    <div class="saas-kpi-grid compact">${metricCard("Recebido no mês", money(m.estimatedRevenue), "R$", "green", "manual")}${metricCard("Pendente", money((m.pendingSubs.length+m.pendingAddons.length)*59.9), "◷", "gold", "registros")}${metricCard("Vencendo (7 dias)", money(m.expiring.length*59.9), "⚠", "red", "atenção")}${metricCard("Confirmados", money(m.active.length*59.9), "✓", "blue", "ativos")}</div>
    ${section("Registro manual", `<div class="saas-manual-form"><label>Status do pagamento<select><option>Selecione o status</option><option>Pago</option><option>Pendente</option><option>Atrasado</option></select></label><label>Valor do plano (R$)<input placeholder="Ex.: 99,90"></label><label>Valor do add-on (R$)<input placeholder="Ex.: 29,90"></label><label>Data de liberação<input type="date"></label><label>Data de vencimento<input type="date"></label><label>Observação manual<input placeholder="Digite uma observação..."></label></div><div class="saas-quick-actions"><button>Registrar pagamento</button><button onclick="document.querySelector('#openNewRelease').click()">Liberar plano</button><button>Renovar add-on</button><button>Exportar</button></div>`)}
    ${section("Registros financeiros manuais", subscriptionRows(getFilteredAccess(),5))}
    ${section("Histórico de alterações", renderHistoryList(true))}
  `;
}
function renderHistoryPage(){
  document.querySelector("#saasPageHistory").innerHTML = `${section("Linha do tempo administrativa", renderHistoryList(true))}${section("Auditoria rápida", `<div class="saas-finance-lines"><span>Última atualização <b>${new Date().toLocaleString("pt-BR")}</b></span><span>Alterações de plano <b>${requestsCache.filter(i=>i.requestType === "planUpgrade").length}</b></span><span>Add-ons processados <b>${addonRequestsCache.filter(i=>String(i.status||"").toLowerCase()==="approved").length}</b></span><span>Revogações <b>${accessCache.filter(i=>String(i.status||"").toLowerCase()==="blocked").length}</b></span></div>`)}`;
}
function renderHistoryList(full=false){
  const items = [
    ["Assinatura liberada", "Clã Titãs • Plano Premium", "Hoje, 14:32", "admin", "purple"],
    ["Upgrade de plano", "GuardiõesBR • Plus → Premium", "Hoje, 10:08", "admin", "blue"],
    ["Add-on adicionado", "War Kings • Add-on Plus", "Hoje, 09:35", "admin", "green"],
    ["Revogação de assinatura", "Lobos da Noite", "Ontem, 21:16", "sistema", "gold"],
    ["Trial convertido", "Elite Warriors • Trial → Plus", "Ontem, 09:18", "sistema", "teal"]
  ];
  return `<div class="saas-history-list">${items.slice(0,full?items.length:4).map(i=>`<article><span class="dot ${i[4]}"></span><div><strong>${i[0]}</strong><small>${i[1]}</small></div><em>${i[2]}<br>${i[3]}</em></article>`).join("")}</div>`;
}
function renderAll(){
  renderDashboard();
  renderSubscriptions();
  renderAddonsPage();
  renderClansPage();
  renderRequestsPage();
  renderFinancePage();
  renderHistoryPage();
  renderActivePage();
}
function renderActivePage(){
  document.querySelectorAll(".saas-pro-view").forEach(view=>view.hidden = true);
  const view = document.querySelector(`#saasPage${activePage[0].toUpperCase()+activePage.slice(1)}`);
  if(view) view.hidden = false;
  document.querySelectorAll(".saas-pro-tab").forEach(btn=>btn.classList.toggle("active", btn.dataset.saasPage === activePage));
  const title = document.querySelector("#saasPageTitle");
  if(title) title.textContent = PAGE_TITLES[activePage] || "Painel SaaS";
  const filters = document.querySelector(".saas-pro-filters");
  if(filters) filters.hidden = activePage === "dashboard";
  const command = document.querySelector(".saas-pro-command");
  if(command) command.classList.toggle("dashboard-command", activePage === "dashboard");
  requestAnimationFrame(()=>document.querySelector(".saas-pro-app")?.scrollTo({top:0,behavior:"smooth"}));
}
async function saveAccess(event){
  event.preventDefault();
  const feedback = document.querySelector("#saasFeedback");
  const tag = normalizeTag(document.querySelector("#saasClanTag")?.value);
  const plan = planKey(document.querySelector("#saasPlan")?.value || "trial");
  const status = document.querySelector("#saasStatus")?.value || "released";
  const expires = addPlanDuration(plan,new Date());
  const note = document.querySelector("#saasManualNote")?.value || "";
  if(!tag){ feedback.textContent = "Informe a tag do clã."; feedback.className = "tag-feedback error"; return; }
  try{
    await setDoc(doc(db,"saasAccess",tag),{
      clanTag:tag,
      clanName:document.querySelector("#saasClanName").value,
      buyerEmail:document.querySelector("#saasBuyerEmail").value,
      buyerPhone:document.querySelector("#saasBuyerPhone").value,
      manualNote:note,
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
      active:status==="active" || status==="released",
      updatedAt:serverTimestamp()
    },{merge:true});
    await addHistory("Liberação manual registrada", `${tag} • ${planLabel(plan)}`);
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

function bindEvents(){
  document.querySelector("#saasGateBtn")?.addEventListener("click",handleGate);
  document.querySelector("#saasGatePassword")?.addEventListener("keydown",event=>{ if(event.key==="Enter") handleGate(); });
  document.querySelector("#openNewRelease")?.addEventListener("click",openReleaseModal);
  document.querySelector("#closeNewRelease")?.addEventListener("click",closeReleaseModal);
  document.querySelector("#saasReleaseOverlay")?.addEventListener("click",event=>{ if(event.target.id === "saasReleaseOverlay") closeReleaseModal(); });
  document.querySelector("#saasReleaseForm")?.addEventListener("submit",saveAccess);
  document.querySelector("#saasLogoutBtn")?.addEventListener("click",async()=>{
    const email = document.querySelector("#saasGateEmail");
    const pass = document.querySelector("#saasGatePassword");
    if(email) email.value = "";
    if(pass) pass.value = "";
    await signOut(auth);
    showGate();
  });
  document.querySelectorAll(".saas-pro-tab").forEach(btn=>btn.addEventListener("click",()=>{
    activePage = btn.dataset.saasPage;
    renderActivePage();
  }));
  document.querySelector("#saasGlobalSearch")?.addEventListener("input",event=>{ searchTerm = event.target.value.trim(); renderAll(); });
  document.querySelector("#saasFilterPlan")?.addEventListener("change",event=>{ planFilter = event.target.value; renderAll(); });
  document.querySelector("#saasFilterStatus")?.addEventListener("change",event=>{ statusFilter = event.target.value; renderAll(); });
  document.querySelector("#saasFilterType")?.addEventListener("change",event=>{ typeFilter = event.target.value; renderAll(); });
  document.addEventListener("change",event=>{
    if(event.target?.id === "saasChartPeriod"){
      chartPeriod = Number(event.target.value) || 30;
      renderDashboard();
    }
  });
}

bindEvents();
showGate();
onAuthStateChanged(auth,async user=>{
  if(await canAccess(user)){
    hideGate();
    await loadAll();
  }else{
    showGate();
  }
});
