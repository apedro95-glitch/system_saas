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

document.querySelector("#subscribeForm")?.addEventListener("submit", async (event)=>{
  event.preventDefault();

  const feedback = document.querySelector("#subscribeFeedback");
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

  try{
    await addDoc(collection(db, "subscriptionRequests"), {
      name,
      email,
      phone,
      clanTag,
      plan,
      status: "pending",
      source: "subscribe-page",
      createdAt: serverTimestamp()
    });

    feedback.textContent = "Solicitação enviada! Aguarde a liberação do suporte.";
    feedback.classList.add("success");
    event.currentTarget.reset();
  }catch(error){
    console.error(error);
    feedback.textContent = "Erro ao enviar solicitação. Tente novamente.";
    feedback.classList.add("error");
  }
});
