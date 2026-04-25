const warMembers=[
{name:'Pedrin',avatar:'P',weekly:'6/16',fame:12350,dayFame:3200,dayAttacks:4},
{name:'Lucas',avatar:'L',weekly:'6/16',fame:11420,dayFame:3050,dayAttacks:4},
{name:'Vini',avatar:'V',weekly:'5/16',fame:10210,dayFame:2600,dayAttacks:3},
{name:'Samuel',avatar:'S',weekly:'4/16',fame:9850,dayFame:2150,dayAttacks:2},
{name:'Kaio',avatar:'K',weekly:'3/16',fame:8920,dayFame:1400,dayAttacks:1},
{name:'Gabriel',avatar:'G',weekly:'2/16',fame:7650,dayFame:950,dayAttacks:1},
{name:'Matheus',avatar:'M',weekly:'0/16',fame:0,dayFame:0,dayAttacks:0}
];
let activeWarTab='members';
function fameClass(v){return v>=11000?'green':v>=9500?'yellow':'red'}
function fmt(v){return v.toLocaleString('pt-BR')}
function dots(n){return '<div class="attack-dots">'+[0,1,2,3].map(i=>`<i class="${i<n?'done':''}"></i>`).join('')+'</div>'}
function renderWarList(){
const list=document.querySelector('#warList'),head=document.querySelector('#warTableHead'),day=document.querySelector('#warDayLabel');
if(activeWarTab==='members'){
day.textContent='';
head.innerHTML='<span>Membro</span><span>Ataques</span><span>Fame</span>';
list.innerHTML=warMembers.map((m,i)=>`<div class="war-row members-row"><div class="war-member-cell"><span class="war-avatar tier-${Math.min(i+1,4)}">${m.avatar}</span><strong>${m.name}</strong></div><strong class="attack-count">${m.weekly}</strong><strong class="fame ${fameClass(m.fame)}">${fmt(m.fame)}</strong></div>`).join('');
}else{
day.textContent='Quinta-feira';
head.innerHTML='<span>Membro</span><span>Fame</span><span>Hoje</span>';
list.innerHTML=warMembers.map((m,i)=>`<div class="war-row attacks-row"><div class="war-member-cell"><span class="war-avatar tier-${Math.min(i+1,4)}">${m.avatar}</span><strong>${m.name}</strong></div><strong class="day-fame ${fameClass(m.dayFame * 4)}">${fmt(m.dayFame)}</strong>${dots(m.dayAttacks)}</div>`).join('');
}}
document.querySelectorAll('.war-tab').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.war-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeWarTab=btn.dataset.tab;renderWarList()}));
document.querySelector('#openWarCalendar')?.addEventListener('click',()=>{document.body.classList.add('modal-open');document.documentElement.classList.add('modal-open');document.querySelector('#calendarDays').classList.toggle('hidden',activeWarTab==='members');document.querySelector('#calendarSubtitle').textContent=activeWarTab==='members'?'Mês e semana ativa da guerra':'Semana e dia ativo da janela';document.querySelector('#warCalendarOverlay').classList.add('show')});
function closeCal(){document.querySelector('#warCalendarOverlay')?.classList.remove('show');document.body.classList.remove('modal-open');document.documentElement.classList.remove('modal-open')}
document.querySelector('#closeWarCalendar')?.addEventListener('click',closeCal);
document.querySelector('#warCalendarOverlay')?.addEventListener('click',e=>{if(e.target.id==='warCalendarOverlay')closeCal()});
renderWarList();