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
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const OWNER_EMAILS = [
  "silva12.anderson@gmail.com"
];

function normalizeEmail(value){
  return String(value || "").trim().toLowerCase();
}

function normalizeTag(value){
  const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if(!cleaned) return "";
  return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
}

function planLabel(plan){
  const p = String(plan || "trial").toLowerCase();
  if(p === "basic") return "Básico";
  if(p === "plus") return "Plus";
  if(p === "premium") return "Premium";
  return "Trial";
}

function addPlanDuration(plan){
  const d = new Date();
  const p = String(plan || "trial").toLowerCase();

  if(p === "trial") d.setDate(d.getDate() + 7);
  else if(p === "basic") d.setMonth(d.getMonth() + 1);
  else if(p === "plus") d.setMonth(d.getMonth() + 6);
  else if(p === "premium") d.setFullYear(d.getFullYear() + 1);
  else d.setDate(d.getDate() + 7);

  return d;
}

function formatDate(value){
  try{
    const date = value?.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString("pt-BR");
  }catch{
    return "—";
  }
}

function setPanelVisible(visible){
  const denied = document.querySelector("#saasAccessDenied");
  const content = document.querySelector("#saasAdminContent");
  if(denied) denied.hidden = true;
  if(content) content.hidden = !visible;
}

function showGate(message = ""){
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

  if(OWNER_EMAILS.includes(normalizeEmail(user.email))){
    return true;
  }

  try{
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const data = userSnap.exists() ? userSnap.data() : {};
    return Boolean(data.saasOwner || data.systemOwner || data.role === "systemOwner");
  }catch{
    return false;
  }
}

