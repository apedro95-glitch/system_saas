import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";





function normalizeSaasClanTag(value){
  const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if(!cleaned) return "";
  return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
}

function cleanSaasClanTag(value){
  return normalizeSaasClanTag(value).replace("#", "");
}

function addPlanDuration(startDate, plan){
  const d = new Date(startDate || Date.now());
  const p = String(plan || "trial").toLowerCase();

  if(p === "trial"){
    d.setDate(d.getDate() + 7);
  }else if(p === "basic" || p === "basico" || p === "básico"){
    d.setMonth(d.getMonth() + 1);
  }else if(p === "plus"){
    d.setMonth(d.getMonth() + 6);
  }else if(p === "premium"){
    d.setFullYear(d.getFullYear() + 1);
  }else{
    d.setDate(d.getDate() + 7);
  }

  return d;
}

function planLabel(plan){
  const p = String(plan || "trial").toLowerCase();
  if(p === "basic" || p === "basico" || p === "básico") return "Básico";
  if(p === "plus") return "Plus";
  if(p === "premium") return "Premium";
  return "Trial";
}


function toTopbrsDate(value){
  if(!value) return null;
  if(value?.toDate) return value.toDate();
  if(value?.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
async function assertActiveSubscription(clanTag){
  const accessSnap = await getDoc(doc(db, 'saasAccess', clanTag));
  const data = accessSnap.exists() ? accessSnap.data() : {};
  const status = String(data.status || data.subscriptionStatus || 'active').toLowerCase();
  const expiresAt = toTopbrsDate(data.planExpiresAt || data.expiresAt);
  if(status === 'blocked' || status === 'expired' || status === 'revoked' || (expiresAt && expiresAt <= new Date())){
    throw new Error('Plano expirado. Renove sua assinatura para continuar usando o sistema.');
  }
  return data;
}
function showPlanExpiredPopup(){
  let overlay = document.querySelector('#planExpiredOverlay');
  if(!overlay){overlay=document.createElement('div'); overlay.id='planExpiredOverlay'; overlay.className='clan-result-sheet-overlay show'; document.body.appendChild(overlay);}
  overlay.innerHTML = `<div class="clan-result-sheet glass-panel not-released"><button type="button" class="sheet-close" onclick="document.querySelector('#planExpiredOverlay')?.remove()" aria-label="Fechar">×</button><div class="sheet-clan-icon"><img src="assets/icons/clan.svg" alt=""></div><div class="sheet-content"><p class="sheet-eyebrow">PLANO EXPIRADO</p><h3>Assinatura expirada</h3><p>Renove seu plano para voltar a acessar o TopBRS Multi-Clã.</p></div><button class="gold-btn sheet-confirm" type="button" onclick="window.location.href='subscribe.html'">Renovar plano</button></div>`;
}

// ========================================
// 🔑 VERIFICAR LIBERAÇÃO SAAS PARA ONBOARDING
// ========================================
window.checkSaasAccessForOnboarding = async function (clanTag) {
  const normalizedTag = normalizeSaasClanTag(clanTag);

  if(!normalizedTag){
    return {
      allowed:false,
      reason:"invalid",
      message:"Tag do clã inválida."
    };
  }

  const snap = await getDoc(doc(db, "saasAccess", normalizedTag));

  if(!snap.exists()){
    return {
      allowed:false,
      exists:false,
      reason:"notReleased",
      message:"Este clã ainda não possui assinatura liberada."
    };
  }

  const access = snap.data() || {};
  const status = String(access.status || "").toLowerCase();
  const allowedOnboarding = access.allowedOnboarding === true;

  if(status === "blocked"){
    return {
      allowed:false,
      exists:true,
      reason:"blocked",
      access,
      message:"Este clã está bloqueado. Fale com o suporte."
    };
  }

  if(access.onboardingComplete || access.consumedAt){
    return {
      allowed:false,
      exists:true,
      reason:"alreadyUsed",
      access,
      message:"Esta liberação já foi usada no onboarding."
    };
  }

  if(!allowedOnboarding){
    return {
      allowed:false,
      exists:true,
      reason:"notAllowed",
      access,
      message:"Este clã ainda não está liberado para onboarding."
    };
  }

  return {
    allowed:true,
    exists:true,
    access
  };
};


// ========================================
// 🔒 VERIFICAR CLÃ JÁ CONFIGURADO
// ========================================
window.checkClanOnboardingStatus = async function (clanTag) {
  const normalizedTag = String(clanTag || "").trim().toUpperCase();
  if(!normalizedTag) return { exists:false, locked:false };

  const clanSnap = await getDoc(doc(db, "clans", normalizedTag));

  if(!clanSnap.exists()){
    return { exists:false, locked:false };
  }

  const data = clanSnap.data() || {};
  // SaaS pode criar um pré-registro em clans/{tag} antes do onboarding.
  // Esse pré-registro NÃO deve bloquear o onboarding; só bloqueia quando já existe dono/admin.
  const locked = Boolean(data.onboardingComplete || data.ownerUid || data.adminUid || data.ownerEmail);

  return {
    exists:true,
    locked,
    clan:data
  };
};


// ========================================
// 👑 CRIAR ADMIN (ONBOARDING)
// ========================================
window.createClanAdmin = async function ({ nome, email, senha, playerTag, clanTag, clanName, clanData, importedMembers = [] }) {
  const normalizedClanTag = normalizeSaasClanTag(clanTag);
  const accessCheck = await window.checkSaasAccessForOnboarding(normalizedClanTag);

  if(!accessCheck.allowed){
    throw new Error(accessCheck.message || "Assinatura não liberada para este clã.");
  }

  const access = accessCheck.access || {};
  const plan = String(access.plan || "trial").toLowerCase();
  const startedAt = new Date();
  const expiresAt = access.planExpiresAt?.toDate ? access.planExpiresAt.toDate() : addPlanDuration(startedAt, plan);

  const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    nome,
    email,
    playerTag,
    clanTag: normalizedClanTag,
    role: "admin",
    active: true,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, "clans", normalizedClanTag), {
      clanTag: normalizedClanTag,
      name: clanName || clanData?.name || access.clanName || "Clã TopBRS",
      badge: clanData?.badge || clanData?.badgeSrc || clanData?.badgeUrl || null,
      badgeSrc: clanData?.badgeSrc || clanData?.badge || null,
      badgeUrl: clanData?.badgeUrl || clanData?.badge || null,
      badgeId: clanData?.badgeId || null,
      members: clanData?.members || 0,
      trophies: clanData?.trophies || null,
      location: clanData?.location || null,
      countryCode: clanData?.countryCode || null,
      countryFlag: clanData?.countryFlag || null,
      plan,
      planLabel: planLabel(plan),
      planStartedAt: Timestamp.fromDate(startedAt),
      planExpiresAt: Timestamp.fromDate(expiresAt),
      subscriptionStatus: "active",
      trialUsed: plan === "trial",
      active: true,
      onboardingComplete: true,
      onboardingCompletedAt: serverTimestamp(),
      ownerUid: user.uid,
      ownerName: nome,
      buyerName: nome,
      adminName: nome,
      onboardingName: nome,
      ownerEmail: email,
      buyerEmail: email,
      createdAt: serverTimestamp()
    });

    for (const member of importedMembers) {
      const memberId = String(member.tag || member.name).replace("#", "");
      if(!memberId) continue;

      await setDoc(doc(db, "clans", clanTag, "members", memberId), {
        name: member.name || "",
        tag: member.tag || "",
        role: member.role || "member",
        trophies: member.trophies || 0,
        active: true,
        importedAt: serverTimestamp()
      });
    }

  await setDoc(doc(db, "saasAccess", normalizedClanTag), {
    status: "active",
    allowedOnboarding: false,
    onboardingComplete: true,
    consumedAt: serverTimestamp(),
    ownerUid: user.uid,
    ownerName: nome,
    buyerName: nome,
    adminName: nome,
    onboardingName: nome,
    ownerEmail: email,
    buyerEmail: email,
    plan,
    planLabel: planLabel(plan),
    planStartedAt: Timestamp.fromDate(startedAt),
    planExpiresAt: Timestamp.fromDate(expiresAt),
    updatedAt: serverTimestamp()
  }, { merge:true });

  localStorage.setItem("topbrs_user_uid", user.uid);
  localStorage.setItem("topbrs_clan_tag", normalizedClanTag);
  window.location.href = "dashboard.html";
};



