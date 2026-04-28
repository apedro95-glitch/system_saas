import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function parseJSON(key){
  try{
    return JSON.parse(localStorage.getItem(key) || "{}");
  }catch{
    return {};
  }
}

const user = parseJSON("topbrs_user");
const clan = parseJSON("topbrs_clan");
const uid = localStorage.getItem("topbrs_user_uid") || user.uid || "";
const clanTag = localStorage.getItem("topbrs_clan_tag") || user.clanTag || clan.clanTag || clan.tag || "";

const avatarOptions = [
  "assets/icons/profile-user.svg",
  "assets/icons/perm-admin.svg",
  "assets/icons/perm-co-leader.svg",
  "assets/icons/perm-member.svg",
  "assets/icons/perm-visitor.svg",
  "assets/icons/clan.svg"
];

const userAvatar = document.querySelector("#userAvatar");
const settingsNick = document.querySelector("#settingsNick");
const settingsMeta = document.querySelector("#settingsMeta");
const settingsClan = document.querySelector("#settingsClan");
const settingsClanTag = document.querySelector("#settingsClanTag");

function roleLabel(role){
  const value = String(role || "member").toLowerCase();
  if(value === "admin" || value === "leader") return "Admin";
  if(value === "coleader" || value === "co-leader") return "Co-líder";
  if(value === "elder") return "Ancião";
  return "Membro";
}

async function hydrateSettings(){
  let profile = {...user};
  let clanData = {...clan};

  if(uid){
    try{
      const snap = await getDoc(doc(db, "users", uid));
      if(snap.exists()){
        profile = {...profile, ...snap.data()};
        localStorage.setItem("topbrs_user", JSON.stringify(profile));
      }
    }catch(error){
      console.warn("Perfil offline:", error);
    }
  }

  if(clanTag){
    try{
      const snap = await getDoc(doc(db, "clans", clanTag));
      if(snap.exists()){
        clanData = {...clanData, ...snap.data()};
        localStorage.setItem("topbrs_clan", JSON.stringify(clanData));
      }
    }catch(error){
      console.warn("Clã offline:", error);
    }
  }

  const savedAvatar = profile.avatar || localStorage.getItem("topbrs_avatar") || "assets/icons/profile-user.svg";

  userAvatar.src = savedAvatar;
  settingsNick.textContent = profile.nome || profile.nick || profile.name || profile.email || "Usuário";
  settingsMeta.textContent = `${roleLabel(profile.role)} • ${profile.playerTag || "sem tag"}`;
  settingsClan.textContent = clanData.name || "TopBRS";
  settingsClanTag.textContent = clanData.clanTag || clanData.tag || clanTag || "#ABC123";

  const plan = profile.plan || clanData.plan || "Premium";
  const planEl = document.querySelector("#settingsPlan");
  if(planEl) planEl.textContent = plan;

  const exp = profile.planExpiresAt || clanData.planExpiresAt || "";
  const expEl = document.querySelector("#settingsExpire");
  if(expEl){
    expEl.textContent = exp ? `Expira em: ${exp}` : "Expiração pendente";
  }
}

function openAvatarPicker(){
  const overlay = document.querySelector("#avatarPickerOverlay");
  const grid = document.querySelector("#avatarPickerGrid");

  grid.innerHTML = avatarOptions.map(src=>`
    <button type="button" class="avatar-choice" data-src="${src}">
      <img src="${src}" alt="">
    </button>
  `).join("");

  grid.querySelectorAll(".avatar-choice").forEach(btn=>{
    btn.addEventListener("click", ()=>selectAvatar(btn.dataset.src));
  });

  document.body.classList.add("modal-open");
  document.documentElement.classList.add("modal-open");
  overlay.classList.add("show");
}

function closeAvatarPicker(){
  const overlay = document.querySelector("#avatarPickerOverlay");
  overlay.classList.remove("show");
  document.body.classList.remove("modal-open");
  document.documentElement.classList.remove("modal-open");
}

async function selectAvatar(src){
  userAvatar.src = src;
  localStorage.setItem("topbrs_avatar", src);

  if(uid){
    try{
      await setDoc(doc(db, "users", uid), {
        avatar: src,
        updatedAt: serverTimestamp()
      }, { merge:true });
    }catch(error){
      console.warn("Avatar salvo apenas localmente:", error);
    }
  }

  closeAvatarPicker();
}

document.querySelector("#openAvatarPicker")?.addEventListener("click", openAvatarPicker);
document.querySelector("#closeAvatarPicker")?.addEventListener("click", closeAvatarPicker);
document.querySelector("#avatarPickerOverlay")?.addEventListener("click", event=>{
  if(event.target.id === "avatarPickerOverlay") closeAvatarPicker();
});

document.querySelector("#themeToggle")?.addEventListener("click", ()=>{
  document.body.classList.toggle("theme-soft-light");
});

document.querySelector("#logoutSettings")?.addEventListener("click", ()=>{
  if(typeof logoutUser === "function") logoutUser();
  else window.location.href = "index.html";
});

hydrateSettings();