async function handleGate(){
  const email = normalizeEmail(document.querySelector("#saasGateEmail")?.value);
  const password = String(document.querySelector("#saasGatePassword")?.value || "");
  const error = document.querySelector("#saasGateError");
  const btn = document.querySelector("#saasGateBtn");

  if(error) error.textContent = "";

  if(!OWNER_EMAILS.includes(email)){
    if(error) error.textContent = "E-mail admin não autorizado.";
    return;
  }

  if(!password){
    if(error) error.textContent = "Informe a senha do admin.";
    return;
  }

  try{
    if(btn){
      btn.disabled = true;
      btn.textContent = "Entrando...";
    }

    const credential = await signInWithEmailAndPassword(auth, email, password);
    const ok = await canAccess(credential.user);

    if(!ok){
      await signOut(auth);
      if(error) error.textContent = "Este usuário não tem permissão SaaS.";
      return;
    }

    hideGate();
    await loadRequestsList();
    await loadAccessList();

  }catch(err){
    console.error(err);
    if(error) error.textContent = "E-mail ou senha inválidos, ou regras do Firestore bloqueando.";
  }finally{
    if(btn){
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  }
}

function fillReleaseForm(item){
  const clanTag = normalizeTag(item.clanTag || "");
  const plan = item.plan || "trial";

  document.querySelector("#saasClanTag").value = clanTag;
  document.querySelector("#saasClanName").value = item.clanName || "";
  document.querySelector("#saasBuyerEmail").value = item.email || item.buyerEmail || "";
  document.querySelector("#saasBuyerPhone").value = item.phone || item.buyerPhone || "";
  document.querySelector("#saasPlan").value = plan;
  document.querySelector("#saasStatus").value = "released";

  document.querySelector("#saasReleaseForm")?.scrollIntoView({behavior:"smooth", block:"start"});
}

window.fillSaasReleaseFromRequest = function(encoded){
  try{
    const item = JSON.parse(decodeURIComponent(encoded));
    fillReleaseForm(item);
  }catch(error){
    console.error(error);
  }
};

async function loadRequestsList(){
  const list = document.querySelector("#saasRequestsList");
  if(!list) return;

  list.innerHTML = `<div class="saas-row loading">Carregando solicitações...</div>`;

  try{
    const snap = await getDocs(query(collection(db, "subscriptionRequests"), orderBy("createdAt", "desc")));

    if(snap.empty){
      list.innerHTML = `<div class="saas-row empty">Nenhuma solicitação recebida.</div>`;
      return;
    }

    list.innerHTML = snap.docs.map(docSnap=>{
      const item = docSnap.data() || {};
      const encoded = encodeURIComponent(JSON.stringify(item));
      return `
        <article class="saas-row saas-request-row">
          <div>
            <strong>${item.name || item.clanTag || "Solicitação"}</strong>
            <span>${item.clanTag || "sem tag"} • ${item.email || "sem email"} • ${item.phone || "sem WhatsApp"}</span>
          </div>
          <div class="saas-pill plan-${item.plan || "trial"}">${planLabel(item.plan)}</div>
          <button class="saas-small-action" type="button" onclick="fillSaasReleaseFromRequest('${encoded}')">Liberar</button>
        </article>
      `;
    }).join("");
  }catch(error){
    console.error(error);
    list.innerHTML = `<div class="saas-row empty">Erro ao carregar solicitações. Verifique regras de leitura de subscriptionRequests.</div>`;
  }
}

async function saveAccess(event){
  event.preventDefault();

  const feedback = document.querySelector("#saasFeedback");
  const clanTag = normalizeTag(document.querySelector("#saasClanTag")?.value);
  const clanName = String(document.querySelector("#saasClanName")?.value || "").trim();
  const buyerEmail = String(document.querySelector("#saasBuyerEmail")?.value || "").trim();
  const buyerPhone = String(document.querySelector("#saasBuyerPhone")?.value || "").trim();
  const plan = document.querySelector("#saasPlan")?.value || "trial";
  const status = document.querySelector("#saasStatus")?.value || "released";

  feedback.className = "tag-feedback";

  if(!clanTag){
    feedback.textContent = "Informe a tag do clã.";
    feedback.classList.add("error");
    return;
  }

  const expiresAt = addPlanDuration(plan);

  try{
    await setDoc(doc(db, "saasAccess", clanTag), {
      clanTag,
      clanName,
      buyerEmail,
      buyerPhone,
      plan,
      planLabel: planLabel(plan),
      status,
      allowedOnboarding: status === "released" || status === "active",
      paymentStatus: "manual",
      planStartedAt: serverTimestamp(),
      planExpiresAt: Timestamp.fromDate(expiresAt),
      onboardingComplete: false,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge:true });

    feedback.textContent = `${clanTag} liberado como ${planLabel(plan)} até ${expiresAt.toLocaleDateString("pt-BR")}.`;
    feedback.classList.add("success");

    document.querySelector("#saasReleaseForm").reset();
    await loadAccessList();

  }catch(error){
    console.error(error);
    feedback.textContent = "Erro ao liberar assinatura. Verifique regras do Firestore.";
    feedback.classList.add("error");
  }
}

async function loadAccessList(){
  const list = document.querySelector("#saasAccessList");
  if(!list) return;

  list.innerHTML = `<div class="saas-row loading">Carregando liberações...</div>`;

  try{
    const snap = await getDocs(query(collection(db, "saasAccess"), orderBy("updatedAt", "desc")));
    if(snap.empty){
      list.innerHTML = `<div class="saas-row empty">Nenhuma liberação ainda.</div>`;
      return;
    }

    list.innerHTML = snap.docs.map(docSnap=>{
      const item = docSnap.data() || {};
      return `
        <article class="saas-row">
          <div>
            <strong>${item.clanName || item.clanTag || docSnap.id}</strong>
            <span>${item.clanTag || docSnap.id} • ${item.buyerEmail || "sem email"}</span>
          </div>
          <div class="saas-pill plan-${item.plan || "trial"}">${item.planLabel || planLabel(item.plan)}</div>
          <small>${item.status || "released"}<br>até ${formatDate(item.planExpiresAt)}</small>
        </article>
      `;
    }).join("");
  }catch(error){
    console.error(error);
    list.innerHTML = `<div class="saas-row empty">Erro ao carregar liberações. Verifique regras de leitura de saasAccess.</div>`;
  }
}

document.querySelector("#saasGateBtn")?.addEventListener("click", handleGate);
document.querySelector("#saasGatePassword")?.addEventListener("keydown", event=>{
  if(event.key === "Enter") handleGate();
});
document.querySelector("#saasReleaseForm")?.addEventListener("submit", saveAccess);

showGate();

onAuthStateChanged(auth, async (user)=>{
  if(await canAccess(user)){
    hideGate();
    await loadRequestsList();
    await loadAccessList();
  }else{
    showGate();
  }
});
