import { db } from "./firebase-config.js";
import { syncClanAndMembersFromApi } from './real-data.js';
import { isCurrentUserMember, getAvatarForMember } from "./identity.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

let membersData = [];
let activeRole = "all";
const MEMBERS_FALLBACK = {
  'pt-BR': {'members.title':'Membros','members.subtitle':'Lista de membros do clã.','members.search':'Buscar membro...','members.sync':'Sincronizar membros','members.member':'Membro','members.coLeader':'Co-líder','members.elder':'Ancião','members.leader':'Líder'},
  'en-US': {'members.title':'Members','members.subtitle':'Clan member list.','members.search':'Search member...','members.sync':'Sync members','members.member':'Member','members.coLeader':'Co-leader','members.elder':'Elder','members.leader':'Leader'},
  'es-ES': {'members.title':'Miembros','members.subtitle':'Lista de miembros del clan.','members.search':'Buscar miembro...','members.sync':'Sincronizar miembros','members.member':'Miembro','members.coLeader':'Colíder','members.elder':'Veterano','members.leader':'Líder'}
};
function currentLang(){ return window.TopBRSI18n?.getLanguage?.() || localStorage.getItem('topbrs_language') || 'pt-BR'; }
function tr(key, vars={}){
  const lang=currentLang();
  let text = window.TopBRSI18n?.t ? window.TopBRSI18n.t(key, vars) : key;
  if(text === key) text = MEMBERS_FALLBACK[lang]?.[key] || MEMBERS_FALLBACK['pt-BR']?.[key] || key;
  Object.entries(vars||{}).forEach(([k,v])=>{ text=String(text).replaceAll(`{{${k}}}`,v); });
  return text;
}
function refreshMembersHeader(){
 const h=document.querySelector('.members-header h1');
 const p=document.querySelector('.members-header p');
 const count=document.querySelector('#membersCount');
 const search=document.querySelector('#memberSearch');
 const sync=document.querySelector('.members-sync-btn');
 if(h) h.textContent=tr('members.title');
 if(p) p.textContent=tr('members.subtitle');
 if(count) count.textContent = `${membersData.length || 0} ${tr('members.title').toLowerCase()}`;
 if(search) search.placeholder=tr('members.search');
 if(sync) sync.setAttribute('aria-label', tr('members.sync'));
}


function normalizeRole(role){
  const value = String(role || "member").toLowerCase();

  if(value === "leader") return "admin";
  if(value === "coLeader" || value === "coleader" || value === "co-leader") return "co-leader";
  if(value === "elder") return "elder";

  return "member";
}

function roleLabel(role){
  const key = normalizeRole(role);

  if(key === "admin") return tr('members.leader');
  if(key === "co-leader") return tr('members.coLeader');
  if(key === "elder") return tr('members.elder');

  return tr('members.member');
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
    list.innerHTML = `<div class="empty-members">${tr('common.loadingMembers')}</div>`;
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
        avatar: data.avatar || "",
        current: isCurrentUserMember({ ...data, id: docSnap.id }),
        perm: permissionIcon(key)
      };
    });

    renderMembers();

  }catch(error){
    console.error("Erro ao carregar membros:", error);

    if(list){
      list.innerHTML = `<div class="empty-members">${tr('members.loadError')}</div>`;
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
    counter.textContent = tr('members.count',{count:membersData.length});
  }

  if(!filtered.length){
    list.innerHTML = `<div class="empty-members">${tr('members.noMembers')}</div>`;
    return;
  }

  list.innerHTML = filtered.map(member=>`
    <article class="member-row ${member.current ? "current-member" : ""}">
      <div class="member-avatar">
        <img src="${getAvatarForMember(member)}" alt="" aria-hidden="true">
      </div>

      <div class="member-info">
        <strong>${member.name}${member.current ? ` <em class="you-badge">${tr('common.you')}</em>` : ''}</strong>
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

function refreshMemberFilterTexts(){
 const modal=document.querySelector('#memberFilterOverlay');
 if(!modal) return;
 const eyebrow=modal.querySelector('.modal-eyebrow'); if(eyebrow) eyebrow.textContent=tr('members.filter');
 const title=modal.querySelector('h2'); if(title) title.textContent=tr('members.filterTitle');
 const keys=['members.all','members.admin','members.coLeader','members.elder','members.member'];
 modal.querySelectorAll('.member-filter-options button').forEach((b,i)=>{ if(keys[i]) b.textContent=tr(keys[i]); });
}
refreshMembersHeader(); refreshMemberFilterTexts();
window.addEventListener('topbrs:languagechange',()=>{ refreshMembersHeader(); refreshMemberFilterTexts(); renderMembers(); });
