import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged
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

const GATE_KEY = "topbrs_saas_admin_gate_v1";
const PASS_KEY = "topbrs_saas_admin_pass_hash_v1";

function normalizeEmail(value){
  return String(value || "").trim().toLowerCase();
}

async function sha256(text){
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,"0")).join("");
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

function showGate(){
  const gate = document.querySelector("#saasLocalGate");
  const title = document.querySelector("#saasGateTitle");
  const text = document.querySelector("#saasGateText");
  const passHash = localStorage.getItem(PASS_KEY);

  if(title) title.textContent = passHash ? "Entrar no Painel SaaS" : "Criar senha do Painel";
  if(text) text.textContent = passHash
    ? "Informe o e-mail admin e a senha criada para este painel."
    : "Primeiro acesso: informe o e-mail admin e crie uma senha para os próximos acessos.";

  if(gate) gate.hidden = false;
  setPanelVisible(false);
}

function hideGate(){
  const gate = document.querySelector("#saasLocalGate");
  if(gate) gate.hidden = true;
  setPanelVisible(true);
}

async function handleGate(){
  const email = normalizeEmail(document.querySelector("#saasGateEmail")?.value);
  const password = String(document.querySelector("#saasGatePassword")?.value || "");
  const error = document.querySelector("#saasGateError");

  if(error) error.textContent = "";

  if(!OWNER_EMAILS.includes(email)){
    if(error) error.textContent = "E-mail admin não autorizado.";
    return;
  }

  if(password.length < 4){
    if(error) error.textContent = "Informe uma senha com pelo menos 4 caracteres.";
    return;
  }

  const savedHash = localStorage.getItem(PASS_KEY);
  const currentHash = await sha256(`${email}:${password}`);

  if(!savedHash){
    localStorage.setItem(PASS_KEY, currentHash);
    localStorage.setItem(GATE_KEY, JSON.stringify({email, unlockedAt: Date.now()}));
    hideGate();
    await loadAccessList();
    return;
  }

  if(savedHash !== currentHash){
    if(error) error.textContent = "Senha incorreta.";
    return;
  }

  localStorage.setItem(GATE_KEY, JSON.stringify({email, unlockedAt: Date.now()}));
  hideGate();
  await loadAccessList();
}

async function canAccessByFirebase(user){
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
    feedback.textContent = "Erro ao liberar assinatura. Verifique as regras do Firestore.";
    feedback.classList.add("error");
  }
}

async function loadAccessList(){
  const list = document.querySelector("#saasAccessList");
  if(!list) return;
  list.innerHTML = `<div class="saas-row loading">Carregando...</div>`;

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
          <div class="saas-pill plan-${item.plan || "trial"}">
            ${item.planLabel || planLabel(item.plan)}
          </div>
          <small>${item.status || "released"}<br>até ${formatDate(item.planExpiresAt)}</small>
        </article>
      `;
    }).join("");
  }catch(error){
    console.error(error);
    list.innerHTML = `<div class="saas-row empty">Erro ao carregar liberações.</div>`;
  }
}

document.querySelector("#saasGateBtn")?.addEventListener("click", handleGate);
document.querySelector("#saasGatePassword")?.addEventListener("keydown", event=>{
  if(event.key === "Enter") handleGate();
});

document.querySelector("#saasReleaseForm")?.addEventListener("submit", saveAccess);

(function bootGate(){
  try{
    const gate = JSON.parse(localStorage.getItem(GATE_KEY) || "{}");
    const emailOk = OWNER_EMAILS.includes(normalizeEmail(gate.email));
    const stillValid = gate.unlockedAt && (Date.now() - gate.unlockedAt < 1000 * 60 * 60 * 12);

    if(emailOk && stillValid){
      hideGate();
      loadAccessList();
      return;
    }
  }catch{}

  showGate();
})();

onAuthStateChanged(auth, async (user)=>{
  // Login Firebase continua funcionando como atalho, mas sem mostrar card "acesso restrito".
  if(await canAccessByFirebase(user)){
    localStorage.setItem(GATE_KEY, JSON.stringify({email: normalizeEmail(user.email), unlockedAt: Date.now()}));
    hideGate();
    await loadAccessList();
  }
});
