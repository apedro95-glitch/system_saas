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

function brandShield(){
  return `
    <div class="brand-shield" aria-hidden="true">
      <svg viewBox="0 0 120 140" role="img">
        <defs>
          <linearGradient id="gold" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#FFE58A" />
            <stop offset="46%" stop-color="#F4B72C" />
            <stop offset="100%" stop-color="#9F6115" />
          </linearGradient>
          <linearGradient id="shieldBg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#1B3E77" />
            <stop offset="100%" stop-color="#071327" />
          </linearGradient>
        </defs>
        <path d="M60 6 108 25v38c0 34-19 58-48 71C31 121 12 97 12 63V25L60 6Z" fill="url(#shieldBg)" stroke="url(#gold)" stroke-width="6" />
        <path d="M34 72h52l-9 27H43l-9-27Z" fill="url(#gold)" />
        <path d="M45 72 60 42l15 30H45Z" fill="#FFE69D" />
        <circle cx="60" cy="73" r="7" fill="#071327" opacity=".32" />
      </svg>
    </div>`;
}

function renderSearch(){
  currentStep = steps.SEARCH;
  app.className = 'auth-shell';
  app.innerHTML = `
    <section class="auth-card glass-panel" aria-labelledby="authTitle">
      <div class="brand-block">
        ${brandShield()}
        <p class="brand-kicker">TOPBRS</p>
        <p class="brand-sub">MULTI CLÃ</p>
      </div>

      <div class="auth-copy">
        <h1 id="authTitle">Bem-vindo ao<br>TopBRS Multi-Clã</h1>
        <p>Gerencie seu clã com inteligência, estratégia e dados em tempo real.</p>
      </div>

      <form class="setup-box glass-inset" id="clanForm">
        <h2>Cadastre seu clã</h2>
        <label class="field">
          <span>Tag do clã</span>
          <input id="clanTag" name="clanTag" type="text" inputmode="text" autocomplete="off" placeholder="Ex: #ABC123" />
        </label>
        <button class="primary-btn" type="submit">
          <span>Buscar Clã</span>
        </button>
        <button class="link-btn" type="button" id="learnMore"><b>Assine agora!</b></button>
      </form>
    </section>
  `;

  document.querySelector('#clanForm').addEventListener('submit', (event)=>{
    event.preventDefault();
    const tag = normalizeClanTag(document.querySelector('#clanTag').value || '#DEMO123');
    clan = tag === '#DEMO123' ? getDemoClan() : {...getDemoClan(), tag, name:'Clã encontrado'};
    currentStep = steps.CONFIRM;
    renderConfirm();
  });
}

function stepper(active){
  const labels = ['Buscar','Confirmar','Importar','Admin','Concluir'];
  return `<div class="stepper onboarding-stepper">${labels.map((label,idx)=>`
    <div class="step-item ${idx+1===active?'active':''} ${idx+1<active?'done':''}">
      <div class="step-dot">${idx+1}</div>
      <div class="step-label">${label}</div>
    </div>`).join('')}</div>`;
}

function onboardShell(active, content){
  app.className = 'auth-shell';
  app.innerHTML = `
    <section class="onboarding-card glass-panel">
      <div class="onboard-top">
        <button class="back-btn" type="button" id="backBtn" aria-label="Voltar">‹</button>
        <div class="onboard-title">Onboarding</div>
        <div></div>
      </div>
      ${stepper(active)}
      ${content}
    </section>`;
  const back = document.querySelector('#backBtn');
  if(back){
    back.addEventListener('click', ()=>{
      if(currentStep === steps.CONFIRM) return renderSearch();
      if(currentStep === steps.IMPORT) currentStep = steps.CONFIRM;
      else if(currentStep === steps.ADMIN) currentStep = steps.CONFIRM;
      else if(currentStep === steps.SUCCESS) currentStep = steps.ADMIN;
      renderCurrent();
    });
  }
}

function renderCurrent(){
  if(currentStep === steps.SEARCH) return renderSearch();
  if(currentStep === steps.CONFIRM) return renderConfirm();
  if(currentStep === steps.IMPORT) return renderImport();
  if(currentStep === steps.ADMIN) return renderAdmin();
  if(currentStep === steps.SUCCESS) return renderSuccess();
}

