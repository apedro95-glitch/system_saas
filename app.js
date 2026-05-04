const app = document.querySelector('#app');
const API_FALLBACK_URL = '';
window.TOPBRS_APP_VERSION = 'i18n-stage2-login-fix-1';
function i18nT(key, values = {}){ return window.TopBRSI18n?.t ? window.TopBRSI18n.t(key, values) : key; }
function languageSwitchMarkup(){ return `<div class="language-switch auth-language-switch" aria-label="Idioma"><button type="button" data-language-option="pt-BR">PT</button><button type="button" data-language-option="en-US">EN</button><button type="button" data-language-option="es-ES">ES</button></div>`; }
function applyI18nNow(){ setTimeout(()=>window.TopBRSI18n?.apply?.(),0); }

function bindAuthFlipDelegates(){
  if(window.__topbrsAuthFlipDelegatesBound) return;
  window.__topbrsAuthFlipDelegatesBound = true;
  document.addEventListener('click', event => {
    const login = event.target.closest('#openLogin,[data-auth-open="login"]');
    const signup = event.target.closest('#openSignup,[data-auth-open="signup"]');
    const back = event.target.closest('#backToClan,[data-auth-back="clan"]');
    if(login){
      event.preventDefault();
      event.stopPropagation();
      showLoginFace();
      return;
    }
    if(signup){
      event.preventDefault();
      event.stopPropagation();
      showSignupFace();
      return;
    }
    if(back){
      event.preventDefault();
      event.stopPropagation();
      hideAuthFace();
    }
  }, true);
}



function cleanApiUrl(value){
  return String(value || '').trim().replace(/\/+$/, '');
}

function isValidApiUrl(value){
  return /^https?:\/\//i.test(String(value || ''));
}