function normalizeMemberTag(value){
  const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  return cleaned.startsWith("#") ? cleaned : (cleaned ? `#${cleaned}` : "");
}
function cleanMemberTag(value){
  return normalizeMemberTag(value).replace("#", "");
}

// ========================================
// 🔐 VERIFICAR PRÉ-CADASTRO DO MEMBRO
// ========================================
window.checkMemberPreRegistration = async function ({ clanTag, playerTag }) {
  const normalizedClanTag = normalizeMemberTag(clanTag);
  const cleanClanId = cleanSaasClanTag(normalizedClanTag);
  const normalizedPlayerTag = normalizeMemberTag(playerTag);
  const memberId = cleanMemberTag(normalizedPlayerTag);

  if(!normalizedClanTag){
    return { allowed:false, message:"Clã não identificado. Busque o clã antes de cadastrar." };
  }

  if(!memberId){
    return { allowed:false, message:"Tag do jogador inválida." };
  }

  const clanIds = [...new Set([normalizedClanTag, cleanClanId].filter(Boolean))];
  const memberIds = [...new Set([memberId, normalizedPlayerTag].filter(Boolean))];

  let foundSnap = null;

  for(const cId of clanIds){
    for(const mId of memberIds){
      try{
        const snap = await getDoc(doc(db, "clans", cId, "members", mId));
        if(snap.exists()){
          foundSnap = snap;
          break;
        }
      }catch(error){
        console.warn("Falha ao consultar membro pré-cadastrado:", cId, mId, error);
      }
    }
    if(foundSnap) break;
  }

  // Fallback: se o docId foi salvo de outra forma, procura pelo campo tag/playerTag.
  if(!foundSnap){
    for(const cId of clanIds){
      try{
        const listSnap = await getDocs(collection(db, "clans", cId, "members"));
        for(const d of listSnap.docs){
          const data = d.data() || {};
          const savedTag = cleanMemberTag(data.tag || data.playerTag || d.id);
          if(savedTag === memberId){
            foundSnap = d;
            break;
          }
        }
      }catch(error){
        console.warn("Falha ao varrer pré-cadastro:", cId, error);
      }
      if(foundSnap) break;
    }
  }

  if(!foundSnap){
    return {
      allowed:false,
      message:"Sua tag não está pré-cadastrada neste clã. Fale com a liderança."
    };
  }

  const member = foundSnap.data() || {};

  if(member.removed || member.active === false){
    return {
      allowed:false,
      message:"Sua tag consta como removida/inativa neste clã."
    };
  }

  if(member.linkedUserUid){
    return {
      allowed:false,
      message:"Esta tag já está vinculada a outro cadastro."
    };
  }

  return { allowed:true, member };
};


