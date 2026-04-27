import { loadMembers, formatNumber, periodLabelNow } from "./real-data.js";

const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fullMonths={Jan:'Janeiro',Fev:'Fevereiro',Mar:'Março',Abr:'Abril',Mai:'Maio',Jun:'Junho',Jul:'Julho',Ago:'Agosto',Set:'Setembro',Out:'Outubro',Nov:'Dezembro'};
let members=[];
let activeTab = location.hash === "#doacoes" ? "donations" : location.hash === "#torneio" ? "tournament" : "general";

function crownSvg(p){
 const color=p===1?'#ffd65f':p===2?'#dbeafe':'#ffb070';
 return `<svg class="rank-crown crown-${p}" viewBox="0 0 64 52" aria-hidden="true">
  <path d="M7 42h50l3-27-15 10L32 5 19 25 4 15l3 27Z" fill="${color}"/>
  <path d="M11 42h42v6H11v-6Z" fill="${color}" opacity=".92"/>
  <circle cx="19" cy="24" r="3" fill="rgba(255,255,255,.55)"/>
  <circle cx="32" cy="14" r="3" fill="rgba(255,255,255,.55)"/>
  <circle cx="45" cy="24" r="3" fill="rgba(255,255,255,.55)"/>
  <path d="M13 36h38" stroke="rgba(0,0,0,.22)" stroke-width="3" stroke-linecap="round"/>
 </svg>`;
}

function rows(){
  if(activeTab === "donations") return [...members].sort((a,b)=>(b.donations||0)-(a.donations||0));
  return [...members].sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
}

function value(item){
  if(activeTab === "donations") return {sent:item.donations||0, rec:item.donationsReceived||0};
  return 0;
}

function renderPodium(){
 const data = rows().slice(0,3);
 const order=[data[1],data[0],data[2]].filter(Boolean);
 const podium=document.querySelector('#podium');
 if(!podium) return;
 podium.innerHTML=order.map((it)=>{
  const originalIndex = data.indexOf(it);
  const p = originalIndex + 1;
  const val = value(it);
  const show = activeTab === "donations" ? formatNumber(val.sent) : "0";
  return `<article class="podium-card p${p}" data-name="${it.name}">
    ${crownSvg(p)}
    <div class="avatar">${(it.name||'?').slice(0,1)}</div>
    <span class="pos">${p}</span>
    <strong>${it.name || "Membro"}</strong>
    <small>${show}</small>
  </article>`;
 }).join('');
}

function renderList(){
 const list=document.querySelector('#rankingList');
 const head=document.querySelector('#rankingTableHead');
 if(!list || !head) return;

 if(activeTab==='donations'){
  head.innerHTML='<span>Posição</span><span>Membro</span><span>Env</span><span>Rec</span>';
  list.innerHTML=rows().slice(3).map((it,i)=>{
   const val=value(it);
   return `<div class="ranking-row four"><span>${i+4}</span><strong>${it.name}</strong><span>${formatNumber(val.sent)}</span><span>${formatNumber(val.rec)}</span></div>`;
  }).join('');
 }else{
  head.innerHTML='<span>Posição</span><span>Membro</span><span>Pontos</span>';
  list.innerHTML=rows().slice(3).map((it,i)=>`<div class="ranking-row"><span>${i+4}</span><strong>${it.name}</strong><span>0</span></div>`).join('');
 }
}

function renderAll(){
 document.querySelectorAll('.ranking-tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===activeTab));
 renderPodium();
 renderList();
}

document.querySelectorAll('.ranking-tab').forEach(btn=>{
 btn.addEventListener('click',()=>{
  activeTab=btn.dataset.tab;
  history.replaceState(null,"", activeTab==="donations" ? "#doacoes" : activeTab==="tournament" ? "#torneio" : "#geral");
  renderAll();
 });
});

async function init(){
 const p=periodLabelNow();
 const period=document.querySelector('#rankingPeriodLabel');
 if(period) period.innerHTML=`<strong>${p.month}</strong><span>Semana ${p.week}</span>`;
 members=(await loadMembers()).filter(m=>!m.removed);
 renderAll();
}

init();
