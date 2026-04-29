const app = document.querySelector('#app');
const API_FALLBACK_URL = '';
window.TOPBRS_APP_VERSION = 'saas-refresh-persist-1';

function cleanApiUrl(value){
  return String(value || '').trim().replace(/\/+$/, '');
}

function isValidApiUrl(value){
  return /^https?:\/\//i.test(String(value || ''));
}

async function getApiBaseUrl(){
  try{
    const mod = await import('./api-config.js?v=saas-refresh-persist-1');
    const url = cleanApiUrl(await mod.getApiBaseUrl({ force: true }));
    if(isValidApiUrl(url)){
      window.TOPBRS_ACTIVE_API_URL = url;
      console.log('TOPBRS API URL:', url);
      return url;
    }
  }catch(error){
    console.warn('Falha ao carregar system/config.apiUrl pelo Firestore:', error);
  }

  const fallback = cleanApiUrl(
    window.TOPBRS_API_URL ||
    localStorage.getItem('TOPBRS_API_URL') ||
    localStorage.getItem('topbrs_api_url') ||
    API_FALLBACK_URL
  );

  window.TOPBRS_ACTIVE_API_URL = fallback;
  console.warn('Usando API fallback:', fallback);
  return fallback;
}

async function getApiBaseCandidates(){
  const urls = [];

  try{
    const mod = await import('./api-config.js?v=saas-refresh-persist-1');
    const configUrl = cleanApiUrl(await mod.getApiBaseUrl({ force: true }));
    if(isValidApiUrl(configUrl)) urls.push(configUrl);
  }catch(error){
    console.warn('Não foi possível montar candidatos pelo Firestore:', error);
  }

  urls.push(
    cleanApiUrl(window.TOPBRS_API_URL),
    cleanApiUrl(localStorage.getItem('TOPBRS_API_URL')),
    cleanApiUrl(localStorage.getItem('topbrs_api_url')),
    cleanApiUrl(API_FALLBACK_URL)
  );

  const unique = [...new Set(urls.filter(isValidApiUrl))];
  console.log('TOPBRS API candidates:', unique);
  return unique;
}

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
  if(!cleaned) return '';
  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
}

function cleanTag(value){
  return normalizeClanTag(value).replace('#','');
}


function getClanBadgeUrl(apiClan){
  const direct =
    apiClan?.badgeUrls?.large ||
    apiClan?.badgeUrls?.medium ||
    apiClan?.badgeUrls?.small;

  if(direct) return direct;

  if(apiClan?.badgeId){
    return `https://cdn.royaleapi.com/static/img/badges/${apiClan.badgeId}.png`;
  }

  return 'assets/icons/clan.svg';
}

function countryCodeToFlag(code){
  const cc = String(code || '').toUpperCase();
  if(!/^[A-Z]{2}$/.test(cc)) return '🏳️';
  return cc.replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
}