// ========================================
// 👤 CADASTRO MEMBRO
// ========================================
window.registerUser = async function ({ email, senha, playerTag, clanTag: providedClanTag = '', nome = '', nick = '' }) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    const clanTag = normalizeMemberTag(providedClanTag || localStorage.getItem("selectedClan") || localStorage.getItem("topbrs_clan_tag"));

    if (!clanTag) {
      await signOut(auth);
      throw new Error("Clã não identificado.");
    }

    const precheck = await window.checkMemberPreRegistration({ clanTag, playerTag });

    if(!precheck.allowed){
      await signOut(auth);
      throw new Error(precheck.message || "Tag não autorizada para cadastro.");
    }

    const memberId = cleanMemberTag(playerTag);
    const member = precheck.member || {};

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      nome: nome || member.name || nick || "",
      nick: nick || member.name || "",
      email,
      playerTag: normalizeMemberTag(playerTag),
      clanTag,
      role: member.role || "member",
      active: true,
      createdAt: serverTimestamp()
    });

    await setDoc(doc(db, "clans", clanTag, "members", memberId), {
      linkedUserUid: user.uid,
      linkedEmail: email,
      linkedAt: serverTimestamp(),
      name: member.name || nick || nome || "",
      tag: normalizeMemberTag(playerTag),
      active: true
    }, { merge:true });

    localStorage.setItem("topbrs_user_uid", user.uid);
    localStorage.setItem("topbrs_clan_tag", clanTag);

    window.location.href = "dashboard.html";

  } catch (error) {
    alert(error.message);
  }
};


// ========================================
// 🔐 LOGIN
// ========================================
window.loginUser = async function ({ email, senha }) {
  const userCredential = await signInWithEmailAndPassword(auth, email, senha);
  const user = userCredential.user;

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists()) {
    await signOut(auth);
    throw new Error("Usuário não encontrado no sistema.");
  }

  const userData = userSnap.data();

  if (!userData.active || !userData.clanTag) {
    await signOut(auth);
    throw new Error("Acesso bloqueado. Fale com o administrador.");
  }

  try{
    const accessData = await assertActiveSubscription(userData.clanTag);
    userData.plan = accessData.plan || userData.plan;
    userData.planExpiresAt = accessData.planExpiresAt || userData.planExpiresAt;
  }catch(error){
    await signOut(auth);
    showPlanExpiredPopup();
    return;
  }

  const clanSnap = await getDoc(doc(db, "clans", userData.clanTag));

  if (!clanSnap.exists() || !clanSnap.data()?.active) {
    await signOut(auth);
    throw new Error("Clã inativo ou não encontrado.");
  }

  localStorage.setItem("topbrs_user", JSON.stringify(userData));
  localStorage.setItem("topbrs_clan", JSON.stringify(clanSnap.data()));

  window.location.href = "dashboard.html";
};

window.logoutUser = async function () {
  localStorage.removeItem("topbrs_user");
  localStorage.removeItem("topbrs_clan");
  localStorage.removeItem("topbrs_user_uid");
  localStorage.removeItem("topbrs_clan_tag");

  await signOut(auth);
  window.location.href = "index.html";
};
