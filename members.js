import {
  loadMembers, syncClanAndMembersFromApi, roleLabel, roleIcon, formatNumber
} from "./real-data.js";

let membersData = [];
let activeRole = "all";

function normalizeRoleKey(role){
  const label = roleLabel(role);
  if(label === "Líder") return "admin";
  if(label === "Co-líder") return "co-leader";
  if(label === "Ancião") return "elder";
  return "member";
}

async function loadMembersFromFirestore(){
  const list = document.querySelector("#membersList");
  if(list) list.innerHTML = `<div class="empty-members">Carregando membros...</div>`;

  membersData = (await loadMembers())
    .filter(m => !m.removed)
    .map(m => ({
      ...m,
      roleText: roleLabel(m.role),
      roleKey: normalizeRoleKey(m.role),
      perm: roleIcon(m.role)
    }));

  renderMembers();
}

function renderMembers(){
  const list = document.querySelector("#membersList");
  if(!list) return;

  const search = (document.querySelector("#memberSearch")?.value || "").toLowerCase().trim();
  const filtered = membersData.filter(m => {
    const text = `${m.name} ${m.tag} ${m.roleText}`.toLowerCase();
    const roleOk = activeRole === "all" || m.roleKey === activeRole;
    return roleOk && text.includes(search);
  });

  const count = document.querySelector("#membersCount");
  if(count) count.textContent = `${membersData.length} membros`;

  if(!filtered.length){
    list.innerHTML = `<div class="empty-members">Nenhum membro encontrado</div>`;
    return;
  }

  list.innerHTML = filtered.map(m => `
    <article class="member-row">
      <div class="member-avatar">
        <img src="assets/icons/profile-user.svg" alt="" aria-hidden="true">
      </div>

      <div class="member-info">
        <strong>${m.name || "Membro"}</strong>
        <span>${m.roleText} • ${m.tag || ""}</span>
      </div>

      <img class="member-perm" src="assets/icons/${m.perm}" alt="${m.roleText}">

      <div class="member-trophies">
        <strong>${formatNumber(m.trophies || 0)}</strong>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 4h8v3.2a4 4 0 0 1-8 0V4Z" fill="currentColor"/>
          <path d="M6 4h2v2.2A2.8 2.8 0 0 1 5.2 9H4V6a2 2 0 0 1 2-2Z" fill="currentColor" opacity=".72"/>
          <path d="M18 4h-2v2.2A2.8 2.8 0 0 0 18.8 9H20V6a2 2 0 0 0-2-2Z" fill="currentColor" opacity=".72"/>
          <rect x="10.2" y="13" width="3.6" height="3.2" rx=".7" fill="currentColor"/>
          <rect x="7.4" y="16" width="9.2" height="2.2" rx="1" fill="currentColor"/>
        </svg>
      </div>
    </article>
  `).join("");
}

document.querySelector("#memberSearch")?.addEventListener("input", renderMembers);

document.querySelector("#memberFilterBtn")?.addEventListener("click", ()=>{
  document.body.classList.add("modal-open");
  document.documentElement.classList.add("modal-open");
  document.querySelector("#memberFilterOverlay")?.classList.add("show");
});

function closeMemberFilter(){
  document.querySelector("#memberFilterOverlay")?.classList.remove("show");
  document.body.classList.remove("modal-open");
  document.documentElement.classList.remove("modal-open");
}

document.querySelector("#closeMemberFilter")?.addEventListener("click", closeMemberFilter);
document.querySelector("#memberFilterOverlay")?.addEventListener("click", event=>{
  if(event.target.id === "memberFilterOverlay") closeMemberFilter();
});

document.querySelectorAll(".member-filter-options button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    activeRole = btn.dataset.role;
    document.querySelectorAll(".member-filter-options button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    renderMembers();
    closeMemberFilter();
  });
});

document.querySelector(".members-sync-btn")?.addEventListener("click", async ()=>{
  const btn = document.querySelector(".members-sync-btn");
  btn.classList.add("spinning");
  btn.disabled = true;
  try{
    await syncClanAndMembersFromApi();
    await loadMembersFromFirestore();
  }catch(error){
    alert("Erro ao sincronizar membros: " + error.message);
  }finally{
    setTimeout(()=>btn.classList.remove("spinning"), 450);
    btn.disabled = false;
  }
});

loadMembersFromFirestore();
