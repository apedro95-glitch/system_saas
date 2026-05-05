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

function t(key, values = {}){
  return window.TopBRSI18n?.t ? window.TopBRSI18n.t(key, values) : key;
}
function planLabel(plan){
  return t(`subscribe.${plan}`);
}
function cycleLabel(cycle){
  return t(`subscribe.${cycle}`);
}
function refreshStaticTranslations(){
  window.TopBRSI18n?.apply?.();
}

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


function setHidden(el, hidden){
  if(!el) return;
  el.hidden = Boolean(hidden);
  el.classList.toggle("is-hidden", Boolean(hidden));
}

function updateStepPills(){
  const plan = selectedPlan();
  const cycle = selectedCycle();
  const amount = selectedAmount();
  const planPill = document.querySelector("#planStepPill");
  const cyclePill = document.querySelector("#cycleStepPill");
  const dataPill = document.querySelector("#dataStepPill");
  const planHint = document.querySelector("#planStepHint");
  const cycleHint = document.querySelector("#cycleStepHint");
  const dataHint = document.querySelector("#dataStepHint");

  if(planPill) planPill.textContent = t("subscribe.selected", { value: planLabel(plan) });
  if(cyclePill) cyclePill.textContent = `${cycleLabel(cycle)} • ${money(amount)}`;
  if(dataPill) dataPill.textContent = t("subscribe.fillData");
  if(planHint) planHint.textContent = t("subscribe.planChosenHint");
  if(cycleHint) cycleHint.textContent = t("subscribe.paymentPeriodChosenHint");
  if(dataHint) dataHint.textContent = t("subscribe.buyerDataActiveHint");
}

function setCheckoutStep(activeStep){
  const order = ["plan", "cycle", "data"];
  const visibleUntil = order.indexOf(activeStep);

  order.forEach((step, index)=>{
    const section = document.querySelector(`.checkout-step[data-step="${step}"]`);
    if(!section) return;

    const shouldBeVisible = index <= visibleUntil;
    setHidden(section, !shouldBeVisible);
    section.classList.toggle("is-active", step === activeStep);
    section.classList.toggle("is-complete", shouldBeVisible && index < visibleUntil);
  });

  const finalVisible = activeStep === "data";
  setHidden(document.querySelector(".checkout-final-panel"), !finalVisible);
  setHidden(document.querySelector(".checkout-final-action"), !finalVisible);

  const active = document.querySelector(`.checkout-step[data-step="${activeStep}"]`);
  if(active){
    window.requestAnimationFrame(()=>{
      active.scrollIntoView({behavior:"smooth", block:"center"});
    });
  }

  updateStepPills();
}

function openCompletedStep(step){
  const section = document.querySelector(`.checkout-step[data-step="${step}"]`);
  if(!section || section.classList.contains("is-hidden")) return;
  setCheckoutStep(step);
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
  if(summaryPlan) summaryPlan.textContent = `${planLabel(plan)} • ${cycleLabel(cycle)}`;
  if(summaryAmount) summaryAmount.textContent = money(amount);
  if(amountInput) amountInput.value = String(amount.toFixed(2));
  updateStepPills();
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
      setCheckoutStep("cycle");
    });
  });

  document.querySelectorAll(".checkout-cycle").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const input = document.querySelector("#subBillingCycle");
      if(input) input.value = btn.dataset.cycle || "monthly";
      updateCheckoutUI();
      setCheckoutStep("data");
    });
  });

  document.querySelectorAll(".checkout-section-head").forEach(head=>{
    head.addEventListener("click", ()=>{
      const section = head.closest(".checkout-step");
      if(section?.dataset?.step) openCompletedStep(section.dataset.step);
    });
  });

  updateCheckoutUI();
  setCheckoutStep("plan");
}

setupCheckoutControls();
window.addEventListener("topbrs:languagechange", ()=>{
  refreshStaticTranslations();
  updateCheckoutUI();
});

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
    feedback.textContent = t("subscribe.requiredFields");
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
    planLabel: planLabel(plan),
    billingCycle,
    billingCycleLabel: cycleLabel(billingCycle),
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
      btn.textContent = t("subscribe.creatingOrder");
    }

    await addDoc(collection(db, "subscriptionRequests"), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    showStatus("pending", t("subscribe.pendingCreatedTitle"), t("subscribe.pendingCreatedText"));
    feedback.textContent = t("subscribe.createdFeedback");
    feedback.classList.add("success");

  }catch(error){
    console.warn("Firestore bloqueou a solicitação pública. Salvando fallback local:", error);
    saveLocalRequest(payload);

    showStatus("pending", t("subscribe.localSavedTitle"), t("subscribe.localSavedText"));
    feedback.innerHTML = `${t("subscribe.localSavedFeedback")} <a href="${openSupportFallback(payload)}">E-mail</a>`;
    feedback.classList.add("success");
  }finally{
    if(btn){
      btn.disabled = false;
      btn.textContent = t("subscribe.createPendingOrder");
    }
  }
});