function showClanResultSheet(type, data = {}){
  let overlay = document.querySelector('#clanResultSheetOverlay');

  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'clanResultSheetOverlay';
    overlay.className = 'clan-result-sheet-overlay';
    document.body.appendChild(overlay);
  }

  const isSuccess = type === 'success';
  const isRegistered = type === 'registered';
  const isNotReleased = type === 'notReleased';
  const isApiError = type === 'apiError';

  const eyebrow = isSuccess ? 'CLÃ ENCONTRADO' : isRegistered ? 'CLÃ JÁ CADASTRADO' : isNotReleased ? 'ASSINATURA NÃO LIBERADA' : isApiError ? 'API INDISPONÍVEL' : 'CLÃ NÃO ENCONTRADO';
  const title = isSuccess ? data.name : isRegistered ? 'Clã já cadastrado' : isNotReleased ? 'Clã sem liberação' : isApiError ? 'Erro na API' : 'Clã não encontrado';
  const message = isSuccess
    ? `${data.tag} • ${data.members} membros`
    : isRegistered
      ? 'Faça login ou solicite acesso ao administrador.'
      : isNotReleased
        ? 'Assine agora ou fale com o suporte para liberar o teste.'
        : isApiError
          ? 'O servidor não respondeu. Verifique o tunnel/API e tente novamente.'
          : 'Confira a tag e tente novamente.';

  overlay.innerHTML = `
    <div class="clan-result-sheet glass-panel ${isSuccess ? 'success' : isRegistered ? 'registered' : isNotReleased ? 'not-released' : isApiError ? 'api-error' : 'error'}">
      <button type="button" class="sheet-close" id="closeClanSheet" aria-label="Fechar">×</button>

      <div class="sheet-clan-icon real-clan-badge-sheet">
        ${isSuccess || isRegistered || isNotReleased ? `<img src="${data.badge || 'assets/icons/clan.svg'}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='assets/icons/clan.svg'">` : `<img src="assets/icons/clan.svg" alt="">`}
      </div>

      <div class="sheet-content">
        <p class="sheet-eyebrow">${eyebrow}</p>
        <h3>${title}</h3>
        <p>${message}</p>
      </div>

      ${isSuccess ? `<button class="gold-btn sheet-confirm" type="button" id="sheetConfirmClan">Confirmar Clã</button>` : ''}
      ${isRegistered ? `<button class="primary-btn sheet-confirm" type="button" id="sheetLoginClan">Fazer login</button>` : ''}
      ${isNotReleased ? `<button class="gold-btn sheet-confirm" type="button" id="sheetSubscribe">Assine agora</button>` : ''}
      ${isApiError ? `<button class="primary-btn sheet-confirm error-btn" type="button" id="sheetTryAgain">Tentar novamente</button>` : ''}
      ${!isSuccess && !isRegistered && !isNotReleased && !isApiError ? `<button class="primary-btn sheet-confirm error-btn" type="button" id="sheetTryAgain">Tentar novamente</button>` : ''}
    </div>
  `;

  requestAnimationFrame(()=> overlay.classList.add('show'));

  document.querySelector('#closeClanSheet')?.addEventListener('click', closeClanResultSheet);
  document.querySelector('#sheetTryAgain')?.addEventListener('click', closeClanResultSheet);
  document.querySelector('#sheetLoginClan')?.addEventListener('click', ()=>{
    closeClanResultSheet();
    showLoginFace();
  });
  document.querySelector('#sheetSubscribe')?.addEventListener('click', ()=>{
    window.location.href = 'subscribe.html';
  });
  document.querySelector('#sheetConfirmClan')?.addEventListener('click', ()=>{
    closeClanResultSheet();
    currentStep = steps.CONFIRM;
    renderConfirm();
  });
}

function closeClanResultSheet(){
  const overlay = document.querySelector('#clanResultSheetOverlay');
  if(!overlay) return;
  overlay.classList.remove('show');
  setTimeout(()=> overlay.remove(), 220);
}


async function fetchClanFromApi(tag){
  const cleaned = cleanTag(tag);
  const urls = [];

  for(const base of await getApiBaseCandidates()){
    urls.push(`${base}/api/clan/${encodeURIComponent(cleaned)}`);
    urls.push(`${base}/api/clan/%23${encodeURIComponent(cleaned)}`);
  }

  let lastError = null;
  let receivedApiResponse = false;

  for(const url of [...new Set(urls)]){
    try{
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      let data = null;
      try{
        data = await response.json();
      }catch(error){
        lastError = new Error('Resposta inválida da API.');
        continue;
      }

      receivedApiResponse = true;

      const foundClan =
        (data?.ok === true && data?.clan) ? data.clan :
        data?.clan ||
        data?.data?.clan ||
        data?.data ||
        (data?.ok === true && data?.tag ? data : null) ||
        (data?.tag && data?.name ? data : null) ||
        (data?.memberList && (data?.name || data?.tag) ? data : null);

      if(response.ok && foundClan && (foundClan.tag || foundClan.name || Array.isArray(foundClan.memberList))){
        return foundClan;
      }

      // Se uma URL respondeu "não encontrado", tenta a próxima candidata antes de falhar.
      lastError = new Error(data?.message || data?.reason || data?.details?.reason || `HTTP ${response.status}`);
    }catch(error){
      lastError = error;
    }
  }

  const msg = String(lastError?.message || '').toLowerCase();

  if(!receivedApiResponse || msg.includes('failed to fetch') || msg.includes('network') || msg.includes('resposta inválida')){
    const err = new Error('API indisponível. Verifique o tunnel/backend.');
    err.code = 'API_UNAVAILABLE';
    throw err;
  }

  const err = new Error(lastError?.message || 'Clã não encontrado.');
  err.code = 'CLAN_NOT_FOUND';
  throw err;
}

