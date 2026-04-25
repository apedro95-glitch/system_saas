const warMembers=[
{name:'Pedrin',avatar:'P',weekly:'6/16',fame:12350,dayFame:3200,dayAttacks:4},
{name:'Lucas',avatar:'L',weekly:'6/16',fame:11420,dayFame:3050,dayAttacks:4},
{name:'Vini',avatar:'V',weekly:'5/16',fame:10210,dayFame:2600,dayAttacks:3},
{name:'Samuel',avatar:'S',weekly:'4/16',fame:9850,dayFame:2150,dayAttacks:2},
{name:'Kaio',avatar:'K',weekly:'3/16',fame:8920,dayFame:1400,dayAttacks:1},
{name:'Gabriel',avatar:'G',weekly:'2/16',fame:7650,dayFame:950,dayAttacks:1},
{name:'Matheus',avatar:'M',weekly:'0/16',fame:0,dayFame:0,dayAttacks:0}
];

const fullMonths={Jan:'Janeiro',Fev:'Fevereiro',Mar:'Março',Abr:'Abril',Mai:'Maio',Jun:'Junho',Jul:'Julho',Ago:'Agosto',Set:'Setembro',Out:'Outubro',Nov:'Novembro',Dez:'Dezembro'};
const days=['Quinta-feira','Sexta-feira','Sábado','Domingo'];
const shortDays=['Qui','Sex','Sáb','Dom'];

let activeWarTab='members';
let selectedMonth='Abr';
let selectedWeek='S4';
let selectedDay=0;

function fameClass(v){return v>=11000?'green':v>=9500?'yellow':'red'}
function fmt(v){return v.toLocaleString('pt-BR')}
function dots(n){return '<div class="attack-dots">'+[0,1,2,3].map(i=>`<i class="${i<n?'done':''}"></i>`).join('')+'</div>'}

function updateWarHeader(){
 const title=document.querySelector('#warTitle');
 const day=document.querySelector('#warDayLabel');
 if(title) title.textContent=`${fullMonths[selectedMonth]} • Semana ${selectedWeek.replace('S','')}`;
 if(day) day.textContent=activeWarTab==='attacks'?days[selectedDay]:'';
 const period=document.querySelector('#warPeriodLabel');
 if(period) period.innerHTML=`<strong>${fullMonths[selectedMonth]}</strong><span>Semana ${selectedWeek.replace('S','')}</span>`;
}

function renderWarList(){
 const list=document.querySelector('#warList'),head=document.querySelector('#warTableHead');
 updateWarHeader();

 if(activeWarTab==='members'){
  head.innerHTML='<span>Membro</span><span>Ataques</span><span>Fame</span>';
  list.innerHTML=warMembers.map((m,i)=>`<div class="war-row members-row"><div class="war-member-cell"><span class="war-avatar tier-${Math.min(i+1,4)}">${m.avatar}</span><strong>${m.name}</strong></div><strong class="attack-count">${m.weekly}</strong><strong class="fame ${fameClass(m.fame)}">${fmt(m.fame)}</strong></div>`).join('');
 }else{
  head.innerHTML='<span>Membro</span><span>Fame</span><span>Hoje</span>';
  list.innerHTML=warMembers.map((m,i)=>`<div class="war-row attacks-row"><div class="war-member-cell"><span class="war-avatar tier-${Math.min(i+1,4)}">${m.avatar}</span><strong>${m.name}</strong></div><strong class="day-fame ${fameClass(m.dayFame*4)}">${fmt(m.dayFame)}</strong>${dots(m.dayAttacks)}</div>`).join('');
 }
}

function updateCalendarText(){
 const title=document.querySelector('.war-calendar-modal h2');
 const subtitle=document.querySelector('#calendarSubtitle');
 if(title) title.textContent=`${fullMonths[selectedMonth]} • Semana ${selectedWeek.replace('S','')}`;
 if(subtitle) subtitle.textContent=activeWarTab==='members'?'Mês e semana ativa da guerra':`${days[selectedDay]} da janela de guerra`;
}

function bindCalendar(){
 document.querySelectorAll('.calendar-months button').forEach(btn=>{
  btn.addEventListener('click',()=>{
   selectedMonth=btn.dataset.value;
   document.querySelectorAll('.calendar-months button').forEach(b=>b.classList.remove('active'));
   btn.classList.add('active');
   updateWarHeader(); updateCalendarText();
  });
 });

 document.querySelectorAll('.calendar-weeks button').forEach(btn=>{
  if(!btn.dataset.value) btn.dataset.value=btn.textContent.trim();
  btn.addEventListener('click',()=>{
   selectedWeek=btn.dataset.value;
   document.querySelectorAll('.calendar-weeks button').forEach(b=>b.classList.remove('active'));
   btn.classList.add('active');
   updateWarHeader(); updateCalendarText();
  });
 });

 const daysBox=document.querySelector('#calendarDays');
 if(daysBox){
  daysBox.innerHTML=shortDays.map((d,i)=>`<button data-value="${i}" class="${i===selectedDay?'active':''}">${d}</button>`).join('');
  daysBox.querySelectorAll('button').forEach(btn=>{
   btn.addEventListener('click',()=>{
    selectedDay=Number(btn.dataset.value);
    daysBox.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    updateWarHeader(); updateCalendarText();
   });
  });
 }
}

document.querySelectorAll('.war-tab').forEach(btn=>btn.addEventListener('click',()=>{
 document.querySelectorAll('.war-tab').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active');
 activeWarTab=btn.dataset.tab;
 renderWarList();
}));

document.querySelector('#openWarCalendar')?.addEventListener('click',()=>{
 document.body.classList.add('modal-open');
 document.documentElement.classList.add('modal-open');
 bindCalendar();
 document.querySelector('#calendarDays')?.classList.toggle('hidden',activeWarTab==='members');
 updateCalendarText();
 document.querySelector('#warCalendarOverlay')?.classList.add('show');
});

function closeCal(){
 document.querySelector('#warCalendarOverlay')?.classList.remove('show');
 document.body.classList.remove('modal-open');
 document.documentElement.classList.remove('modal-open');
}

document.querySelector('#closeWarCalendar')?.addEventListener('click',closeCal);
document.querySelector('#warCalendarOverlay')?.addEventListener('click',e=>{if(e.target.id==='warCalendarOverlay')closeCal()});

bindCalendar();
renderWarList();

function updateWarStatus(){
 const status=document.getElementById('warStatus');
 const monthNow=new Date().getMonth();
 if(selectedMonth < monthNow){
   status.textContent='Finalizado';
   status.style.background='rgba(120,120,120,.25)';
 }else if(selectedMonth > monthNow){
   status.textContent='Futuro';
   status.style.background='rgba(80,140,255,.25)';
 }else{
   status.textContent='Em andamento';
   status.style.background='rgba(40,200,120,.25)';
 }
}

function updateWarBlock(){
 const period=document.getElementById('warBlockPeriod');
 const day=document.getElementById('warBlockDay');
 period.textContent = fullMonths[selectedMonth] + ' • Semana ' + selectedWeek.replace('S','');

 if(activeWarTab==='attacks'){
   day.textContent = days[selectedDay];
   day.style.display='block';
 }else{
   day.style.display='none';
 }

 updateWarStatus();
}

setTimeout(updateWarBlock,200);
