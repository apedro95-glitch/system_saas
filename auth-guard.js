import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const publicPages = ["index.html", "", "/"];
const page = location.pathname.split("/").pop();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (!publicPages.includes(page)) location.href = "index.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));

  if (!userSnap.exists()) {
    await signOut(auth);
    location.href = "index.html";
    return;
  }

  const userData = userSnap.data();

  if (!userData.active || !userData.clanTag) {
    await signOut(auth);
    location.href = "index.html";
    return;
  }

  const clanSnap = await getDoc(doc(db, "clans", userData.clanTag));

  if (!clanSnap.exists() || !clanSnap.data().active) {
    await signOut(auth);
    location.href = "index.html";
    return;
  }

  localStorage.setItem("topbrs_user", JSON.stringify(userData));
  localStorage.setItem("topbrs_clan", JSON.stringify(clanSnap.data()));

  if (publicPages.includes(page)) {
    location.href = "dashboard.html";
  }
});
