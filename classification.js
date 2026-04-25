const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const fullMonths={Jan:'Janeiro',Fev:'Fevereiro',Mar:'Março',Abr:'Abril',Mai:'Maio',Jun:'Junho',Jul:'Julho',Ago:'Agosto',Set:'Setembro',Out:'Outubro',Nov:'Novembro',Dez:'Dezembro'};
let selectedMonth='Abr', selectedWeek='S4', activeTab='general';
const rankingData=[
{name:'Pedrin',role:'Co-líder',avatar:'P',general:62550,tournament:19,donSent:1284,donReceived:320,weeks:{S1:6,S2:6,S3:7,S4:0}},
{name:'Lucas',role:'Ancião',avatar:'L',general:11420,tournament:18,donSent:980,donReceived:410,weeks:{S1:5,S2:6,S3:5,S4:2}},
{name:'Vini',role:'Membro',avatar:'V',general:10210,tournament:16,donSent:870,donReceived:230,weeks:{S1:4,S2:6,S3:6,S4:0}},
{name:'Samuel',role:'Membro',avatar:'S',general:9850,tournament:14,donSent:720,donReceived:260,weeks:{S1:4,S2:4,S3:4,S4:2}},
{name:'Kaio',role:'Membro',avatar:'K',general:8920,tournament:12,donSent:640,donReceived:500,weeks:{S1:3,S2:3,S3:5,S4:1}},
{name:'Gabriel',role:'Membro',avatar:'G',general:7650,tournament:10,donSent:530,donReceived:390,weeks:{S1:2,S2:4,S3:3,S4:1}},
{name:'Matheus',role:'Membro',avatar:'M',general:6480,tournament:8,donSent:430,donReceived:510,weeks:{S1:2,S2:2,S3:3,S4:1}},
{name:'Felipe',role:'Membro',avatar:'F',general:5230,tournament:6,donSent:380,donReceived:610,weeks:{S1:1,S2:2,S3:2,S4:1}}
];
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
function rows(){const k=activeTab==='general'?'general':activeTab==='tournament'?'tournament':'donSent';return [...rankingData].sort((a,b)=>b[k]-a[k])}
function value(item){if(activeTab==='general')return item.general.toLocaleString('pt-BR'); if(activeTab==='tournament')return `${item.tournament} PTS`; return {sent:item.donSent,rec:item.donReceived}}
function renderPodium(){
 const order=[rows()[1],rows()[0],rows()[2]];
 document.querySelector('#podium').innerHTML=order.map((it,i)=>{
  const p=i===1?1:i===0?2:3,v=value(it),d=typeof v==='object'?v.sent:v;
  return `<article class="podium-card podium-${p}" data-name="${it.name}">
   ${crownSvg(p)}
   <div class="podium-avatar avatar-${p}">${it.avatar}</div>
   <span class="podium-place">${p}</span>
   <strong>${it.name}</strong>
   <small>${d}</small>
  </article>`;
 }).join('');
 if(activeTab==='tournament'){
  document.querySelectorAll('.podium-card').forEach(card=>{
   card.addEventListener('click',()=>openDetail(card.dataset.name));
  });
 }
}
function renderTable(){const head=document.querySelector('#rankingTableHead'),list=document.querySelector('#rankingList'),r=rows().slice(3); if(activeTab==='donations'){head.className='ranking-table-head donations-head';head.innerHTML='<span>Posição</span><span>Membro</span><span>Env</span><span>Rec</span>';list.innerHTML=r.map((it,i)=>`<button class="ranking-row donation-row"><span>${i+4}</span><strong>${it.name}</strong><b>${it.donSent}</b><b>${it.donReceived}</b></button>`).join('')}else{head.className='ranking-table-head';head.innerHTML='<span>Posição</span><span>Membro</span><span>Pontos</span>';list.innerHTML=r.map((it,i)=>`<button class="ranking-row" data-name="${it.name}"><span>${i+4}</span><strong>${it.name}</strong><b>${value(it)}</b></button>`).join(''); if(activeTab==='tournament')list.querySelectorAll('.ranking-row').forEach(x=>x.onclick=()=>openDetail(x.dataset.name))}}
function renderAll(){renderPodium();renderTable()}
document.querySelectorAll('.ranking-tab').forEach(btn=>btn.onclick=()=>{document.querySelectorAll('.ranking-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeTab=btn.dataset.tab;renderAll()});
function updateRankingPeriod(){
 const el=document.querySelector('#rankingPeriodLabel');
 if(el) el.innerHTML=`<strong>${fullMonths[selectedMonth]}</strong><span>Semana ${selectedWeek.replace('S','')}</span>`;
}
function renderCalendar(){const m=document.querySelector('#rankingMonths'),w=document.querySelector('#rankingWeeks');m.innerHTML=months.map(x=>`<button data-value="${x}" class="${x===selectedMonth?'active':''}">${x}</button>`).join('');w.innerHTML=['S1','S2','S3','S4'].map(x=>`<button data-value="${x}" class="${x===selectedWeek?'active':''}">${x}</button>`).join('');[m,w].forEach(box=>box.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(box===m)selectedMonth=b.dataset.value;else selectedWeek=b.dataset.value;box.querySelectorAll('button').forEach(z=>z.classList.remove('active'));b.classList.add('active');document.querySelector('#rankingCalendarTitle').textContent=`${fullMonths[selectedMonth]} • Semana ${selectedWeek.replace('S','')}`;updateRankingPeriod()}));document.querySelector('#rankingCalendarTitle').textContent=`${fullMonths[selectedMonth]} • Semana ${selectedWeek.replace('S','')}`;updateRankingPeriod()}
function openOverlay(id){document.body.classList.add('modal-open');document.documentElement.classList.add('modal-open');document.querySelector(id).classList.add('show')}
function closeOverlay(id){document.querySelector(id).classList.remove('show');document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open')}
document.querySelector('#openRankingCalendar').onclick=()=>{renderCalendar();openOverlay('#rankingCalendarOverlay')};document.querySelector('#closeRankingCalendar').onclick=()=>closeOverlay('#rankingCalendarOverlay');document.querySelector('#rankingCalendarOverlay').onclick=e=>{if(e.target.id==='rankingCalendarOverlay')closeOverlay('#rankingCalendarOverlay')};
function openDetail(name){const it=rankingData.find(x=>x.name===name);document.querySelector('#detailName').textContent=it.name;document.querySelector('#detailRole').textContent=`${it.role} • Pontuação semanal do mês vigente`;document.querySelector('#detailTotal').textContent=`${it.tournament} PTS`;document.querySelector('#detailWeeks').innerHTML=['S1','S2','S3','S4'].map(w=>`<div><span>${w}</span><strong>${it.weeks[w]}</strong></div>`).join('');openOverlay('#rankingDetailOverlay')}
document.querySelector('#closeRankingDetail').onclick=()=>closeOverlay('#rankingDetailOverlay');document.querySelector('#rankingDetailOverlay').onclick=e=>{if(e.target.id==='rankingDetailOverlay')closeOverlay('#rankingDetailOverlay')};
document.addEventListener('gesturestart',e=>e.preventDefault());document.addEventListener('gesturechange',e=>e.preventDefault());document.addEventListener('gestureend',e=>e.preventDefault());updateRankingPeriod();renderAll();
let lastTouchEndRanking=0;
document.addEventListener('touchend',e=>{
 const now=Date.now();
 if(now-lastTouchEndRanking<=300)e.preventDefault();
 lastTouchEndRanking=now;
},{passive:false});
document.addEventListener('touchmove',e=>{
 if(e.touches && e.touches.length>1)e.preventDefault();
},{passive:false});