function renderConfirm(){
  onboardShell(2, `
    <div class="onboard-heading">
      <h1>Clã encontrado!</h1>
    </div>

    <div class="clan-confirm-card">
      <div class="clan-main">
        <div class="clan-icon"><img src="${clan.badge}" alt=""></div>
        <div>
          <h2>${clan.name}</h2>
          <p>${clan.tag}</p>
        </div>
      </div>
      <div class="clan-stats">
        <div class="clan-stat"><span>Membros</span><strong>${clan.members}</strong></div>
        <div class="clan-stat"><span>Troféus</span><strong>${clan.trophies}</strong></div>
        <div class="clan-stat"><span>Local</span><strong>${clan.location}</strong></div>
      </div>
    </div>

    <div class="confirm-copy">
      <h3>Este é o clã correto?</h3>
      <p>Confira os dados acima e confirme para continuar.</p>
    </div>

    <button class="gold-btn" id="confirmClan">Confirmar Clã</button>
    <button class="ghost-btn" id="otherClan">Buscar outro clã</button>
  `);
  document.querySelector('#confirmClan').addEventListener('click', ()=>{currentStep = steps.IMPORT; renderImport();});
  document.querySelector('#otherClan').addEventListener('click', ()=>renderSearch());
}

function renderImport(){
  importedMembers = getDemoMembers().map((member)=>({...member, done:false}));
  let currentImported = 0;
  const totalMembers = clan?.members || 47;

  function paintImport(){
    const listMarkup = importedMembers.map((m,i)=>`
        <div class="import-row ${m.done ? 'imported' : ''}">
          <span>${i+1}</span>
          <strong>${m.name}</strong>
          <small>${m.tag}</small>
          ${m.done ? '<span class="ok">✓</span>' : '<span class="spin"></span>'}
        </div>`).join('');

    onboardShell(3, `
      <div class="onboard-heading">
        <h1>Importando membros</h1>
        <p>Estamos buscando os membros do seu clã na API do Clash Royale.</p>
      </div>

      <div class="import-progress animated-import" style="--progress:${Math.min(100, Math.round((currentImported / totalMembers) * 100))}%">
        <div class="progress-inner">
          <div>
            <strong id="importCount">${currentImported}</strong><br>
            <span>/${totalMembers}</span>
          </div>
        </div>
      </div>
      <p class="import-sub"><strong>${currentImported >= importedMembers.length ? 'Importados com sucesso' : 'Importando membros...'}</strong></p>

      <div class="import-list">
        ${listMarkup}
      </div>

      <div class="note-box">Não feche o app durante a importação.</div>
    `);
  }

  paintImport();

  const importSteps = [8, 17, 26, 38, 47];
  let tick = 0;

  const interval = setInterval(()=>{
    if(tick < importedMembers.length){
      importedMembers[tick].done = true;
    }

    currentImported = importSteps[Math.min(tick, importSteps.length - 1)] || totalMembers;
    tick++;
    paintImport();

    if(tick > importSteps.length){
      clearInterval(interval);
      setTimeout(()=>{
        currentStep = steps.ADMIN;
        renderAdmin();
      }, 650);
    }
  }, 620);
}

function renderAdmin(){
  onboardShell(4, `
    <div class="onboard-heading">
      <h1>Criar conta admin</h1>
      <p>Você será o administrador principal deste clã.</p>
    </div>
    <div class="admin-box">
      <label class="field"><span>Nome</span><input placeholder="Seu nome"></label>
      <label class="field"><span>Email</span><input type="email" placeholder="admin@email.com"></label>
      <label class="field"><span>Senha</span><input type="password" placeholder="Crie uma senha"></label>
      <label class="field"><span>Tag do jogador</span><input placeholder="#PLAYER123"></label>
    </div>
    <button class="primary-btn" id="createAdmin">Criar conta e iniciar clã</button>
  `);
  document.querySelector('#createAdmin').addEventListener('click', ()=>{currentStep = steps.SUCCESS; renderSuccess();});
}

function renderSuccess(){
  onboardShell(5, `
    <div class="success-seal">✓</div>
    <div class="onboard-heading">
      <h1>Clã configurado!</h1>
      <p>O ambiente do seu clã está pronto para começar.</p>
    </div>
    <button class="primary-btn" type="button">Entrar no sistema</button>
  `);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

renderSearch();
