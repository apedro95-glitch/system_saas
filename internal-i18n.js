const STAGE3_LANG_KEY = 'topbrs_language';
const STAGE3 = {
  'pt-BR': {
    'dashboard.title':'DASHBOARD','dashboard.subtitle':'Visão geral do seu clã','dashboard.currentWar':'GUERRA ATUAL','dashboard.attacksUsed':'Ataques usados','dashboard.fame':'Fame','dashboard.highlights':'DESTAQUES','dashboard.topClan':'TOP DO CLÃ','dashboard.mostActive':'MAIS ATIVO','dashboard.mostDonations':'MAIS DOAÇÕES','dashboard.latestNotifications':'ÚLTIMAS NOTIFICAÇÕES','dashboard.notifications':'Notificações','dashboard.notificationsText':'Últimas mensagens do seu clã','dashboard.badgeEyebrow':'Emblema do clã','dashboard.chooseBadge':'Escolher emblema','dashboard.chooseBadgeText':'Selecione o emblema que representa seu clã.',
    'war.title':'Guerra','war.subtitle':'Acompanhe o desempenho do clã na guerra semanal','war.current':'GUERRA ATUAL','war.inProgress':'EM ANDAMENTO','war.week':'Semana','war.day':'Dia','war.member':'MEMBRO','war.fame':'FAME','war.attacks':'ATAQUES','war.usedAttacks':'Ataques usados',
    'classification.title':'Classificação','classification.subtitle':'Confira os rankings do clã','classification.general':'Geral','classification.tournament':'Torneio','classification.donations':'Doações','classification.pos':'POS','classification.member':'MEMBRO','classification.points':'PONTOS','classification.sent':'ENV','classification.received':'REC',
    'members.title':'Membros','members.subtitle':'Lista de membros do clã.','members.count':'{{count}} membros','members.search':'Buscar membro...','members.filter':'Filtro','members.filterTitle':'Filtrar membros','members.all':'Todos','members.admin':'Admin','members.coLeader':'Co-líder','members.elder':'Ancião','members.member':'Membro',
    'nav.war':'Guerra','nav.classification':'Class.','nav.members':'Membros','nav.home':'Início','nav.tournament':'Torneio','nav.leadership':'Liderança','nav.settings':'Config.',
    'construction.eyebrow':'Aviso','construction.title':'Menu em construção…🚧','construction.text':'Essa área será liberada nas próximas etapas.','common.close':'Fechar','common.noData':'Sem dados','common.soon':'Em breve','common.attacks':'ataques'
  },
  'en-US': {
    'dashboard.title':'DASHBOARD','dashboard.subtitle':'Clan overview','dashboard.currentWar':'CURRENT WAR','dashboard.attacksUsed':'Attacks used','dashboard.fame':'Fame','dashboard.highlights':'HIGHLIGHTS','dashboard.topClan':'TOP CLAN','dashboard.mostActive':'MOST ACTIVE','dashboard.mostDonations':'MOST DONATIONS','dashboard.latestNotifications':'LATEST NOTIFICATIONS','dashboard.notifications':'Notifications','dashboard.notificationsText':'Latest clan messages','dashboard.badgeEyebrow':'Clan badge','dashboard.chooseBadge':'Choose badge','dashboard.chooseBadgeText':'Select the badge that represents your clan.',
    'war.title':'War','war.subtitle':'Track your clan performance in weekly war','war.current':'CURRENT WAR','war.inProgress':'IN PROGRESS','war.week':'Week','war.day':'Day','war.member':'MEMBER','war.fame':'FAME','war.attacks':'ATTACKS','war.usedAttacks':'Attacks used',
    'classification.title':'Ranking','classification.subtitle':'Check your clan rankings','classification.general':'General','classification.tournament':'Tournament','classification.donations':'Donations','classification.pos':'POS','classification.member':'MEMBER','classification.points':'POINTS','classification.sent':'SENT','classification.received':'RCV',
    'members.title':'Members','members.subtitle':'Clan member list.','members.count':'{{count}} members','members.search':'Search member...','members.filter':'Filter','members.filterTitle':'Filter members','members.all':'All','members.admin':'Admin','members.coLeader':'Co-leader','members.elder':'Elder','members.member':'Member',
    'nav.war':'War','nav.classification':'Rank','nav.members':'Members','nav.home':'Home','nav.tournament':'Tournament','nav.leadership':'Leadership','nav.settings':'Settings',
    'construction.eyebrow':'Notice','construction.title':'Menu under construction…🚧','construction.text':'This area will be released in the next stages.','common.close':'Close','common.noData':'No data','common.soon':'Soon','common.attacks':'attacks'
  },
  'es-ES': {
    'dashboard.title':'PANEL','dashboard.subtitle':'Resumen de tu clan','dashboard.currentWar':'GUERRA ACTUAL','dashboard.attacksUsed':'Ataques usados','dashboard.fame':'Fama','dashboard.highlights':'DESTACADOS','dashboard.topClan':'TOP DEL CLAN','dashboard.mostActive':'MÁS ACTIVO','dashboard.mostDonations':'MÁS DONACIONES','dashboard.latestNotifications':'ÚLTIMAS NOTIFICACIONES','dashboard.notifications':'Notificaciones','dashboard.notificationsText':'Últimos mensajes de tu clan','dashboard.badgeEyebrow':'Emblema del clan','dashboard.chooseBadge':'Elegir emblema','dashboard.chooseBadgeText':'Selecciona el emblema que representa a tu clan.',
    'war.title':'Guerra','war.subtitle':'Acompaña el rendimiento del clan en la guerra semanal','war.current':'GUERRA ACTUAL','war.inProgress':'EN CURSO','war.week':'Semana','war.day':'Día','war.member':'MIEMBRO','war.fame':'FAMA','war.attacks':'ATAQUES','war.usedAttacks':'Ataques usados',
    'classification.title':'Clasificación','classification.subtitle':'Consulta los rankings del clan','classification.general':'General','classification.tournament':'Torneo','classification.donations':'Donaciones','classification.pos':'POS','classification.member':'MIEMBRO','classification.points':'PUNTOS','classification.sent':'ENV','classification.received':'REC',
    'members.title':'Miembros','members.subtitle':'Lista de miembros del clan.','members.count':'{{count}} miembros','members.search':'Buscar miembro...','members.filter':'Filtro','members.filterTitle':'Filtrar miembros','members.all':'Todos','members.admin':'Admin','members.coLeader':'Colíder','members.elder':'Veterano','members.member':'Miembro',
    'nav.war':'Guerra','nav.classification':'Clasif.','nav.members':'Miembros','nav.home':'Inicio','nav.tournament':'Torneo','nav.leadership':'Liderazgo','nav.settings':'Config.',
    'construction.eyebrow':'Aviso','construction.title':'Menú en construcción…🚧','construction.text':'Esta área se liberará en las próximas etapas.','common.close':'Cerrar','common.noData':'Sin datos','common.soon':'Pronto','common.attacks':'ataques'
  }
};
function lang(){ return (window.TopBRSI18n?.getLanguage?.() || localStorage.getItem(STAGE3_LANG_KEY) || 'pt-BR'); }
function t(key, vars={}){ let value=(STAGE3[lang()]||STAGE3['pt-BR'])[key] || STAGE3['pt-BR'][key] || key; Object.entries(vars).forEach(([k,v])=> value=value.replaceAll(`{{${k}}}`, v)); return value; }
function set(selector,key,root=document){ root.querySelectorAll(selector).forEach(el=>{ el.textContent=t(key); }); }
function setAttr(selector,attr,key,root=document){ root.querySelectorAll(selector).forEach(el=>{ el.setAttribute(attr,t(key)); }); }
function setByText(text,key,root=document){ root.querySelectorAll('span,b,strong,h1,h2,p,small,button,div.modal-eyebrow').forEach(el=>{ if((el.childNodes.length===1) && el.textContent.trim()===text) el.textContent=t(key); }); }
function applyStage3(root=document){
  // Dashboard
  set('.dash-title-card h1','dashboard.title',root); set('.dash-title-card p','dashboard.subtitle',root);
  set('.go-war-card .dash-card-head > span','dashboard.currentWar',root);
  const warGrid=root.querySelectorAll('.go-war-card .war-grid small'); if(warGrid[0]) warGrid[0].textContent=t('dashboard.attacksUsed'); if(warGrid[1]) warGrid[1].textContent=t('dashboard.fame');
  set('.dash-section-label','dashboard.highlights',root); set('.dashboard-notification-list .dash-section-label','dashboard.latestNotifications',root);
  const highlights=root.querySelectorAll('.highlight-grid article > span'); if(highlights[0]) highlights[0].textContent=t('dashboard.topClan'); if(highlights[1]) highlights[1].textContent=t('dashboard.mostActive'); if(highlights[2]) highlights[2].textContent=t('dashboard.mostDonations');
  root.querySelectorAll('[data-highlight-top-name],[data-highlight-donations-name]').forEach(el=>{ if(['Sem dados','No data','Sin datos'].includes(el.textContent.trim())) el.textContent=t('common.noData'); });
  root.querySelectorAll('[data-highlight-active-name]').forEach(el=>{ if(['Em breve','Soon','Pronto'].includes(el.textContent.trim())) el.textContent=t('common.soon'); });
  root.querySelectorAll('[data-highlight-active-value]').forEach(el=>{ const n=parseInt(el.textContent,10); if(Number.isFinite(n)) el.textContent=`${n} ${t('common.attacks')}`; });
  set('.notifications-modal-head .modal-eyebrow','dashboard.latestNotifications',root); set('.notifications-modal-head h2','dashboard.notifications',root); set('.notifications-modal-head p','dashboard.notificationsText',root);
  set('.clan-badge-picker-modal .modal-eyebrow','dashboard.badgeEyebrow',root); set('.clan-badge-picker-modal h2','dashboard.chooseBadge',root); set('.clan-badge-picker-modal p','dashboard.chooseBadgeText',root);
  // War
  set('.war-heading-text h1','war.title',root); set('.war-heading-text .war-subtitle','war.subtitle',root); setByText('GUERRA ATUAL','war.current',root); setByText('EM ANDAMENTO','war.inProgress',root); setByText('Semana','war.week',root); setByText('Dia','war.day',root); setByText('MEMBRO','war.member',root); setByText('FAME','war.fame',root); setByText('ATAQUES','war.attacks',root); setByText('Ataques usados','war.usedAttacks',root);
  // Classification
  set('.ranking-header h1','classification.title',root); set('.ranking-header p','classification.subtitle',root); setByText('Geral','classification.general',root); setByText('Torneio','classification.tournament',root); setByText('Doações','classification.donations',root); setByText('POS','classification.pos',root); setByText('MEMBRO','classification.member',root); setByText('PONTOS','classification.points',root); setByText('ENV','classification.sent',root); setByText('REC','classification.received',root);
  // Members
  set('.members-header h1','members.title',root); set('.members-header p','members.subtitle',root); const countEl=root.querySelector('#membersCount'); if(countEl){ const n=(countEl.textContent.match(/\d+/)||['0'])[0]; countEl.textContent=t('members.count',{count:n}); }
  setAttr('#memberSearch','placeholder','members.search',root); setAttr('.member-filter-btn','aria-label','members.filter',root); set('.member-filter-modal .modal-eyebrow','members.filter',root); set('.member-filter-modal h2','members.filterTitle',root);
  const roleMap={all:'members.all',admin:'members.admin','co-leader':'members.coLeader',elder:'members.elder',member:'members.member'}; root.querySelectorAll('.member-filter-options button[data-role]').forEach(btn=>{ btn.textContent=t(roleMap[btn.dataset.role]||'members.member'); });
  // Bottom nav
  const navKeys=['nav.war','nav.classification','nav.members','nav.home','nav.tournament','nav.leadership','nav.settings']; root.querySelectorAll('.bottom-nav .nav-btn span').forEach((span,i)=>{ if(navKeys[i]) span.textContent=t(navKeys[i]); });
  // Construction/common
  set('.construction-modal .modal-eyebrow','construction.eyebrow',root); set('.construction-modal h2','construction.title',root); set('.construction-modal p','construction.text',root); setAttr('.modal-close','aria-label','common.close',root);
}
function boot(){ applyStage3(); window.addEventListener('topbrs:languagechange',()=>setTimeout(()=>applyStage3(),0)); const mo=new MutationObserver(m=>{ if(m.some(x=>x.addedNodes.length)) setTimeout(()=>applyStage3(),0); }); mo.observe(document.body,{childList:true,subtree:true}); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
