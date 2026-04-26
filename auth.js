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

// CADASTRO ADMIN
window.createAdminAccount = async function ({ nome, nick, email, senha, clanTag }) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
  const user = userCredential.user;

  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    nome,
    nick,
    email,
    clanTag,
    role: "admin",
    active: true,
    createdAt: serverTimestamp()
  });

  await setDoc(doc(db, "clans", clanTag), {
    clanTag,
    name: "Os Brabos BR",
    ownerUid: user.uid,
    active: true,
    createdAt: serverTimestamp()
  });

  window.location.href = "dashboard.html";
};

// LOGIN
window.loginUser = async function ({ email, senha }) {
  const userCredential = await signInWithEmailAndPassword(auth, email, senha);
  const user = userCredential.user;

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists()) {
    alert("Usuário sem cadastro no sistema.");
    return;
  }

  const userData = userSnap.data();

  if (!userData.active || !userData.clanTag) {
    alert("Acesso bloqueado. Fale com o administrador.");
    return;
  }

  window.location.href = "dashboard.html";
};
