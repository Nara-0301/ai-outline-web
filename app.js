(() => {
  const LEVELS = [
    { key:'BG1', name:'Beginner Lv1', color:'#70a9a1' },
    { key:'BG2', name:'Beginner Lv2', color:'#87b7a7' },
    { key:'BG3', name:'Beginner Lv3', color:'#a9c877' },
    { key:'EM1', name:'Elementary Lv1', color:'#d7c65f' },
    { key:'EM2', name:'Elementary Lv2', color:'#e6a95f' },
    { key:'EM3', name:'Elementary Lv3', color:'#df8464' },
    { key:'IM1', name:'Intermediate Lv1', color:'#bb7080' },
    { key:'IM2', name:'Intermediate Lv2', color:'#896d8d' }
  ];
  const PROGRAMS = {
    MG:{ name:'Morning Greeting', short:'아침 인사', color:'#eea949', groups:[[3,4],[6,7],[8,9],[10,11],[12,13],[14,15],[16,17],[18,19]] },
    AR:{ name:'Afternoon Routine', short:'오후 일상', color:'#65a4a1', groups:[[2,3],[5,6],[7,8],[9,10],[11,12],[13,14],[15,16],[17,18]] },
    BL:{ name:'Background Listening', short:'배경 청취', color:'#8a7da7', groups:[[2,0],[4,0],[5,0],[6,0],[7,0]] },
    BT:{ name:'Bedtime Talk', short:'취침 대화', color:'#496c91', groups:[[2,3],[5,6],[7,8],[9,10],[11,12],[13,14],[15,16],[17,18]] }
  };
  const PROGRAM_KEYS = Object.keys(PROGRAMS);
  const state = { level:'BG1', type:'ALL', query:'', limit:40 };
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const promptButton = (code, content, extraClass='') => window.PromptViewer
    ? window.PromptViewer.button(code, content, extraClass)
    : `<code>${content}</code>`;

  function grid(raw){
    const rows=new Map();
    raw.cells.forEach(([r,c,v])=>{ if(!rows.has(r)) rows.set(r,{}); rows.get(r)[c]=v; });
    return rows;
  }
  const grids=Object.fromEntries(PROGRAM_KEYS.map(k=>[k,grid(window.OUTLINE_RAW[k])]));
  const scheduleRows=new Map();
  PROGRAM_KEYS.forEach(program=>{
    for(const [rowNo,row] of grids[program]){
      const id=String(row[1]||'').trim();
      if(rowNo>=15&&id&&!scheduleRows.has(rowNo)) scheduleRows.set(rowNo,id);
    }
  });

  function isTopic(v){
    if(!v) return false;
    const s=v.trim();
    if(/^(직접 입력|주제 대화|대화형 게임|Role-play|단어 강화 대화\d*|단어 게임\d*)$/i.test(s)) return false;
    if(/^[A-Z]{2,}\d?_[A-Z0-9_]+$/i.test(s)) return false;
    if(/^[A-Z]\d?(,\s*[A-Z]\d?)+$/i.test(s)) return false;
    return /[a-z가-힣]{3}/i.test(s);
  }
  function kindOf(id){
    if(/주말|추가/.test(id)) return 'EXTRA';
    if(/R\d{3}|_R/i.test(id)) return 'REVIEW';
    return 'NORMAL';
  }
  function kindLabel(k){ return k==='REVIEW'?'복습':k==='EXTRA'?'주말 추가':'일차 학습'; }
  function kindClass(k){ return k==='REVIEW'?'review':k==='EXTRA'?'extra':'normal'; }
  function displayRoundId(levelKey,id){
    const value=String(id||'').trim();
    const weekend=value.match(/^주말\s*추가\s*(\d+)$/);
    if(weekend) return `주말 추가 ${weekend[1]}`;
    if(levelKey==='BG1') return value;
    const round=value.match(/([NR]\d{3})$/i);
    return round?round[1].toUpperCase():value;
  }

  function parseProgram(key){
    const cfg=PROGRAMS[key], out=[];
    for(const [rowNo,row] of grids[key]){
      if(rowNo<15) continue;
      const id=String(row[1]||'').trim();
      if(!id) continue;
      const sessions=cfg.groups.map((cols,i)=>({
        level:LEVELS[i],
        code:row[cols[0]]||'',
        type:cols[1]?row[cols[1]]||'':''
      })).filter(s=>s.code||s.type);
      if(sessions.length) out.push({id,rowNo,kind:kindOf(id),sessions});
    }
    return out;
  }
  const models=Object.fromEntries(PROGRAM_KEYS.map(k=>[k,parseProgram(k)]));

  function combined(levelKey){
    const map=new Map();
    let maxRowNo=0;
    PROGRAM_KEYS.forEach(program=>{
      models[program].forEach(lesson=>{
        const session=lesson.sessions.find(s=>s.level.key===levelKey);
        if(!session) return;
        maxRowNo=Math.max(maxRowNo,lesson.rowNo);
        if(!map.has(lesson.id)) map.set(lesson.id,{id:displayRoundId(levelKey,lesson.id),sourceId:lesson.id,kind:lesson.kind,entries:{},rowNo:lesson.rowNo});
        map.get(lesson.id).rowNo=Math.min(map.get(lesson.id).rowNo,lesson.rowNo);
        map.get(lesson.id).entries[program]={...session,rowNo:lesson.rowNo};
      });
    });
    for(const [rowNo,sourceId] of scheduleRows){
      if(rowNo>maxRowNo||map.has(sourceId)) continue;
      map.set(sourceId,{id:displayRoundId(levelKey,sourceId),sourceId,kind:kindOf(sourceId),entries:{},rowNo});
    }
    return [...map.values()].sort((a,b)=>a.rowNo-b.rowNo||a.sourceId.localeCompare(b.sourceId,'ko'));
  }
  const levelRows=Object.fromEntries(LEVELS.map(l=>[l.key,combined(l.key)]));

  function duration(level){
    const idx=LEVELS.findIndex(l=>l.key===level);
    const row=grids.MG.get(7)||{};
    return row[PROGRAMS.MG.groups[idx][0]] || (idx<3?'6개월':idx<6?'10개월':'12개월');
  }
  function subject(entry){
    if(!entry) return '';
    return isTopic(entry.type)?entry.type:'';
  }
  function searchable(row){
    return [row.id,row.sourceId,...PROGRAM_KEYS.flatMap(k=>{
      const e=row.entries[k]; return e?[k,PROGRAMS[k].name,e.code,e.type]:[];
    })].join(' ').toLowerCase();
  }
  function filtered(){
    const q=state.query.trim().toLowerCase();
    return levelRows[state.level].filter(r=>(state.type==='ALL'||r.kind===state.type)&&(!q||searchable(r).includes(q)));
  }
  function mark(text){
    const safe=esc(text); if(!state.query.trim()) return safe;
    const q=state.query.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return safe.replace(new RegExp(`(${q})`,'ig'),'<mark class="highlight">$1</mark>');
  }

  function renderLevelNav(){
    $('#levelNav').innerHTML=LEVELS.map(l=>{
      const available=PROGRAM_KEYS.filter(k=>models[k].some(x=>x.sessions.some(s=>s.level.key===l.key))).length;
      return `<button data-level="${l.key}" class="${state.level===l.key?'active':''}"><span class="nav-code">${l.key}</span><span class="nav-name">${esc(l.name)}</span><span class="nav-count">${available}/4</span></button>`;
    }).join('');
    $('#levelNav').querySelectorAll('button').forEach(b=>b.onclick=()=>selectLevel(b.dataset.level));
    $('#mobileLevelSelect').innerHTML=LEVELS.map(l=>`<option value="${l.key}">${l.key}</option>`).join('');
    $('#mobileLevelSelect').value=state.level;
  }
  function selectLevel(level){
    state.level=level; state.type='ALL'; state.limit=40;
    render();
    document.querySelector('.sidebar').classList.remove('open');
  }

  function renderHero(){
    const l=LEVELS.find(x=>x.key===state.level), rows=levelRows[state.level];
    const programs=PROGRAM_KEYS.filter(k=>rows.some(r=>r.entries[k])).length;
    const topics=new Set(rows.flatMap(r=>PROGRAM_KEYS.map(k=>subject(r.entries[k])).filter(Boolean))).size;
    $('#levelCode').textContent=`${l.key} · ${l.name}`;
    $('#levelDescription').textContent=`예상 학습 기간 ${duration(l.key)}. 같은 회차의 Morning Greeting, Afternoon Routine, Background Listening, Bedtime Talk을 한 줄에 연결했습니다.`;
    const stats=[['통합 회차',rows.length],['연결 프로그램',programs],['복습 회차',rows.filter(r=>r.kind==='REVIEW').length],['표시 주제',topics]];
    $('#heroStats').innerHTML=stats.map(([label,n])=>`<div class="stat-card"><strong>${Number(n).toLocaleString('ko-KR')}</strong><span>${label}</span></div>`).join('');
  }

  function preview(entry,program){
    if(!entry) return '<div class="program-cell empty">—</div>';
    const topic=subject(entry);
    const title=topic || (entry.type && !/직접 입력/.test(entry.type)?entry.type:'프롬프트');
    return `<div class="program-cell" style="--program-color:${PROGRAMS[program].color}"><b>${mark(title)}</b>${promptButton(entry.code,mark(entry.code),'prompt-code-compact')}${topic?'':entry.type?`<small>${mark(entry.type)}</small>`:''}</div>`;
  }
  function detail(entry,program){
    if(!entry) return '<div class="detail-cell empty">해당 레벨 콘텐츠 없음</div>';
    const topic=subject(entry);
    return `<div class="detail-cell" style="--program-color:${PROGRAMS[program].color}"><span class="detail-program">${program} · ${esc(PROGRAMS[program].name)}</span>${promptButton(entry.code,mark(entry.code))}${entry.type?`<span class="detail-type">${mark(entry.type)}</span>`:''}${topic?`<p>${mark(topic)}</p>`:''}</div>`;
  }
  function rowCard(row){
    return `<details class="curriculum-row">
      <summary>
        <div class="round-cell"><code>${mark(row.id)}</code><small><span class="type-badge type-${kindClass(row.kind)}">${kindLabel(row.kind)}</span></small></div>
        ${PROGRAM_KEYS.map(k=>preview(row.entries[k],k)).join('')}
      </summary>
      <div class="matrix-detail"><div class="detail-label">전체 정보</div>${PROGRAM_KEYS.map(k=>detail(row.entries[k],k)).join('')}</div>
    </details>`;
  }
  function renderCatalog(){
    const all=filtered(),shown=all.slice(0,state.limit);
    $('#resultCount').textContent=all.length.toLocaleString('ko-KR');
    $('#curriculumList').innerHTML=shown.map(rowCard).join('');
    $('#loadMore').hidden=shown.length>=all.length;
    $('#emptyState').hidden=all.length!==0;
    const tags=[];
    if(state.type!=='ALL') tags.push(`유형 · ${kindLabel(state.type)}`);
    if(state.query) tags.push(`검색 · “${esc(state.query)}”`);
    $('#activeFilters').innerHTML=tags.map(t=>`<span class="filter-chip">${t}</span>`).join('');
  }
  function render(){
    renderLevelNav(); renderHero();
    $('#typeFilters').innerHTML=[['ALL','전체'],['NORMAL','일차 학습'],['REVIEW','복습'],['EXTRA','주말 추가']].map(([k,v])=>`<button class="${state.type===k?'active':''}" data-type="${k}">${v}</button>`).join('');
    $('#typeFilters').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.type=b.dataset.type;state.limit=40;render();});
    renderCatalog();
  }

  $('#searchInput').addEventListener('input',e=>{state.query=e.target.value;state.limit=40;renderCatalog();});
  $('#mobileLevelSelect').addEventListener('change',e=>selectLevel(e.target.value));
  $('#loadMore').onclick=()=>{state.limit+=60;renderCatalog();};
  $('#mobileMenu').onclick=()=>document.querySelector('.sidebar').classList.toggle('open');
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchInput').focus();}});
  render();
})();
