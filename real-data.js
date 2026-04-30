import { db } from "./firebase-config.js";
import { getApiBaseUrl, getApiBaseCandidates } from "./api-config.js?v=saas-refresh-persist-1";
import {
  doc, getDoc, setDoc, collection, getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export { getApiBaseUrl, getApiBaseCandidates };

export function normalizeClanTag(value){
  const cleaned = String(value || "").trim().toUpperCase().replace(/\s+/g,"");
  if(!cleaned) return "";
  return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
}
export function cleanTag(value){ return normalizeClanTag(value).replace("#",""); }
export function formatNumber(value){ return Number(value || 0).toLocaleString("pt-BR"); }

export function getStoredUser(){ try{return JSON.parse(localStorage.getItem("topbrs_user")||"{}")}catch{return {}} }
export function getStoredClan(){ try{return JSON.parse(localStorage.getItem("topbrs_clan")||"{}")}catch{return {}} }
export function getStoredMembers(){
  try{
    const cached = JSON.parse(localStorage.getItem("topbrs_members") || "[]");
    return Array.isArray(cached) ? cached : [];
  }catch{
    return [];
  }
}
export function setStoredMembers(members){
  localStorage.setItem("topbrs_members", JSON.stringify(members || []));
}
export function getCurrentClanTag(){
  const u=getStoredUser(), c=getStoredClan();
  return normalizeClanTag(u.clanTag || c.clanTag || c.tag || localStorage.getItem("selectedClan") || localStorage.getItem("topbrs_clan_tag") || "");
}

function uniqueUrls(urls){
  return [...new Set((urls || []).filter(Boolean).map(u=>String(u).replace(/\/+$/, "")))];
}

export async function fetchClanFromApi(tag){
  const cleaned = cleanTag(tag);
  const urls = [];
  for(const base of uniqueUrls(await getApiBaseCandidates())){
    urls.push(`${base}/api/clan/${encodeURIComponent(cleaned)}`);
    urls.push(`${base}/api/clan/%23${encodeURIComponent(cleaned)}`);
  }

  let lastError = null;
  for(const url of uniqueUrls(urls)){
    try{
      const res = await fetch(url, {cache:"no-store", headers:{Accept:"application/json"}});
      const data = await res.json();
      const clan =
        (data?.ok === true && data?.clan) ? data.clan :
        data?.clan || data?.data?.clan || data?.data ||
        ((data?.tag || data?.name || data?.memberList) ? data : null);
      if(res.ok && clan) return clan;
      lastError = new Error(data?.message || data?.reason || `HTTP ${res.status}`);
    }catch(error){
      lastError = error;
    }
  }
  throw lastError || new Error("Clã não encontrado.");
}

export async function fetchMembersFromApi(tag){
  const cleaned = cleanTag(tag);
  const urls = [];
  for(const base of uniqueUrls(await getApiBaseCandidates())){
    urls.push(`${base}/api/clan/${encodeURIComponent(cleaned)}/members`);
    urls.push(`${base}/api/clan/%23${encodeURIComponent(cleaned)}/members`);
  }

  for(const url of uniqueUrls(urls)){
    try{
      const res = await fetch(url, {cache:"no-store", headers:{Accept:"application/json"}});
      if(!res.ok) continue;
      const data = await res.json();
      if(Array.isArray(data)) return data;
      if(Array.isArray(data?.members)) return data.members;
      if(Array.isArray(data?.memberList)) return data.memberList;
      if(Array.isArray(data?.clan?.memberList)) return data.clan.memberList;
      if(Array.isArray(data?.data?.memberList)) return data.data.memberList;
    }catch(error){
      console.warn("Endpoint members indisponível:", url, error);
    }
  }

  // Fallback confiável: a rota /api/clan já traz memberList em vários backends.
  const clan = await fetchClanFromApi(tag);
  return Array.isArray(clan?.memberList) ? clan.memberList : [];
}
export function mapClan(apiClan){
  return {
    clanTag: normalizeClanTag(apiClan.tag),
    tag: normalizeClanTag(apiClan.tag),
    name: apiClan.name || "Clã",
    badge: apiClan.badgeUrls?.medium || apiClan.badgeUrls?.large || apiClan.badgeUrls?.small || "assets/icons/clan.svg",
    badgeId: apiClan.badgeId || null,
    members: apiClan.members || apiClan.memberList?.length || 0,
    trophies: apiClan.clanScore || 0,
    clanScore: apiClan.clanScore || 0,
    clanWarTrophies: apiClan.clanWarTrophies || 0,
    donationsPerWeek: apiClan.donationsPerWeek || 0,
    requiredTrophies: apiClan.requiredTrophies || 0,
    location: apiClan.location?.name || "Não informado",
    raw: apiClan
  };
}
export function mapMember(m){
  return {
    name:m.name||"Membro",
    tag:normalizeClanTag(m.tag||""),
    role:m.role||"member",
    trophies:Number(m.trophies||0),
    donations:Number(m.donations||0),
    donationsReceived:Number(m.donationsReceived||0),
    expLevel:Number(m.expLevel||0),
    clanRank:Number(m.clanRank||0),
    previousClanRank:Number(m.previousClanRank||0),
    lastSeen:m.lastSeen||"",
    arena:m.arena || null,
    clanChestPoints:Number(m.clanChestPoints||0),
    active:true,
    removed:false,
    raw:m
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
export async function loadMembers({ preferApi = false } = {}){
  const tag=getCurrentClanTag();
  const cached=getStoredMembers();
  if(!tag) return cached;

  if(preferApi){
    try{
      const sync = await syncClanAndMembersFromApi();
      return sync.members || [];
    }catch(e){ console.warn("API preferida indisponível, usando cache/Firestore:", e); }
  }

  try{
    const snap=await getDocs(query(collection(db,"clans",tag,"members"), orderBy("trophies","desc")));
    const members=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(members.length){
      setStoredMembers(members);
      return members;
    }
  }catch(e){ console.warn(e); }

  if(cached.length) return cached;

  try{
    const apiMembers = await fetchMembersFromApi(tag);
    const members = apiMembers.map(mapMember).sort((a,b)=>(b.trophies||0)-(a.trophies||0));
    setStoredMembers(members);
    return members;
  }catch(e){
    console.warn(e);
    return [];
  }
}

function monthWeekIds(now=new Date()){
  const y=now.getFullYear();
  const m=String(now.getMonth()+1).padStart(2,"0");
  const week=Math.min(4, Math.max(1, Math.ceil(now.getDate()/7)));
  return { monthId:`${y}-${m}`, weekId:`S${week}` };
}

async function saveRankSnapshots(clanTag, clan, members){
  const {monthId, weekId} = monthWeekIds();
  const donationRanking = [...members].sort((a,b)=>(b.donations||0)-(a.donations||0)).map((m,idx)=>({
    position:idx+1, tag:m.tag, name:m.name, donations:m.donations||0, donationsReceived:m.donationsReceived||0
  }));
  const generalRanking = [...members].sort((a,b)=>(b.generalPoints||b.warPoints||b.trophies||0)-(a.generalPoints||a.warPoints||a.trophies||0)).map((m,idx)=>({
    position:idx+1, tag:m.tag, name:m.name, points:Number(m.generalPoints||m.warPoints||0), trophies:m.trophies||0
  }));
  await setDoc(doc(db,"clans",clanTag,"rankings",monthId), {
    monthId,
    clanTag,
    clanName:clan.name,
    donationRanking,
    generalRanking,
    updatedAt:serverTimestamp()
  }, {merge:true});
  await setDoc(doc(db,"clans",clanTag,"rankings",monthId,"weeks",weekId), {
    monthId,
    weekId,
    donationRanking,
    generalRanking,
    updatedAt:serverTimestamp()
  }, {merge:true});
}

export async function syncClanAndMembersFromApi(){
  const tag=getCurrentClanTag();
  if(!tag) throw new Error("Clã não identificado.");
  const apiClan=await fetchClanFromApi(tag);
  const clan=mapClan(apiClan);
  const clanTag=normalizeClanTag(clan.clanTag || tag);
  await setDoc(doc(db,"clans",clanTag), {...clan, active:true, syncedAt:serverTimestamp(), updatedAt:serverTimestamp()}, {merge:true});
  const apiMembers=await fetchMembersFromApi(clanTag);
  const live=new Set();
  const mappedMembers = apiMembers.map(mapMember).sort((a,b)=>(b.trophies||0)-(a.trophies||0));
  for(const member of mappedMembers){
    const id=cleanTag(member.tag || member.name);
    if(!id) continue; live.add(id);
    await setDoc(doc(db,"clans",clanTag,"members",id), {...member, syncedAt:serverTimestamp(), updatedAt:serverTimestamp()}, {merge:true});
  }
  try{
    const old=await getDocs(collection(db,"clans",clanTag,"members"));
    for(const d of old.docs){
      if(!live.has(d.id)) await setDoc(doc(db,"clans",clanTag,"members",d.id), {active:false, removed:true, removedAt:serverTimestamp(), updatedAt:serverTimestamp()}, {merge:true});
    }
  }catch(error){ console.warn("Não foi possível marcar removidos:", error); }
  await saveRankSnapshots(clanTag, clan, mappedMembers);
  localStorage.setItem("topbrs_clan", JSON.stringify(clan));
  localStorage.setItem("topbrs_clan_tag", clanTag);
  setStoredMembers(mappedMembers);
  localStorage.setItem("topbrs_last_full_sync", String(Date.now()));
  return {clan, members:mappedMembers};
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
export function getRealWarState(){ return warWindowState(); }
export function applyClanHeader(clan){
  document.querySelectorAll('[data-clan-name], .dash-clan strong').forEach(el=>el.textContent=clan?.name||'TopBRS');
  document.querySelectorAll('[data-clan-tag], .dash-clan span').forEach(el=>el.textContent=clan?.clanTag||clan?.tag||'#ABC123');
  document.querySelectorAll('[data-clan-badge], [data-dashboard-clan-badge]').forEach(img=>{ if(img?.tagName==='IMG') img.src=clan?.badge||'assets/icons/clan.svg'; });
}
