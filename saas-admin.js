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

async function canAccess(user){
  if(!user) return false;

  if(OWNER_EMAILS.includes(String(user.email || "").toLowerCase())){
    return true;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const data = userSnap.exists() ? userSnap.data() : {};

  return Boolean(data.saasOwner || data.systemOwner || data.role === "systemOwner");
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
    feedback.textContent = "Erro ao liberar assinatura.";
    feedback.classList.add("error");
  }
}

async function loadAccessList(){
  const list = document.querySelector("#saasAccessList");
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

onAuthStateChanged(auth, async (user)=>{
  const ok = await canAccess(user);

  document.querySelector("#saasAccessDenied").hidden = ok;
  document.querySelector("#saasAdminContent").hidden = !ok;

  if(ok){
    document.querySelector("#saasReleaseForm")?.addEventListener("submit", saveAccess);
    await loadAccessList();
  }
});
