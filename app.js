const form = document.querySelector('#clanForm');
const tagInput = document.querySelector('#clanTag');
const result = document.querySelector('#resultBox');
const resultName = document.querySelector('#resultName');
const resultMeta = document.querySelector('#resultMeta');
const closeResult = document.querySelector('#closeResult');

function normalizeClanTag(value){
  const cleaned = String(value || '').trim().toUpperCase().replace(/\s+/g,'');
  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const tag = normalizeClanTag(tagInput.value || '#ABC123');
  tagInput.value = tag;
  resultName.textContent = tag === '#ABC123' ? 'Os Brabos BR' : 'Clã encontrado';
  resultMeta.textContent = `${tag} • aguardando integração API`;
  result.classList.remove('hidden');
});

closeResult.addEventListener('click', () => result.classList.add('hidden'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
