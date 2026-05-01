
// PLAN LOCK SYSTEM
function getPlan(){
  return localStorage.getItem('plan') || 'trial';
}

function lockBadges(){
  const plan = getPlan();
  const badges = document.querySelectorAll('.badge-item');

  let limit = 5;
  if(plan === 'plus') limit = 10;
  if(plan === 'premium') limit = 999;

  badges.forEach((b,i)=>{
    if(i >= limit){
      b.classList.add('locked');
      b.innerHTML += '<span class="lock">🔒</span>';
      b.onclick = ()=>alert('Faça upgrade para liberar');
    }
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  setTimeout(lockBadges, 500);
});
