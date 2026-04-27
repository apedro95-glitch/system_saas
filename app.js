const app = document.querySelector('#app');

const steps = {
  SEARCH: 'search',
  CONFIRM: 'confirm',
  IMPORT: 'import',
  ADMIN: 'admin',
  SUCCESS: 'success'
};

let currentStep = steps.SEARCH;
let clan = null;
let importedMembers = [];

function normalizeClanTag(value){
  const cleaned = String(value || '').trim().toUpperCase().replace(/\s+/g,'');
  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
}

function getDemoClan(){
  return {
    name:'Os Brabos BR',
    tag:'#DEMO123',
    badge:'assets/icons/clan.svg',
    members:47,
    trophies:'62.580',
    location:'Brasil'
  };
}

function getDemoMembers(){
  return [
    {name:'Pedrin', tag:'#PLP9QG8R', done:true},
    {name:'Lucas', tag:'#G9QJ80P', done:true},
    {name:'Vini', tag:'#LJ9Q2PP', done:false},
    {name:'Samuel', tag:'#Q2J9U9LP', done:false}
  ];
}

function renderSearch(){
  currentStep = steps.SEARCH;

  app.innerHTML = `
    <form id="clanForm">
      <input id="clanTag" placeholder="#ABC123"/>
      <button type="submit">Buscar Clã</button>
    </form>
  `;

  const form = document.querySelector('#clanForm');
  const input = document.querySelector('#clanTag');

  form.addEventListener('submit', (event)=>{
    event.preventDefault();

    let value = input.value.trim();

    // 🔥 aceita qualquer tag
    if(!value){
      value = '#DEMO123';
    }

    const tag = normalizeClanTag(value);

    clan = {
      ...getDemoClan(),
      tag,
      name: 'Clã Teste'
    };

    localStorage.setItem('selectedClan', tag);

    currentStep = steps.CONFIRM;
    renderConfirm();
  });
}

function renderConfirm(){
  app.innerHTML = `
    <h1>Clã encontrado</h1>
    <p>${clan.name} (${clan.tag})</p>
    <button id="confirm">Confirmar</button>
  `;

  document.querySelector('#confirm').addEventListener('click', ()=>{
    currentStep = steps.IMPORT;
    renderImport();
  });
}

function renderImport(){
  app.innerHTML = `<h1>Importando...</h1>`;

  setTimeout(()=>{
    currentStep = steps.ADMIN;
    renderAdmin();
  }, 1000);
}

function renderAdmin(){
  app.innerHTML = `
    <input id="email" placeholder="Email"/>
    <input id="senha" placeholder="Senha"/>
    <button id="createAdmin">Criar Admin</button>
  `;

  document.querySelector('#createAdmin').addEventListener('click', async ()=>{
    const email = document.querySelector('#email').value;
    const senha = document.querySelector('#senha').value;

    if(!email || !senha){
      alert("Preencha tudo");
      return;
    }

    await createClanAdmin({
      email,
      senha,
      clanTag: clan.tag
    });

    currentStep = steps.SUCCESS;
    renderSuccess();
  });
}

function renderSuccess(){
  app.innerHTML = `
    <h1>Sucesso!</h1>
    <button onclick="window.location.href='dashboard.html'">Entrar</button>
  `;
}

renderSearch();
