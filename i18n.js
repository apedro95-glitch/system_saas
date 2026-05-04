const TOPBRS_LANG_KEY = 'topbrs_language';
const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US', 'es-ES'];
const LANGUAGE_LABELS = {
  'pt-BR': 'Português (BR)',
  'en-US': 'English (US)',
  'es-ES': 'Español (ES)'
};
let currentLanguage = null;
let currentDictionary = {};

function normalizeLanguage(language){
  const value = String(language || '').trim();
  if(SUPPORTED_LANGUAGES.includes(value)) return value;
  const lower = value.toLowerCase();
  if(lower.startsWith('en')) return 'en-US';
  if(lower.startsWith('es')) return 'es-ES';
  if(lower.startsWith('pt')) return 'pt-BR';
  return 'pt-BR';
}

function getInitialLanguage(){
  return normalizeLanguage(localStorage.getItem(TOPBRS_LANG_KEY) || navigator.language || 'pt-BR');
}

async function fetchDictionary(language){
  try{
    const response = await fetch(`assets/i18n/${language}.json?v=i18n-stage1`, {cache:'no-store'});
    if(!response.ok) throw new Error(`i18n ${language} ${response.status}`);
    return await response.json();
  }catch(error){
    if(language !== 'pt-BR') return fetchDictionary('pt-BR');
    console.warn('Falha ao carregar idioma:', error);
    return {};
  }
}

function formatTemplate(text, values = {}){
  return String(text || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key)=> values[key] ?? '');
}

function translate(key, values){
  return formatTemplate(currentDictionary[key] || key, values);
}

function setTextPreservingBreaks(element, text){
  const parts = String(text || '').split('\n');
  element.textContent = '';
  parts.forEach((part, index)=>{
    if(index) element.appendChild(document.createElement('br'));
    element.appendChild(document.createTextNode(part));
  });
}

function applyTranslations(root = document){
  root.querySelectorAll('[data-i18n]').forEach(element=>{
    setTextPreservingBreaks(element, translate(element.dataset.i18n));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(element=>{
    element.setAttribute('placeholder', translate(element.dataset.i18nPlaceholder));
  });
  root.querySelectorAll('[data-i18n-title]').forEach(element=>{
    element.setAttribute('title', translate(element.dataset.i18nTitle));
  });
  root.querySelectorAll('[data-i18n-aria-label]').forEach(element=>{
    element.setAttribute('aria-label', translate(element.dataset.i18nAriaLabel));
  });
  root.querySelectorAll('[data-i18n-current-language]').forEach(element=>{
    element.textContent = LANGUAGE_LABELS[currentLanguage] || LANGUAGE_LABELS['pt-BR'];
  });
  root.querySelectorAll('[data-language-option]').forEach(button=>{
    const active = button.dataset.languageOption === currentLanguage;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  document.documentElement.lang = currentLanguage || 'pt-BR';
}

async function setLanguage(language, options = {}){
  currentLanguage = normalizeLanguage(language);
  currentDictionary = await fetchDictionary(currentLanguage);
  localStorage.setItem(TOPBRS_LANG_KEY, currentLanguage);
  applyTranslations();
  window.dispatchEvent(new CustomEvent('topbrs:languagechange', {detail:{language:currentLanguage}}));
  if(options.closePopup){
    document.querySelector('#settingsLanguageOverlay')?.classList.remove('show');
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
  }
  return currentLanguage;
}

function bindLanguageControls(){
  document.addEventListener('click', event=>{
    const languageButton = event.target.closest('[data-language-option]');
    if(languageButton){
      event.preventDefault();
      setLanguage(languageButton.dataset.languageOption, {closePopup: true});
      return;
    }
    if(event.target.closest('#openLanguagePopup')){
      event.preventDefault();
      const overlay = document.querySelector('#settingsLanguageOverlay');
      overlay?.classList.add('show');
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
      applyTranslations();
      return;
    }
    if(event.target.closest('[data-close-language-popup]') || event.target.id === 'settingsLanguageOverlay'){
      document.querySelector('#settingsLanguageOverlay')?.classList.remove('show');
      if(!document.querySelector('.settings-popup-overlay.show,.avatar-picker-overlay.show,.plan-manager-overlay.show')){
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
      }
    }
  });
}

window.TopBRSI18n = {
  setLanguage,
  getLanguage: ()=>currentLanguage,
  t: translate,
  apply: applyTranslations,
  supported: SUPPORTED_LANGUAGES,
  labels: LANGUAGE_LABELS
};

bindLanguageControls();
setLanguage(getInitialLanguage());
