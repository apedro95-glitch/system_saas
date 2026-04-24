let step="search";
let clan=null;

function demoClan(){
return {name:"TopBRS Demo",tag:"#DEMO123",members:47,trophies:62580};
}

function setStep(s){step=s;render();}

function render(){
const app=document.getElementById("app");

if(step==="search"){
app.innerHTML=`
<div class="card">
<h2>Selecione seu clã</h2>
<input id="tag" placeholder="#DEMO123">
<button class="primary" onclick="buscar()">Buscar Clã</button>
</div>`;
}

if(step==="confirm"){
app.innerHTML=`
<div class="card">
${stepper(2)}
<h2>Clã encontrado</h2>
<p>${clan.name}</p>
<p>${clan.tag}</p>
<button class="gold" onclick="setStep('import')">Confirmar</button>
<button onclick="setStep('search')">Voltar</button>
</div>`;
}

if(step==="import"){
app.innerHTML=`
<div class="card">
${stepper(3)}
<h2>Importando membros...</h2>
<div class="loader"></div>
</div>`;
setTimeout(()=>setStep("create"),1500);
}

if(step==="create"){
app.innerHTML=`
<div class="card">
${stepper(4)}
<h2>Criar admin</h2>
<input placeholder="Nome">
<input placeholder="Email">
<input placeholder="Senha" type="password">
<button class="primary" onclick="setStep('success')">Criar</button>
</div>`;
}

if(step==="success"){
app.innerHTML=`
<div class="card">
${stepper(5)}
<h2>Pronto!</h2>
<button class="primary">Entrar</button>
</div>`;
}
}

function buscar(){
const tag=document.getElementById("tag").value;
if(tag.toUpperCase()==="#DEMO123"){
clan=demoClan();
setStep("confirm");
}
}

function stepper(n){
let html='<div class="stepper">';
for(let i=1;i<=5;i++){
html+=`<div class="step ${i===n?'active':''}">${i}</div>`;
if(i<5) html+='<div class="line"></div>';
}
html+='</div>';
return html;
}

render();
