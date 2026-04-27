import { auth, db } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
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
window.createClanAdmin = async function ({ nome, email, senha, playerTag, clanTag }) {
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
    name: "Clã TopBRS",
    ownerUid: user.uid,
    active: true,
    createdAt: serverTimestamp()
  });

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
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) {
      alert("Usuário não encontrado.");
      return;
    }

    window.location.href = "dashboard.html";

  } catch (error) {
    alert("Erro no login: " + error.message);
  }
};