async function fetchClanMembersFromApi(tag){
  try{
    const apiBaseUrl = await getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/clan/${encodeURIComponent(cleanTag(tag))}/members`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    const data = await response.json();

    if(!response.ok){
      return [];
    }

    if(Array.isArray(data?.members)) return data.members;
    if(Array.isArray(data?.memberList)) return data.memberList;
    if(Array.isArray(data?.clan?.memberList)) return data.clan.memberList;
    if(Array.isArray(data?.data?.memberList)) return data.data.memberList;
    return [];
  }catch(error){
    console.warn('Não foi possível carregar membros reais agora:', error);
    return [];
  }
}


async function fetchPlayerFromApi(tag){
  const endpoints = [
    `${await getApiBaseUrl()}/api/player/${encodeURIComponent(cleanTag(tag))}`,
    `${await getApiBaseUrl()}/api/member/${encodeURIComponent(cleanTag(tag))}`
  ];

  for(const url of endpoints){
    try{
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });

      if(!response.ok) continue;

      const data = await response.json();
      if(data?.ok && (data.player || data.member || data.data)){
        return data.player || data.member || data.data;
      }
    }catch(error){
      console.warn('Endpoint de jogador indisponível:', url, error);
    }
  }

  return null;
}

function mapApiClan(apiClan){
  const countryCode = apiClan.location?.countryCode || '';
  const badge = getClanBadgeUrl(apiClan);

  return {
    name: apiClan.name || 'Clã encontrado',
    tag: apiClan.tag || '#SEM_TAG',
    badge,
    badgeId: apiClan.badgeId || null,
    members: apiClan.members || apiClan.memberList?.length || 0,
    trophies: Number(apiClan.clanScore || apiClan.clanWarTrophies || 0).toLocaleString('pt-BR'),
    countryCode,
    countryFlag: countryCodeToFlag(countryCode),
    location: apiClan.location?.name || 'Não informado',
    raw: apiClan
  };
}


async function waitForSaasAccessChecker(){
  if(typeof window.checkSaasAccessForOnboarding === 'function') return window.checkSaasAccessForOnboarding;
  await new Promise(resolve=>setTimeout(resolve, 180));
  return typeof window.checkSaasAccessForOnboarding === 'function' ? window.checkSaasAccessForOnboarding : null;
}

async function waitForClanStatusChecker(){
  if(typeof window.checkClanOnboardingStatus === 'function') return window.checkClanOnboardingStatus;
  await new Promise(resolve=>setTimeout(resolve, 180));
  return typeof window.checkClanOnboardingStatus === 'function' ? window.checkClanOnboardingStatus : null;
}

function mapApiMembers(apiMembers){
  return apiMembers.map((m)=>({
    name: m.name || 'Membro',
    tag: m.tag || '#SEM_TAG',
    role: m.role || 'member',
    trophies: m.trophies || 0,
    done: false
  }));
}

function getDemoMembers(){
  return [
    {name:'Pedrin', tag:'#PLP9QG8R', done:false},
    {name:'Lucas', tag:'#G9QJ80P', done:false},
    {name:'Vini', tag:'#LJ9Q2PP', done:false},
    {name:'Samuel', tag:'#Q2J9LP', done:false}
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

  document.querySelector('#clanForm')?.addEventListener('submit', async (event)=>{
    event.preventDefault();

    const form = event.currentTarget;
    const input = document.querySelector('#clanTag');
    const btn = form.querySelector('button[type="submit"]');
    const btnText = btn?.querySelector('span');
    const tag = normalizeClanTag(input?.value || '');

    if(!tag || tag === '#'){
      showClanResultSheet('error');
      return;
    }

    try{
      if(btn) btn.disabled = true;
      if(btnText) btnText.textContent = 'Buscando...';

      const apiClan = await fetchClanFromApi(tag);
      clan = mapApiClan(apiClan);

      localStorage.setItem('selectedClan', clan.tag);
      localStorage.setItem('topbrs_pending_clan', JSON.stringify(clan));

      const saasChecker = await waitForSaasAccessChecker();
      if(saasChecker){
        const access = await saasChecker(clan.tag);
        if(!access?.allowed){
          showClanResultSheet('notReleased', clan);
          return;
        }
      }

      const checker = await waitForClanStatusChecker();
      if(checker){
        const status = await checker(clan.tag);
        if(status?.exists && status?.locked){
          showClanResultSheet('registered', clan);
          return;
        }
      }

      showClanResultSheet('success', clan);

    }catch(error){
      console.error('Erro ao buscar clã real:', error);
      showClanResultSheet(error?.code === 'API_UNAVAILABLE' ? 'apiError' : 'error');
    }finally{
      if(btn) btn.disabled = false;
      if(btnText) btnText.textContent = 'Buscar Clã';
    }
  });

  document.querySelector('#openLogin')?.addEventListener('click', ()=>showLoginFace());
  document.querySelector('#openSignup')?.addEventListener('click', ()=>showSignupFace());
  document.querySelector('#backToClan')?.addEventListener('click', ()=>hideAuthFace());
  document.querySelector('#learnMore')?.addEventListener('click', ()=>{ window.location.href='subscribe.html'; });
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
    <small class="login-error-text" id="loginError" hidden></small>

    <button class="link-btn forgot-btn" type="button" onclick="openForgotPasswordPopup()"><b>Esqueci minha senha</b></button>

    <div class="member-access compact">
      <span>Ainda não tem conta?</span>
      <button type="button" class="inline-link" onclick="showSignupFace()">Cadastre-se</button>
    </div>
  `;

  document.querySelector('#authFlip')?.classList.add('is-flipped');

  document.querySelector('#loginBtn')?.addEventListener('click', async ()=>{
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

    const btn = document.querySelector('#loginBtn');

    try{
      const errorText = document.querySelector('#loginError');
      if(errorText){
        errorText.hidden = true;
        errorText.textContent = '';
      }

      btn.disabled = true;
      btn.textContent = 'Entrando...';
      await loginUser({ email, senha });
    }catch(error){
      const errorText = document.querySelector('#loginError');
      if(errorText){
        errorText.textContent = 'E-mail ou senha incorreto';
        errorText.hidden = false;
      }
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  });
}

function showSignupFace(){
  const content = document.querySelector('#authBackContent');
  content.innerHTML = `
    <h2>Criar cadastro</h2>
    <p class="auth-mode-copy">Valide sua tag para vincular seu perfil ao clã.</p>

    <label class="field auth-field">
      <span>Nome</span>
      <input id="signupName" type="text" placeholder="Seu nome" autocomplete="name" />
    </label>

    <label class="field auth-field">
      <span>Tag do clã</span>
      <input id="signupClanTag" type="text" placeholder="#CLAN123" autocomplete="off" />
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
      <input id="signupEmail" type="email" placeholder="seu@email.com" autocomplete="email" />
    </label>

    <label class="field auth-field">
      <span>Senha</span>
      <div class="password-wrap">
        <input id="signupPassword" type="password" placeholder="Crie uma senha" autocomplete="new-password" />
        <button type="button" class="eye-btn" aria-label="Mostrar senha" onclick="togglePassword('signupPassword', this)">${eyeSvg()}</button>
      </div>
    </label>

    <button class="primary-btn auth-main-btn" id="signupBtn" type="button" disabled>Confirmar cadastro</button>

    <div class="member-access compact">
      <span>Já tem conta?</span>
      <button type="button" class="inline-link" onclick="showLoginFace()">Login</button>
    </div>
  `;

  document.querySelector('#authFlip')?.classList.add('is-flipped');

  const savedClanTag = localStorage.getItem('selectedClan') || localStorage.getItem('topbrs_clan_tag') || '';
  const signupClanInput = document.querySelector('#signupClanTag');
  if(signupClanInput && savedClanTag) signupClanInput.value = savedClanTag;

  document.querySelector('#validateTagBtn')?.addEventListener('click', validatePlayerTagMock);

  document.querySelector('#signupBtn')?.addEventListener('click', async ()=>{
    const email = String(document.querySelector('#signupEmail')?.value || '').trim();
    const senha = String(document.querySelector('#signupPassword')?.value || '').trim();
    const playerTagInput = document.querySelector('#playerTag');
    const playerTag = String(playerTagInput?.value || '').trim();
    const clanTag = normalizeClanTag(document.querySelector('#signupClanTag')?.value || localStorage.getItem('selectedClan') || '');
    const nome = String(document.querySelector('#signupName')?.value || '').trim();
    const nick = String(document.querySelector('#playerNick')?.value || '').trim();

    if(!email || !senha || !playerTag || !clanTag){
      alert('Preencha email, senha, tag do clã e tag do jogador.');
      return;
    }

    localStorage.setItem('selectedClan', clanTag);

    if(playerTagInput?.dataset.validated !== 'true'){
      alert('Valide sua tag antes de confirmar o cadastro.');
      return;
    }

    if(typeof registerUser !== 'function'){
      alert('Cadastro ainda não carregou. Verifique auth.js.');
      return;
    }

    try{
      const btn = document.querySelector('#signupBtn');
      btn.disabled = true;
      btn.textContent = 'Criando cadastro...';
      await registerUser({ email, senha, playerTag: normalizeClanTag(playerTag), clanTag, nome, nick });
    }catch(error){
      alert('Erro ao cadastrar: ' + error.message);
      const btn = document.querySelector('#signupBtn');
      btn.disabled = false;
      btn.textContent = 'Confirmar cadastro';
    }
  });
}

async function validatePlayerTagMock(){
  const tagInput = document.querySelector('#playerTag');
  const nickInput = document.querySelector('#playerNick');
  const feedback = document.querySelector('#tagFeedback');
  const btn = document.querySelector('#validateTagBtn');
  const signupBtn = document.querySelector('#signupBtn');

  const value = String(tagInput?.value || '').trim();

  feedback.className = 'tag-feedback';
  nickInput.value = '';
  if(signupBtn) signupBtn.disabled = true;

  if(!value){
    feedback.textContent = 'Digite uma tag para validar.';
    feedback.classList.add('error');
    return;
  }

  const normalized = normalizeClanTag(value);
  const selectedClan = normalizeClanTag(document.querySelector('#signupClanTag')?.value || localStorage.getItem('selectedClan') || localStorage.getItem('topbrs_clan_tag') || '');

  if(!selectedClan){
    feedback.textContent = 'Digite a tag do clã antes de validar.';
    feedback.classList.add('error');
    return;
  }

  localStorage.setItem('selectedClan', selectedClan);

  btn.disabled = true;
  btn.textContent = 'Validando...';
  feedback.textContent = 'Verificando pré-cadastro...';
  feedback.classList.add('loading');

  try{
    if(typeof window.checkMemberPreRegistration !== 'function'){
      feedback.className = 'tag-feedback error';
      feedback.textContent = 'Validação do sistema ainda não carregou. Tente novamente.';
      btn.disabled = false;
      btn.textContent = 'Validar';
      return;
    }

    const result = await window.checkMemberPreRegistration({
      clanTag: selectedClan,
      playerTag: normalized
    });

    if(!result?.allowed){
      feedback.className = 'tag-feedback error';
      feedback.textContent = result?.message || 'Sua tag não está pré-cadastrada neste clã.';
      btn.disabled = false;
      btn.textContent = 'Validar';
      return;
    }

    // A API individual do jogador é opcional aqui.
    // Se existir, usamos para confirmar/atualizar o nick.
    // Se não existir no backend, o cadastro continua usando o pré-cadastro importado do clã.
    let player = null;
    try{
      player = await fetchPlayerFromApi(normalized);
    }catch(error){
      console.warn('Consulta individual do jogador indisponível. Usando pré-cadastro:', error);
    }

    const nick = player?.name || result.member?.name || 'Jogador validado';

    tagInput.value = normalized;
    nickInput.value = nick;
    tagInput.dataset.validated = 'true';
    tagInput.dataset.nick = nick;

    feedback.className = 'tag-feedback success';
    feedback.textContent = player
      ? 'Tag validada na API e pré-cadastro encontrado.'
      : 'Tag pré-cadastrada encontrada. Cadastro liberado.';

    if(signupBtn) signupBtn.disabled = false;
    btn.disabled = false;
    btn.textContent = 'Validado';
    btn.classList.add('validated');

  }catch(error){
    console.error(error);
    feedback.className = 'tag-feedback error';
    feedback.textContent = 'Erro ao validar a tag. Tente novamente.';
    btn.disabled = false;
    btn.textContent = 'Validar';
  }
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
        <div class="clan-icon real-clan-badge"><img src="${clan.badge}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='assets/icons/clan.svg'"></div>
        <div>
          <h2>${clan.name}</h2>
          <p>${clan.tag}</p>
        </div>
      </div>
      <div class="clan-stats">
        <div class="clan-stat"><span>Membros</span><strong>👤 ${clan.members}</strong></div>
        <div class="clan-stat"><span>Troféus</span><strong>🏆 ${clan.trophies}</strong></div>
        <div class="clan-stat"><span>País</span><strong class="clan-country-label" title="${clan.location}">${clan.countryFlag || '🏳️'} ${clan.location}</strong></div>
      </div>
    </div>

    <div class="confirm-copy">
      <h3>Este é o clã correto?</h3>
      <p>Confira os dados acima e confirme para continuar.</p>
    </div>

    <button class="gold-btn" id="confirmClan">Confirmar Clã</button>
    <button class="ghost-btn" id="otherClan">Buscar outro clã</button>
  `);
  document.querySelector('#confirmClan')?.addEventListener('click', ()=>{currentStep = steps.IMPORT; renderImport();});
  document.querySelector('#otherClan')?.addEventListener('click', ()=>renderSearch());
}

async function renderImport(){
  const realMembers = await fetchClanMembersFromApi(clan.tag);
  const mappedMembers = mapApiMembers(realMembers);
  importedMembers = (mappedMembers.length ? mappedMembers : getDemoMembers()).map((member)=>({...member, done:false}));

  let currentImported = 0;
  const totalMembers = clan?.members || importedMembers.length || 47;

  function paintImport(){
    const listMarkup = importedMembers.slice(0, 6).map((m,i)=>`
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

  let tick = 0;
  const stepsCount = Math.max(1, importedMembers.length);
  const interval = setInterval(()=>{
    if(tick < importedMembers.length){
      importedMembers[tick].done = true;
    }

    const progressRatio = Math.min(1, (tick + 1) / stepsCount);
    currentImported = Math.min(totalMembers, Math.max(1, Math.round(totalMembers * progressRatio)));
    tick++;
    paintImport();

    if(tick >= stepsCount){
      clearInterval(interval);
      setTimeout(()=>{
        currentStep = steps.ADMIN;
        renderAdmin();
      }, 650);
    }
  }, 420);
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
  document.querySelector('#createAdmin')?.addEventListener('click', async ()=>{
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
        clanData: clan,
        importedMembers
      });

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

window.togglePassword = togglePassword;
window.showSignupFace = showSignupFace;
window.showLoginFace = showLoginFace;
window.openForgotPasswordPopup = openForgotPasswordPopup;
window.closeForgotPasswordPopup = closeForgotPasswordPopup;
window.sendRecoveryMock = sendRecoveryMock;

/* Service Worker desativado temporariamente para evitar cache antigo durante testes da API. */

renderSearch();
