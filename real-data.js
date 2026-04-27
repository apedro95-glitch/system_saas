import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export function normalizeClanTag(value){
  const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g,"");
  return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
}

export function formatNumber(value){
  return Number(value || 0).toLocaleString("pt-BR");
}

export function getStoredUser(){
  try { return JSON.parse(localStorage.getItem("topbrs_user") || "{}"); }
  catch { return {}; }
}

export function getStoredClan(){
  try { return JSON.parse(localStorage.getItem("topbrs_clan") || "{}"); }
  catch { return {}; }
}

export function getCurrentClanTag(){
  const user = getStoredUser();
  const clan = getStoredClan();
  return user.clanTag || clan.clanTag || localStorage.getItem("selectedClan") || localStorage.getItem("topbrs_clan_tag") || "";
}

export async function loadClan(){
  const tag = getCurrentClanTag();
  const localClan = getStoredClan();

  if(!tag){
    return localClan || {};
  }

  try{
    const snap = await getDoc(doc(db, "clans", tag));
    if(snap.exists()){
      const data = snap.data();
      localStorage.setItem("topbrs_clan", JSON.stringify(data));
      return data;
    }
  }catch(error){
    console.warn("Não foi possível carregar clã:", error);
  }

  return localClan || {};
}

export async function loadMembers(){
  const tag = getCurrentClanTag();
  if(!tag) return [];

  try{
    const snap = await getDocs(query(collection(db, "clans", tag, "members"), orderBy("trophies", "desc")));
    return snap.docs.map((docSnap)=>({ id: docSnap.id, ...docSnap.data() }));
  }catch(error){
    console.warn("Não foi possível carregar membros:", error);
    return [];
  }
}

export function getRoleLabel(role){
  const value = String(role || "member").toLowerCase();
  if(value === "leader" || value === "admin") return "Líder";
  if(value === "coleader" || value === "co-leader" || value === "coLeader") return "Co-líder";
  if(value === "elder") return "Ancião";
  return "Membro";
}

export function getRealWarState(){
  // Janela real: quinta 06:41 até sexta 06:41; repete sexta, sábado e domingo.
  // Fora dessas janelas, não puxamos treino/pré-guerra e mantemos números zerados.
  const now = new Date();
  const day = now.getDay(); // 0 dom, 4 qui, 5 sex, 6 sab
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = 6 * 60 + 41;

  const isWarDay = day === 4 || day === 5 || day === 6 || day === 0;
  const isInsideWindow = isWarDay && minutes >= start;

  const active = isInsideWindow;
  return {
    active,
    status: active ? "Em andamento" : "Fora da janela",
    attacksUsed: 0,
    fame: 0,
    dayLabel: active ? ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"][day] : "",
  };
}

export function applyClanHeader(clan){
  const name = clan?.name || "TopBRS";
  const tag = clan?.clanTag || clan?.tag || "#ABC123";
  const badge = clan?.badge || "assets/icons/clan.svg";

  document.querySelectorAll("[data-clan-name]").forEach(el => el.textContent = name);
  document.querySelectorAll("[data-clan-tag]").forEach(el => el.textContent = tag);
  document.querySelectorAll("[data-clan-badge]").forEach(img => {
    img.src = badge;
    img.onerror = () => { img.src = "assets/icons/clan.svg"; };
  });
}
