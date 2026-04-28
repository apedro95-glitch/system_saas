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
      ownerUid: user.uid,
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


// ========================================
// 👤 CADASTRO MEMBRO
// ========================================
window.registerUser = async function ({ email, senha, playerTag }) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    const clanTag = localStorage.getItem("selectedClan");

    if (!clanTag) {
      alert("Clã não identificado.");
      return;
    }

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email,
      playerTag,
      clanTag,
      role: "member",
      active: true,
      createdAt: serverTimestamp()
    });

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
