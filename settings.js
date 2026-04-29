import {
  parseLocalJSON,
  findCurrentMemberProfile,
  saveAvatarEverywhere
} from "./identity.js";

const avatarOptions = ["assets/avatars/._avatar-1.webp", "assets/avatars/._avatar-2.webp", "assets/avatars/._avatar-3.webp", "assets/avatars/._avatar-4.webp", "assets/avatars/._avatar-5.webp", "assets/avatars/._avatar-6.webp", "assets/avatars/._avatar-7.webp", "assets/avatars/._avatar-8.webp", "assets/avatars/avatar-1.webp", "assets/avatars/avatar-2.webp", "assets/avatars/avatar-3.webp", "assets/avatars/avatar-4.webp", "assets/avatars/avatar-5.webp", "assets/avatars/avatar-6.webp", "assets/avatars/avatar-7.webp", "assets/avatars/avatar-8.webp"];

const clan = parseLocalJSON("topbrs_clan");
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
  const profile = await findCurrentMemberProfile();
  const clanData = parseLocalJSON("topbrs_clan");

  const savedAvatar = profile.avatar || localStorage.getItem("topbrs_avatar") || avatarOptions[0] || "assets/icons/profile-user.svg";

  userAvatar.src = savedAvatar;
  settingsNick.textContent = profile.displayName || profile.nick || profile.name || profile.nome || profile.email || "Usuário";
  settingsMeta.textContent = `${roleLabel(profile.role)} • ${profile.playerTag || "sem tag"}`;
  settingsClan.textContent = clanData.name || clan.name || "TopBRS";
  settingsClanTag.textContent = clanData.clanTag || clanData.tag || clan.clanTag || clan.tag || "#ABC123";

  const plan = profile.plan || clanData.plan || "Premium";
  const planEl = document.querySelector("#settingsPlan");
  if(planEl) planEl.textContent = plan;

  const exp = profile.planExpiresAt || clanData.planExpiresAt || "";
  const expEl = document.querySelector("#settingsExpire");
  if(expEl) expEl.textContent = exp ? `Expira em: ${exp}` : "Expiração pendente";
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

  try{
    await saveAvatarEverywhere(src);
  }catch(error){
    console.warn("Avatar salvo localmente. Firestore indisponível:", error);
    localStorage.setItem("topbrs_avatar", src);
  }

  window.dispatchEvent(new CustomEvent("topbrs:avatar-updated", { detail: { src } }));
  closeAvatarPicker();
}

document.querySelector("#openAvatarPicker")?.addEventListener("click", openAvatarPicker);
document.querySelector("#closeAvatarPicker")?.addEventListener("click", closeAvatarPicker);
document.querySelector("#avatarPickerOverlay")?.addEventListener("click", event=>{
  if(event.target.id === "avatarPickerOverlay") closeAvatarPicker();
});

document.querySelector("#themeToggle")?.addEventListener("click", ()=>{
  const current = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = current;
  localStorage.setItem("topbrs_theme", current);
});

const savedTheme = localStorage.getItem("topbrs_theme");
if(savedTheme) document.documentElement.dataset.theme = savedTheme;

document.querySelector("#logoutSettings")?.addEventListener("click", ()=>{
  if(typeof logoutUser === "function") logoutUser();
  else window.location.href = "index.html";
});

hydrateSettings();