async function getApiBaseUrl(){
  try{
    const mod = await import('./api-config.js?v=api-member-fix-1');
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
    const mod = await import('./api-config.js?v=api-member-fix-1');
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
let selectedOnboardingBadge = '';
let onboardingPlan = 'trial';

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
  const statusKey = isSuccess ? 'auth.sheet.clanFound' : isRegistered ? 'auth.sheet.clanRegistered' : isNotReleased ? 'auth.sheet.notReleased' : isApiError ? 'auth.sheet.apiUnavailable' : 'auth.sheet.clanNotFound';
  const title = isSuccess ? (data.name || i18nT('auth.sheet.clanFound')) : isRegistered ? i18nT('auth.sheet.registeredTitle') : isNotReleased ? i18nT('auth.sheet.notReleasedTitle') : isApiError ? i18nT('auth.sheet.apiErrorTitle') : i18nT('auth.sheet.notFoundTitle');
  const message = isSuccess
    ? `${data.tag || ''} • ${i18nT('auth.sheet.membersCount', {count: data.members || '—'})}`
    : isRegistered
      ? i18nT('auth.sheet.registeredText')
      : isNotReleased
        ? i18nT('auth.sheet.notReleasedText')
        : isApiError
          ? i18nT('auth.sheet.apiErrorText')
          : i18nT('auth.sheet.notFoundText');

  overlay.innerHTML = `
    <div class="clan-result-sheet glass-panel ${isSuccess ? 'success' : isRegistered ? 'registered' : isNotReleased ? 'not-released' : isApiError ? 'api-error' : 'error'}">
      <button type="button" class="sheet-close" id="closeClanSheet" aria-label="${i18nT('common.close')}">×</button>

      <div class="sheet-clan-icon real-clan-badge-sheet">
        ${isSuccess || isRegistered || isNotReleased ? `<img src="${data.badge || 'assets/icons/clan.svg'}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='assets/icons/clan.svg'">` : `<img src="assets/icons/clan.svg" alt="">`}
      </div>

      <div class="sheet-content">
        <p class="sheet-eyebrow">${i18nT(statusKey)}</p>
        <h3>${title}</h3>
        <p>${message}</p>
      </div>

      ${isSuccess ? `<button class="gold-btn sheet-confirm" type="button" id="sheetConfirmClan">${i18nT('auth.confirmClan')}</button>` : ''}
      ${isRegistered ? `<button class="primary-btn sheet-confirm" type="button" id="sheetLoginClan">${i18nT('auth.login')}</button>` : ''}
      ${isNotReleased ? `<button class="gold-btn sheet-confirm" type="button" id="sheetSubscribe">${i18nT('auth.subscribeNow')}</button>` : ''}
      ${isApiError ? `<button class="primary-btn sheet-confirm error-btn" type="button" id="sheetTryAgain">${i18nT('auth.tryAgain')}</button>` : ''}
      ${!isSuccess && !isRegistered && !isNotReleased && !isApiError ? `<button class="primary-btn sheet-confirm error-btn" type="button" id="sheetTryAgain">${i18nT('auth.tryAgain')}</button>` : ''}
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
    badgeSrc: badge,
    badgeUrl: badge,
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
    ${languageSwitchMarkup()}
    <section class="auth-card glass-panel" aria-labelledby="authTitle">
      <div class="brand-block">
        ${brandShield()}
        <p class="brand-kicker">TOPBRS</p>
        <p class="brand-sub">MULTI CLÃ</p>
      </div>

      <div class="auth-copy">
        <h1 id="authTitle" data-i18n="auth.welcomeTitle">Bem-vindo ao<br>TopBRS Multi-Clã</h1>
        <p data-i18n="auth.welcomeText">Gerencie seu clã com inteligência, estratégia e dados em tempo real.</p>
      </div>

      <div class="flip-wrap" id="authFlip">
        <div class="flip-card-inner">

          <form class="setup-box glass-inset flip-face flip-front" id="clanForm">
            <h2 data-i18n="auth.registerClan">Cadastre seu clã</h2>

            <label class="field">
              <span data-i18n="auth.clanTag">Tag do clã</span>
              <input id="clanTag" name="clanTag" type="text" inputmode="text" autocomplete="off" placeholder="Ex: #ABC123" data-i18n-placeholder="auth.clanTagPlaceholder" />
            </label>

            <button class="primary-btn" type="submit">
              <span data-i18n="auth.searchClan">Buscar Clã</span>
            </button>

            <div class="member-access">
              <span data-i18n="auth.alreadyMember">Já é membro?</span>
              <button type="button" class="inline-link" id="openLogin" data-auth-open="login" onclick="showLoginFace()" data-i18n="auth.login">Login</button>
              <span data-i18n="auth.or">ou</span>
              <button type="button" class="inline-link" id="openSignup" data-auth-open="signup" onclick="showSignupFace()" data-i18n="auth.signup">Cadastre-se</button>
            </div>

            <button class="link-btn sign-link" type="button" id="learnMore"><b data-i18n="auth.subscribeNow">Assine agora!</b></button>
          </form>

          <div class="setup-box glass-inset flip-face flip-back" id="authBack">
            <button type="button" class="flip-close" id="backToClan" data-auth-back="clan" onclick="hideAuthFace()" aria-label="${i18nT('common.back')}">×</button>
            <div id="authBackContent"></div>
          </div>

        </div>
      </div>
    </section>
  `;
  applyI18nNow();

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
      if(btnText) btnText.textContent = i18nT('auth.searching');

      const apiClan = await fetchClanFromApi(tag);
      clan = mapApiClan(apiClan);
      selectedOnboardingBadge = clan.badge || 'assets/icons/clan.svg';

      localStorage.setItem('selectedClan', clan.tag);
      localStorage.setItem('topbrs_pending_clan', JSON.stringify(clan));

      const saasChecker = await waitForSaasAccessChecker();
      if(saasChecker){
        const access = await saasChecker(clan.tag);
        onboardingPlan = normalizePlanForAssets(access?.access?.plan || access?.plan || 'trial');
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
      console.error(error);
      showClanResultSheet(error?.code === 'API_UNAVAILABLE' ? 'apiError' : 'error');
    }finally{
      if(btn) btn.disabled = false;
      if(btnText) btnText.textContent = i18nT('auth.searchClan');
    }
  });

  document.querySelector('#learnMore')?.addEventListener('click', ()=>{window.location.href='subscribe.html';});
  document.querySelector('#openLogin')?.addEventListener('click', ()=>showLoginFace());
  document.querySelector('#openSignup')?.addEventListener('click', ()=>showSignupFace());
  document.querySelector('#backToClan')?.addEventListener('click', hideAuthFace);
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
    <h2 data-i18n="auth.loginTitle">Acessar sistema</h2>
    <p class="auth-mode-copy" data-i18n="auth.loginText">Entre com seu email e senha para continuar.</p>

    <label class="field auth-field">
      <span data-i18n="auth.email">Email</span>
      <input id="loginEmail" type="email" placeholder="seu@email.com" data-i18n-placeholder="auth.emailPlaceholder" autocomplete="email" />
    </label>

    <label class="field auth-field">
      <span data-i18n="auth.password">Senha</span>
      <div class="password-wrap">
        <input id="loginPassword" type="password" placeholder="Sua senha" data-i18n-placeholder="auth.passwordPlaceholder" autocomplete="current-password" />
        <button type="button" class="eye-btn" aria-label="Mostrar senha" onclick="togglePassword('loginPassword', this)">${eyeSvg()}</button>
      </div>
    </label>

    <button class="primary-btn auth-main-btn" id="loginBtn" type="button" data-i18n="auth.enter">Entrar</button>
    <small class="login-error-text" id="loginError" hidden></small>

    <button class="link-btn forgot-btn" type="button" onclick="openForgotPasswordPopup()"><b data-i18n="auth.forgotPassword">Esqueci minha senha</b></button>

    <div class="member-access compact">
      <span data-i18n="auth.noAccount">Ainda não tem conta?</span>
      <button type="button" class="inline-link" onclick="showSignupFace()" data-i18n="auth.signup">Cadastre-se</button>
    </div>
  `;

  document.querySelector('#authFlip')?.classList.add('is-flipped');
  applyI18nNow();

  document.querySelector('#loginBtn')?.addEventListener('click', async ()=>{
    const email = String(document.querySelector('#loginEmail')?.value || '').trim();
    const senha = String(document.querySelector('#loginPassword')?.value || '').trim();

    if(!email || !senha){
      alert(i18nT('auth.enterEmailPassword'));
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
      btn.textContent = i18nT('auth.entering');
      await loginUser({ email, senha });
    }catch(error){
      const errorText = document.querySelector('#loginError');
      if(errorText){
        errorText.textContent = i18nT('auth.invalidLogin');
        errorText.hidden = false;
      }
      btn.disabled = false;
      btn.textContent = i18nT('auth.enter');
    }
  });
}

function showSignupFace(){
  const content = document.querySelector('#authBackContent');
  content.innerHTML = `
    <h2 data-i18n="auth.signupTitle">Criar cadastro</h2>
    <p class="auth-mode-copy" data-i18n="auth.signupText">Valide sua tag para vincular seu perfil ao clã.</p>

    <label class="field auth-field">
      <span data-i18n="auth.name">Nome</span>
      <input id="signupName" type="text" placeholder="Seu nome" data-i18n-placeholder="auth.namePlaceholder" autocomplete="name" />
    </label>

    <label class="field auth-field">
      <span>Tag do clã</span>
      <input id="signupClanTag" type="text" placeholder="#CLAN123" autocomplete="off" />
    </label>

    <label class="field auth-field">
      <span data-i18n="auth.playerTag">Tag do jogador</span>
      <div class="input-with-btn">
        <input id="playerTag" type="text" placeholder="#PLAYER123" autocomplete="off" />
        <button type="button" id="validateTagBtn" data-i18n="auth.validate">Validar</button>
      </div>
      <small class="tag-feedback" id="tagFeedback"></small>
    </label>

    <label class="field auth-field">
      <span data-i18n="auth.nick">Nick</span>
      <input id="playerNick" type="text" placeholder="Será preenchido após validar" data-i18n-placeholder="auth.nickAfterValidate" disabled />
    </label>

    <label class="field auth-field">
      <span data-i18n="auth.email">Email</span>
      <input id="signupEmail" type="email" placeholder="seu@email.com" data-i18n-placeholder="auth.emailPlaceholder" autocomplete="email" />
    </label>

    <label class="field auth-field">
      <span data-i18n="auth.password">Senha</span>
      <div class="password-wrap">
        <input id="signupPassword" type="password" placeholder="Crie uma senha" data-i18n-placeholder="auth.createPassword" autocomplete="new-password" />
        <button type="button" class="eye-btn" aria-label="Mostrar senha" onclick="togglePassword('signupPassword', this)">${eyeSvg()}</button>
      </div>
    </label>

    <button class="primary-btn auth-main-btn" id="signupBtn" type="button" disabled data-i18n="auth.confirmSignup">Confirmar cadastro</button>

    <div class="member-access compact">
      <span data-i18n="auth.hasAccount">Já tem conta?</span>
      <button type="button" class="inline-link" onclick="showLoginFace()" data-i18n="auth.login">Login</button>
    </div>
  `;

  document.querySelector('#authFlip')?.classList.add('is-flipped');
  applyI18nNow();

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
      alert(i18nT('auth.fillSignupFields'));
      return;
    }

    localStorage.setItem('selectedClan', clanTag);

    if(playerTagInput?.dataset.validated !== 'true'){
      alert(i18nT('auth.validateBeforeSignup'));
      return;
    }

    if(typeof registerUser !== 'function'){
      alert('Cadastro ainda não carregou. Verifique auth.js.');
      return;
    }

    try{
      const btn = document.querySelector('#signupBtn');
      btn.disabled = true;
      btn.textContent = i18nT('auth.creatingSignup');
      await registerUser({ email, senha, playerTag: normalizeClanTag(playerTag), clanTag, nome, nick });
    }catch(error){
      alert('Erro ao cadastrar: ' + error.message);
      const btn = document.querySelector('#signupBtn');
      btn.disabled = false;
      btn.textContent = i18nT('auth.confirmSignup');
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
    feedback.textContent = i18nT('auth.enterTagToValidate');
    feedback.classList.add('error');
    return;
  }

  const normalized = normalizeClanTag(value);
  const selectedClan = normalizeClanTag(document.querySelector('#signupClanTag')?.value || localStorage.getItem('selectedClan') || localStorage.getItem('topbrs_clan_tag') || '');

  if(!selectedClan){
    feedback.textContent = i18nT('auth.enterClanTagFirst');
    feedback.classList.add('error');
    return;
  }

  localStorage.setItem('selectedClan', selectedClan);

  btn.disabled = true;
  btn.textContent = i18nT('auth.validating');
  feedback.textContent = i18nT('auth.checkingPreRegistration');
  feedback.classList.add('loading');

  try{
    if(typeof window.checkMemberPreRegistration !== 'function'){
      feedback.className = 'tag-feedback error';
      feedback.textContent = i18nT('auth.validationNotLoaded');
      btn.disabled = false;
      btn.textContent = i18nT('auth.validate');
      return;
    }

    const result = await window.checkMemberPreRegistration({
      clanTag: selectedClan,
      playerTag: normalized
    });

    if(!result?.allowed){
      feedback.className = 'tag-feedback error';
      feedback.textContent = result?.message || i18nT('auth.tagNotPreRegistered');
      btn.disabled = false;
      btn.textContent = i18nT('auth.validate');
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
      ? i18nT('auth.tagValidatedApi')
      : i18nT('auth.tagValidatedPre');

    if(signupBtn) signupBtn.disabled = false;
    btn.disabled = false;
    btn.textContent = i18nT('auth.validated');
    btn.classList.add('validated');

  }catch(error){
    console.error(error);
    feedback.className = 'tag-feedback error';
    feedback.textContent = i18nT('auth.tagValidationError');
    btn.disabled = false;
    btn.textContent = i18nT('auth.validate');
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
        <span data-i18n="auth.email">Email</span>
        <input id="recoveryEmail" type="email" placeholder="seu@email.com" data-i18n-placeholder="auth.emailPlaceholder" autocomplete="email" />
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
  const labels = ['onboarding.search','onboarding.confirm','onboarding.import','onboarding.admin','onboarding.finish'].map(key=>i18nT(key));
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
        <div class="onboard-title" data-i18n="onboarding.title">Onboarding</div>
        <div></div>
      </div>
      ${stepper(active)}
      ${languageSwitchMarkup()}
      ${content}
    </section>`;
  applyI18nNow();
  const back = document.querySelector('#backBtn');
  if(back){
    back.addEventListener('click', ()=>{
      if(currentStep === steps.CONFIRM) return window.addEventListener('topbrs:languagechange', ()=>{ applyI18nNow(); });
bindAuthFlipDelegates();
renderSearch();
      if(currentStep === steps.IMPORT) currentStep = steps.CONFIRM;
      else if(currentStep === steps.ADMIN) currentStep = steps.CONFIRM;
      else if(currentStep === steps.SUCCESS) currentStep = steps.ADMIN;
      renderCurrent();
    });
  }
}

