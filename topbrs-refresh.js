import { syncClanAndMembersFromApi } from './real-data.js';
import { syncWarSilently } from './war-logic.js';

async function refreshAll(btn){
  if(btn?.classList.contains('loading')) return;
  btn?.classList.add('loading');
  btn?.setAttribute('aria-busy','true');
  try{
    await syncClanAndMembersFromApi();
    await syncWarSilently();
    if(typeof window.topbrsAfterRefresh === 'function') await window.topbrsAfterRefresh();
    window.dispatchEvent(new CustomEvent('topbrs:data-refreshed'));
    btn?.classList.add('success');
    setTimeout(()=>btn?.classList.remove('success'), 1100);
  }catch(error){
    console.warn('Atualização manual falhou:', error);
    btn?.classList.add('error');
    setTimeout(()=>btn?.classList.remove('error'), 1400);
  }finally{
    btn?.classList.remove('loading');
    btn?.removeAttribute('aria-busy');
  }
}
window.topbrsRefreshAll = refreshAll;
document.querySelectorAll('.topbrs-refresh-btn').forEach(btn=>btn.addEventListener('click',()=>refreshAll(btn)));
