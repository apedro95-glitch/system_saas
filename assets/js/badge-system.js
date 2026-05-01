
// AUTO BADGE LOADER
async function loadBadges() {
  const container = document.getElementById('badge-list');
  if(!container) return;

  container.innerHTML = '';

  for(let i=1;i<=50;i++){
    const img = document.createElement('img');
    img.src = `assets/badges/clanbadge${i}.webp`;
    img.className = 'badge-item';
    img.onclick = ()=>selectBadge(img.src);
    img.onerror = ()=>img.remove();
    container.appendChild(img);
  }
}

function selectBadge(src){
  localStorage.setItem('clanBadge', src);
  document.querySelectorAll('.clan-badge').forEach(el=>{
    el.src = src;
  });
}

document.addEventListener('DOMContentLoaded', loadBadges);