function renderCurrent(){
  if(currentStep === steps.SEARCH) return window.addEventListener('topbrs:languagechange', ()=>{ applyI18nNow(); });
bindAuthFlipDelegates();
renderSearch();
  if(currentStep === steps.CONFIRM) return renderConfirm();
  if(currentStep === steps.IMPORT) return renderImport();
  if(currentStep === steps.ADMIN) return renderAdmin();
  if(currentStep === steps.SUCCESS) return renderSuccess();
}



function normalizePlanForAssets(plan){
  const p = String(plan || 'trial').toLowerCase();
  if(['basic','basico','básico'].includes(p)) return 'basic';
  if(p === 'plus') return 'plus';
  if(p === 'premium') return 'premium';
  return 'trial';
}
function canUseBadgeIndex(index){
  const p = normalizePlanForAssets(onboardingPlan);
  if(p === 'trial' || p === 'basic') return index < 5;
  return true;
}
function getClanBadgeOptions(){
  return Array.from({length:300}, (_,i)=>`assets/badges/clanbadge${i+1}.webp`);
}
function openOnboardingBadgePicker(){
  let overlay = document.querySelector('#onboardBadgePickerOverlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'onboardBadgePickerOverlay';
    overlay.className = 'clan-badge-picker-overlay onboard-badge-picker-overlay';
    overlay.innerHTML = `<div class="clan-badge-picker-modal glass-panel">
      <button class="modal-close" id="closeOnboardBadgePicker" aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke="currentColor" stroke-width="2.35" stroke-linecap="round"/></svg></button>
      <div class="modal-eyebrow">Emblema do clã</div><h2>Escolher emblema</h2>
      <p id="onboardBadgeSubtitle"></p><div class="clan-badge-picker-grid" id="onboardBadgePickerGrid"></div></div>`;
    document.body.appendChild(overlay);
  }
  const p = normalizePlanForAssets(onboardingPlan);
  const subtitle = overlay.querySelector('#onboardBadgeSubtitle');
  if(subtitle) subtitle.textContent = (p === 'trial' || p === 'basic') ? 'Seu plano libera 5 emblemas. Faça UPGRADE para liberar todos.' : 'Selecione o emblema que será usado no seu sistema.';
  const grid = overlay.querySelector('#onboardBadgePickerGrid');
  grid.innerHTML = getClanBadgeOptions().map((src,index)=>{
    const locked = !canUseBadgeIndex(index);
    return `<button type="button" class="clan-badge-choice ${locked?'locked':''}" data-src="${src}" ${locked?'disabled':''}>
      <img src="${src}" alt="" loading="lazy" onerror="this.closest('button').remove()">
      ${locked ? `<span class="badge-lock"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2.4" fill="currentColor"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></span>` : ''}
    </button>`;
  }).join('');
  grid.querySelectorAll('.clan-badge-choice:not(.locked)').forEach(btn=>btn.addEventListener('click',()=>{
    selectedOnboardingBadge = btn.dataset.src;
    if(clan){clan.badge=selectedOnboardingBadge; clan.badgeSrc=selectedOnboardingBadge; clan.badgeUrl=selectedOnboardingBadge; localStorage.setItem('topbrs_pending_clan', JSON.stringify(clan));}
    const preview=document.querySelector('#onboardClanBadgePreview'); if(preview) preview.src=selectedOnboardingBadge;
    closeOnboardingBadgePicker();
  }));
  overlay.querySelector('#closeOnboardBadgePicker')?.addEventListener('click', closeOnboardingBadgePicker);
  overlay.addEventListener('click',e=>{if(e.target.id==='onboardBadgePickerOverlay') closeOnboardingBadgePicker();},{once:true});
  document.body.classList.add('modal-open'); document.documentElement.classList.add('modal-open'); overlay.classList.add('show');
}
function closeOnboardingBadgePicker(){
  const overlay = document.querySelector('#onboardBadgePickerOverlay');
  overlay?.classList.remove('show'); document.body.classList.remove('modal-open'); document.documentElement.classList.remove('modal-open');
}
function bindOnboardingBadgePicker(){
  const wrap=document.querySelector("#onboardClanBadgePreviewWrap");
  wrap?.addEventListener("click", openOnboardingBadgePicker);
  wrap?.addEventListener("keydown", e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openOnboardingBadgePicker(); }});
  document.querySelector("#onboardBadgeEditBtn")?.addEventListener("click", event=>{
    event.preventDefault();
    event.stopPropagation();
    openOnboardingBadgePicker();
  });
}

function renderConfirm(){
  onboardShell(2, `
    <div class="onboard-heading">
      <h1 data-i18n="onboarding.clanFoundTitle">Clã encontrado!</h1>
    </div>

    <div class="clan-confirm-card">
      <div class="clan-main">
        <div class="clan-icon real-clan-badge onboard-clan-badge-preview-wrap" id="onboardClanBadgePreviewWrap" role="button" tabindex="0" aria-label="Escolher emblema do clã">
          <img id="onboardClanBadgePreview" src="${selectedOnboardingBadge || clan.badge}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='assets/icons/clan.svg'">
          <button class="onboard-badge-edit-dot" id="onboardBadgeEditBtn" type="button" aria-label="Editar emblema"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5h4.2L19.1 9.1a2.2 2.2 0 0 0 0-3.1L18 4.9a2.2 2.2 0 0 0-3.1 0L4.5 15.3v4.2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13.8 6 18 10.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
        </div>
        <div>
          <h2>${clan.name}</h2>
          <p>${clan.tag}</p>
        </div>
      </div>
      <div class="clan-stats">
        <div class="clan-stat"><span data-i18n="onboarding.members">Membros</span><strong>👤 ${clan.members}</strong></div>
        <div class="clan-stat"><span data-i18n="onboarding.trophies">Troféus</span><strong>🏆 ${clan.trophies}</strong></div>
        <div class="clan-stat"><span data-i18n="onboarding.country">País</span><strong class="clan-country-label" title="${clan.location}">${clan.countryFlag || '🏳️'} ${clan.location}</strong></div>
      </div>
    </div>

    <div class="confirm-copy">
      <h3 data-i18n="onboarding.correctClan">Este é o clã correto?</h3>
      <p data-i18n="onboarding.correctClanText">Confira os dados acima e confirme para continuar.</p>
    </div>

    <button class="gold-btn" id="confirmClan" data-i18n="auth.confirmClan">Confirmar Clã</button>
    <button class="ghost-btn" id="otherClan" data-i18n="onboarding.searchAnotherClan">Buscar outro clã</button>
  `);
  bindOnboardingBadgePicker();
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
        <h1 data-i18n="onboarding.importingMembers">Importando membros</h1>
        <p data-i18n="onboarding.importingMembersText">Estamos buscando os membros do seu clã na API do Clash Royale.</p>
      </div>

      <div class="import-progress animated-import" style="--progress:${Math.min(100, Math.round((currentImported / totalMembers) * 100))}%">
        <div class="progress-inner">
          <div>
            <strong id="importCount">${currentImported}</strong><br>
            <span>/${totalMembers}</span>
          </div>
        </div>
      </div>
      <p class="import-sub"><strong>${currentImported >= importedMembers.length ? i18nT('onboarding.importedSuccess') : i18nT('onboarding.importingMembersProgress')}</strong></p>

      <div class="import-list">
        ${listMarkup}
      </div>

      <div class="note-box" data-i18n="onboarding.doNotClose">Não feche o app durante a importação.</div>
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
      <h1 data-i18n="onboarding.createAdminTitle">Criar conta admin</h1>
      <p data-i18n="onboarding.createAdminText">Você será o administrador principal deste clã.</p>
    </div>
    <div class="admin-box">
      <label class="field"><span data-i18n="auth.name">Nome</span><input placeholder="Seu nome" data-i18n-placeholder="auth.namePlaceholder"></label>
      <label class="field"><span data-i18n="auth.email">Email</span><input type="email" placeholder="admin@email.com"></label>
      <label class="field"><span data-i18n="auth.password">Senha</span><input type="password" placeholder="Crie uma senha" data-i18n-placeholder="auth.createPassword"></label>
      <label class="field"><span data-i18n="auth.playerTag">Tag do jogador</span><input placeholder="#PLAYER123"></label>
    </div>
    <button class="primary-btn" id="createAdmin" data-i18n="onboarding.createAdminButton">Criar conta e iniciar clã</button>
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
      <h1 data-i18n="onboarding.successTitle">Clã configurado!</h1>
      <p data-i18n="onboarding.successText">O ambiente do seu clã está pronto para começar.</p>
    </div>
    <button class="primary-btn" type="button" onclick="window.location.href='dashboard.html'"><span data-i18n="onboarding.enterSystem">Entrar no sistema</span></button>
  `);
}

window.togglePassword = togglePassword;
window.showSignupFace = showSignupFace;
window.showLoginFace = showLoginFace;
window.hideAuthFace = hideAuthFace;
window.openForgotPasswordPopup = openForgotPasswordPopup;
window.closeForgotPasswordPopup = closeForgotPasswordPopup;
window.sendRecoveryMock = sendRecoveryMock;

/* Service Worker desativado temporariamente para evitar cache antigo durante testes da API. */

window.addEventListener('topbrs:languagechange', ()=>{ applyI18nNow(); });
bindAuthFlipDelegates();
renderSearch();

function showPlanExpiredPopupOnIndex(){
  const expired = new URLSearchParams(location.search).get("expired") === "1" || localStorage.getItem("topbrs_plan_expired") === "1";
  if(!expired) return;
  localStorage.removeItem("topbrs_plan_expired");
  const overlay=document.createElement("div");
  overlay.className="clan-result-sheet-overlay show";
  overlay.innerHTML=`
    <section class="clan-result-sheet glass-panel plan-expired-sheet">
      <button class="close-btn" aria-label="Fechar">×</button>
      <div class="mini-shield"><img src="assets/icons/clan.svg" alt=""></div>
      <p class="eyebrow">PLANO EXPIRADO</p>
      <h2>Assinatura expirada</h2>
      <p>Renove seu plano para continuar acessando o sistema do seu clã.</p>
      <button class="primary-btn" type="button" id="renewPlanBtn"><span>Renovar plano</span></button>
    </section>`;
  document.body.appendChild(overlay);
  overlay.querySelector(".close-btn")?.addEventListener("click",()=>overlay.remove());
  overlay.querySelector("#renewPlanBtn")?.addEventListener("click",()=>{location.href="subscribe.html";});
}
showPlanExpiredPopupOnIndex();


/* ===== Stage 2 login/cadastro robust fix v2 ===== */
function topbrsAuthClickHandler(event){
  const login = event.target.closest?.('#openLogin,[data-auth-open="login"]');
  const signup = event.target.closest?.('#openSignup,[data-auth-open="signup"]');
  const back = event.target.closest?.('#backToClan,[data-auth-back="clan"]');
  if(!login && !signup && !back) return;
  event.preventDefault();
  event.stopPropagation();
  if(login) return showLoginFace();
  if(signup) return showSignupFace();
  return hideAuthFace();
}
['click','pointerup','touchend'].forEach(type=>{
  document.addEventListener(type, topbrsAuthClickHandler, {capture:true, passive:false});
});
function forceBindAuthButtons(){
  const login = document.querySelector('#openLogin,[data-auth-open="login"]');
  const signup = document.querySelector('#openSignup,[data-auth-open="signup"]');
  const back = document.querySelector('#backToClan,[data-auth-back="clan"]');
  if(login) login.onclick = event => { event?.preventDefault?.(); showLoginFace(); };
  if(signup) signup.onclick = event => { event?.preventDefault?.(); showSignupFace(); };
  if(back) back.onclick = event => { event?.preventDefault?.(); hideAuthFace(); };
}
const authButtonObserver = new MutationObserver(()=>forceBindAuthButtons());
authButtonObserver.observe(document.body, {childList:true, subtree:true});
forceBindAuthButtons();
