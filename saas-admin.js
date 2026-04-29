import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const OWNER_EMAILS = ["silva12.anderson@gmail.com"];
let requests = [];
let accesses = [];
let currentTab = "sales";

function normalizeEmail(value){ return String(value || "").trim().toLowerCase(); }
function normalizeTag(value){ const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g, ""); return cleaned ? (cleaned.startsWith("#") ? cleaned : `#${cleaned}`) : ""; }
function planLabel(plan){ const p=String(plan||"trial").toLowerCase(); if(p==="basic")return"Básico"; if(p==="plus")return"Plus"; if(p==="premium")return"Premium"; return"Trial"; }
function planDays(plan){ const p=String(plan||"trial").toLowerCase(); if(p==="basic")return 31; if(p==="plus")return 183; if(p==="premium")return 365; return 7; }
function addPlanDuration(plan, base = new Date()){ const d=new Date(base); const p=String(plan||"trial").toLowerCase(); if(p==="trial")d.setDate(d.getDate()+7); else if(p==="basic")d.setMonth(d.getMonth()+1); else if(p==="plus")d.setMonth(d.getMonth()+6); else if(p==="premium")d.setFullYear(d.getFullYear()+1); else d.setDate(d.getDate()+7); return d; }
function toDate(value){ if(!value)return null; if(value?.toDate)return value.toDate(); const d=new Date(value); return Number.isNaN(d.getTime())?null:d; }
function formatDate(value){ const d=toDate(value); return d ? d.toLocaleDateString("pt-BR") : "—"; }
function isExpired(item){ const exp=toDate(item.planExpiresAt); return exp ? exp.getTime() < Date.now() : false; }
function statusOf(item){ return String(item.status || "released").toLowerCase(); }
function isRevoked(item){ const s=statusOf(item); return ["blocked","revoked","expired","deleted"].includes(s) || isExpired(item); }
function escapeHtml(value){ return String(value ?? "").replace(/[&<>'"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function setPanelVisible(visible){ document.querySelector("#saasAccessDenied")?.setAttribute("hidden", ""); const content=document.querySelector("#saasAdminContent"); if(content) content.hidden=!visible; }
function showGate(message=""){ const gate=document.querySelector("#saasLocalGate"), error=document.querySelector("#saasGateError"); if(error) error.textContent=message; if(gate) gate.hidden=false; setPanelVisible(false); }
function hideGate(){ const gate=document.querySelector("#saasLocalGate"); if(gate) gate.hidden=true; setPanelVisible(true); }
async function canAccess(user){ if(!user)return false; if(OWNER_EMAILS.includes(normalizeEmail(user.email)))return true; try{ const snap=await getDoc(doc(db,"users",user.uid)); const data=snap.exists()?snap.data():{}; return Boolean(data.saasOwner||data.systemOwner||data.role==="systemOwner"); }catch{return false;} }

async function handleGate(){
 const email=normalizeEmail(document.querySelector("#saasGateEmail")?.value); const password=String(document.querySelector("#saasGatePassword")?.value||""); const error=document.querySelector("#saasGateError"), btn=document.querySelector("#saasGateBtn");
 if(error)error.textContent=""; if(!OWNER_EMAILS.includes(email)){ if(error)error.textContent="E-mail admin não autorizado."; return; } if(!password){ if(error)error.textContent="Informe a senha do admin."; return; }
 try{ if(btn){btn.disabled=true;btn.textContent="Entrando...";} const credential=await signInWithEmailAndPassword(auth,email,password); if(!(await canAccess(credential.user))){ await signOut(auth); if(error)error.textContent="Este usuário não tem permissão SaaS."; return; } hideGate(); await loadAll(); }
 catch(err){ console.error(err); if(error)error.textContent="E-mail ou senha inválidos, ou regras do Firestore bloqueando."; }
 finally{ if(btn){btn.disabled=false;btn.textContent="Entrar";} }
}

function openReleaseModal(item={}){ fillReleaseForm(item); document.querySelector("#saasReleaseOverlay")?.classList.add("show"); document.body.classList.add("modal-open"); }
function closeReleaseModal(){ document.querySelector("#saasReleaseOverlay")?.classList.remove("show"); document.body.classList.remove("modal-open"); }
function fillReleaseForm(item){
 document.querySelector("#saasClanTag").value=normalizeTag(item.clanTag||"");
 document.querySelector("#saasClanName").value=item.clanName||item.name||"";
 document.querySelector("#saasBuyerEmail").value=item.email||item.buyerEmail||item.ownerEmail||"";
 document.querySelector("#saasBuyerPhone").value=item.phone||item.buyerPhone||"";
 document.querySelector("#saasPlan").value=item.plan||"trial";
 document.querySelector("#saasStatus").value=item.status === "active" ? "active" : "released";
}
window.openSaasReleaseFromRequest=(id)=>{ const item=requests.find(x=>x.id===id); openReleaseModal(item||{}); };

async function loadRequests(){
 const snap=await getDocs(query(collection(db,"subscriptionRequests"), orderBy("createdAt","desc")));
 requests=snap.docs.map(d=>({id:d.id,...(d.data()||{})})).filter(r=>!["approved","released","deleted"].includes(String(r.status||"pending").toLowerCase()));
}
async function loadAccesses(){
 const snap=await getDocs(query(collection(db,"saasAccess"), orderBy("updatedAt","desc")));
 accesses=snap.docs.map(d=>({id:d.id,...(d.data()||{}), clanTag:(d.data()?.clanTag||d.id)}));
}
async function loadAll(){
 try{ await Promise.all([loadRequests(), loadAccesses()]); renderAll(); }
 catch(error){ console.error(error); const list=document.querySelector("#saasMainList"); if(list) list.innerHTML=`<div class="saas-row empty">Erro ao carregar painel. Verifique regras do Firestore.</div>`; }
}

function renderKpis(){
 const active=accesses.filter(x=>!isRevoked(x) && String(x.plan||"").toLowerCase()!=="trial").length;
 const trial=accesses.filter(x=>!isRevoked(x) && String(x.plan||"trial").toLowerCase()==="trial").length;
 document.querySelector("#kpiSales").textContent=requests.length;
 document.querySelector("#kpiActive").textContent=active;
 document.querySelector("#kpiTrial").textContent=trial;
}
function filteredAccesses(){
 if(currentTab==="trial") return accesses.filter(x=>!isRevoked(x) && String(x.plan||"trial").toLowerCase()==="trial");
 if(currentTab==="active") return accesses.filter(x=>!isRevoked(x) && String(x.plan||"").toLowerCase()!=="trial");
 if(currentTab==="expired") return accesses.filter(isRevoked);
 return [];
}
function renderAll(){ renderKpis(); document.querySelectorAll(".saas-tab").forEach(b=>b.classList.toggle("active", b.dataset.saasTab===currentTab)); const title={sales:"VENDAS",trial:"TRIAL",active:"ATIVOS",expired:"EXPIRADOS / REVOGADOS"}[currentTab]||"PAINEL"; document.querySelector("#saasListTitle").textContent=title; renderList(); }
function renderList(){
 const list=document.querySelector("#saasMainList"); if(!list)return;
 if(currentTab==="sales"){
   if(!requests.length){ list.innerHTML=`<div class="saas-row empty">Nenhuma solicitação pendente.</div>`; return; }
   list.innerHTML=requests.map(item=>renderRequest(item)).join(""); return;
 }
 const items=filteredAccesses();
 if(!items.length){ list.innerHTML=`<div class="saas-row empty">Nada nesta aba.</div>`; return; }
 list.innerHTML=items.map(item=>renderAccess(item)).join("");
}
function renderRequest(item){
 const tag=normalizeTag(item.clanTag||"");
 return `<article class="saas-row saas-request-row"><div><strong>${escapeHtml(item.name||item.clanName||tag||"Solicitação")}</strong><span>${escapeHtml(tag||"sem tag")} • ${escapeHtml(item.email||"sem email")} • ${escapeHtml(item.phone||"sem WhatsApp")}</span></div><div class="saas-pill plan-${item.plan||"trial"}">${planLabel(item.plan)}</div><div class="saas-actions"><button class="saas-small-action" type="button" onclick="releaseSale('${item.id}','trial')">Trial</button><button class="saas-small-action" type="button" onclick="releaseSale('${item.id}','basic')">Básico</button><button class="saas-small-action" type="button" onclick="releaseSale('${item.id}','plus')">Plus</button><button class="saas-small-action" type="button" onclick="releaseSale('${item.id}','premium')">Premium</button><button class="saas-small-action danger" type="button" onclick="deleteSaasRequest('${item.id}')">Excluir</button></div></article>`;
}
function renderAccess(item){
 const tag=normalizeTag(item.clanTag||item.id); const plan=String(item.plan||"trial").toLowerCase();
 return `<article class="saas-row saas-access-row plan-card-${plan}"><div><strong>${escapeHtml(item.clanName||tag)}</strong><span>${escapeHtml(tag)} • ${escapeHtml(item.buyerEmail||item.ownerEmail||"sem email")}</span></div><div class="saas-pill plan-${plan}">${item.planLabel||planLabel(plan)}</div><small>${escapeHtml(item.status||"released")}<br>até ${formatDate(item.planExpiresAt)}</small><div class="saas-plan-tools"><select id="plan-${escapeHtml(tag)}"><option value="trial">Trial</option><option value="basic">Básico</option><option value="plus">Plus</option><option value="premium">Premium</option></select><button class="saas-small-action" type="button" onclick="extendSaasPlan('${escapeHtml(tag)}')">Alterar/estender</button><button class="saas-small-action danger" type="button" onclick="revokeSaasAccess('${escapeHtml(tag)}')">Revogar</button></div></article>`;
}
async function upsertAccess({clanTag, clanName, buyerEmail, buyerPhone, plan, status="released", requestId=null}){
 const normalized=normalizeTag(clanTag); if(!normalized) throw new Error("Informe a tag do clã.");
 const existingSnap=await getDoc(doc(db,"saasAccess",normalized)); const existing=existingSnap.exists()?existingSnap.data():{};
 const now=new Date(); const currentExp=toDate(existing.planExpiresAt); const base=(currentExp && currentExp>now) ? currentExp : now; const expiresAt=addPlanDuration(plan, base);
 await setDoc(doc(db,"saasAccess",normalized), {clanTag:normalized, clanName:clanName||existing.clanName||"", buyerEmail:buyerEmail||existing.buyerEmail||existing.ownerEmail||"", ownerEmail:buyerEmail||existing.ownerEmail||"", buyerPhone:buyerPhone||existing.buyerPhone||"", plan, planLabel:planLabel(plan), status, allowedOnboarding:status==="released"||status==="active"||status==="trial", paymentStatus:"manual", planStartedAt:existing.planStartedAt||serverTimestamp(), planExpiresAt:Timestamp.fromDate(expiresAt), onboardingComplete:Boolean(existing.onboardingComplete), updatedAt:serverTimestamp(), createdAt:existing.createdAt||serverTimestamp(), sourceRequestId:requestId||existing.sourceRequestId||null}, {merge:true});
 return expiresAt;
}
async function saveAccess(event){
 event.preventDefault(); const feedback=document.querySelector("#saasFeedback"); feedback.className="tag-feedback";
 const data={clanTag:document.querySelector("#saasClanTag")?.value, clanName:document.querySelector("#saasClanName")?.value, buyerEmail:document.querySelector("#saasBuyerEmail")?.value, buyerPhone:document.querySelector("#saasBuyerPhone")?.value, plan:document.querySelector("#saasPlan")?.value||"trial", status:document.querySelector("#saasStatus")?.value||"released"};
 try{ const exp=await upsertAccess(data); feedback.textContent=`${normalizeTag(data.clanTag)} liberado como ${planLabel(data.plan)} até ${exp.toLocaleDateString("pt-BR")}.`; feedback.classList.add("success"); document.querySelector("#saasReleaseForm").reset(); await loadAll(); setTimeout(closeReleaseModal, 450); }
 catch(error){ console.error(error); feedback.textContent=error.message||"Erro ao liberar assinatura."; feedback.classList.add("error"); }
}
window.releaseSale=async function(requestId, plan){
 const item=requests.find(x=>x.id===requestId); if(!item)return; try{ await upsertAccess({clanTag:item.clanTag, clanName:item.clanName||item.name, buyerEmail:item.email||item.buyerEmail, buyerPhone:item.phone||item.buyerPhone, plan, status: plan==="trial"?"released":"active", requestId}); await setDoc(doc(db,"subscriptionRequests",requestId), {status:"approved", approvedPlan:plan, approvedAt:serverTimestamp(), updatedAt:serverTimestamp()}, {merge:true}); await loadAll(); }catch(error){ console.error(error); alert("Erro ao liberar venda."); }
};
window.deleteSaasRequest=async function(requestId){ if(!requestId)return; if(!confirm("Remover esta solicitação da aba Vendas?"))return; try{ await setDoc(doc(db,"subscriptionRequests",requestId), {status:"deleted", deletedAt:serverTimestamp(), updatedAt:serverTimestamp()}, {merge:true}); await loadAll(); }catch(error){ console.error(error); alert("Erro ao excluir solicitação."); } };
window.extendSaasPlan=async function(clanTag){ const tag=normalizeTag(clanTag); const plan=document.getElementById(`plan-${tag}`)?.value||"trial"; try{ const snap=await getDoc(doc(db,"saasAccess",tag)); const item=snap.exists()?snap.data():{}; await upsertAccess({clanTag:tag, clanName:item.clanName, buyerEmail:item.buyerEmail||item.ownerEmail, buyerPhone:item.buyerPhone, plan, status: plan==="trial"?"released":"active"}); await loadAll(); }catch(error){ console.error(error); alert("Erro ao alterar assinatura."); } };
window.revokeSaasAccess=async function(clanTag){ const tag=normalizeTag(clanTag); if(!tag)return; if(!confirm(`Revogar assinatura do clã ${tag}?`))return; try{ await setDoc(doc(db,"saasAccess",tag), {status:"revoked", allowedOnboarding:false, revokedAt:serverTimestamp(), updatedAt:serverTimestamp()}, {merge:true}); await setDoc(doc(db,"clans",tag), {subscriptionStatus:"revoked", active:false, blockedAt:serverTimestamp(), updatedAt:serverTimestamp()}, {merge:true}); await loadAll(); }catch(error){ console.error(error); alert("Erro ao revogar assinatura."); } };

// eventos

document.querySelector("#saasGateBtn")?.addEventListener("click", handleGate);
document.querySelector("#saasGatePassword")?.addEventListener("keydown", e=>{ if(e.key==="Enter") handleGate(); });
document.querySelector("#saasReleaseForm")?.addEventListener("submit", saveAccess);
document.querySelector("#openNewRelease")?.addEventListener("click", ()=>openReleaseModal({}));
document.querySelector("#closeNewRelease")?.addEventListener("click", closeReleaseModal);
document.querySelector("#saasReleaseOverlay")?.addEventListener("click", e=>{ if(e.target.id==="saasReleaseOverlay") closeReleaseModal(); });
document.querySelector("#saasLogout")?.addEventListener("click", async()=>{ await signOut(auth); showGate(); });
document.querySelectorAll(".saas-tab").forEach(btn=>btn.addEventListener("click",()=>{ currentTab=btn.dataset.saasTab; renderAll(); }));
showGate();
onAuthStateChanged(auth, async user=>{ if(await canAccess(user)){ hideGate(); await loadAll(); } else showGate(); });
