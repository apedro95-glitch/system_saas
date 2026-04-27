const API_BASE_URL = 'https://mortgages-defensive-contributors-kim.trycloudflare.com';

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


async function fetchClanFromApi(tag){
  const cleanTag = normalizeClanTag(tag).replace('#', '');

  const response = await fetch(`${API_BASE_URL}/api/clan/${encodeURIComponent(cleanTag)}`, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    cache: 'no-store'
  });

  let data = null;

  try{
    data = await response.json();
  }catch(error){
    throw new Error('Resposta inválida da API.');
  }

  if(!response.ok || !data.ok || !data.clan){
    throw new Error(data?.message || data?.details?.reason || 'Clã não encontrado. Verifique a tag.');
  }

  return data.clan;
}

function mapApiClan(apiClan){
  return {
    name: apiClan.name || 'Clã encontrado',
    tag: apiClan.tag || '#SEM_TAG',
    badge: apiClan.badgeUrls?.medium || apiClan.badgeUrls?.large || apiClan.badgeUrls?.small || 'assets/icons/clan.svg',
    members: apiClan.members || apiClan.memberList?.length || 0,
    trophies: Number(apiClan.clanScore || apiClan.clanWarTrophies || 0).toLocaleString('pt-BR'),
    location: apiClan.location?.name || 'Não informado',
    raw: apiClan
  };
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



function showClanSearchError(message){
  alert(message || 'Não foi possível buscar o clã. Confira a tag e tente novamente.');
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

      <div class="flip-wrap" id="authFlip">
        <div class="flip-card-inner">

          <form class="setup-box glass-inset flip-face flip-front" id="clanForm">
            <h2>Cadastre seu clã</h2>

            <label class="field">
              <span>Tag do clã</span>
              <input id="clanTag" name="clanTag" type="text" inputmode="text" autocomplete="off" placeholder="Ex: #ABC123" />
            </label>

            <button class="primary-btn" type="submit">
              <span>Buscar Clã</span>
            </button>

            <div class="member-access">
              <span>Já é membro?</span>
              <button type="button" class="inline-link" id="openLogin">Login</button>
              <span>ou</span>
              <button type="button" class="inline-link" id="openSignup">Cadastre-se</button>
            </div>

            <button class="link-btn sign-link" type="button" id="learnMore"><b>Assine agora!</b></button>
          </form>

          <div class="setup-box glass-inset flip-face flip-back" id="authBack">
            <button type="button" class="flip-close" id="backToClan" aria-label="Voltar">×</button>
            <div id="authBackContent"></div>
          </div>

        </div>
      </div>
    </section>
  `;

  document.querySelector('#clanForm').addEventListener('submit', async (event)=>{
  event.preventDefault();

  const input = document.querySelector('#clanTag');
  const btn = event.currentTarget.querySelector('button[type="submit"]');
  const btnText = btn?.querySelector('span');

  const tag = normalizeClanTag(input.value);

  if(!tag || tag === '#'){
    alert('Digite a tag do clã.');
    return;
  }

  try{
    btn.disabled = true;
    if(btnText) btnText.textContent = 'Buscando...';

    const cleanTag = tag.replace('#', '');
    const response = await fetch(`${API_BASE_URL}/api/clan/${cleanTag}`, {
      cache: 'no-store'
    });

    const data = await response.json();

    if(!response.ok || !data.ok || !data.clan){
      throw new Error(data.message || 'Clã não encontrado.');
    }

    const apiClan = data.clan;

    clan = {
      name: apiClan.name,
      tag: apiClan.tag,
      badge: apiClan.badgeUrls?.medium || apiClan.badgeUrls?.small || 'assets/icons/clan.svg',
      members: apiClan.members || apiClan.memberList?.length || 0,
      trophies: Number(apiClan.clanScore || 0).toLocaleString('pt-BR'),
      location: apiClan.location?.name || 'Não informado',
      raw: apiClan
    };

    localStorage.setItem('selectedClan', clan.tag);
    localStorage.setItem('topbrs_pending_clan', JSON.stringify(clan));

    currentStep = steps.CONFIRM;
    renderConfirm();

  }catch(error){
    alert(error.message || 'Erro ao buscar clã.');
  }finally{
    btn.disabled = false;
    if(btnText) btnText.textContent = 'Buscar Clã';
  }
});

  document.querySelector('#openLogin')?.addEventListener('click', ()=>showLoginFace());
  document.querySelector('#openSignup')?.addEventListener('click', ()=>showSignupFace());
  document.querySelector('#backToClan')?.addEventListener('click', ()=>hideAuthFace());
}


function eyeSvg(){
  return `<svg class="eye-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/>
  </svg>`;
}

function eyeOffSvg(){
  return `<svg class="eye-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M10.7 5.2A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a16.7 16.7 0 0 1-3.1 4.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M6.2 6.8C3.8 8.5 2.5 12 2.5 12s3.5 7 9.5 7a9.8 9.8 0 0 0 4.1-.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function togglePassword(inputId, button){
  const input = document.getElementById(inputId);
  if(!input) return;
  const visible = input.type === 'text';
  input.type = visible ? 'password' : 'text';
  button.innerHTML = visible ? eyeSvg() : eyeOffSvg();
  button.setAttribute('aria-label', visible ? 'Mostrar senha' : 'Ocultar senha');
}

function showLoginFace(){
  const content = document.querySelector('#authBackContent');
  content.innerHTML = `
    <h2>Acessar sistema</h2>
    <p class="auth-mode-copy">Entre com seu email e senha para continuar.</p>

    <label class="field auth-field">
      <span>Email</span>
      <input id="loginEmail" type="email" placeholder="seu@email.com" autocomplete="email" />
    </label>

    <label class="field auth-field">
      <span>Senha</span>
      <div class="password-wrap">
        <input id="loginPassword" type="password" placeholder="Sua senha" autocomplete="current-password" />
        <button type="button" class="eye-btn" aria-label="Mostrar senha" onclick="togglePassword('loginPassword', this)">${eyeSvg()}</button>
      </div>
    </label>

    <button class="primary-btn auth-main-btn" id="loginBtn" type="button">Entrar</button>

    <button class="link-btn forgot-btn" type="button" onclick="openForgotPasswordPopup()" onclick="openForgotPasswordPopup()"><b>Esqueci minha senha</b></button>

    <div class="member-access compact">
      <span>Ainda não tem conta?</span>
      <button type="button" class="inline-link" onclick="showSignupFace()">Cadastre-se</button>
    </div>
  `;
  document.querySelector('#authFlip').classList.add('is-flipped');

  const loginBtn = document.querySelector('#loginBtn');
  if(loginBtn){
    loginBtn.addEventListener('click', async ()=>{
      const email = String(document.querySelector('#loginEmail')?.value || '').trim();
      const senha = String(document.querySelector('#loginPassword')?.value || '').trim();

      if(!email || !senha){
        alert('Digite email e senha.');
        return;
      }

      if(typeof loginUser !== 'function'){
        alert('Login ainda não carregou. Verifique auth.js.');
        return;
      }

      try{
        loginBtn.disabled = true;
        loginBtn.textContent = 'Entrando...';

        await loginUser({ email, senha });

      }catch(error){
        alert('Erro ao entrar: ' + error.message);
        loginBtn.disabled = false;
        loginBtn.textContent = 'Entrar';
      }
    });
  }
}

function showSignupFace(){
  const content = document.querySelector('#authBackContent');
  content.innerHTML = `
    <h2>Criar cadastro</h2>
    <p class="auth-mode-copy">Valide sua tag para vincular seu perfil ao clã.</p>

    <label class="field auth-field">
      <span>Nome</span>
      <input type="text" placeholder="Seu nome" autocomplete="name" />
    </label>

    <label class="field auth-field">
      <span>Tag do jogador</span>
      <div class="input-with-btn">
        <input id="playerTag" type="text" placeholder="#PLAYER123" autocomplete="off" />
        <button type="button" id="validateTagBtn">Validar</button>
      </div>
      <small class="tag-feedback" id="tagFeedback"></small>
    </label>

    <label class="field auth-field">
      <span>Nick</span>
      <input id="playerNick" type="text" placeholder="Será preenchido após validar" disabled />
    </label>

    <label class="field auth-field">
      <span>Email</span>
      <input id="loginEmail" type="email" placeholder="seu@email.com" autocomplete="email" />
    </label>

    <label class="field auth-field">
      <span>Senha</span>
      <div class="password-wrap">
        <input id="signupPassword" type="password" placeholder="Crie uma senha" autocomplete="new-password" />
        <button type="button" class="eye-btn" aria-label="Mostrar senha" onclick="togglePassword('signupPassword', this)">${eyeSvg()}</button>
      </div>
    </label>

    <button class="primary-btn auth-main-btn" type="button">Confirmar cadastro</button>

    <div class="member-access compact">
      <span>Já tem conta?</span>
      <button type="button" class="inline-link" onclick="showLoginFace()">Login</button>
    </div>
  `;

  document.querySelector('#authFlip').classList.add('is-flipped');

  const validateBtn = document.querySelector('#validateTagBtn');
  validateBtn.addEventListener('click', validatePlayerTagMock);
}

function validatePlayerTagMock(){
  const tagInput = document.querySelector('#playerTag');
  const nickInput = document.querySelector('#playerNick');
  const feedback = document.querySelector('#tagFeedback');
  const btn = document.querySelector('#validateTagBtn');

  const value = String(tagInput.value || '').trim();

  feedback.className = 'tag-feedback';
  nickInput.value = '';

  if(!value){
    feedback.textContent = 'Digite uma tag para validar.';
    feedback.classList.add('error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Validando...';
  feedback.textContent = 'Consultando jogador...';
  feedback.classList.add('loading');

  setTimeout(()=>{
    const normalized = value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`;

    if(normalized.length < 5){
      feedback.className = 'tag-feedback error';
      feedback.textContent = 'Tag inválida. Confira e tente novamente.';
      btn.disabled = false;
      btn.textContent = 'Validar';
      return;
    }

    tagInput.value = normalized;
    nickInput.value = normalized === '#DEMO123' ? 'Pedrin Demo' : 'Jogador validado';
    feedback.className = 'tag-feedback success';
    feedback.textContent = 'Tag validada com sucesso.';
    btn.disabled = false;
    btn.textContent = 'Validado';
    btn.classList.add('validated');
  }, 850);
}


function openForgotPasswordPopup(){
  let overlay = document.querySelector('#forgotPasswordOverlay');

  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'forgotPasswordOverlay';
    overlay.className = 'premium-modal-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="premium-modal glass-panel">
      <button type="button" class="modal-close" onclick="closeForgotPasswordPopup()" aria-label="Fechar">×</button>

      <div class="modal-eyebrow">Recuperação de acesso</div>
      <h2>Esqueci minha senha</h2>
      <p>Digite seu e-mail cadastrado para receber o link de recuperação.</p>

      <label class="field modal-field">
        <span>Email</span>
        <input id="recoveryEmail" type="email" placeholder="seu@email.com" autocomplete="email" />
      </label>

      <button class="primary-btn modal-action" type="button" onclick="sendRecoveryMock()">Enviar recuperação</button>

      <small id="recoveryFeedback" class="modal-feedback"></small>
    </div>
  `;

  requestAnimationFrame(()=> overlay.classList.add('show'));
}

function closeForgotPasswordPopup(){
  const overlay = document.querySelector('#forgotPasswordOverlay');
  if(!overlay) return;
  overlay.classList.remove('show');
  setTimeout(()=> overlay.remove(), 220);
}

function sendRecoveryMock(){
  const input = document.querySelector('#recoveryEmail');
  const feedback = document.querySelector('#recoveryFeedback');
  const email = String(input?.value || '').trim();

  feedback.className = 'modal-feedback';

  if(!email || !email.includes('@')){
    feedback.textContent = 'Informe um e-mail válido.';
    feedback.classList.add('error');
    return;
  }

  feedback.textContent = 'Link de recuperação enviado. Verifique sua caixa de entrada.';
  feedback.classList.add('success');
  setTimeout(()=> closeForgotPasswordPopup(), 1200);
}

function hideAuthFace(){
  const flip = document.querySelector('#authFlip');
  if(flip) flip.classList.remove('is-flipped');
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
        <div class="clan-icon"><img src="${clan.badge}" alt="" referrerpolicy="no-referrer" onerror="this.src=\'assets/icons/clan.svg\'"></div>
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
  document.querySelector('#createAdmin').addEventListener('click', async ()=>{
    const btn = document.querySelector('#createAdmin');
    const inputs = document.querySelectorAll('.admin-box input');

    const nome = String(inputs[0]?.value || '').trim();
    const email = String(inputs[1]?.value || '').trim();
    const senha = String(inputs[2]?.value || '').trim();
    const playerTag = normalizeClanTag(inputs[3]?.value || '#DEMO123');

    if(!nome || !email || !senha){
      alert('Preencha nome, email e senha.');
      return;
    }

    if(typeof createClanAdmin !== 'function'){
      alert('Firebase não carregou. Verifique auth.js e firebase-config.js.');
      return;
    }

    try{
      btn.disabled = true;
      btn.textContent = 'Criando conta...';

      await createClanAdmin({
        nome,
        email,
        senha,
        playerTag,
        clanTag: clan.tag,
        clanName: clan.name,
        clanData: clan
      });

    }catch(error){
      alert('Erro ao criar admin: ' + error.message);
      btn.disabled = false;
      btn.textContent = 'Criar conta e iniciar clã';
    }
  });

      // createClanAdmin redireciona para dashboard.html ao finalizar.
    }catch(error){
      alert('Erro ao criar admin: ' + error.message);
      btn.disabled = false;
      btn.textContent = 'Criar conta e iniciar clã';
    }
  });
}

function renderSuccess(){
  onboardShell(5, `
    <div class="success-seal">✓</div>
    <div class="onboard-heading">
      <h1>Clã configurado!</h1>
      <p>O ambiente do seu clã está pronto para começar.</p>
    </div>
    <button class="primary-btn" type="button" onclick="window.location.href='dashboard.html'">Entrar no sistema</button>
  `);
}

renderSearch();
