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
    MG:{ title:'Morning Greeting', kicker:'MORNING GREETING · MG', headline:'하루의 시작을 여는', desc:'기상, 날씨, 아침 식사처럼 하루의 시작과 맞닿은 상황을 레벨별 대화로 구성합니다.', groups:[[3,4],[6,7],[8,9],[10,11],[12,13],[14,15],[16,17],[18,19]], topicMode:'type' },
    AR:{ title:'Afternoon Routine', kicker:'AFTERNOON ROUTINE · AR', headline:'하교 후 일상을 잇는', desc:'학교에서 있었던 일, 간식, 이동과 놀이 등 오후 생활을 자연스러운 영어 대화로 연결합니다.', groups:[[2,3],[5,6],[7,8],[9,10],[11,12],[13,14],[15,16],[17,18]], topicMode:'type' },
    BL:{ title:'Background Listening', kicker:'BACKGROUND LISTENING · BL', headline:'반복 노출로 쌓아가는', desc:'생활 속 배경 청취 콘텐츠를 회차와 레벨별 프롬프트 코드 중심으로 빠르게 탐색합니다.', groups:[[2,0],[4,0],[5,0],[6,0],[7,0]] },
    BT:{ title:'Bedtime Talk', kicker:'BEDTIME TALK · BT', headline:'하루를 차분히 닫는', desc:'오늘의 감정, 기억, 내일의 계획처럼 잠들기 전 나누기 좋은 대화를 단계적으로 구성합니다.', groups:[[2,3],[5,6],[7,8],[9,10],[11,12],[13,14],[15,16],[17,18]], topicMode:'type' },
    CCA:{ title:'Chit-Chat A', kicker:'CHIT-CHAT A · CCA', headline:'주제와 활동을 넘나드는', desc:'단어 강화, 주제 대화, 역할극, 대화형 게임을 레벨별 주제와 함께 입체적으로 살펴봅니다.', groups:[[3,4,5],[7,8,9],[10,11,12],[13,14,15],[16,17,18],[19,20,21],[22,23,24],[25,26,27]], orderCol:2 }
  };
  const state={program:'MG',level:'ALL',type:'ALL',query:'',limit:36};
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const promptButton=(code,content,extraClass='')=>window.PromptViewer
    ?window.PromptViewer.button(code,content,extraClass)
    :`<code>${content}</code>`;
  const grids={};

  function makeGrid(raw){
    const rows=new Map();
    raw.cells.forEach(([r,c,v])=>{if(!rows.has(r))rows.set(r,{});rows.get(r)[c]=v;});
    return rows;
  }
  Object.keys(PROGRAMS).forEach(k=>grids[k]=makeGrid(window.OUTLINE_RAW[k]));

  function isTopic(v){
    if(!v)return false;
    const s=v.trim();
    if(/^(직접 입력|주제 대화|대화형 게임|Role-play|단어 강화 대화\d*|단어 게임\d*)$/i.test(s))return false;
    if(/^[A-Z]{2,}\d?_[A-Z0-9_]+$/i.test(s))return false;
    if(/^[A-Z]\d?(,\s*[A-Z]\d?)+$/i.test(s))return false;
    return /[a-z가-힣]{3}/i.test(s);
  }
  function classify(id){if(/주말|추가/.test(id))return'EXTRA';if(/R\d{3}|_R/i.test(id))return'REVIEW';return'NORMAL';}
  function typeLabel(k){return k==='REVIEW'?'복습':k==='EXTRA'?'주말 추가':'일차 학습';}
  function typeClass(k){return k==='REVIEW'?'review':k==='EXTRA'?'extra':'normal';}
  function displayRoundId(levelKey,id){
    const value=String(id||'').trim();
    const weekend=value.match(/^주말\s*추가\s*(\d+)$/);
    if(weekend)return `주말 추가 ${weekend[1]}`;
    if(!levelKey||levelKey==='ALL'||levelKey==='BG1')return value;
    const round=value.match(/([NR]\d{3})$/i);
    return round?round[1].toUpperCase():value;
  }

  function parse(key){
    const cfg=PROGRAMS[key],out=[];
    for(const [rowNo,row] of grids[key]){
      if(rowNo<15)continue;
      const id=String(row[1]||'').trim();
      if(!id)continue;
      const sessions=cfg.groups.map((cols,i)=>({
        level:LEVELS[i],code:row[cols[0]]||'',type:cols[1]?row[cols[1]]||'':'',topic:cols[2]?row[cols[2]]||'':''
      })).filter(s=>s.code||s.type||s.topic);
      if(!sessions.length)continue;
      const topics=[...new Set(sessions.flatMap(s=>[s.topic,isTopic(s.type)?s.type:'']).filter(Boolean))];
      out.push({id,rowNo,order:cfg.orderCol?row[cfg.orderCol]||'':'',kind:classify(id),sessions,topics});
    }
    return out;
  }
  const models=Object.fromEntries(Object.keys(PROGRAMS).map(k=>[k,parse(k)]));

  function duration(key,index){
    const row=grids[key].get(7)||{},col=PROGRAMS[key].groups[index]?.[0];
    if(row[col])return row[col];
    return index<3?'6개월':index<6?'10개월':'12개월';
  }
  function mark(text){
    const safe=esc(text);if(!state.query.trim())return safe;
    const q=state.query.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return safe.replace(new RegExp(`(${q})`,'ig'),'<mark class="highlight">$1</mark>');
  }
  function filtered(){
    const q=state.query.trim().toLowerCase();
    return models[state.program].filter(l=>{
      if(state.type!=='ALL'&&l.kind!==state.type)return false;
      if(state.level!=='ALL'&&!l.sessions.some(s=>s.level.key===state.level))return false;
      if(!q)return true;
      return [l.id,l.order,...l.topics,...l.sessions.flatMap(s=>[s.level.key,s.code,s.type,s.topic])].join(' ').toLowerCase().includes(q);
    });
  }

  function renderNav(){
    $('#programNav').innerHTML=Object.entries(PROGRAMS).map(([k,p])=>`<button data-program="${k}" class="${state.program===k?'active':''}"><span class="nav-code">${k}</span><span class="nav-name">${esc(p.title)}</span><span class="nav-count">${models[k].length}</span></button>`).join('');
    $('#programNav').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.program=b.dataset.program;state.level='ALL';state.type='ALL';state.limit=36;render();document.querySelector('.sidebar').classList.remove('open');});
  }
  function renderRoadmap(){
    const available=new Set(models[state.program].flatMap(l=>l.sessions.map(s=>s.level.key)));
    $('#pLevelTrack').innerHTML=LEVELS.filter(l=>available.has(l.key)).map((l,i)=>`<button class="level-card ${state.level===l.key?'active':''}" style="--level-color:${l.color}" data-level="${l.key}"><span class="level-index">0${i+1} · ${l.key}</span><strong>${esc(l.name)}</strong><small>예상 ${esc(duration(state.program,LEVELS.indexOf(l)))}</small></button>`).join('');
    $('#pLevelTrack').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.level=state.level===b.dataset.level?'ALL':b.dataset.level;state.limit=36;renderRoadmap();renderCatalog();});
    $('#pLevelSelect').innerHTML=['<option value="ALL">전체 레벨</option>',...LEVELS.filter(l=>available.has(l.key)).map(l=>`<option value="${l.key}">${l.key} · ${esc(l.name)}</option>`)].join('');
    $('#pLevelSelect').value=state.level;
  }
  function lessonCard(l){
    const visible=state.level==='ALL'?l.sessions:l.sessions.filter(s=>s.level.key===state.level);
    const previews=(l.topics.length?l.topics:visible.map(s=>s.type).filter(isTopic)).slice(0,3);
    const title=l.order||previews[0]||typeLabel(l.kind);
    const displayId=displayRoundId(state.level,l.id);
    return `<details class="lesson"><summary><span class="lesson-id">${mark(displayId)}</span><span class="lesson-title"><strong>${mark(title)}</strong><small><span class="type-badge type-${typeClass(l.kind)}">${typeLabel(l.kind)}</span> · Excel row ${l.rowNo}</small></span><span class="topic-preview">${previews.map(t=>`<span>${mark(t)}</span>`).join('')||'<span>코드 중심 콘텐츠</span>'}</span><span class="chevron">＋</span></summary><div class="lesson-detail"><div class="level-grid">${visible.map(s=>`<article class="session-card" style="--level-color:${s.level.color}"><div class="session-top"><span class="session-level">${s.level.key} · ${esc(s.level.name)}</span>${s.type?`<span class="session-type">${mark(s.type)}</span>`:''}</div>${s.code?promptButton(s.code,mark(s.code),'session-code'):''}${s.topic?`<p class="session-topic">${mark(s.topic)}</p>`:''}</article>`).join('')}</div></div></details>`;
  }
  function renderCatalog(){
    const all=filtered(),shown=all.slice(0,state.limit);
    $('#pResultCount').textContent=all.length.toLocaleString('ko-KR');
    $('#pLessonList').innerHTML=shown.map(lessonCard).join('');
    $('#pLoadMore').hidden=shown.length>=all.length;$('#pEmptyState').hidden=all.length!==0;
    const tags=[];if(state.level!=='ALL')tags.push(`레벨 · ${state.level}`);if(state.type!=='ALL')tags.push(`유형 · ${typeLabel(state.type)}`);if(state.query)tags.push(`검색 · “${esc(state.query)}”`);
    $('#pActiveFilters').innerHTML=tags.map(t=>`<span class="filter-chip">${t}</span>`).join('');
  }
  function render(){
    const p=PROGRAMS[state.program],data=models[state.program];
    renderNav();
    $('#pProgramCode').textContent=p.kicker;
    $('#pProgramTitle').innerHTML=`${esc(p.headline)}<br><em>${esc(p.title)}</em>`;
    $('#pProgramDescription').textContent=p.desc;
    const topics=new Set(data.flatMap(x=>x.topics)).size;
    const stats=[['전체 회차',data.length],['일차 학습',data.filter(x=>x.kind==='NORMAL').length],['복습 회차',data.filter(x=>x.kind==='REVIEW').length],['고유 주제',topics]];
    $('#pHeroStats').innerHTML=stats.map(([label,n])=>`<div class="stat-card"><strong>${Number(n).toLocaleString('ko-KR')}</strong><span>${label}</span></div>`).join('');
    $('#pTypeFilters').innerHTML=[['ALL','전체'],['NORMAL','일차 학습'],['REVIEW','복습'],['EXTRA','주말 추가']].map(([k,v])=>`<button class="${state.type===k?'active':''}" data-type="${k}">${v}</button>`).join('');
    $('#pTypeFilters').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.type=b.dataset.type;state.limit=36;render();});
    renderRoadmap();renderCatalog();
  }

  function switchView(view){
    const isLevel=view==='level';
    $('#levelView').hidden=!isLevel;$('#programView').hidden=isLevel;
    $('#levelTab').classList.toggle('active',isLevel);$('#programTab').classList.toggle('active',!isLevel);
    $('#levelTab').setAttribute('aria-selected',String(isLevel));$('#programTab').setAttribute('aria-selected',String(!isLevel));
    $('#levelNav').hidden=!isLevel;$('#programNav').hidden=isLevel;
    $('#sideNavLabel').textContent=isLevel?'LEVELS':'PROGRAMS';
    document.querySelector('.topbar>.search').hidden=!isLevel;
    document.querySelector('.mobile-level').hidden=!isLevel;
    document.querySelector('.sidebar-note b').textContent=isLevel?'4개 프로그램 통합':'5개 최신 목차';
    document.querySelector('.sidebar-note small').textContent=isLevel?'동일 회차 가로 비교':'프로그램별 상세 탐색';
    window.scrollTo({top:0,behavior:'smooth'});
  }
  $('#levelTab').onclick=()=>switchView('level');
  $('#programTab').onclick=()=>switchView('program');
  $('#pSearchInput').addEventListener('input',e=>{state.query=e.target.value;state.limit=36;renderCatalog();});
  $('#pLevelSelect').addEventListener('change',e=>{state.level=e.target.value;state.limit=36;renderRoadmap();renderCatalog();});
  $('#pLoadMore').onclick=()=>{state.limit+=48;renderCatalog();};
  render();
})();
