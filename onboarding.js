
// TopBRS Onboarding (non-invasive, keeps original UI intact)

let step = 1;
let clan = null;

function renderOnboarding() {
  const root = document.getElementById("onboarding-root");
  if (!root) return;

  root.innerHTML = `
    <div class="onboarding-card">
      ${renderStepper()}
      ${renderStep()}
    </div>
  `;
}

function renderStepper(){
  let html = '<div class="stepper">';
  for(let i=1;i<=5;i++){
    html += `<div class="step ${i===step?'active':''}">${i}</div>`;
  }
  html += '</div>';
  return html;
}

function renderStep(){
  if(step===1){
    return `
      <h2>Buscar clã</h2>
      <input id="tag" placeholder="#DEMO123"/>
      <button onclick="buscarClan()">Buscar</button>
    `;
  }

  if(step===2){
    return `
      <h2>Clã encontrado</h2>
      <p>${clan.name}</p>
      <button onclick="nextStep()">Confirmar</button>
    `;
  }

  if(step===3){
    setTimeout(()=>{ nextStep() },1500);
    return `<h2>Importando membros...</h2>`;
  }

  if(step===4){
    return `
      <h2>Criar admin</h2>
      <input placeholder="Nome"/>
      <input placeholder="Email"/>
      <input placeholder="Senha"/>
      <button onclick="nextStep()">Criar</button>
    `;
  }

  if(step===5){
    return `
      <h2>Concluído</h2>
      <button onclick="alert('Entrar sistema')">Entrar</button>
    `;
  }
}

function buscarClan(){
  const tag = document.getElementById("tag").value;
  if(tag === "#DEMO123"){
    clan = { name:"TopBRS Demo" };
    nextStep();
  }
}

function nextStep(){
  step++;
  renderOnboarding();
}

document.addEventListener("DOMContentLoaded", renderOnboarding);
