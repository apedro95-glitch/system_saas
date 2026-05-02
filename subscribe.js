import { db } from "./firebase-config.js";
import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function normalizeTag(value){
  const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if(!cleaned) return "";
  return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
}

function saveLocalRequest(payload){
  try{
    const current = JSON.parse(localStorage.getItem("topbrs_subscription_requests") || "[]");
    current.unshift({...payload, savedAt: new Date().toISOString()});
    localStorage.setItem("topbrs_subscription_requests", JSON.stringify(current.slice(0, 50)));
  }catch(error){
    console.warn("Não foi possível salvar solicitação local:", error);
  }
}

function openSupportFallback(payload){
  const text = encodeURIComponent(
`Solicitação TopBRS Multi-Clã
Nome: ${payload.name}
Email: ${payload.email}
WhatsApp: ${payload.phone || "-"}
Clã: ${payload.clanTag}
Plano: ${payload.plan}`
  );

  // Mantém sem número fixo por enquanto. O usuário copia/encaminha se o Firestore bloquear.
  return `mailto:${payload.ownerEmail || "suporte@topbrs.com"}?subject=Solicitação TopBRS ${encodeURIComponent(payload.clanTag)}&body=${text}`;
}

document.querySelector("#subscribeForm")?.addEventListener("submit", async (event)=>{
  event.preventDefault();

  const feedback = document.querySelector("#subscribeFeedback");
  const btn = event.currentTarget.querySelector("button[type='submit']");
  const name = String(document.querySelector("#subName")?.value || "").trim();
  const email = String(document.querySelector("#subEmail")?.value || "").trim();
  const phone = String(document.querySelector("#subPhone")?.value || "").trim();
  const clanTag = normalizeTag(document.querySelector("#subClanTag")?.value);
  const plan = document.querySelector("#subPlan")?.value || "trial";

  feedback.className = "tag-feedback";

  if(!name || !email || !clanTag){
    feedback.textContent = "Preencha nome, email e tag do clã.";
    feedback.classList.add("error");
    return;
  }

  const payload = {
    name,
    email,
    phone,
    clanTag,
    plan,
    status: "pending",
    source: "subscribe-page"
  };

  try{
    if(btn){
      btn.disabled = true;
      btn.textContent = "Enviando...";
    }

    await addDoc(collection(db, "subscriptionRequests"), {
      ...payload,
      createdAt: serverTimestamp()
    });

    feedback.textContent = "Solicitação enviada! Aguarde a liberação do suporte.";
    feedback.classList.add("success");
    event.currentTarget.reset();

  }catch(error){
    console.warn("Firestore bloqueou a solicitação pública. Salvando fallback local:", error);
    saveLocalRequest(payload);

    feedback.innerHTML = `Solicitação registrada neste aparelho. Se não aparecer no painel, envie pelo suporte. <a href="${openSupportFallback(payload)}">Abrir e-mail</a>`;
    feedback.classList.add("success");
  }finally{
    if(btn){
      btn.disabled = false;
      btn.textContent = "Enviar solicitação";
    }
  }
});
