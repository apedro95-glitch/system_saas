import { db } from "./firebase-config.js";
import {
  doc, getDoc, setDoc, collection, getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export const API_BASE_URL = "https://delight-rom-bookstore-relaxation.trycloudflare.com";

export function normalizeClanTag(value){
  const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g,"");
  return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
}
export function cleanTag(value){ return normalizeClanTag(value).replace("#",""); }
export function formatNumber(value){ return Number(value || 0).toLocaleString("pt-BR"); }

export function getStoredUser(){ try{return JSON.parse(localStorage.getItem("topbrs_user")||"{}")}catch{return {}} }
export function getStoredClan(){ try{return JSON.parse(localStorage.getItem("topbrs_clan")||"{}")}catch{return {}} }
export function getCurrentClanTag(){
  const u=getStoredUser(), c=getStoredClan();
  return u.clanTag || c.clanTag || c.tag || localStorage.getItem("selectedClan") || localStorage.getItem("topbrs_clan_tag") || "";
}

export async function fetchClanFromApi(tag){
  const res = await fetch(`${API_BASE_URL}/api/clan/${encodeURIComponent(cleanTag(tag))}`, {cache:"no-store"});
  const data = await res.json();
  if(!res.ok || !data.ok || !data.clan) throw new Error(data?.message || "Clã não encontrado.");
  return data.clan;
}
export async function fetchMembersFromApi(tag){
  const res = await fetch(`${API_BASE_URL}/api/clan/${encodeURIComponent(cleanTag(tag))}/members`, {cache:"no-store"});
  const data = await res.json();
  if(!res.ok || !data.ok) throw new Error(data?.message || "Membros não encontrados.");
  return Array.isArray(data.members) ? data.members : [];
}
export function mapClan(apiClan){
  return {
    clanTag: apiClan.tag,
    tag: apiClan.tag,
    name: apiClan.name || "Clã",
    badge: apiClan.badgeUrls?.medium || apiClan.badgeUrls?.large || apiClan.badgeUrls?.small || "assets/icons/clan.svg",
    members: apiClan.members || apiClan.memberList?.length || 0,
    trophies: apiClan.clanScore || 0,
    clanWarTrophies: apiClan.clanWarTrophies || 0,
    location: apiClan.location?.name || "Não informado"
  };
}
export function mapMember(m){
  return {
    name:m.name||"Membro",
    tag:m.tag||"",
    role:m.role||"member",
    trophies:m.trophies||0,
    donations:m.donations||0,
    donationsReceived:m.donationsReceived||0,
    expLevel:m.expLevel||0,
    clanRank:m.clanRank||0,
    previousClanRank:m.previousClanRank||0,
    lastSeen:m.lastSeen||"",
    active:true,
    removed:false
  };
}

export async function loadClan(){
  const tag=getCurrentClanTag(), local=getStoredClan();
  if(!tag) return local;
  try{
    const snap=await getDoc(doc(db,"clans",tag));
    if(snap.exists()){ const c=snap.data(); localStorage.setItem("topbrs_clan",JSON.stringify(c)); return c; }
  }catch(e){ console.warn(e); }
  return local;
}
export async function loadMembers(){
  const tag=getCurrentClanTag();
  if(!tag) return [];
  try{
    const snap=await getDocs(query(collection(db,"clans",tag,"members"), orderBy("trophies","desc")));
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){ console.warn(e); return []; }
}
export async function syncClanAndMembersFromApi(){
  const tag=getCurrentClanTag();
  if(!tag) throw new Error("Clã não identificado.");
  const apiClan=await fetchClanFromApi(tag);
  const clan=mapClan(apiClan);
  await setDoc(doc(db,"clans",clan.clanTag), {...clan, syncedAt:serverTimestamp()}, {merge:true});
  const apiMembers=await fetchMembersFromApi(tag);
  const live=new Set();
  for(const raw of apiMembers){
    const member=mapMember(raw); const id=cleanTag(member.tag || member.name);
    if(!id) continue; live.add(id);
    await setDoc(doc(db,"clans",clan.clanTag,"members",id), {...member, syncedAt:serverTimestamp()}, {merge:true});
  }
  const old=await getDocs(collection(db,"clans",clan.clanTag,"members"));
  for(const d of old.docs){
    if(!live.has(d.id)) await setDoc(doc(db,"clans",clan.clanTag,"members",d.id), {active:false, removed:true, removedAt:serverTimestamp()}, {merge:true});
  }
  localStorage.setItem("topbrs_clan", JSON.stringify(clan));
  return {clan, members:apiMembers.map(mapMember)};
}
export function roleLabel(role){
  const v=String(role||"member").toLowerCase();
  if(v==="leader"||v==="admin") return "Líder";
  if(v==="coleader"||v==="co-leader") return "Co-líder";
  if(v==="elder") return "Ancião";
  return "Membro";
}
export function roleIcon(role){
  const l=roleLabel(role);
  if(l==="Líder") return "perm-admin.svg";
  if(l==="Co-líder") return "perm-co-leader.svg";
  if(l==="Ancião") return "perm-member.svg";
  return "perm-visitor.svg";
}
export function periodLabelNow(){
  const now=new Date();
  const months=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const shorts=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const week=Math.min(4, Math.max(1, Math.ceil(now.getDate()/7)));
  return {month:months[now.getMonth()], short:shorts[now.getMonth()], week, label:`${months[now.getMonth()]} • Semana ${week}`, weekCode:`S${week}`};
}
export function warWindowState(){
  const now=new Date(), day=now.getDay(), min=now.getHours()*60+now.getMinutes(), start=6*60+41;
  const active=(day===4||day===5||day===6||day===0) && min>=start;
  return {active, status: active ? "EM ANDAMENTO" : "FORA DA JANELA", attacksUsed:0, fame:0};
}
