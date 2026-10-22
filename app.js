(() => {
  'use strict';
  const STORAGE_KEY = 'fullbody.data.v1';
  const BLOCKS = {
    A: { title: 'Máximo Gasto Calórico', subtitle: 'Pernas + Costas', color: '#81b8ff' },
    B: { title: 'Força e Definição Sem Dor', subtitle: 'Peito + Posterior de Pernas', color: '#b7f36b' },
    C: { title: 'Circuito Finalizador', subtitle: 'Braços + Core', color: '#d2a1ff' },
    D: { title: 'Outros exercícios', subtitle: 'Exercícios adicionais', color: '#f8c36b' }
  };
  const SEED_EXERCISES = [
    { id:'ex-smith', name:'Agachamento no Smith', group:'Pernas', secondary:'Glúteos', equipment:'Smith', block:'A', sets:4, reps:'10–12', rest:90, notes:'' },
    { id:'ex-pulley', name:'Puxada Alta no Pulley', group:'Costas', secondary:'Bíceps', equipment:'Polia alta', block:'A', sets:4, reps:'10–12', rest:75, notes:'' },
    { id:'ex-supino-maquina', name:'Supino Vertical Sentado na Máquina', group:'Peito', secondary:'Tríceps, ombros', equipment:'Máquina', block:'B', sets:4, reps:'10–12', rest:75, notes:'' },
    { id:'ex-flexora', name:'Cadeira Flexora Sentada', group:'Posterior de pernas', secondary:'', equipment:'Máquina', block:'B', sets:4, reps:'12–15', rest:60, notes:'' },
    { id:'ex-remada-triangulo', name:'Remada Baixa Sentada com Triângulo', group:'Costas', secondary:'Bíceps', equipment:'Polia baixa e triângulo', block:'C', sets:3, reps:'12', rest:60, notes:'' },
    { id:'ex-extensora', name:'Cadeira Extensora', group:'Quadríceps', secondary:'', equipment:'Máquina', block:'C', sets:3, reps:'12–15', rest:60, notes:'' },
    { id:'ex-lateral', name:'Elevação Lateral com Halteres', group:'Ombros', secondary:'', equipment:'Halteres', block:'C', sets:3, reps:'12–15', rest:45, notes:'' }
  ];
  const $ = (selector, root=document) => root.querySelector(selector);
  const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const todayLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
  const fmtDate = value => { if (!value) return '—'; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}); };
  const fmtTime = value => value ? new Date(value).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '—';
  const fmtDuration = total => { total = Math.max(0, Math.floor(Number(total)||0)); const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60; return h ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; };
  const formatNumber = value => Number(value||0).toLocaleString('pt-BR',{maximumFractionDigits:1});
  const parseReps = value => { const match=String(value||'').match(/\d+/); return match ? Number(match[0]) : 0; };
  const seedState = () => ({
    version:1, view:'inicio', theme:'dark',
    profile:{name:'',birthdate:'',sex:'',height:'',weight:'',targetWeight:'',goal:'Condicionamento',notes:''},
    weightLog:[], exercises:SEED_EXERCISES.map(e=>({...e})), history:[], routines:[{id:'routine-inicial',name:'Treino Inicial em Blocos',description:'Sua sequência inicial organizada nos blocos A, B e C.',exerciseIds:SEED_EXERCISES.map(e=>e.id)}], active:null, setup:{date:todayLocal(),mode:'routine',selectedRoutineId:'routine-inicial',selectedIds:SEED_EXERCISES.map(e=>e.id)}, modal:null, search:'', filterBlock:'Todos', toast:''
  });
  function loadState(){
    try {
      const raw=localStorage.getItem(STORAGE_KEY); if(!raw) return seedState();
      const parsed=JSON.parse(raw), base=seedState();
      const merged={...base,...parsed,profile:{...base.profile,...(parsed.profile||{})},setup:{...base.setup,...(parsed.setup||{})}};
      if(!Array.isArray(merged.exercises)) merged.exercises=base.exercises;
      if(!Array.isArray(merged.history)) merged.history=[];
      if(!Array.isArray(merged.weightLog)) merged.weightLog=[];
      if(!Array.isArray(merged.routines)||!merged.routines.length) merged.routines=base.routines;
      if(merged.active && !Array.isArray(merged.active.exercises)) merged.active=null;
      return merged;
    } catch(e){ return seedState(); }
  }
  let state=loadState();
  let tickTimer=null, toastTimer=null;
  function save(){ try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); } catch(e){ showToast('Não foi possível salvar. Verifique o espaço disponível no navegador.'); } }
  function showToast(message){ const root=$('#modal-root'); if(!root) return; const old=$('.toast',root); if(old) old.remove(); const node=document.createElement('div'); node.className='toast'; node.textContent=message; root.appendChild(node); clearTimeout(toastTimer); toastTimer=setTimeout(()=>node.remove(),2800); }
  function setView(view){ state.view=view; state.modal=null; save(); render(); window.scrollTo({top:0,behavior:'smooth'}); }
  function exerciseCountByBlock(block){return state.exercises.filter(e=>e.block===block).length;}
  function createSessionExercise(e, blockOverride){
    return {id:e.id,sourceId:e.id,name:e.name,group:e.group||'Geral',equipment:e.equipment||'',block:blockOverride!==undefined?blockOverride:(e.block||'A'),rest:Number(e.rest)||60,notes:e.notes||'',sets:Array.from({length:Math.max(1,Number(e.sets)||1)},()=>({reps:parseReps(e.reps)||10,weight:'',done:false}))};
  }
  function getElapsedSeconds(active=state.active){
    if(!active) return 0;
    const base=Number(active.elapsedBeforePause)||0;
    return Math.floor((base+(active.status==='running' && active.startedAt ? Date.now()-active.startedAt : 0))/1000);
  }
  function isExerciseDone(ex){return ex.sets.length>0 && ex.sets.every(s=>s.done);}
  function setCount(active){return active ? active.exercises.reduce((n,e)=>n+e.sets.length,0):0;}
  function doneSetCount(active){return active ? active.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0):0;}
  function blockIds(active=state.active){
    if(!active) return [];
    const unique=[...new Set(active.exercises.map(e=>e.block||'A'))];
    return ['A','B','C','D'].filter(b=>unique.includes(b)).concat(unique.filter(b=>!['A','B','C','D'].includes(b)));
  }
  function currentBlock(active=state.active){return blockIds(active).find(b=>active.exercises.some(e=>(e.block||'A')===b&&!isExerciseDone(e)))||null;}
  function selectedBlock(active=state.active){const ids=blockIds(active);return ids.includes(active?.selectedBlock)?active.selectedBlock:(currentBlock(active)||ids[0]||null);}
  function blockProgress(block,active=state.active){const exs=active.exercises.filter(e=>(e.block||'A')===block);const total=exs.reduce((n,e)=>n+e.sets.length,0);const done=exs.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0);return {total,done,percent:total?Math.round(done/total*100):0,complete:total>0&&done===total};}
  // In circuit mode, the user completes the same set number for every exercise before resting.
  function currentRoundIndex(block,active=state.active){
    if(!active)return 0;
    const exs=active.exercises.filter(e=>(e.block||'A')===block);
    const maxSets=Math.max(0,...exs.map(e=>e.sets.length));
    for(let i=0;i<maxSets;i++){const round=exs.filter(e=>i<e.sets.length);if(round.some(e=>!e.sets[i].done))return i;}
    return maxSets;
  }
  function roundComplete(block,index,active=state.active){
    const round=(active?.exercises||[]).filter(e=>(e.block||'A')===block&&index<e.sets.length);
    return round.length>0&&round.every(e=>e.sets[index].done);
  }
  function roundRestSeconds(block,active=state.active){
    const exs=(active?.exercises||[]).filter(e=>(e.block||'A')===block);
    return Math.max(1,...exs.map(e=>Number(e.rest)||60));
  }
  function applyTheme(){document.documentElement.dataset.theme=state.theme==='light'?'light':'dark';const meta=$('meta[name="theme-color"]');if(meta)meta.content=state.theme==='light'?'#f4f6f8':'#101318';}
  function pageHead(kicker,title,subtitle,action=''){return `<div class="page-head"><div><div class="eyebrow">${kicker}</div><h1 class="page-title">${title}</h1>${subtitle?`<p class="page-subtitle">${subtitle}</p>`:''}</div>${action}</div>`;}
  function button(label,action,cls='btn',attrs=''){return `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;}
  function emptyState(icon,title,description,actionHtml=''){return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${description}</p>${actionHtml?`<div style="margin-top:15px">${actionHtml}</div>`:''}</div>`;}
  function exerciseLine(e,index=0,showBlock=true){const block=e.block||'A';return `<div class="exercise-card"><div class="exercise-num">${String(index+1).padStart(2,'0')}</div><div class="exercise-main"><div class="exercise-name">${escapeHtml(e.name)}</div><div class="muted small">${escapeHtml(e.group||'Geral')} · ${escapeHtml(e.equipment||'Equipamento não informado')}</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px"><span class="pill accent">${e.sets||3} séries</span><span class="pill">${escapeHtml(e.reps||'10–12')} reps</span>${showBlock?`<span class="pill">Bloco ${escapeHtml(block)}</span>`:''}</div></div><div class="exercise-actions">${button('Editar','edit-exercise','btn btn-small','data-id="'+escapeHtml(e.id)+'"')}${button('Excluir','delete-exercise','btn btn-small btn-ghost','data-id="'+escapeHtml(e.id)+'"')}</div></div>`;}
  function renderHome(){
    const name=state.profile.name.trim().split(/\s+/)[0];
    const weekStart=new Date();weekStart.setHours(0,0,0,0);const day=weekStart.getDay();weekStart.setDate(weekStart.getDate()-(day===0?6:day-1));
    const weekCount=state.history.filter(h=>new Date(`${h.date}T12:00:00`)>=weekStart).length;
    const last=state.history.slice().sort((a,b)=>(b.finishedAt||'').localeCompare(a.finishedAt||''))[0];
    const avgDuration=state.history.length?Math.round(state.history.reduce((sum,h)=>sum+(h.durationSeconds||0),0)/state.history.length):0;
    const donePct=state.active?Math.round(doneSetCount(state.active)/Math.max(1,setCount(state.active))*100):0;
    const activeHero=state.active?`<section class="hero"><div><div class="eyebrow" style="color:#b7f36b">TREINO EM ANDAMENTO</div><h2>Continue de onde parou.</h2><p>${escapeHtml(state.active.name)} · ${donePct}% das séries concluídas.</p>${button('Retomar treino →','resume-workout','btn btn-primary')}</div><div class="hero-side">◉</div></section>`:`<section class="hero"><div><div class="eyebrow" style="color:#b7f36b">SEU PRÓXIMO TREINO</div><h2>${name?`Vamos treinar, ${escapeHtml(name)}?`:'Hora de cuidar da sua evolução.'}</h2><p>Um treino de cada vez. Registre suas séries e acompanhe o seu progresso.</p>${button('Iniciar treino →','go','btn btn-primary','data-view="treinos"')}</div><div class="hero-side">✳</div></section>`;
    const quickBlocks=['A','B','C'].map(b=>{const meta=BLOCKS[b],list=state.exercises.filter(e=>e.block===b);return `<div class="block-card"><div class="block-letter">BLOCO ${b}</div><h3>${escapeHtml(meta.title)}</h3><p>${escapeHtml(meta.subtitle)}</p><div class="block-meta"><span>${list.length} exercícios</span><span>${list.reduce((s,e)=>s+Number(e.sets||0),0)} séries</span></div></div>`;}).join('');
    return `${pageHead('PAINEL PESSOAL',name?`Olá, ${escapeHtml(name)}.`:'Olá!','Seu espaço de treino e evolução.')}${activeHero}<div class="stats-grid"><div class="stat"><div class="stat-label">Treinos nesta semana</div><div class="stat-value">${weekCount}</div><div class="stat-note">de segunda a hoje</div></div><div class="stat"><div class="stat-label">Peso atual</div><div class="stat-value">${state.profile.weight?`${escapeHtml(state.profile.weight)}<span style="font-size:13px"> kg</span>`:'—'}</div><div class="stat-note">${state.profile.height?`Altura ${escapeHtml(state.profile.height)} cm`:'Atualize seu perfil'}</div></div><div class="stat"><div class="stat-label">Treinos registrados</div><div class="stat-value">${state.history.length}</div><div class="stat-note">no histórico</div></div><div class="stat"><div class="stat-label">Duração média</div><div class="stat-value">${state.history.length?fmtDuration(avgDuration):'—'}</div><div class="stat-note">por treino</div></div></div><div class="section-row"><h2>Seu treino inicial</h2>${button('Ver treino →','go','btn btn-small btn-ghost','data-view="treinos"')}</div><div class="grid grid-3">${quickBlocks}</div><div class="section-row"><h2>Último treino</h2>${button('Abrir histórico','go','btn btn-small btn-ghost','data-view="historico"')}</div><section class="panel">${last?`<div class="list-row"><div class="exercise-num">✓</div><div class="list-content"><div class="list-title">${escapeHtml(last.name)}</div><div class="muted small">${fmtDate(last.date)} · ${last.exerciseCount||last.exercises?.length||0} exercícios</div></div><div class="list-row-right"><div style="font-weight:800">${fmtDuration(last.durationSeconds)}</div><span class="muted small">duração</span></div></div>`:emptyState('◷','Ainda sem treinos registrados','Seu primeiro treino ficará salvo aqui assim que você finalizá-lo.')}</section><div class="section-row"><h2>Atalhos</h2></div><div class="grid grid-2"><section class="panel"><div class="panel-title">Biblioteca de exercícios</div><p class="muted small">Consulte, personalize ou cadastre novos exercícios.</p>${button('Abrir exercícios','go','btn','data-view="exercicios"')}</section><section class="panel"><div class="panel-title">Dados pessoais</div><p class="muted small">Atualize seu peso e acompanhe sua evolução física.</p>${button('Meu perfil','go','btn','data-view="perfil"')}</section></div>`;
  }
  function renderExercises(){
    const search=String(state.search||'').toLowerCase();
    const list=state.exercises.filter(e=>(state.filterBlock==='Todos'||e.block===state.filterBlock)&&`${e.name} ${e.group} ${e.equipment}`.toLowerCase().includes(search));
    const action=button('+ Cadastrar exercício','new-exercise','btn btn-primary');
    return `${pageHead('BIBLIOTECA','Exercícios','Gerencie os exercícios, equipamentos e parâmetros do seu treino.',action)}<section class="panel" style="margin-bottom:18px"><div class="form-row"><div class="field" style="margin:0"><label for="exercise-search">Pesquisar</label><input id="exercise-search" value="${escapeHtml(state.search||'')}" placeholder="Nome, grupo muscular ou equipamento..."></div><div class="field" style="margin:0"><label for="block-filter">Filtrar por bloco</label><select id="block-filter"><option ${state.filterBlock==='Todos'?'selected':''}>Todos</option>${['A','B','C','D'].map(b=>`<option value="${b}" ${state.filterBlock===b?'selected':''}>Bloco ${b}</option>`).join('')}</select></div></div></section><div class="list">${list.length?list.map(exerciseLine).join(''):emptyState('⌕','Nenhum exercício encontrado','Ajuste a pesquisa ou cadastre um novo exercício.',button('+ Cadastrar exercício','new-exercise','btn btn-primary'))}</div><p class="inline-note">Os sete exercícios iniciais são editáveis. Alterações na biblioteca não modificam os registros de treinos já realizados.</p>`;
  }
  function renderTreinos(){
    const routine=state.routines.find(r=>r.id===(state.setup.selectedRoutineId||'routine-inicial'))||state.routines[0];
    const chosen=state.exercises.filter(e=>routine && routine.exerciseIds.includes(e.id));
    const blockCards=['A','B','C','D'].map(b=>{
      const list=chosen.filter(e=>(e.block||'A')===b);if(!list.length)return '';
      const meta=BLOCKS[b]||BLOCKS.D;
      return `<div class="block-card"><div class="block-letter">BLOCO ${b}</div><h3>${escapeHtml(meta.title)}</h3><p>${escapeHtml(meta.subtitle)}</p><div class="divider"></div><div class="list">${list.map((e,i)=>`<div class="routine-item"><div class="exercise-num">${i+1}</div><div class="list-content"><div class="list-title">${escapeHtml(e.name)}</div><div class="muted small">${e.sets} séries × ${escapeHtml(e.reps)} repetições</div></div></div>`).join('')}</div><div class="block-meta"><span>${list.length} exercícios</span><span>${list.reduce((sum,e)=>sum+Number(e.sets||0),0)} séries planejadas</span></div></div>`;
    }).join('');
    const routineOptions=state.routines.length>1?`<div class="field"><label for="routine-select">Rotina atual</label><select id="routine-select">${state.routines.map(r=>`<option value="${escapeHtml(r.id)}" ${r.id===routine?.id?'selected':''}>${escapeHtml(r.name)}</option>`).join('')}</select></div>`:'';
    return `${pageHead('PLANEJAMENTO','Preparar treino','Mantenha uma rotina salva e edite o nome ou os exercícios quando quiser.')} ${state.active?`<section class="panel" style="margin-bottom:18px;border-color:var(--accent)"><div class="workout-header"><div><div class="eyebrow">SESSÃO SALVA</div><div class="panel-title">Você tem um treino em andamento</div><div class="muted small">Seu progresso foi salvo neste dispositivo.</div></div>${button('Retomar →','resume-workout','btn btn-primary')}</div></section>`:''}<section class="panel" style="margin-bottom:18px"><div class="workout-header"><div><div class="eyebrow">ROTINA REUTILIZÁVEL</div><h2 style="margin:0 0 6px;font-size:24px">${escapeHtml(routine?.name||'Minha rotina')}</h2><div class="muted small">${chosen.length} exercícios · ${chosen.reduce((n,e)=>n+Number(e.sets||0),0)} séries</div></div>${button('Editar rotina','edit-routine','btn btn-primary','data-id="'+escapeHtml(routine?.id||'routine-inicial')+'"')}</div>${routineOptions}<div class="inline-note">Esta rotina fica salva neste dispositivo. Alterar a rotina não modifica treinos que já foram registrados no histórico.</div></section><section class="panel" style="margin-bottom:18px"><div class="field" style="margin-bottom:0"><label for="workout-date">Data do treino</label><input id="workout-date" type="date" value="${escapeHtml(state.setup.date||todayLocal())}"></div></section><div class="section-row"><h2>Prévia da sequência</h2><span class="muted small">A → B → C</span></div><div class="grid" style="gap:12px">${blockCards||emptyState('＋','Rotina sem exercícios','Edite a rotina para selecionar ao menos um exercício.',button('Editar rotina','edit-routine','btn btn-primary','data-id="'+escapeHtml(routine?.id||'routine-inicial')+'"'))}</div><div class="bottom-actions"><div><div class="muted small">Pronto para começar?</div><strong>${chosen.length} exercícios selecionados</strong></div>${button('Iniciar treino →','start-workout','btn btn-primary',chosen.length?'':'disabled')}</div>`;
  }
  
  function renderSession(){
    const a=state.active;if(!a)return emptyState('＋','Nenhum treino em andamento','Comece uma nova sessão para registrar exercícios.',button('Preparar treino','go','btn btn-primary','data-view="treinos"'));
    const blocks=blockIds(a),firstIncomplete=currentBlock(a),current=selectedBlock(a),total=setCount(a),done=doneSetCount(a),pct=total?Math.round(done/total*100):100;
    const chips=blocks.map(b=>{const p=blockProgress(b,a),isCur=current===b;return `<button type="button" class="block-chip ${p.complete?'complete':''} ${isCur?'current':''}" data-action="select-block" data-block="${escapeHtml(b)}" aria-pressed="${isCur?'true':'false'}" aria-label="Abrir Bloco ${escapeHtml(b)}">${p.complete?'✓ ':''}Bloco ${escapeHtml(b)} · ${p.done}/${p.total}</button>`;}).join('');
    const workoutComplete=!firstIncomplete;
    let workContent='';
    if(!current){
      workContent=`<section class="panel"><h2>Nenhum bloco disponível</h2><p class="muted">Adicione exercícios antes de continuar.</p></section>`;
    }else{
      const meta=BLOCKS[current]||BLOCKS.D;
      const blockExercises=a.exercises.filter(e=>(e.block||'A')===current);
      const roundIndex=currentRoundIndex(current,a),roundTotal=Math.max(0,...blockExercises.map(e=>e.sets.length));
      const roundNo=Math.min(roundIndex+1,Math.max(roundTotal,1));
      const roundSets=blockExercises.filter(e=>roundIndex<e.sets.length);
      const roundDone=roundSets.filter(e=>e.sets[roundIndex]?.done).length;
      const blockP=blockProgress(current,a);
      const exerciseCards=blockExercises.map((ex,exIdx)=>{
        const exerciseDone=isExerciseDone(ex);
        return `<section class="panel active-exercise" style="margin-top:12px;border-color:${exerciseDone?'var(--success)':'var(--line)'}"><div class="workout-header"><div><div class="eyebrow">EXERCÍCIO ${String(exIdx+1).padStart(2,'0')} ${exerciseDone?'· CONCLUÍDO':'· BLOCO '+escapeHtml(current)}</div><h2 style="font-size:20px;line-height:1.2;margin:0 0 6px">${escapeHtml(ex.name)}</h2><div class="muted small">${escapeHtml(ex.group)} · ${escapeHtml(ex.equipment)}</div></div><span class="pill ${exerciseDone?'done':'accent'}">${ex.sets.filter(s=>s.done).length}/${ex.sets.length} séries</span></div><table class="set-table"><thead><tr><th>Série</th><th>Reps</th><th>Carga (kg)</th><th class="text-right">Feita</th></tr></thead><tbody>${ex.sets.map((set,i)=>{
          const future=i>roundIndex&&!set.done;
          const disabled=set.done||future||blockP.complete;
          return `<tr class="${set.done?'set-done':''}"><td class="set-index">${i+1}</td><td><input type="number" min="0" step="1" aria-label="${escapeHtml(ex.name)} — repetições da série ${i+1}" data-action="set-reps" data-ex="${escapeHtml(ex.id)}" data-set="${i}" value="${escapeHtml(set.reps)}" ${disabled?'disabled':''}></td><td><input type="number" min="0" step="0.5" aria-label="${escapeHtml(ex.name)} — carga da série ${i+1} em quilos" data-action="set-weight" data-ex="${escapeHtml(ex.id)}" data-set="${i}" value="${escapeHtml(set.weight)}" placeholder="—" ${disabled?'disabled':''}></td><td class="text-right"><input class="set-check" type="checkbox" aria-label="${escapeHtml(ex.name)} — marcar série ${i+1} concluída" data-action="toggle-set" data-ex="${escapeHtml(ex.id)}" data-set="${i}" ${set.done?'checked':''} ${future||blockP.complete?'disabled':''}></td></tr>`;
        }).join('')}</tbody></table><div class="inline-note">${exerciseDone?'Todas as séries deste exercício foram concluídas.':`Faça a série ${Math.min(roundIndex+1,ex.sets.length)} deste exercício nesta rodada. As próximas séries serão liberadas quando todos os exercícios desta rodada forem marcados.`}</div></section>`;
      }).join('');
      let restBanner='';
      if(a.rest?.endAt){
        restBanner=`<div class="rest-banner"><div><div class="muted small">DESCANSO ATIVO · ${a.rest.block?`BLOCO ${escapeHtml(a.rest.block)} · `:''}RODADA ${escapeHtml(a.rest.round||roundNo)}</div><div id="rest-time" class="rest-time">${fmtDuration(Math.max(0,Math.ceil((a.rest.endAt-Date.now())/1000)))}</div><div class="muted small">Você pode mudar de bloco e continuar outro exercício; o contador atual permanece ativo.</div></div><div>${button('Pular descanso','skip-rest','btn btn-small')}</div></div>`;
      }else if(blockP.complete){
        restBanner=`<div class="rest-banner"><div><div class="muted small">BLOCO CONCLUÍDO</div><div class="rest-time">${blockP.done}/${blockP.total}</div><div class="muted small">Escolha qualquer outro bloco nas abas acima, sem precisar seguir a ordem.</div></div></div>`;
      }else{
        restBanner=`<div class="rest-banner"><div><div class="muted small">RODADA ${roundNo} DE ${Math.max(roundTotal,1)}</div><div class="rest-time">${fmtDuration(roundRestSeconds(current,a))}</div><div class="muted small">O descanso começa depois que todos os exercícios desta rodada forem marcados (${roundDone}/${roundSets.length}).</div></div></div>`;
      }
      workContent=`${workoutComplete?`<section class="panel" style="text-align:center;padding:22px;margin-bottom:14px;border-color:var(--success)"><div class="empty-icon">✓</div><h2 style="margin:0 0 8px">Todas as séries concluídas!</h2><p class="muted">Você pode revisar qualquer bloco nas abas acima e finalizar para salvar o resumo no histórico.</p></section>`:''}<section class="block-card ${blockP.complete?'':'is-current'}" style="margin-bottom:14px"><div class="block-letter">BLOCO ${escapeHtml(current)}</div><h2 style="margin:6px 0 5px;font-size:24px;letter-spacing:-.8px">${escapeHtml(meta.title)}</h2><p>${escapeHtml(meta.subtitle)}</p><div class="progress-track"><div class="progress-fill" style="width:${blockP.percent}%"></div></div><div class="block-meta"><span>${blockP.done} de ${blockP.total} séries</span><span>${blockP.percent}%</span></div><p style="margin-top:12px">${blockP.complete?'Bloco concluído. Você pode consultar este bloco ou abrir qualquer outro a qualquer momento.':'Execute uma série de cada exercício deste bloco; só depois começa o descanso. Você pode trocar de bloco a qualquer momento.'}</p></section>${restBanner}${exerciseCards}`;
    }
    return `${pageHead('TREINO EM ANDAMENTO',escapeHtml(a.name),`Iniciado em ${fmtDate(a.date)} às ${fmtTime(a.startedAtOriginal)}.`)}<div class="workout-header"><div class="timer-box"><div id="workout-timer" class="timer-number">${fmtDuration(getElapsedSeconds(a))}</div><div class="timer-label">Tempo de treino</div></div><div style="display:flex;gap:8px;flex-wrap:wrap">${button(a.status==='paused'?'Retomar cronômetro':'Pausar cronômetro','toggle-pause','btn btn-ghost')}${button('Finalizar treino','finish-workout','btn btn-primary')}</div></div><div class="panel" style="margin-bottom:14px;padding:14px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><strong>Progresso geral</strong><div class="muted small">${done} de ${total} séries concluídas</div></div><strong style="font-size:22px">${pct}%</strong></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div><div class="block-nav" aria-label="Selecionar bloco de treino">${chips}</div>${workContent}<div class="bottom-actions"><div><div class="muted small">Treino salvo automaticamente</div><strong>${current?`Bloco ${current}`:'Todas as séries concluídas'}</strong></div>${button('Finalizar e salvar','finish-workout','btn btn-primary')}</div>`;
  }
  
  function renderHistory(){
    const list=state.history.slice().sort((a,b)=>(b.finishedAt||b.date||'').localeCompare(a.finishedAt||a.date||''));
    return `${pageHead('REGISTROS','Histórico de treinos','Consulte suas sessões anteriores e os detalhes de cada exercício.')}${list.length?`<section class="panel"><div class="list">${list.map(h=>`<div class="list-row"><div class="exercise-num">✓</div><div class="list-content"><div class="list-title">${escapeHtml(h.name||'Treino')}</div><div class="muted small">${fmtDate(h.date)} · ${h.exerciseCount??h.exercises?.length??0} exercícios · ${h.completedSets??0}/${h.plannedSets??0} séries</div></div><div class="list-row-right"><div style="font-weight:800">${fmtDuration(h.durationSeconds)}</div><button type="button" class="btn btn-small btn-ghost" data-action="history-detail" data-id="${escapeHtml(h.id)}">Detalhes</button></div></div>`).join('')}</div></section>`:emptyState('◷','Seu histórico começa aqui','Finalize seu primeiro treino para guardar data, duração, séries e cargas.',button('Iniciar primeiro treino','go','btn btn-primary','data-view="treinos"'))}`;
  }
  function svgLineChart(points,label){
    if(!points||points.length<2)return `<div class="empty-state" style="padding:20px 0"><div class="muted small">Adicione ao menos dois registros para visualizar o gráfico.</div></div>`;
    const W=600,H=190,pad=24,vals=points.map(p=>Number(p.value)||0),min=Math.min(...vals),max=Math.max(...vals),span=(max-min)||1;
    const coords=points.map((p,i)=>({x:pad+(W-2*pad)*(i/(points.length-1)),y:H-pad-(Number(p.value)-min)/span*(H-2*pad)}));
    const path=coords.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(label)}"><line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}" stroke="var(--line)"/><line x1="${pad}" y1="${pad}" x2="${W-pad}" y2="${pad}" stroke="var(--line)" stroke-dasharray="4 5"/><path d="${path}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${coords.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--accent)" stroke="var(--panel)" stroke-width="2"/>`).join('')}</svg><div class="chart-legend"><span>${escapeHtml(points[0].label||'Início')}</span><span>${formatNumber(min)}–${formatNumber(max)} kg</span><span>${escapeHtml(points[points.length-1].label||'Atual')}</span></div>`;
  }
  function renderEvolution(){
    const byGroup={};state.history.forEach(h=>(h.exercises||[]).forEach(e=>{byGroup[e.group||'Geral']=(byGroup[e.group||'Geral']||0)+1;}));
    const topGroups=Object.entries(byGroup).sort((a,b)=>b[1]-a[1]).slice(0,7),maxGroup=Math.max(1,...topGroups.map(x=>x[1]));
    const weightPoints=state.weightLog.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(w=>({value:Number(w.weight),label:fmtDate(w.date)}));
    const recent=state.history.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||'')).slice(-8);
    return `${pageHead('DADOS E RESULTADOS','Sua evolução','Acompanhe os dados que você registrou. Gráficos aparecem conforme você acumula histórico.')}<div class="stats-grid"><div class="stat"><div class="stat-label">Treinos registrados</div><div class="stat-value">${state.history.length}</div></div><div class="stat"><div class="stat-label">Séries concluídas</div><div class="stat-value">${state.history.reduce((n,h)=>n+(h.completedSets||0),0)}</div></div><div class="stat"><div class="stat-label">Repetições feitas</div><div class="stat-value">${formatNumber(state.history.reduce((n,h)=>n+(h.totalReps||0),0))}</div></div><div class="stat"><div class="stat-label">Tempo acumulado</div><div class="stat-value">${fmtDuration(state.history.reduce((n,h)=>n+(h.durationSeconds||0),0))}</div></div></div><div class="grid grid-2"><section class="panel"><div class="panel-title">Peso corporal</div><p class="muted small">Registros em quilogramas</p>${state.weightLog.length?svgLineChart(weightPoints,'Evolução do peso corporal'):emptyState('↗','Sem dados de peso','Registre seu peso no perfil para iniciar o gráfico.',button('Registrar peso','add-weight','btn btn-small'))}</section><section class="panel"><div class="panel-title">Treinos recentes</div><p class="muted small">Duração por sessão</p>${recent.length?`<div class="bar-list">${recent.map(h=>{const max=Math.max(1,...recent.map(x=>x.durationSeconds||0));return `<div class="bar-row"><span>${escapeHtml(fmtDate(h.date))}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(3,(h.durationSeconds||0)/max*100)}%"></div></div><strong>${fmtDuration(h.durationSeconds)}</strong></div>`;}).join('')}</div>`:emptyState('◷','Sem treinos','Finalize uma sessão para ver seus registros aqui.')}</section><section class="panel"><div class="panel-title">Exercícios por grupo muscular</div><p class="muted small">Contagem nos treinos finalizados</p>${topGroups.length?`<div class="bar-list">${topGroups.map(([name,value])=>`<div class="bar-row"><span>${escapeHtml(name)}</span><div class="bar-track"><div class="bar-fill" style="width:${value/maxGroup*100}%"></div></div><strong>${value}</strong></div>`).join('')}</div>`:emptyState('▦','Ainda sem dados','Os grupos musculares serão contabilizados depois do primeiro treino.')}</section><section class="panel"><div class="panel-title">Evolução de cargas</div><p class="muted small">Resumo das maiores cargas registradas por exercício</p>${renderLoadProgress()}</section></div>`;
  }
  function renderLoadProgress(){
    const map={};state.history.forEach(h=>(h.exercises||[]).forEach(e=>e.sets.forEach(s=>{const w=Number(s.weight);if(Number.isFinite(w)&&w>0){if(!map[e.name])map[e.name]=[];map[e.name].push(w);}})));
    const rows=Object.entries(map).map(([name,values])=>({name,max:Math.max(...values),last:values[values.length-1]})).sort((a,b)=>b.max-a.max).slice(0,6);
    if(!rows.length)return emptyState('↗','Sem cargas registradas','Informe a carga de cada série durante o treino.');
    const max=Math.max(1,...rows.map(r=>r.max));return `<div class="bar-list">${rows.map(r=>`<div><div class="bar-row"><span title="${escapeHtml(r.name)}">${escapeHtml(r.name.length>17?r.name.slice(0,16)+'…':r.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${r.max/max*100}%"></div></div><strong>${formatNumber(r.max)} kg</strong></div><div class="muted small" style="margin:3px 0 0 94px">Última carga registrada: ${formatNumber(r.last)} kg</div></div>`).join('')}</div>`;
  }
  function renderProfile(){
    const p=state.profile;
    return `${pageHead('DADOS PESSOAIS','Meu perfil','Mantenha suas informações atualizadas e registre o peso ao longo do tempo.',button('＋ Registrar peso','add-weight','btn btn-primary'))}<form id="profile-form" class="panel"><div class="grid grid-2"><div class="field"><label for="profile-name">Nome</label><input id="profile-name" name="name" value="${escapeHtml(p.name)}" placeholder="Como gostaria de ser chamado?"></div><div class="field"><label for="profile-birthdate">Data de nascimento</label><input id="profile-birthdate" name="birthdate" type="date" value="${escapeHtml(p.birthdate)}"></div></div><div class="form-row"><div class="field"><label for="profile-sex">Sexo (opcional)</label><select id="profile-sex" name="sex"><option value="">Prefiro não informar</option><option ${p.sex==='Masculino'?'selected':''}>Masculino</option><option ${p.sex==='Feminino'?'selected':''}>Feminino</option><option ${p.sex==='Outro'?'selected':''}>Outro</option></select></div><div class="field"><label for="profile-goal">Objetivo principal</label><select id="profile-goal" name="goal">${['Hipertrofia','Ganho de força','Emagrecimento','Condicionamento','Manutenção'].map(x=>`<option ${p.goal===x?'selected':''}>${x}</option>`).join('')}</select></div></div><div class="form-row"><div class="field"><label for="profile-height">Altura (cm)</label><input id="profile-height" name="height" type="number" min="1" step="1" value="${escapeHtml(p.height)}" placeholder="Ex.: 175"></div><div class="field"><label for="profile-weight">Peso atual (kg)</label><input id="profile-weight" name="weight" type="number" min="1" step="0.1" value="${escapeHtml(p.weight)}" placeholder="Ex.: 85,5"></div></div><div class="field"><label for="profile-target">Peso desejado (kg, opcional)</label><input id="profile-target" name="targetWeight" type="number" min="1" step="0.1" value="${escapeHtml(p.targetWeight)}"></div><div class="field"><label for="profile-notes">Observações pessoais</label><textarea id="profile-notes" name="notes" placeholder="Preferências, limitações ou lembretes">${escapeHtml(p.notes)}</textarea></div><div class="divider"></div><div class="panel-title">Histórico de peso</div>${state.weightLog.length?`<div class="list">${state.weightLog.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(w=>`<div class="list-row"><div class="list-content"><div class="list-title">${formatNumber(w.weight)} kg</div><div class="muted small">${fmtDate(w.date)}</div></div>${button('Excluir','delete-weight','btn btn-small btn-ghost','data-id="'+escapeHtml(w.id)+'"')}</div>`).join('')}</div>`: `<p class="muted small">Nenhum registro de peso ainda.</p>`}<div class="modal-actions"><button class="btn btn-primary" type="submit">Salvar perfil</button></div></form>`;
  }
  function renderSettings(){
    const notificationSupported='Notification' in window;
    const notificationGranted=notificationSupported&&Notification.permission==='granted';
    return `${pageHead('PREFERÊNCIAS','Configurações','Gerencie o tema, os alarmes e cópias de segurança dos seus dados.') }<div class="grid grid-2"><section class="panel"><div class="panel-title">Aparência</div><p class="muted small">Escolha o tema mais confortável para treinar.</p><div class="grid grid-2"><button type="button" data-action="set-theme" data-theme="dark" class="btn ${state.theme==='dark'?'btn-primary':''}">◐ Escuro</button><button type="button" data-action="set-theme" data-theme="light" class="btn ${state.theme==='light'?'btn-primary':''}">☼ Claro</button></div></section><section class="panel"><div class="panel-title">Alarme de descanso</div><p class="muted small">O alarme usa uma sequência de bipes mais forte e tenta vibrar. Ative as notificações para permitir um aviso adicional quando o navegador ainda estiver executando a sessão em segundo plano.</p>${button(notificationGranted?'✓ Notificações ativadas':(notificationSupported?'Ativar notificações':'Notificações não suportadas'),'enable-notifications','btn btn-primary',(!notificationSupported||notificationGranted)?'disabled':'')}<p class="inline-note">Limitação: uma PWA não consegue garantir o alarme com o celular bloqueado nem controlar o volume de outros aplicativos. Para isso, é necessária uma versão Android nativa com foco de áudio e serviço em primeiro plano.</p></section><section class="panel"><div class="panel-title">Backup e restauração</div><p class="muted small">Exporte o perfil, exercícios, treinos e histórico para um arquivo JSON.</p><div class="grid" style="gap:8px">${button('↓ Exportar backup JSON','export-json','btn btn-primary')}${button('↑ Importar backup JSON','import-json','btn')}</div></section><section class="panel"><div class="panel-title">Privacidade e armazenamento</div><p class="muted small">Seus dados ficam no armazenamento local deste navegador. O GitHub Pages hospeda apenas os arquivos do aplicativo e não recebe automaticamente os treinos finalizados.</p><p class="muted small">A sincronização automática entre dispositivos exige conectar um backend autenticado (por exemplo, Supabase). Até configurar esse serviço, use Exportar/Importar backup JSON. Não coloque dados pessoais em um repositório público.</p></section><section class="panel"><div class="panel-title">Gerenciamento dos dados</div><p class="muted small">A exclusão de dados é permanente neste dispositivo. Exporte uma cópia antes de continuar.</p>${button('Apagar todos os dados','reset-data','btn btn-danger')}</section></div><p class="inline-note">O navegador pode limitar temporizadores e áudio quando a tela está bloqueada; notificações não garantem execução pontual nesse estado.</p><p class="inline-note">Os dados são salvos localmente; o GitHub Pages não sincroniza registros automaticamente com um servidor.</p>`;
  }
  function render(){
    applyTheme();
    $('#top-date').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'});
    const views={inicio:renderHome,exercicios:renderExercises,treinos:renderTreinos,sessao:renderSession,historico:renderHistory,evolucao:renderEvolution,perfil:renderProfile,configuracoes:renderSettings};
    const view=views[state.view]?state.view:'inicio';
    document.body.dataset.view=view;
    $('#main').innerHTML=views[view]();
    $$('.nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.view===view || (view==='sessao'&&btn.dataset.view==='treinos') || (view==='perfil'&&btn.dataset.view==='evolucao')));
    renderModal();
    updateLiveTimers();
    save();
  }
  function renderModal(){
    const root=$('#modal-root');if(!root)return;const modal=state.modal;if(!modal){root.innerHTML='';return;}
    if(modal.type==='exercise'){
      const e=modal.id?state.exercises.find(x=>x.id===modal.id):null;
      root.innerHTML=`<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${e?'Editar exercício':'Novo exercício'}</h2><form id="exercise-form" data-id="${escapeHtml(e?.id||'')}"><div class="field"><label for="ex-name">Nome do exercício *</label><input id="ex-name" name="name" required value="${escapeHtml(e?.name||'')}" placeholder="Ex.: Remada unilateral"></div><div class="form-row"><div class="field"><label for="ex-group">Grupo muscular *</label><input id="ex-group" name="group" required value="${escapeHtml(e?.group||'')}" placeholder="Ex.: Costas"></div><div class="field"><label for="ex-equipment">Equipamento</label><input id="ex-equipment" name="equipment" value="${escapeHtml(e?.equipment||'')}" placeholder="Ex.: Halteres"></div></div><div class="form-row"><div class="field"><label for="ex-block">Bloco</label><select id="ex-block" name="block">${['A','B','C','D'].map(b=>`<option value="${b}" ${(e?.block||'D')===b?'selected':''}>Bloco ${b}${b==='D'?' · Outros':''}</option>`).join('')}</select></div><div class="field"><label for="ex-sets">Número de séries</label><input id="ex-sets" name="sets" type="number" min="1" max="20" value="${escapeHtml(e?.sets||3)}"></div></div><div class="form-row"><div class="field"><label for="ex-reps">Repetições planejadas</label><input id="ex-reps" name="reps" value="${escapeHtml(e?.reps||'10–12')}" placeholder="10–12"></div><div class="field"><label for="ex-rest">Descanso (segundos)</label><input id="ex-rest" name="rest" type="number" min="0" max="900" value="${escapeHtml(e?.rest??60)}"></div></div><div class="field"><label for="ex-secondary">Grupos secundários</label><input id="ex-secondary" name="secondary" value="${escapeHtml(e?.secondary||'')}"></div><div class="field"><label for="ex-notes">Observações</label><textarea id="ex-notes" name="notes">${escapeHtml(e?.notes||'')}</textarea></div><div class="modal-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">Salvar exercício</button></div></form></section></div>`;
    } else if(modal.type==='weight'){
      const current=state.profile.weight||'';
      root.innerHTML=`<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true"><h2>Registrar peso corporal</h2><form id="weight-form"><div class="form-row"><div class="field"><label for="weight-date">Data</label><input id="weight-date" name="date" type="date" value="${todayLocal()}" required></div><div class="field"><label for="weight-value">Peso (kg)</label><input id="weight-value" name="weight" type="number" min="1" step="0.1" value="${escapeHtml(current)}" required placeholder="Ex.: 86,2"></div></div><div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">Cancelar</button><button class="btn btn-primary" type="submit">Salvar peso</button></div></form></section></div>`;
    } else if(modal.type==='finish'){
      const a=state.active;if(!a){state.modal=null;return;}
      const finished=a.exercises.filter(isExerciseDone).length, incomplete=a.exercises.filter(e=>!isExerciseDone(e));
      root.innerHTML=`<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true"><h2>Finalizar treino</h2><p class="muted">Confira o resumo antes de salvar no histórico.</p><div class="stats-grid"><div class="stat"><div class="stat-label">Duração</div><div class="stat-value" style="font-size:18px">${fmtDuration(getElapsedSeconds(a))}</div></div><div class="stat"><div class="stat-label">Exercícios concluídos</div><div class="stat-value">${finished}/${a.exercises.length}</div></div><div class="stat"><div class="stat-label">Séries concluídas</div><div class="stat-value">${doneSetCount(a)}/${setCount(a)}</div></div><div class="stat"><div class="stat-label">Repetições</div><div class="stat-value">${a.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).reduce((m,s)=>m+(Number(s.reps)||0),0),0)}</div></div></div>${incomplete.length?`<div class="panel" style="margin-bottom:12px"><div class="panel-title">Exercícios incompletos</div><p class="muted small">${incomplete.map(e=>escapeHtml(e.name)).join(' · ')}</p></div>`:''}<form id="finish-form"><div class="field"><label for="finish-notes">Observações finais (opcional)</label><textarea id="finish-notes" name="notes" placeholder="Como foi o treino hoje?">${escapeHtml(a.notes||'')}</textarea></div><div class="modal-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Continuar treino</button><button type="submit" class="btn btn-primary">Salvar no histórico</button></div></form></section></div>`;
    } else if(modal.type==='history'){
      const h=state.history.find(x=>x.id===modal.id);if(!h){state.modal=null;return;}
      root.innerHTML=`<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true"><h2>${escapeHtml(h.name||'Treino')}</h2><p class="muted">${fmtDate(h.date)} · ${fmtTime(h.startedAtOriginal)}–${fmtTime(h.finishedAt)}</p><div class="stats-grid"><div class="stat"><div class="stat-label">Duração</div><div class="stat-value" style="font-size:17px">${fmtDuration(h.durationSeconds)}</div></div><div class="stat"><div class="stat-label">Séries feitas</div><div class="stat-value">${h.completedSets||0}</div></div></div><div class="list">${(h.exercises||[]).map(e=>`<div class="routine-item"><div class="list-content"><div class="list-title">${escapeHtml(e.name)}</div><div class="muted small">${escapeHtml(e.group||'')} · Bloco ${escapeHtml(e.block||'A')}</div><div class="muted small" style="margin-top:5px">${e.sets.map((s,i)=>`S${i+1}: ${s.done?'✓':'—'} ${escapeHtml(s.reps)} reps${s.weight!==''?` · ${escapeHtml(s.weight)} kg`:''}`).join(' | ')}</div></div><span class="pill ${isExerciseDone(e)?'done':''}">${e.sets.filter(s=>s.done).length}/${e.sets.length}</span></div>`).join('')}</div>${h.notes?`<div class="divider"></div><div class="panel-title">Observações</div><p class="muted">${escapeHtml(h.notes)}</p>`:''}<div class="modal-actions"><button type="button" data-action="copy-history" data-id="${escapeHtml(h.id)}" class="btn">Atualizar rotina com este treino</button><button type="button" class="btn btn-primary" data-action="close-modal">Fechar</button></div></section></div>`;
    } else if(modal.type==='reset'){
      root.innerHTML=`<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true"><h2>Apagar todos os dados?</h2><p>Esta ação apagará perfil, exercícios personalizados, treinos e histórico armazenados neste navegador. Exporte um backup antes de continuar.</p><div class="modal-actions"><button class="btn btn-ghost" data-action="close-modal">Cancelar</button><button class="btn btn-danger" data-action="confirm-reset">Apagar tudo</button></div></section></div>`;
    } else if(modal.type==='routine-editor'){
      const routine=state.routines.find(r=>r.id===modal.id)||state.routines[0];
      const selected=new Set(modal.payload?.exerciseIds||routine?.exerciseIds||[]);
      const exerciseGroups=['A','B','C','D'].map(block=>{
        const exs=state.exercises.filter(e=>(e.block||'D')===block);if(!exs.length)return '';
        return `<div class="routine-edit-group"><div class="eyebrow">BLOCO ${block}</div>${exs.map(e=>`<label class="check-row"><input type="checkbox" name="exerciseIds" value="${escapeHtml(e.id)}" ${selected.has(e.id)?'checked':''}><span><strong>${escapeHtml(e.name)}</strong><br><span class="muted small">${e.sets} séries · ${escapeHtml(e.reps)} repetições</span></span></label>`).join('')}</div>`;
      }).join('');
      root.innerHTML=`<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="routine-editor-title"><h2 id="routine-editor-title">Editar rotina</h2><form id="routine-editor-form" data-id="${escapeHtml(routine?.id||'routine-inicial')}"><div class="field"><label for="routine-editor-name">Nome do treino</label><input id="routine-editor-name" name="name" required maxlength="80" value="${escapeHtml(routine?.name||'Minha rotina')}"></div><p class="muted small">Marque todos os exercícios que deseja manter na rotina. Essa seleção continuará salva até você editá-la novamente.</p><div class="routine-edit-list">${exerciseGroups||'<p class="muted">Cadastre exercícios na biblioteca primeiro.</p>'}</div><div class="modal-actions"><button type="button" class="btn btn-ghost" data-action="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">Salvar rotina</button></div></form></section></div>`;
    } else if(modal.type==='routine-name'){
      root.innerHTML=`<div class="modal-backdrop" data-action="close-modal"><section class="modal" role="dialog" aria-modal="true"><h2>Nome do treino</h2><form id="routine-form"><div class="field"><label for="routine-name">Nome</label><input id="routine-name" name="name" required value="${escapeHtml(modal.name||'Treino em blocos')}"></div><div class="modal-actions"><button class="btn btn-ghost" type="button" data-action="close-modal">Cancelar</button><button class="btn btn-primary" type="submit">Continuar</button></div></form></section></div>`;
    }
  }
  function startWorkout(){
    ensureAudio();
    if(state.active){showToast('Você já tem um treino em andamento. Retome-o para continuar.');state.view='sessao';render();return;}
    const date=state.setup.date||todayLocal();
    const routine=state.routines.find(r=>r.id===(state.setup.selectedRoutineId||'routine-inicial'))||state.routines[0];
    const chosen=state.exercises.filter(e=>routine && routine.exerciseIds.includes(e.id));
    if(!chosen.length){showToast('Edite a rotina e selecione pelo menos um exercício.');return;}
    state.modal={type:'routine-name',name:routine?.name||'Minha rotina',payload:{date,chosen}};renderModal();
  }
  function confirmStart(name){
    const pending=state.modal?.payload;if(!pending)return;
    const chosen=pending.chosen;
    const order=['A','B','C','D'];chosen.sort((a,b)=>order.indexOf(a.block||'A')-order.indexOf(b.block||'A'));
    state.active={id:uid('session'),name:(name||'Treino').trim()||'Treino',date:pending.date,startedAtOriginal:new Date().toISOString(),startedAt:Date.now(),elapsedBeforePause:0,status:'running',selectedBlock:chosen[0]?.block||'A',exercises:chosen.map(e=>createSessionExercise(e)),notes:'',rest:null};
    state.setup.date=todayLocal();state.setup.selectedIds=chosen.map(e=>e.id);state.modal=null;state.view='sessao';save();render();showToast('Treino iniciado. O progresso será salvo automaticamente.');
  }
  function togglePause(){const a=state.active;if(!a)return;if(a.status==='running'){a.elapsedBeforePause=(Number(a.elapsedBeforePause)||0)+(Date.now()-(a.startedAt||Date.now()));a.startedAt=null;a.status='paused';}else{a.startedAt=Date.now();a.status='running';}save();render();}
  function markSet(exId,index,checked){
    ensureAudio();
    const a=state.active;if(!a)return;
    const block=selectedBlock(a),ex=a.exercises.find(x=>x.id===exId);
    if(!ex)return;
    if((ex.block||'A')!==block){showToast('Selecione a aba do bloco correspondente para registrar esta série.');render();return;}
    const set=ex.sets[index];if(!set)return;
    const restBelongsToBlock=a.rest&&(!a.rest.block||a.rest.block===block);
    if(checked && restBelongsToBlock && a.rest.endAt>Date.now()){
      showToast('O descanso deste bloco ainda está em andamento. Aguarde ou toque em “Pular descanso”.');render();return;
    }
    const roundIndex=currentRoundIndex(block,a);
    if(checked && index!==roundIndex){showToast(`Finalize a rodada ${roundIndex+1} deste bloco antes de avançar para a próxima série.`);render();return;}
    set.done=checked;
    if(!checked){if(restBelongsToBlock)a.rest=null;}
    else if(roundComplete(block,index,a)){
      const hasMoreInBlock=a.exercises.some(e=>(e.block||'A')===block&&!isExerciseDone(e));
      if(hasMoreInBlock){const seconds=roundRestSeconds(block,a);a.rest={endAt:Date.now()+seconds*1000,block,round:index+1,seconds};}
      else if(restBelongsToBlock)a.rest=null;
    }else if(restBelongsToBlock){a.rest=null;}
    save();render();
    if(checked&&roundComplete(block,index,a)&&a.exercises.some(e=>(e.block||'A')===block&&!isExerciseDone(e)))showToast(`Rodada ${index+1} do bloco ${block} concluída. Hora do descanso.`);
    else if(isExerciseDone(ex))showToast(`${ex.name} concluído!`);
  }
  
  function finishWorkout(notes){
    const a=state.active;if(!a)return;
    const durationSeconds=getElapsedSeconds(a),done=doneSetCount(a),planned=setCount(a),completedExercises=a.exercises.filter(isExerciseDone).length;
    const totalReps=a.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).reduce((m,s)=>m+(Number(s.reps)||0),0),0);
    const volume=a.exercises.reduce((n,e)=>n+e.sets.filter(s=>s.done).reduce((m,s)=>m+(Number(s.reps)||0)*(Number(s.weight)||0),0),0);
    state.history.push({id:uid('history'),name:a.name,date:a.date,startedAtOriginal:a.startedAtOriginal,finishedAt:new Date().toISOString(),durationSeconds,exerciseCount:a.exercises.length,completedExercises,completedSets:done,plannedSets:planned,totalReps,volume,notes:notes||'',exercises:a.exercises.map(e=>({...e,sets:e.sets.map(s=>({...s}))}))});
    state.active=null;state.modal=null;state.view='historico';save();render();showToast('Treino salvo no histórico.');
  }
  function exportJson(){
    const payload={app:'FullBody',version:1,exportedAt:new Date().toISOString(),data:{...state,modal:null,toast:''}};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`FullBody_backup_${todayLocal()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast('Backup exportado. Guarde o arquivo em local seguro.');
  }
  function importJsonFile(file){
    if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result);const incoming=parsed.data||parsed;if(!Array.isArray(incoming.exercises)||!Array.isArray(incoming.history)||!incoming.profile)throw new Error('invalid');if(!confirm('Importar este backup e substituir os dados atuais do FullBody? Exporte um backup atual antes, se necessário.'))return;state={...seedState(),...incoming,modal:null,view:'inicio'};save();render();showToast('Backup importado.');}catch(e){showToast('Arquivo inválido. Selecione um backup JSON do FullBody.');}};reader.readAsText(file);}
  function deleteExercise(id){const e=state.exercises.find(x=>x.id===id);if(!e)return;if(!confirm(`Excluir o exercício “${e.name}” da biblioteca? Os treinos já salvos não serão alterados.`))return;state.exercises=state.exercises.filter(x=>x.id!==id);state.routines=state.routines.map(r=>({...r,exerciseIds:r.exerciseIds.filter(x=>x!==id)}));state.setup.selectedIds=(state.setup.selectedIds||[]).filter(x=>x!==id);save();render();showToast('Exercício excluído da biblioteca.');}
  function deleteWeight(id){if(!confirm('Excluir este registro de peso?'))return;state.weightLog=state.weightLog.filter(x=>x.id!==id);save();render();}
  function handleAction(buttonEl){
    const action=buttonEl.dataset.action,id=buttonEl.dataset.id;
    switch(action){
      case 'go': {const requested=buttonEl.dataset.view||'inicio';setView(requested==='treinos'&&state.active?'sessao':requested);break;}
      case 'toggle-theme': state.theme=state.theme==='dark'?'light':'dark';save();render();break;
      case 'select-block': {const block=buttonEl.dataset.block;if(state.active&&blockIds(state.active).includes(block)){state.active.selectedBlock=block;save();render();}break;}
      case 'set-theme': state.theme=buttonEl.dataset.theme;save();render();break;
      case 'new-exercise':state.modal={type:'exercise'};renderModal();break;
      case 'edit-exercise':state.modal={type:'exercise',id};renderModal();break;
      case 'delete-exercise':deleteExercise(id);break;
      case 'edit-routine':{const routine=state.routines.find(r=>r.id===id)||state.routines[0];if(!routine){showToast('Não foi encontrada uma rotina para editar.');break;}state.modal={type:'routine-editor',id:routine.id,payload:{exerciseIds:routine.exerciseIds.slice()}};renderModal();break;}
      case 'routine-select':break;
      case 'start-workout':startWorkout();break;
      case 'resume-workout':state.view='sessao';if(state.active&&state.active.status==='paused')togglePause();else render();break;
      case 'toggle-pause':togglePause();break;
      case 'skip-rest':if(state.active)state.active.rest=null;save();render();break;
      case 'finish-workout':state.modal={type:'finish'};renderModal();break;
      case 'close-modal':state.modal=null;renderModal();break;
      case 'history-detail':state.modal={type:'history',id};renderModal();break;
      case 'copy-history':{const h=state.history.find(x=>x.id===id);if(!h)break;const routine=state.routines.find(r=>r.id===(state.setup.selectedRoutineId||'routine-inicial'))||state.routines[0];if(!h.exercises?.length){showToast('Este registro não contém exercícios para reutilizar.');break;}if(!confirm('Substituir os exercícios da rotina atual pelos exercícios deste treino? O histórico não será alterado.'))break;const ids=h.exercises.map(e=>state.exercises.find(x=>x.id===e.sourceId||x.id===e.id)?.id).filter(Boolean);if(routine){routine.exerciseIds=[...new Set(ids)];routine.name=h.name||routine.name;state.setup.selectedRoutineId=routine.id;}state.setup.date=todayLocal();state.modal=null;state.view='treinos';save();render();showToast('Rotina atualizada usando o treino do histórico.');break;}
      case 'add-weight':state.modal={type:'weight'};renderModal();break;
      case 'delete-weight':deleteWeight(id);break;
      case 'enable-notifications': {if(!('Notification' in window)){showToast('Este navegador não oferece notificações para o FullBody.');break;}if(Notification.permission==='granted'){showToast('As notificações já estão ativadas.');break;}Notification.requestPermission().then(permission=>{render();showToast(permission==='granted'?'Notificações ativadas.':'Permissão de notificações não concedida.');}).catch(()=>showToast('Não foi possível solicitar a permissão de notificações.'));break;}
      case 'export-json':exportJson();break;
      case 'import-json':$('#import-file').click();break;
      case 'reset-data':state.modal={type:'reset'};renderModal();break;
      case 'confirm-reset':if(confirm('Confirma a exclusão permanente de todos os dados?')){localStorage.removeItem(STORAGE_KEY);state=seedState();render();showToast('Dados apagados.');}break;
    }
  }
  
  document.addEventListener('click',event=>{
    ensureAudio();
    const target=event.target.closest('[data-action]');if(!target)return;
    if(target.dataset.action==='close-modal' && target.classList.contains('modal-backdrop') && event.target!==target)return;
    if(target.type==='submit'&&target.closest('form'))return;
    handleAction(target);
  });
  document.addEventListener('change',event=>{
    const el=event.target;
    if(el.id==='exercise-search'){state.search=el.value;render();const inp=$('#exercise-search');if(inp){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);}return;}
    if(el.id==='block-filter'){state.filterBlock=el.value;render();return;}
    if(el.id==='workout-date'){state.setup.date=el.value||todayLocal();save();return;}
    if(el.id==='routine-select'){state.setup.selectedRoutineId=el.value;save();render();return;}
    if(el.matches('[data-action="toggle-set"]')){markSet(el.dataset.ex,Number(el.dataset.set),el.checked);return;}
    if(el.matches('[data-action="set-reps"], [data-action="set-weight"]')){const ex=state.active?.exercises.find(x=>x.id===el.dataset.ex),s=ex?.sets[Number(el.dataset.set)];if(s){if(el.dataset.action==='set-reps')s.reps=Number(el.value)||0;else s.weight=el.value;save();}return;}
  });
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.id==='exercise-search'){state.search=el.value;const pos=el.selectionStart;const list=state.exercises.filter(e=>(state.filterBlock==='Todos'||e.block===state.filterBlock)&&`${e.name} ${e.group} ${e.equipment}`.toLowerCase().includes(state.search.toLowerCase()));const target=$('#main');const action=button('+ Cadastrar exercício','new-exercise','btn btn-primary');target.innerHTML=`${pageHead('BIBLIOTECA','Exercícios','Gerencie os exercícios, equipamentos e parâmetros do seu treino.',action)}<section class="panel" style="margin-bottom:18px"><div class="form-row"><div class="field" style="margin:0"><label for="exercise-search">Pesquisar</label><input id="exercise-search" value="${escapeHtml(state.search)}" placeholder="Nome, grupo muscular ou equipamento..."></div><div class="field" style="margin:0"><label for="block-filter">Filtrar por bloco</label><select id="block-filter"><option ${state.filterBlock==='Todos'?'selected':''}>Todos</option>${['A','B','C','D'].map(b=>`<option value="${b}" ${state.filterBlock===b?'selected':''}>Bloco ${b}</option>`).join('')}</select></div></div></section><div class="list">${list.length?list.map(exerciseLine).join(''):emptyState('⌕','Nenhum exercício encontrado','Ajuste a pesquisa ou cadastre um novo exercício.',button('+ Cadastrar exercício','new-exercise','btn btn-primary'))}</div><p class="inline-note">As alterações na biblioteca não modificam treinos já realizados.</p>`;const next=$('#exercise-search');next?.focus();if(next&&pos!=null)next.setSelectionRange(pos,pos);return;}
  });
  document.addEventListener('submit',event=>{
    event.preventDefault();const form=event.target;
    if(form.id==='exercise-form'){
      const fd=new FormData(form),existing=state.exercises.find(e=>e.id===form.dataset.id);const name=String(fd.get('name')||'').trim(),group=String(fd.get('group')||'').trim();if(!name||!group){showToast('Preencha o nome e o grupo muscular.');return;}
      const entry={id:existing?.id||uid('ex'),name,group,equipment:String(fd.get('equipment')||'').trim(),block:String(fd.get('block')||'D'),sets:Math.min(20,Math.max(1,Number(fd.get('sets'))||3)),reps:String(fd.get('reps')||'10–12').trim(),rest:Math.min(900,Math.max(0,Number(fd.get('rest'))||0)),secondary:String(fd.get('secondary')||'').trim(),notes:String(fd.get('notes')||'').trim()};
      if(existing)state.exercises=state.exercises.map(e=>e.id===existing.id?entry:e);else{state.exercises.push(entry);state.setup.selectedIds.push(entry.id);}state.modal=null;save();render();showToast(existing?'Exercício atualizado.':'Exercício cadastrado.');
    }else if(form.id==='weight-form'){
      const fd=new FormData(form),weight=Number(fd.get('weight')),date=String(fd.get('date')||todayLocal());if(!weight||weight<=0){showToast('Informe um peso válido.');return;}state.weightLog.push({id:uid('weight'),date,weight});state.profile.weight=String(weight);state.modal=null;save();render();showToast('Peso registrado.');
    }else if(form.id==='profile-form'){
      const fd=new FormData(form);const oldWeight=state.profile.weight;state.profile={...state.profile,name:String(fd.get('name')||'').trim(),birthdate:String(fd.get('birthdate')||''),sex:String(fd.get('sex')||''),height:String(fd.get('height')||''),weight:String(fd.get('weight')||''),targetWeight:String(fd.get('targetWeight')||''),goal:String(fd.get('goal')||'Condicionamento'),notes:String(fd.get('notes')||'').trim()};
      if(state.profile.weight && state.profile.weight!==oldWeight){state.weightLog.push({id:uid('weight'),date:todayLocal(),weight:Number(state.profile.weight)});}save();render();showToast('Perfil atualizado.');
    }else if(form.id==='finish-form'){
      const fd=new FormData(form);finishWorkout(String(fd.get('notes')||'').trim());
    }else if(form.id==='routine-form'){
      const fd=new FormData(form);confirmStart(String(fd.get('name')||'').trim());
    }else if(form.id==='routine-editor-form'){
      const fd=new FormData(form),name=String(fd.get('name')||'').trim(),ids=[...new Set(fd.getAll('exerciseIds').map(String).filter(id=>state.exercises.some(e=>e.id===id)))];
      const routine=state.routines.find(r=>r.id===form.dataset.id)||state.routines[0];
      if(!routine){showToast('Não foi encontrada uma rotina para atualizar.');return;}
      if(!name){showToast('Informe o nome do treino.');return;}
      if(!ids.length){showToast('Selecione ao menos um exercício para a rotina.');return;}
      routine.name=name;routine.description=`${ids.length} exercícios selecionados`;routine.exerciseIds=ids;state.setup.selectedRoutineId=routine.id;state.modal=null;save();render();showToast('Rotina atualizada e salva neste dispositivo.');
    }
  });
  $('#import-file').addEventListener('change',event=>{importJsonFile(event.target.files?.[0]);event.target.value='';});
  let audioContext=null;
  function ensureAudio(){
    try{const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;if(!audioContext)audioContext=new AudioCtx();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch(e){}
  }
  function scheduleRestBeeps(){
    if(!audioContext)return;
    const now=audioContext.currentTime;
    // Stronger ascending alert: eight longer beeps over about three seconds.
    const pattern=[
      {delay:0.00,freq:880},{delay:0.34,freq:1175},{delay:0.68,freq:1480},
      {delay:1.16,freq:880},{delay:1.50,freq:1175},{delay:1.84,freq:1480},
      {delay:2.32,freq:1760},{delay:2.68,freq:1320}
    ];
    pattern.forEach(({delay,freq})=>{
      const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
      oscillator.type='triangle';oscillator.frequency.setValueAtTime(freq,now+delay);
      gain.gain.setValueAtTime(0.0001,now+delay);
      gain.gain.exponentialRampToValueAtTime(0.72,now+delay+0.025);
      gain.gain.setValueAtTime(0.72,now+delay+0.20);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+delay+0.31);
      oscillator.connect(gain);gain.connect(audioContext.destination);
      oscillator.start(now+delay);oscillator.stop(now+delay+0.33);
    });
  }
  function playRestAlarm(){
    // Best effort only: PWAs cannot acquire native Android audio focus or guarantee timers while locked.
    try{
      ensureAudio();
      if(audioContext){if(audioContext.state==='suspended')audioContext.resume().then(scheduleRestBeeps).catch(()=>{});else scheduleRestBeeps();}
    }catch(e){}
    try{if(navigator.vibrate)navigator.vibrate([260,90,260,90,500,110,260]);}catch(e){}
    try{
      if('Notification' in window&&Notification.permission==='granted'&&document.visibilityState==='hidden'){
        if('serviceWorker' in navigator){navigator.serviceWorker.ready.then(reg=>reg.showNotification('FullBody — descanso concluído',{body:'Seu descanso terminou. Próxima rodada liberada.',icon:'./icon.svg',tag:'fullbody-rest-alarm',renotify:true,vibrate:[260,90,260,90,500]})).catch(()=>{});}
        else new Notification('FullBody — descanso concluído',{body:'Seu descanso terminou. Próxima rodada liberada.'});
      }
    }catch(e){}
  }
  function updateLiveTimers(){
    const a=state.active;if(!a)return;
    const timer=$('#workout-timer');if(timer)timer.textContent=fmtDuration(getElapsedSeconds(a));
    if(a.rest?.endAt){
      const seconds=Math.max(0,Math.ceil((a.rest.endAt-Date.now())/1000));
      const rest=$('#rest-time');if(rest)rest.textContent=fmtDuration(seconds);
      if(seconds<=0){a.rest=null;save();playRestAlarm();render();showToast('Descanso concluído! Próxima rodada liberada.');}
    }
  }
  setInterval(updateLiveTimers,1000);
  // A returning foreground tab checks deadlines that elapsed while browsers throttled background timers.
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();else updateLiveTimers();});
  window.addEventListener('beforeunload',save);
  if('serviceWorker' in navigator && /^https?:$/.test(location.protocol))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  render();
})();
