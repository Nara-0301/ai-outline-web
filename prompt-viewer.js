(() => {
  const data = window.PROMPT_DETAILS || {};
  const instructions = data.systemInstructions || {};
  const studyInfo = data.studyInfo || {};
  const messages = data.messages || {};
  const modal = document.querySelector('#promptModal');
  const panel = modal?.querySelector('.prompt-modal-panel');
  const title = document.querySelector('#promptModalTitle');
  const codeLabel = document.querySelector('#promptModalCode');
  const meta = document.querySelector('#promptModalMeta');
  const body = document.querySelector('#promptModalBody');
  const dataSummary = document.querySelector('#promptDataSummary');
  let previousFocus = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function messageCodeFor(code) {
    return String(code).replace(/^(.*_CCA)_(\d+)$/, '$1_CM_$2');
  }

  function has(code) {
    return Boolean(instructions[code]);
  }

  function hasStudy(code) {
    return Boolean(studyInfo[code]);
  }

  function button(code, innerHtml, extraClass = '') {
    const available = has(code);
    const studyAvailable = hasStudy(code);
    const label = available ? `${code} 프롬프트 보기` : `${code} 상세 데이터 없음`;
    return `<span class="prompt-code-group">
      <button type="button" class="prompt-code ${available ? 'is-available' : 'is-unavailable'} ${extraClass}" data-prompt-code="${esc(code)}" aria-label="${esc(label)}" title="${esc(label)}">${innerHtml}${available ? '<span class="prompt-available-label">프롬프트</span>' : ''}</button>
      ${studyAvailable ? `<button type="button" class="study-info-button" data-study-code="${esc(code)}" aria-label="${esc(code)} Study Info 보기">STUDY INFO</button>` : ''}
    </span>`;
  }

  function metaChip(label, value) {
    if (!value) return '';
    return `<span><small>${esc(label)}</small><b>${esc(value)}</b></span>`;
  }

  function studySection(info) {
    if (!info) return '';
    return `<section class="prompt-support-section">
      <div class="prompt-section-heading"><div><p class="eyebrow">STUDY INFO</p><h3>연결된 학습 정보</h3></div></div>
      <div class="study-info-grid">
        ${metaChip('주제', [info.subject, info.subjectKor].filter(Boolean).join(' · '))}
        ${metaChip('이미지 유형', info.imageType)}
      </div>
      ${info.contents ? `<div class="support-copy"><b>학습 내용</b><p>${esc(info.contents)}</p>${info.contentsKor ? `<p lang="ko">${esc(info.contentsKor)}</p>` : ''}</div>` : ''}
      ${info.reportContents ? `<div class="support-copy"><b>리포트 문구</b><p>${esc(info.reportContents)}</p></div>` : ''}
    </section>`;
  }

  function messagesSection(items, messageCode) {
    if (!items?.length) return '';
    return `<section class="prompt-support-section">
      <div class="prompt-section-heading"><div><p class="eyebrow">MESSAGE SEQUENCE</p><h3>연결된 대화 문구</h3></div><code>${esc(messageCode)}</code></div>
      <ol class="message-list">${items.map(item => `<li>
        <div class="message-tags">
          ${item.emotion ? `<span>${esc(item.emotion)}</span>` : ''}
          ${item.extensionType ? `<span>${esc(item.extensionType)}</span>` : ''}
        </div>
        <p>${esc(item.message)}</p>
        ${item.translated ? `<p class="message-translation" lang="ko">${esc(item.translated)}</p>` : ''}
      </li>`).join('')}</ol>
    </section>`;
  }

  function open(code) {
    if (!modal) return;
    const instruction = instructions[code];
    const messageCode = messageCodeFor(code);
    const messageItems = messages[messageCode] || [];
    previousFocus = document.activeElement;
    codeLabel.textContent = code;

    if (!instruction) {
      title.textContent = '프롬프트 상세 데이터 없음';
      meta.innerHTML = '';
      body.innerHTML = `<div class="prompt-empty"><span>i</span><h3>제공된 원본에서 찾지 못했습니다</h3><p>현재 연결된 운영 배포 파일에는 <code>${esc(code)}</code>의 프롬프트 본문이 없습니다.</p></div>`;
    } else {
      title.textContent = '시스템 프롬프트';
      meta.innerHTML = [
        metaChip('레벨', instruction.level),
        metaChip('프로그램', instruction.program),
        metaChip('버전', instruction.version),
        metaChip('상태', instruction.status),
        metaChip('학습 유형', instruction.studyType)
      ].join('');
      body.innerHTML = `<section class="prompt-primary-section">
        <div class="prompt-section-heading">
          <div><p class="eyebrow">SYSTEM INSTRUCTION</p><h3>실제 프롬프트 본문</h3></div>
          <button type="button" class="copy-prompt" data-copy-prompt>본문 복사</button>
        </div>
        <pre>${esc(instruction.prompt)}</pre>
      </section>${messagesSection(messageItems, messageCode)}`;
    }

    modal.hidden = false;
    document.body.classList.add('prompt-modal-open');
    requestAnimationFrame(() => panel?.focus());
  }

  function openStudy(code) {
    if (!modal) return;
    const info = studyInfo[code];
    previousFocus = document.activeElement;
    codeLabel.textContent = code;
    title.textContent = 'STUDY INFO';

    if (!info) {
      meta.innerHTML = '';
      body.innerHTML = `<div class="prompt-empty"><span>i</span><h3>Study Info 데이터 없음</h3><p>현재 연결된 Study Info 시트에는 <code>${esc(code)}</code> 데이터가 없습니다.</p></div>`;
    } else {
      meta.innerHTML = [
        metaChip('Study Info ID', info.id),
        metaChip('주제', info.subject),
        metaChip('한글 주제', info.subjectKor),
        metaChip('이미지 유형', info.imageType),
        metaChip('적용 버전', info.sourceDate)
      ].join('');
      body.innerHTML = `<section class="study-detail-section">
        <div class="prompt-section-heading"><div><p class="eyebrow">STUDY CONTENTS</p><h3>학습 내용</h3></div></div>
        <div class="study-detail-card">
          <div><span>ENGLISH</span><p lang="en">${esc(info.contents || '—')}</p></div>
          <div><span>KOREAN</span><p lang="ko">${esc(info.contentsKor || '—')}</p></div>
          ${info.reportContents ? `<div><span>REPORT CONTENTS</span><p>${esc(info.reportContents)}</p></div>` : ''}
        </div>
      </section>`;
    }

    modal.hidden = false;
    document.body.classList.add('prompt-modal-open');
    requestAnimationFrame(() => panel?.focus());
  }

  function close() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('prompt-modal-open');
    previousFocus?.focus?.();
  }

  async function copyPrompt(buttonElement) {
    const code = codeLabel.textContent;
    const text = instructions[code]?.prompt || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      buttonElement.textContent = '복사 완료';
      setTimeout(() => { buttonElement.textContent = '본문 복사'; }, 1400);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      buttonElement.textContent = '복사 완료';
      setTimeout(() => { buttonElement.textContent = '본문 복사'; }, 1400);
    }
  }

  document.addEventListener('click', event => {
    const studyButton = event.target.closest('[data-study-code]');
    if (studyButton) {
      event.preventDefault();
      event.stopPropagation();
      openStudy(studyButton.dataset.studyCode);
      return;
    }
    const promptButton = event.target.closest('[data-prompt-code]');
    if (promptButton) {
      event.preventDefault();
      event.stopPropagation();
      open(promptButton.dataset.promptCode);
      return;
    }
    if (event.target.closest('[data-prompt-close]')) close();
    const copyButton = event.target.closest('[data-copy-prompt]');
    if (copyButton) copyPrompt(copyButton);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal?.hidden) close();
  });

  if (dataSummary) {
    dataSummary.textContent = `시스템 프롬프트 ${Object.keys(instructions).length}개 · Study Info ${Object.keys(studyInfo).length}개 · 대화 문구 그룹 ${Object.keys(messages).length}개`;
  }

  window.PromptViewer = { has, hasStudy, button, open, openStudy, close };
})();
