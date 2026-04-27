import { loadMembers, warWindowState, formatNumber, periodLabelNow } from "./real-data.js";

let warMembers = [];
let activeWarTab = "members";

function dots(n){
  return '<div class="attack-dots">'+[0,1,2,3].map(i=>`<i class="${i<n?'done':''}"></i>`).join('')+'</div>';
}

function setupPeriods(){
  const p = periodLabelNow();
  const periodTop = document.querySelector("#warPeriodLabel");
  if(periodTop){
    periodTop.innerHTML = `<strong>${p.month}</strong><span>Semana ${p.week}</span>`;
  }
  const block = document.querySelector("#warBlockPeriod");
  if(block) block.textContent = p.label;
}

function applyWarBlock(){
  const state = warWindowState();
  const total = warMembers.length * 16;

  const status = document.querySelector("#warStatusPill");
  const label = status?.querySelector("b");
  status?.classList.remove("state-current","state-finished","state-future","em","final","future");
  status?.classList.add(state.active ? "em" : "final");
  if(label) label.textContent = state.status.toUpperCase();

  const attacks = document.querySelector("#warAttacksUsed");
  if(attacks) attacks.textContent = `${state.attacksUsed} / ${total}`;

  const fame = document.querySelector("#warBlockFame");
  if(fame) fame.innerHTML = `✦ ${formatNumber(state.fame)}`;

  const bar = document.querySelector("#warBlockProgressBar");
  if(bar) bar.style.width = total ? `${Math.min(100, (state.attacksUsed/total)*100)}%` : "0%";

  const day = document.querySelector("#warBlockDay");
  if(day){
    day.hidden = activeWarTab !== "attacks";
    day.textContent = state.dayName;
  }
}

function renderWarList(){
  const head = document.querySelector("#warTableHead");
  const list = document.querySelector("#warList");
  if(!head || !list) return;

  if(activeWarTab === "members"){
    head.innerHTML = `<span>Membro</span><span>Ataques</span><span>Fame</span>`;
    list.innerHTML = warMembers.map(m=>`
      <div class="war-row">
        <div class="war-member"><span class="avatar">${(m.name||'?').slice(0,1)}</span><strong>${m.name}</strong></div>
        <span>0/16</span>
        <strong class="fame green">0</strong>
      </div>
    `).join("");
  }else{
    head.innerHTML = `<span>Membro</span><span>Fame</span><span>Hoje</span>`;
    list.innerHTML = warMembers.map(m=>`
      <div class="war-row">
        <div class="war-member"><span class="avatar">${(m.name||'?').slice(0,1)}</span><strong>${m.name}</strong></div>
        <strong class="fame green">0</strong>
        ${dots(0)}
      </div>
    `).join("");
  }

  applyWarBlock();
}

document.querySelectorAll(".war-tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".war-tab").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    activeWarTab = btn.dataset.tab;
    renderWarList();
  });
});

async function initWar(){
  setupPeriods();
  warMembers = (await loadMembers()).filter(m=>!m.removed);
  applyWarBlock();
  renderWarList();
}

initWar();
