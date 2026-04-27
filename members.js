import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let membersData = [];
let activeRole = "all";

function normalizeRole(role){
  const value = String(role || "member").toLowerCase();

  if(value === "leader") return "admin";
  if(value === "coLeader" || value === "coleader" || value === "co-leader") return "co-leader";
  if(value === "elder") return "elder";

  return "member";
}

function roleLabel(role){
  const key = normalizeRole(role);

  if(key === "admin") return "Líder";
  if(key === "co-leader") return "Co-líder";
  if(key === "elder") return "Ancião";

  return "Membro";
}

function permissionIcon(role){
  const key = normalizeRole(role);

  if(key === "admin") return "perm-admin.svg";
  if(key === "co-leader") return "perm-co-leader.svg";
  if(key === "elder") return "perm-member.svg";

  return "perm-visitor.svg";
}

function formatNumber(value){
  return Number(value || 0).toLocaleString("pt-BR");
}

function getCurrentClanTag(){
  try{
    const user = JSON.parse(localStorage.getItem("topbrs_user") || "{}");
    const clan = JSON.parse(localStorage.getItem("topbrs_clan") || "{}");

    return user.clanTag || clan.clanTag || localStorage.getItem("selectedClan") || localStorage.getItem("topbrs_clan_tag");
  }catch(error){
    return localStorage.getItem("selectedClan") || localStorage.getItem("topbrs_clan_tag");
  }
}

async function loadMembersFromFirestore(){
  const list = document.querySelector("#membersList");

  if(list){
    list.innerHTML = `<div class="empty-members">Carregando membros...</div>`;
  }

  const clanTag = getCurrentClanTag();

  if(!clanTag){
    if(list){
      list.innerHTML = `<div class="empty-members">Clã não identificado.</div>`;
    }
    return;
  }

  try{
    const membersRef = collection(db, "clans", clanTag, "members");
    const snap = await getDocs(query(membersRef, orderBy("trophies", "desc")));

    membersData = snap.docs.map((docSnap)=>{
      const data = docSnap.data();
      const key = normalizeRole(data.role);

      return {
        name: data.name || "Membro",
        tag: data.tag || docSnap.id,
        role: roleLabel(key),
        key,
        trophies: data.trophies || 0,
        current: false,
        perm: permissionIcon(key)
      };
    });

    renderMembers();

  }catch(error){
    console.error("Erro ao carregar membros:", error);

    if(list){
      list.innerHTML = `<div class="empty-members">Erro ao carregar membros reais.</div>`;
    }
  }
}

function renderMembers(){
  const list = document.querySelector("#membersList");
  const search = (document.querySelector("#memberSearch")?.value || "").toLowerCase().trim();

  if(!list) return;

  const filtered = membersData.filter(member=>{
    const matchSearch =
      member.name.toLowerCase().includes(search) ||
      member.role.toLowerCase().includes(search) ||
      member.tag.toLowerCase().includes(search);

    const matchRole = activeRole === "all" || member.key === activeRole;

    return matchSearch && matchRole;
  });

  const counter = document.querySelector("#membersCount");
  if(counter){
    counter.textContent = `${membersData.length} membros`;
  }

  if(!filtered.length){
    list.innerHTML = `<div class="empty-members">Nenhum membro encontrado</div>`;
    return;
  }

  list.innerHTML = filtered.map(member=>`
    <article class="member-row ${member.current ? "current-member" : ""}">
      <div class="member-avatar">
        <img src="assets/icons/profile-user.svg" alt="" aria-hidden="true">
      </div>

      <div class="member-info">
        <strong>${member.name}</strong>
        <span>${member.role} • ${member.tag}</span>
      </div>

      <img class="member-perm" src="assets/icons/${member.perm}" alt="${member.role}">

      <div class="member-trophies">
        <strong>${formatNumber(member.trophies)}</strong>
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

  await loadMembersFromFirestore();

  setTimeout(()=>btn.classList.remove("spinning"), 650);
});

loadMembersFromFirestore();
