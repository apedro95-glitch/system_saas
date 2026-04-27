import { db } from "./firebase-config.js";
import {
  doc, getDoc, setDoc, collection, getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export const API_BASE_URL = "https://delight-rom-bookstore-relaxation.trycloudflare.com";

export function normalizeClanTag(value){
  const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g,"");
  return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
}

export function cleanTag(value){
  return normalizeClanTag(value).replace("#", "");
}

export function formatNumber(value){
  return Number(value || 0).toLocaleString("pt-BR");
}

export function getStoredUser(){
  try { return JSON.parse(localStorage.getItem("topbrs_user") || "{}"); } catch { return {}; }
}

export function getStoredClan(){
  try { return JSON.parse(localStorage.getItem("topbrs_clan") || "{}"); } catch { return {}; }
}

export function getCurrentClanTag(){
  const user = getStoredUser();
  const clan = getStoredClan();
  return user.clanTag || clan.clanTag || clan.tag || localStorage.getItem("selectedClan") || localStorage.getItem("topbrs_clan_tag") || "";
}

export async function fetchClanFromApi(tag){
  const response = await fetch(`${API_BASE_URL}/api/clan/${encodeURIComponent(cleanTag(tag))}`, { cache: "no-store" });
  const data = await response.json();
  if(!response.ok || !data.ok || !data.clan){
    throw new Error(data?.message || data?.details?.reason || "Clã não encontrado.");
  }
  return data.clan;
}

export async function fetchMembersFromApi(tag){
  const response = await fetch(`${API_BASE_URL}/api/clan/${encodeURIComponent(cleanTag(tag))}/members`, { cache: "no-store" });
  const data = await response.json();
  if(!response.ok || !data.ok){
    throw new Error(data?.message || "Não foi possível buscar membros.");
  }
  return Array.isArray(data.members) ? data.members : [];
}

export function mapApiClan(apiClan){
  return {
    clanTag: apiClan.tag,
    tag: apiClan.tag,
    name: apiClan.name || "Clã encontrado",
    badge: apiClan.badgeUrls?.medium || apiClan.badgeUrls?.large || apiClan.badgeUrls?.small || "assets/icons/clan.svg",
    members: apiClan.members || apiClan.memberList?.length || 0,
    trophies: apiClan.clanScore || 0,
    clanWarTrophies: apiClan.clanWarTrophies || 0,
    location: apiClan.location?.name || "Não informado",
    raw: apiClan
  };
}

export function mapApiMember(m){
  return {
    name: m.name || "Membro",
    tag: m.tag || "",
    role: m.role || "member",
    trophies: m.trophies || 0,
    donations: m.donations || 0,
    donationsReceived: m.donationsReceived || 0,
    expLevel: m.expLevel || 0,
    clanRank: m.clanRank || 0,
    previousClanRank: m.previousClanRank || 0,
    lastSeen: m.lastSeen || "",
    active: true
  };
}

export async function loadClan(){
  const tag = getCurrentClanTag();
  const local = getStoredClan();
  if(!tag) return local;
  try{
    const snap = await getDoc(doc(db, "clans", tag));
    if(snap.exists()){
      const data = snap.data();
      localStorage.setItem("topbrs_clan", JSON.stringify(data));
      return data;
    }
  }catch(error){ console.warn("loadClan Firestore:", error); }
  return local;
}

export async function loadMembers(){
  const tag = getCurrentClanTag();
  if(!tag) return [];
  try{
    const snap = await getDocs(query(collection(db, "clans", tag, "members"), orderBy("trophies", "desc")));
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  }catch(error){
    console.warn("loadMembers Firestore:", error);
    return [];
  }
}

export async function syncClanAndMembersFromApi(){
  const tag = getCurrentClanTag();
  if(!tag) throw new Error("Clã não identificado.");

  const apiClan = await fetchClanFromApi(tag);
  const clan = mapApiClan(apiClan);

  await setDoc(doc(db, "clans", clan.clanTag), {
    ...clan,
    syncedAt: serverTimestamp()
  }, { merge:true });

  const apiMembers = await fetchMembersFromApi(tag);
  const liveTags = new Set();

  for(const raw of apiMembers){
    const member = mapApiMember(raw);
    const id = cleanTag(member.tag || member.name);
    if(!id) continue;
    liveTags.add(id);

    await setDoc(doc(db, "clans", clan.clanTag, "members", id), {
      ...member,
      removed: false,
      syncedAt: serverTimestamp()
    }, { merge:true });
  }

  // Marca expulsos/removidos sem apagar ainda, para futura área em Configurações.
  const current = await getDocs(collection(db, "clans", clan.clanTag, "members"));
  for(const docSnap of current.docs){
    if(!liveTags.has(docSnap.id)){
      await setDoc(doc(db, "clans", clan.clanTag, "members", docSnap.id), {
        active: false,
        removed: true,
        removedAt: serverTimestamp()
      }, { merge:true });
    }
  }

  localStorage.setItem("topbrs_clan", JSON.stringify(clan));
  return { clan, members: apiMembers.map(mapApiMember) };
}

export function roleLabel(role){
  const value = String(role || "member").toLowerCase();
  if(value === "leader" || value === "admin") return "Líder";
  if(value === "coleader" || value === "co-leader" || value === "coleader") return "Co-líder";
  if(value === "elder") return "Ancião";
  return "Membro";
}

export function roleIcon(role){
  const label = roleLabel(role);
  if(label === "Líder") return "perm-admin.svg";
  if(label === "Co-líder") return "perm-co-leader.svg";
  if(label === "Ancião") return "perm-member.svg";
  return "perm-visitor.svg";
}

export function periodLabelNow(){
  const now = new Date();
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const week = Math.min(4, Math.max(1, Math.ceil(now.getDate()/7)));
  return { month: months[now.getMonth()], week, label: `${months[now.getMonth()]} • Semana ${week}` };
}

export function warWindowState(){
  // Regra solicitada: não contar treino/pré-guerra.
  // Janelas reais começam 06:41 de quinta, sexta, sábado e domingo; cada janela dura 24h.
  const now = new Date();
  const day = now.getDay(); // 0 dom, 4 qui, 5 sex, 6 sáb
  const startMin = 6*60 + 41;
  const min = now.getHours()*60 + now.getMinutes();
  const warDay = day === 4 || day === 5 || day === 6 || day === 0;
  const active = warDay && min >= startMin;
  const p = periodLabelNow();
  return {
    active,
    status: active ? "Em andamento" : "Fora da janela",
    attacksUsed: 0,
    fame: 0,
    period: p.label,
    dayName: ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"][day]
  };
}
