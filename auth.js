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


// =============================
// CADASTRO MEMBRO
// =============================
window.registerUser = async function ({ email, senha, playerTag }) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // 🔥 valida se existe algum clã com esse player
    const clanTag = localStorage.getItem("selectedClan"); // do onboarding

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


// =============================
// LOGIN
// =============================
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
