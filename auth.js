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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";



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
  const locked = Boolean(data.onboardingComplete || data.ownerUid || data.active);

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
  const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    nome,
    email,
    playerTag,
    clanTag,
    role: "admin",
    active: true,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, "clans", clanTag), {
      clanTag,
      name: clanName || clanData?.name || "Clã TopBRS",
      badge: clanData?.badge || null,
      badgeId: clanData?.badgeId || null,
      members: clanData?.members || 0,
      trophies: clanData?.trophies || null,
      location: clanData?.location || null,
      countryCode: clanData?.countryCode || null,
      countryFlag: clanData?.countryFlag || null,
      active: true,
      onboardingComplete: true,
      onboardingCompletedAt: serverTimestamp(),
      ownerUid: user.uid,
      ownerEmail: email,
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

  localStorage.setItem("topbrs_user_uid", user.uid);
  localStorage.setItem("topbrs_clan_tag", clanTag);
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
  const normalizedPlayerTag = normalizeMemberTag(playerTag);
  const memberId = cleanMemberTag(normalizedPlayerTag);

  if(!normalizedClanTag){
    return { allowed:false, message:"Clã não identificado. Busque o clã antes de cadastrar." };
  }

  if(!memberId){
    return { allowed:false, message:"Tag do jogador inválida." };
  }

  const memberSnap = await getDoc(doc(db, "clans", normalizedClanTag, "members", memberId));

  if(!memberSnap.exists()){
    return {
      allowed:false,
      message:"Sua tag não está pré-cadastrada neste clã. Fale com a liderança."
    };
  }

  const member = memberSnap.data() || {};

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
window.registerUser = async function ({ email, senha, playerTag, nome = '', nick = '' }) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    const clanTag = normalizeMemberTag(localStorage.getItem("selectedClan") || localStorage.getItem("topbrs_clan_tag"));

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
