import { db } from "./firebase-config.js";
import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const PLAN_PRICES = {
  basic: { monthly: 19.90, semiannual: 29.90, annual: 49.90 },
  plus: { monthly: 39.90, semiannual: 49.90, annual: 69.90 },
  premium: { monthly: 69.90, semiannual: 79.90, annual: 99.90 }
};

const PLAN_LABELS = {
  basic: "Básico",
  plus: "Plus",
  premium: "Premium"
};

const CYCLE_LABELS = {
  monthly: "Mensal",
  semiannual: "Semestral",
  annual: "Anual"
};

function normalizeTag(value){
  const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if(!cleaned) return "";
  return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
}

function money(value){
  return Number(value || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

function selectedPlan(){ return document.querySelector("#subPlan")?.value || "basic"; }
function selectedCycle(){ return document.querySelector("#subBillingCycle")?.value || "monthly"; }
function selectedAmount(){ return PLAN_PRICES[selectedPlan()]?.[selectedCycle()] || 0; }

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
`Pedido TopBRS Multi-Clã
Nome: ${payload.buyerName}
Email: ${payload.buyerEmail}
WhatsApp: ${payload.buyerPhone || "-"}
Clã: ${payload.clanName || "-"}
Tag: ${payload.clanTag}
Plano: ${payload.planLabel}
Período: ${payload.billingCycleLabel}
Valor: ${money(payload.amount)}`
  );

  return `mailto:${payload.ownerEmail || "suporte@topbrs.com"}?subject=Pedido TopBRS ${encodeURIComponent(payload.clanTag)}&body=${text}`;
}

function updateCheckoutUI(){
  const plan = selectedPlan();
  const cycle = selectedCycle();
  const prices = PLAN_PRICES[plan] || PLAN_PRICES.basic;
  const amount = prices[cycle] || prices.monthly;

  document.querySelectorAll(".checkout-plan-card").forEach(card=>{
    card.classList.toggle("active", card.dataset.plan === plan);
  });
  document.querySelectorAll(".checkout-cycle").forEach(btn=>{
    btn.classList.toggle("active", btn.dataset.cycle === cycle);
  });

  const monthly = document.querySelector("#cycleMonthlyPrice");
  const semiannual = document.querySelector("#cycleSemiannualPrice");
  const annual = document.querySelector("#cycleAnnualPrice");
  if(monthly) monthly.textContent = money(prices.monthly);
  if(semiannual) semiannual.textContent = money(prices.semiannual);
  if(annual) annual.textContent = money(prices.annual);

  Object.entries(PLAN_PRICES).forEach(([key, value])=>{
    const target = document.querySelector(`[data-price-label="${key}"]`);
    if(target) target.textContent = money(value[cycle] || value.monthly);
  });

  const summaryPlan = document.querySelector("#summaryPlan");
  const summaryAmount = document.querySelector("#summaryAmount");
  const amountInput = document.querySelector("#subAmount");
  if(summaryPlan) summaryPlan.textContent = `${PLAN_LABELS[plan]} • ${CYCLE_LABELS[cycle]}`;
  if(summaryAmount) summaryAmount.textContent = money(amount);
  if(amountInput) amountInput.value = String(amount.toFixed(2));
}

function showStatus(status, title, text){
  const panel = document.querySelector("#checkoutStatusPanel");
  const icon = document.querySelector("#checkoutStatusIcon");
  const titleEl = document.querySelector("#checkoutStatusTitle");
  const textEl = document.querySelector("#checkoutStatusText");
  if(!panel) return;
  panel.hidden = false;
  panel.dataset.status = status;
  if(icon) icon.textContent = status === "approved" ? "✓" : status === "rejected" ? "×" : "◷";
  if(titleEl) titleEl.textContent = title;
  if(textEl) textEl.textContent = text;
}

function setupCheckoutControls(){
  document.querySelectorAll(".checkout-plan-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      const input = document.querySelector("#subPlan");
      if(input) input.value = card.dataset.plan || "basic";
      updateCheckoutUI();
    });
  });

  document.querySelectorAll(".checkout-cycle").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const input = document.querySelector("#subBillingCycle");
      if(input) input.value = btn.dataset.cycle || "monthly";
      updateCheckoutUI();
    });
  });

  updateCheckoutUI();
}

setupCheckoutControls();

document.querySelector("#subscribeForm")?.addEventListener("submit", async (event)=>{
  event.preventDefault();

  const feedback = document.querySelector("#subscribeFeedback");
  const btn = event.currentTarget.querySelector("button[type='submit']");
  const buyerName = String(document.querySelector("#subName")?.value || "").trim();
  const buyerEmail = String(document.querySelector("#subEmail")?.value || "").trim();
  const buyerPhone = String(document.querySelector("#subPhone")?.value || "").trim();
  const clanName = String(document.querySelector("#subClanName")?.value || "").trim();
  const clanTag = normalizeTag(document.querySelector("#subClanTag")?.value);
  const message = String(document.querySelector("#subMessage")?.value || "").trim();
  const plan = selectedPlan();
  const billingCycle = selectedCycle();
  const amount = selectedAmount();

  feedback.className = "tag-feedback";

  if(!buyerName || !buyerEmail || !clanTag){
    feedback.textContent = "Preencha nome, email e tag do clã.";
    feedback.classList.add("error");
    return;
  }

  const orderId = `topbrs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    orderId,
    buyerName,
    name: buyerName,
    buyerEmail,
    email: buyerEmail,
    buyerPhone,
    phone: buyerPhone,
    clanName,
    clanTag,
    message,
    plan,
    planLabel: PLAN_LABELS[plan],
    billingCycle,
    billingCycleLabel: CYCLE_LABELS[billingCycle],
    amount,
    currency: "BRL",
    status: "pending_payment",
    paymentStatus: "pending_payment",
    paymentProvider: "mercadopago",
    mercadoPagoPaymentId: null,
    mercadoPagoPreferenceId: null,
    requestType: "newSubscription",
    source: "subscribe-checkout-page"
  };

  try{
    if(btn){
      btn.disabled = true;
      btn.textContent = "Criando pedido...";
    }

    await addDoc(collection(db, "subscriptionRequests"), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    showStatus("pending", "Pedido pendente criado", "Próxima etapa: conectar o botão ao Mercado Pago pela VPS/webhook para confirmação automática.");
    feedback.textContent = "Pedido criado! Ele já fica preparado para o fluxo de pagamento automático no SaaS.";
    feedback.classList.add("success");

  }catch(error){
    console.warn("Firestore bloqueou a solicitação pública. Salvando fallback local:", error);
    saveLocalRequest(payload);

    showStatus("pending", "Pedido salvo localmente", "Se o Firestore bloquear, envie o pedido pelo suporte para registro manual.");
    feedback.innerHTML = `Pedido registrado neste aparelho. Se não aparecer no painel, envie pelo suporte. <a href="${openSupportFallback(payload)}">Abrir e-mail</a>`;
    feedback.classList.add("success");
  }finally{
    if(btn){
      btn.disabled = false;
      btn.textContent = "Criar pedido pendente";
    }
  }
});
