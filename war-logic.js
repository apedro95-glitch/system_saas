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
  getApiBaseUrl,
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
  const apiBaseUrl = await getApiBaseUrl();
  const endpoints = [
    `${apiBaseUrl}/api/clan/${encodeURIComponent(cleanTag(clanTag))}/currentriverrace`,
    `${apiBaseUrl}/api/war/${encodeURIComponent(cleanTag(clanTag))}`,
    `${apiBaseUrl}/api/clan/%23${encodeURIComponent(cleanTag(clanTag))}/currentriverrace`,
    `${apiBaseUrl}/api/war/%23${encodeURIComponent(cleanTag(clanTag))}`
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
    riverRace.riverRace?.clan?.participants ||
    riverRace.data?.clan?.participants ||
    riverRace.participants ||
    riverRace.clanParticipants ||
    riverRace.currentRiverRace?.clan?.participants ||
    []
  );
}

function firstNumber(...values){
  for(const value of values){
    if(value === undefined || value === null || value === "") continue;
    const n = Number(value);
    if(Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeParticipant(raw){
  const attacksToday = firstNumber(
    raw.decksUsedToday,
    raw.attacksUsedToday,
    raw.boatAttacksToday,
    raw.attacksToday
  ) ?? 0;

  const weeklyAttacks = firstNumber(
    raw.decksUsed,
    raw.attacksUsed,
    raw.totalAttacks,
    raw.decksUsedTotal,
    attacksToday
  ) ?? attacksToday;

  /*
    Na API do River Race, o campo mais comum de fame é acumulado da semana atual.
    Alguns endpoints customizados podem expor fame diária em campos próprios.
    Mantemos os dois conceitos separados para não somar o acumulado semanal em cada dia.
  */
  const weeklyFame = firstNumber(
    raw.weeklyFame,
    raw.totalFame,
    raw.fame,
    raw.repairPoints,
    raw.boatPoints,
    raw.clanScore
  ) ?? 0;

  const dailyFame = firstNumber(
    raw.fameToday,
    raw.dailyFame,
    raw.fameEarnedToday,
    raw.repairPointsToday,
    raw.boatPointsToday,
    raw.clanScoreToday
  );

  return {
    tag: raw.tag || raw.playerTag || "",
    name: raw.name || "Membro",
    attacksToday: Math.max(0, Math.min(4, attacksToday)),
    weeklyAttacks: Math.max(0, Math.min(16, weeklyAttacks)),
    weeklyFame: Math.max(0, weeklyFame),
    dailyFame: dailyFame === null ? null : Math.max(0, dailyFame),
    fame: Math.max(0, weeklyFame),
    raw
  };
}

function safeDayRecord(day){
  return {
    attacks: Math.max(0, Number(day?.attacks || 0)),
    fame: Math.max(0, Number(day?.fame || 0))
  };
}

function ensureDays(days){
  return {
    D1: safeDayRecord(days?.D1),
    D2: safeDayRecord(days?.D2),
    D3: safeDayRecord(days?.D3),
    D4: safeDayRecord(days?.D4)
  };
}

function normalizeStoredDailyFame(days, weeklyFame = null){
  const normalized = ensureDays(days);
  const values = WAR_DAYS.map(dayKey=>Number(normalized[dayKey]?.fame || 0));
  const sum = values.reduce((a,b)=>a+b,0);
  const max = Math.max(...values, 0);
  const target = Number(weeklyFame || 0);

  /*
    Correção de histórico antigo:
    versões anteriores podiam salvar o fame acumulado semanal dentro de D1/D2/D3/D4.
    Quando isso acontece, a soma dos dias explode. Se os valores parecem cumulativos,
    convertemos para deltas por dia sem apagar o histórico.
  */
  const looksCumulative = target > 0 && sum > target * 1.15 && max <= target * 1.10;
  if(looksCumulative){
    let previous = 0;
    WAR_DAYS.forEach((dayKey, index)=>{
      const current = values[index];
      normalized[dayKey].fame = Math.max(0, current - previous);
      previous = Math.max(previous, current);
    });
  }

  return normalized;
}

function sumDaysFame(days){
  return WAR_DAYS.reduce((sum, dayKey)=>sum + Number(days?.[dayKey]?.fame || 0), 0);
}

function sumDaysAttacks(days){
  return WAR_DAYS.reduce((sum, dayKey)=>sum + Number(days?.[dayKey]?.attacks || 0), 0);
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
    weeklyFame:0,
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
  const totalFame = warMembers.reduce((sum,m)=>sum + Number(m.weeklyFame ?? sumDaysFame(m.days)), 0);
  const dayTotals = WAR_DAYS.reduce((acc, dayKey)=>{
    acc[dayKey] = {
      attacks: warMembers.reduce((sum,m)=>sum + Number(m.days?.[dayKey]?.attacks || 0), 0),
      fame: warMembers.reduce((sum,m)=>sum + Number(m.days?.[dayKey]?.fame || 0), 0)
    };
    return acc;
  }, {});

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
    dayTotals,
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
        weeklyFame: member.weeklyFame || 0,
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
    membersMap[id].days = normalizeStoredDailyFame(membersMap[id].days, membersMap[id].weeklyFame);
    membersMap[id].weeklyFame = Number(membersMap[id].weeklyFame || sumDaysFame(membersMap[id].days));
  }

  const riverRace = ctx.active ? await fetchRiverRaceFromApi(clanTag) : null;
  const participants = extractParticipants(riverRace).map(normalizeParticipant);

  if(ctx.active && ctx.dayKey){
    for(const p of participants){
      const id = cleanTag(p.tag || p.name);
      if(!id || !membersMap[id]) continue;

      membersMap[id].days = normalizeStoredDailyFame(membersMap[id].days, membersMap[id].weeklyFame || p.weeklyFame);

      const existing = Number(membersMap[id].days?.[ctx.dayKey]?.attacks || 0);
      const attacksToday = Math.max(existing, p.attacksToday || 0);

      const currentDayIndex = Math.max(0, WAR_DAYS.indexOf(ctx.dayKey));
      const previousDaysFame = WAR_DAYS
        .slice(0, currentDayIndex)
        .reduce((sum,dayKey)=>sum + Number(membersMap[id].days?.[dayKey]?.fame || 0),0);

      const apiWeeklyFame = Number(p.weeklyFame || p.fame || 0);
      let currentDayFame = 0;

      /*
        Regra crítica da aba Dia:
        - se o membro não atacou na janela diária atual, a fame do dia deve ser 0;
        - se atacou, a fame diária vem do campo diário da API quando existir;
        - caso a API só exponha fame semanal acumulada, calculamos o delta:
          fame semanal atual - soma das janelas anteriores da semana.
        Importante: substituímos o valor salvo do dia atual, em vez de fazer Math.max,
        porque versões anteriores podiam ter salvo fame semanal dentro do dia.
      */
      if(attacksToday > 0){
        if(p.dailyFame !== null && p.dailyFame !== undefined){
          currentDayFame = Number(p.dailyFame || 0);
        }else{
          currentDayFame = Math.max(0, apiWeeklyFame - previousDaysFame);
        }
      }

      membersMap[id].days[ctx.dayKey] = {
        attacks: attacksToday,
        fame: Math.max(0, currentDayFame),
      };

      membersMap[id].apiWeeklyFame = apiWeeklyFame;
      membersMap[id].weeklyFame = apiWeeklyFame > 0
        ? apiWeeklyFame
        : Math.max(sumDaysFame(membersMap[id].days), Number(membersMap[id].weeklyFame || 0));

      // Corrige histórico antigo sem deixar a soma dos dias inflar a pontuação semanal.
      membersMap[id].days = normalizeStoredDailyFame(membersMap[id].days, membersMap[id].weeklyFame);

      membersMap[id].weeklyAttacks = Math.max(
        membersMap[id].weeklyAttacks || 0,
        p.weeklyAttacks || sumDaysAttacks(membersMap[id].days)
      );
    }
  }

  if(ctx.active && ctx.dayKey){
    for(const member of Object.values(membersMap)){
      const todayAttacks = Number(member.days?.[ctx.dayKey]?.attacks || 0);
      if(todayAttacks <= 0 && member.days?.[ctx.dayKey]){
        member.days[ctx.dayKey].fame = 0;
      }
    }
  }

  for(const member of Object.values(membersMap)){
    member.days = normalizeStoredDailyFame(member.days, member.weeklyFame);
    const attacksByDays = sumDaysAttacks(member.days);
    const fameByDays = sumDaysFame(member.days);
    member.weeklyFame = Number(member.apiWeeklyFame || 0) > 0
      ? Number(member.apiWeeklyFame || 0)
      : Math.max(Number(member.weeklyFame || 0), fameByDays);
    // A pontuação semanal é a soma das janelas salvas.
    // Se a API trouxe um valor maior e a janela atual está ativa, preserva o maior valor para não zerar ataques reais.
    member.weeklyAttacks = Math.max(attacksByDays, Number(member.weeklyAttacks || 0));
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
