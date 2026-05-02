import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const publicPages = ["index.html", "subscribe.html", "", "/"];
function guardToDate(value){ if(!value) return null; if(value?.toDate) return value.toDate(); if(value?.seconds) return new Date(value.seconds*1000); const d=new Date(value); return Number.isNaN(d.getTime())?null:d; }
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
  let accessData = {};
  try{ const accessSnap = await getDoc(doc(db, "saasAccess", userData.clanTag)); if(accessSnap.exists()) accessData = accessSnap.data(); }catch{}
  const sub = {...(clanSnap.exists()?clanSnap.data():{}), ...accessData};
  const expiresAt = guardToDate(sub.planExpiresAt || sub.expiresAt);
  const status = String(sub.status || sub.subscriptionStatus || 'active').toLowerCase();
  if(status === 'blocked' || status === 'expired' || status === 'revoked' || (expiresAt && expiresAt <= new Date())){
    await signOut(auth);
    localStorage.setItem('topbrs_plan_expired','1');
    location.href = 'index.html?expired=1';
    return;
  }

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
