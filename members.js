const membersData = [
  {name:'Pedrin', role:'Líder', key:'admin', trophies:12350, current:true, perm:'perm-admin.svg'},
  {name:'Lucas', role:'Co-líder', key:'co-leader', trophies:11420, current:false, perm:'perm-co-leader.svg'},
  {name:'Vini', role:'Ancião', key:'elder', trophies:10210, current:false, perm:'perm-member.svg'},
  {name:'Samuel', role:'Ancião', key:'elder', trophies:9850, current:false, perm:'perm-member.svg'},
  {name:'Kaio', role:'Membro', key:'member', trophies:8920, current:false, perm:'perm-visitor.svg'},
  {name:'Gabriel', role:'Membro', key:'member', trophies:7650, current:false, perm:'perm-visitor.svg'},
  {name:'Matheus', role:'Membro', key:'member', trophies:6480, current:false, perm:'perm-visitor.svg'},
  {name:'Felipe', role:'Membro', key:'member', trophies:5230, current:false, perm:'perm-visitor.svg'}
];

let activeRole = 'all';

function formatNumber(value){ return value.toLocaleString('pt-BR'); }

function renderMembers(){
  const list = document.querySelector('#membersList');
  const search = (document.querySelector('#memberSearch')?.value || '').toLowerCase().trim();

  const filtered = membersData.filter(member=>{
    const matchSearch = member.name.toLowerCase().includes(search) || member.role.toLowerCase().includes(search);
    const matchRole = activeRole === 'all' || member.key === activeRole;
    return matchSearch && matchRole;
  });

  document.querySelector('#membersCount').textContent = `${membersData.length} membros`;

  if(!filtered.length){
    list.innerHTML = `<div class="empty-members">Nenhum membro encontrado</div>`;
    return;
  }

  list.innerHTML = filtered.map(member=>`
    <article class="member-row ${member.current ? 'current-member' : ''}">
      <div class="member-avatar">
        <img src="assets/icons/profile-user.svg" alt="" aria-hidden="true">
      </div>
      <div class="member-info">
        <strong>${member.name}</strong>
        <span>${member.role}</span>
      </div>
      <img class="member-perm" src="assets/icons/${member.perm}" alt="${member.role}">
      <div class="member-trophies">
        <strong>${formatNumber(member.trophies)}</strong>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 4h8v3.2a4 4 0 0 1-8 0V4Z" fill="currentColor"/>
          <path d="M6 4h2v2.2A2.8 2.8 0 0 1 5.2 9H4V6a2 2 0 0 1 2-2Z" fill="currentColor" opacity=".72"/>
          <path d="M18 4h-2v2.2A2.8 2.8 0 0 0 18.8 9H20V6a2 2 0 0 0-2-2Z" fill="currentColor" opacity=".72"/>
          <rect x="10.2" y="13" width="3.6" height="3.2" rx=".7" fill="currentColor"/>
          <rect x="7.4" y="16" width="9.2" height="2.2" rx="1" fill="currentColor"/>
        </svg>
      </div>
    </article>
  `).join('');
}

document.querySelector('#memberSearch')?.addEventListener('input', renderMembers);

document.querySelector('#memberFilterBtn')?.addEventListener('click', ()=>{
  document.body.classList.add('modal-open');
  document.documentElement.classList.add('modal-open');
  document.querySelector('#memberFilterOverlay')?.classList.add('show');
});

function closeMemberFilter(){
  document.querySelector('#memberFilterOverlay')?.classList.remove('show');
  document.body.classList.remove('modal-open');
  document.documentElement.classList.remove('modal-open');
}

document.querySelector('#closeMemberFilter')?.addEventListener('click', closeMemberFilter);
document.querySelector('#memberFilterOverlay')?.addEventListener('click', event=>{
  if(event.target.id === 'memberFilterOverlay') closeMemberFilter();
});

document.querySelectorAll('.member-filter-options button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    activeRole = btn.dataset.role;
    document.querySelectorAll('.member-filter-options button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    renderMembers();
    closeMemberFilter();
  });
});

document.querySelector('.members-sync-btn')?.addEventListener('click', ()=>{
  const btn = document.querySelector('.members-sync-btn');
  btn.classList.add('spinning');
  setTimeout(()=>btn.classList.remove('spinning'), 900);
});

renderMembers();
