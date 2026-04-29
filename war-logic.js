import { db } from "./firebase-config.js";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  API_BASE_URL,
  cleanTag,
  getCurrentClanTag,
  loadMembers,
  formatNumber
} from "./real-data.js";

const WAR_START_MINUTE = 6 * 60 + 41;
const WAR_DAYS = ["D1","D2","D3","D4"];

function pad(n){ return String(n).padStart(2, "0"); }

function mondayOfWeek(date){
  const d = new Date(date);
  const day = d.getDay(); // 0 dom
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoDate(date){
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
}

export function getWarWeekContext(now = new Date()){
  const monday = mondayOfWeek(now);
  const thursday = addDays(monday, 3);
  thursday.setHours(6, 41, 0, 0);

  const nextMondayEnd = addDays(monday, 7);
  nextMondayEnd.setHours(6, 41, 0, 0);

  let warStart = thursday;
  let warEnd = nextMondayEnd;

  // Se ainda não abriu a janela desta semana, usamos a última guerra válida.
  if(now < warStart){
    const previousMonday = addDays(monday, -7);
    warStart = addDays(previousMonday, 3);
    warStart.setHours(6,41,0,0);
    warEnd = addDays(previousMonday, 7);
    warEnd.setHours(6,41,0,0);
  }

  /*
    Regra de virada de mês:
    A guerra pertence ao mês/semana da data em que o D1 fecha.
    Exemplo: começa 30/04 06:41 e D1 fecha 01/05 06:41 => Maio S1.
    Isso corrige todos os meses em que a última quinta cruza para o mês seguinte.
  */
  const referenceDate = addDays(warStart, 1);
  referenceDate.setHours(12,0,0,0);

  const monthNumber = referenceDate.getMonth() + 1;
  const week = Math.min(4, Math.max(1, Math.ceil(referenceDate.getDate() / 7)));
  const monthKey = `${referenceDate.getFullYear()}-${pad(monthNumber)}`;
  const weekKey = `S${week}`;
  const warId = `${monthKey}_${weekKey}`;

  let dayIndex = -1;
  if(now >= warStart && now < warEnd){
    dayIndex = Math.floor((now - warStart) / (24 * 60 * 60 * 1000));
  }

  return {
    active: dayIndex >= 0 && dayIndex < 4,
    warId,
    monthKey,
    weekKey,
    referenceDate,
    warStart,
    warEnd,
    dayIndex,
    dayKey: dayIndex >= 0 && dayIndex < 4 ? WAR_DAYS[dayIndex] : null,
    dayLabel: dayIndex >= 0 && dayIndex < 4 ? `Dia ${dayIndex + 1}` : "Fora da janela",
    label: `${monthKey} • ${weekKey}`,
  };
}

export async function fetchRiverRaceFromApi(clanTag){
  const endpoints = [
    `${API_BASE_URL}/api/clan/${encodeURIComponent(cleanTag(clanTag))}/riverrace`,
    `${API_BASE_URL}/api/clan/${encodeURIComponent(cleanTag(clanTag))}/war`,
    `${API_BASE_URL}/api/clan/${encodeURIComponent(cleanTag(clanTag))}/currentriverrace`
  ];

  for(const url of endpoints){
    try{
      const res = await fetch(url, { cache:"no-store" });
      if(!res.ok) continue;
      const data = await res.json();
      if(data?.ok && (data.riverRace || data.war || data.data)){
        return data.riverRace || data.war || data.data;
      }
      if(data?.clan?.participants || data?.participants || data?.clanParticipants){
        return data;
      }
    }catch(error){
      console.warn("Endpoint guerra indisponível:", url, error);
    }
  }

  return null;
}

function extractParticipants(riverRace){
  if(!riverRace) return [];
  return (
    riverRace.clan?.participants ||
    riverRace.participants ||
    riverRace.clanParticipants ||
    riverRace.currentRiverRace?.clan?.participants ||
    []
  );
}

function normalizeParticipant(raw){
  const attacksUsed =
    Number(raw.decksUsedToday ?? raw.attacksUsedToday ?? raw.boatAttacksToday ?? raw.attacks ?? 0);

  const weeklyAttacks =
    Number(raw.decksUsed ?? raw.attacksUsed ?? raw.totalAttacks ?? attacksUsed);

  return {
    tag: raw.tag || raw.playerTag || "",
    name: raw.name || "Membro",
    attacksToday: Math.max(0, Math.min(4, attacksUsed)),
    weeklyAttacks: Math.max(0, Math.min(16, weeklyAttacks)),
    fame: Number(raw.fame || raw.repairPoints || raw.boatPoints || 0),
    raw
  };
}

function emptyWarMember(member){
  return {
    tag: member.tag || member.id || "",
    name: member.name || "Membro",
    role: member.role || "member",
    avatar: member.avatar || "",
    days: {
      D1:{ attacks:0, fame:0 },
      D2:{ attacks:0, fame:0 },
      D3:{ attacks:0, fame:0 },
      D4:{ attacks:0, fame:0 }
    },
    weeklyAttacks:0,
    attackPoints:0,
    bonusPoints:0,
    warPoints:0,
    tournamentPoints:0,
    generalPoints:0,
    completed:false
  };
}

export async function loadWarHistory(clanTag, monthKey, weekKey){
  const ref = doc(db, "clans", clanTag, "warHistory", monthKey, "weeks", weekKey);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function saveWarHistory(clanTag, ctx, membersMap){
  const warMembers = Object.values(membersMap);
  const totalAttacks = warMembers.reduce((sum,m)=>sum + (m.weeklyAttacks || 0), 0);
  const totalFame = warMembers.reduce((sum,m)=>sum + (m.days?.D1?.fame || 0) + (m.days?.D2?.fame || 0) + (m.days?.D3?.fame || 0) + (m.days?.D4?.fame || 0), 0);

  const ref = doc(db, "clans", clanTag, "warHistory", ctx.monthKey, "weeks", ctx.weekKey);
  const payload = {
    warId: ctx.warId,
    monthKey: ctx.monthKey,
    weekKey: ctx.weekKey,
    warStart: ctx.warStart.toISOString(),
    warEnd: ctx.warEnd.toISOString(),
    currentDayKey: ctx.dayKey,
    totalAttacks,
    totalFame,
    updatedAt: serverTimestamp(),
    members: membersMap
  };

  await setDoc(ref, payload, { merge:true });
  return payload;
}

export async function saveMemberScores(clanTag, ctx, membersMap){
  for(const member of Object.values(membersMap)){
    const memberId = cleanTag(member.tag || member.name);
    if(!memberId) continue;

    await setDoc(doc(db, "clans", clanTag, "members", memberId), {
      warPoints: member.warPoints || 0,
      attackPoints: member.attackPoints || 0,
      warBonusPoints: member.bonusPoints || 0,
      generalPoints: member.generalPoints || member.warPoints || 0,
      currentWar: {
        monthKey: ctx.monthKey,
        weekKey: ctx.weekKey,
        days: member.days,
        weeklyAttacks: member.weeklyAttacks,
        completed: member.completed
      },
      updatedAt: serverTimestamp()
    }, { merge:true });
  }
}

export async function syncWarSilently(){
  const clanTag = getCurrentClanTag();
  if(!clanTag) return null;

  const ctx = getWarWeekContext(new Date());
  const members = (await loadMembers()).filter(m=>!m.removed);
  const previous = await loadWarHistory(clanTag, ctx.monthKey, ctx.weekKey);

  const membersMap = {};

  for(const m of members){
    const id = cleanTag(m.tag || m.id || m.name);
    if(!id) continue;
    membersMap[id] = {
      ...emptyWarMember(m),
      ...(previous?.members?.[id] || {})
    };
    membersMap[id].tag = m.tag || membersMap[id].tag;
    membersMap[id].name = m.name || membersMap[id].name;
    membersMap[id].role = m.role || membersMap[id].role;
    membersMap[id].avatar = m.avatar || membersMap[id].avatar || "";
  }

  const riverRace = ctx.active ? await fetchRiverRaceFromApi(clanTag) : null;
  const participants = extractParticipants(riverRace).map(normalizeParticipant);

  if(ctx.active && ctx.dayKey){
    for(const p of participants){
      const id = cleanTag(p.tag || p.name);
      if(!id || !membersMap[id]) continue;

      const existing = membersMap[id].days?.[ctx.dayKey]?.attacks || 0;
      const attacksToday = Math.max(existing, p.attacksToday || 0);

      membersMap[id].days[ctx.dayKey] = {
        attacks: attacksToday,
        fame: Math.max(membersMap[id].days?.[ctx.dayKey]?.fame || 0, p.fame || 0),
      };

      membersMap[id].weeklyAttacks = Math.max(
        membersMap[id].weeklyAttacks || 0,
        p.weeklyAttacks || Object.values(membersMap[id].days).reduce((sum,d)=>sum + (d.attacks || 0),0)
      );
    }
  }

  for(const member of Object.values(membersMap)){
    const attacksByDays = Object.values(member.days || {}).reduce((sum,d)=>sum + (d.attacks || 0),0);
    // A pontuação semanal deve ser a soma das janelas salvas. Evita dados fantasmas quando não há API de guerra.
    member.weeklyAttacks = attacksByDays;
    member.attackPoints = Math.min(16, member.weeklyAttacks);
    member.completed = member.weeklyAttacks >= 16;
    member.bonusPoints = member.completed ? 3 : 0;
    member.warPoints = member.attackPoints + member.bonusPoints;
    member.tournamentPoints = member.tournamentPoints || 0;
    member.generalPoints = member.warPoints + member.tournamentPoints;
  }

  const history = await saveWarHistory(clanTag, ctx, membersMap);
  await saveMemberScores(clanTag, ctx, membersMap);

  localStorage.setItem("topbrs_last_war_sync", String(Date.now()));
  localStorage.setItem("topbrs_current_war", JSON.stringify({
    monthKey: ctx.monthKey,
    weekKey: ctx.weekKey,
    dayKey: ctx.dayKey,
    active: ctx.active,
    syncedAt: Date.now()
  }));

  return history;
}

export async function loadCurrentWarForUi(){
  const clanTag = getCurrentClanTag();
  if(!clanTag) return { ctx:getWarWeekContext(), members:{} };
  const ctx = getWarWeekContext(new Date());
  const history = await loadWarHistory(clanTag, ctx.monthKey, ctx.weekKey);
  return { ctx, members: history?.members || {}, history };
}

export function getMemberWarPoints(member){
  return Number(member?.warPoints || member?.generalPoints || 0);
}

export function getDailyAttackDots(member, dayKey){
  const attacks = Number(member?.days?.[dayKey]?.attacks || 0);
  return Math.max(0, Math.min(4, attacks));
}
