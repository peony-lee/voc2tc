// ===== APP CONTROLLER (v12-optimized) =====
const PAGE_TITLES = {
  workbench:['工作台','今日待办与流程总览'],
  voices:['声音管理','导入、查看和管理用户声音'],
  generate:['用例生成','三阶段流水线 · 5类决策'],
  review:['用例审核','逐条决策 · 采纳 / 修改 / 驳回'],
  report:['报告输出','决策汇总 · 新建需求 · 后续行动'],
  graph:['关系图谱','声音 / 需求 / 用例可视化'],
  wiki:['知识库','三阶段决策原理']
};

let currentPage = 'workbench';

// ── 审核备注 & 原始场景快照 ──
let grReviewNotes = {};
let grTcOriginalScenes = {};

function render() {
  const pc = document.getElementById('pc');
  const renderer = PAGES[currentPage];
  pc.innerHTML = renderer ? renderer() : '<div>页面不存在</div>';
  // sync title
  const [t,sub] = PAGE_TITLES[currentPage] || [currentPage,''];
  document.getElementById('pageTitle').textContent = t;
  document.getElementById('breadcrumbSub').textContent = sub;
  // sync nav
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const a = document.querySelector(`.nav-item[data-page="${currentPage}"]`);
  if(a) a.classList.add('active');
  // update badges
  updateBadges();
  // restore voice selection checkboxes
  if(currentPage==='voices'){
    document.querySelectorAll('.v-sel').forEach(cb=>{
      cb.checked = DATA.ctx.selectedVoices.includes(cb.dataset.id);
    });
    document.getElementById('vsel-cnt').textContent = DATA.ctx.selectedVoices.length;
  }
  // initialize graph if on graph page
  if(currentPage==='graph'){
    setTimeout(initGraphV12, 100);
  }
  pc.scrollTop = 0;
}

function goPage(p){
  currentPage = p;
  render();
}

function updateBadges() {
  const b1 = document.getElementById('badge-voices');
  const b2 = document.getElementById('badge-review');
  if(b1) b1.textContent = DATA.voices.filter(v=>v.status==='pending').length;
  if(b2) b2.textContent = DATA.tcs.filter(t=>!t.decision).length;
}

// ===== VOICE SELECTION =====
function toggleVoiceSel(id){
  const idx = DATA.ctx.selectedVoices.indexOf(id);
  if(idx>=0) DATA.ctx.selectedVoices.splice(idx,1);
  else DATA.ctx.selectedVoices.push(id);
  // recompute auto modules
  const mods = new Set();
  DATA.ctx.selectedVoices.forEach(vid=>{
    const v = DATA.voices.find(vv=>vv.id===vid);
    if(v) mods.add(v.module);
  });
  DATA.ctx.autoModules = [...mods];
  // update UI without full re-render
  const cb = document.querySelector(`.v-sel[data-id="${id}"]`);
  if(cb) cb.checked = DATA.ctx.selectedVoices.includes(id);
  document.getElementById('vsel-cnt').textContent = DATA.ctx.selectedVoices.length;
}

function generateFromSelected(){
  if(!DATA.ctx.selectedVoices.length){
    showToast('请先选中至少一条声音','error');
    return;
  }
  showToast(`已带入 ${DATA.ctx.selectedVoices.length} 条声音 → 生成页`,'success');
  goPage('generate');
}

// ===== MODULES =====
function toggleModule(mid){
  const idx = DATA.ctx.autoModules.indexOf(mid);
  if(idx>=0) DATA.ctx.autoModules.splice(idx,1);
  else DATA.ctx.autoModules.push(mid);
  render();
}
function selectAllModules(){
  DATA.ctx.autoModules = DATA.modules.map(m=>m.id);
  render();
}
function clearModules(){
  DATA.ctx.autoModules = [];
  render();
}
// ===== THREE-STAGE GENERATION ENGINE =====
// Replaces the stub startGen with actual PocketBase API calls
// Stage1: voice -> requirement classification (LLM)
// Stage2: 4W TC matching (LLM)
// Stage3: wiki/persist (write results)

let _genState = { running: false, stage: 0, total: 0, current: 0, results: null };

function startGen(){
  if(!DATA.ctx.autoModules.length){
    showToast('请至少选中一个模块','error');
    return;
  }
  if(_genState.running){
    showToast('生成正在进行中...','error');
    return;
  }

  // Collect voices to process: selected voices or all pending
  let voicesToProcess = DATA.ctx.selectedVoices.length > 0
    ? DATA.voices.filter(v => DATA.ctx.selectedVoices.includes(v.id))
    : DATA.voices.filter(v => v.status === 'pending' || v.status === 'new_req');

  if(voicesToProcess.length === 0){
    showToast('没有可处理的声音，跳过 LLM 直接进入审核','success');
    goPage('review');
    return;
  }

  // Filter by selected modules
  const modSet = new Set(DATA.ctx.autoModules);
  voicesToProcess = voicesToProcess.filter(v => modSet.has(v.module));

  if(voicesToProcess.length === 0){
    showToast('选中模块内无可处理的声音','error');
    return;
  }

  if(PB.isConnected()){
    _runGenWithBackend(voicesToProcess);
  } else {
    _runGenLocal(voicesToProcess);
  }
}

// ── Backend mode: call PocketBase LLM APIs ──
async function _runGenWithBackend(voices){
  _genState = { running: true, stage: 1, total: voices.length, current: 0, results: { exactHits:[], partialHits:[], newReqs:[], crossReqs:[], needClarify:[] } };
  _updateGenProgress();

  try {
    // Stage 1: Voice -> Req classification for each voice
    for(let i = 0; i < voices.length; i++){
      const v = voices[i];
      _genState.current = i + 1;
      _genState.stage = 1;
      _updateGenProgress();

      try {
        const result = await PB.callStage1(v.id, v.text);
        if(result && result.ok && result.parsed){
          const parsed = result.parsed;
          // Update voice status
          v.status = parsed.status || 'categorized';
          v.module = parsed.module || v.module;
          // Classify result into buckets
          const decision = parsed.decision || 'clarify';
          const entry = { voiceId: v.id, reqId: parsed.reqId, module: parsed.module, confidence: parsed.confidence || 0, reasoning: parsed.reasoning || '' };
          if(decision === 'exact') _genState.results.exactHits.push(entry);
          else if(decision === 'partial') _genState.results.partialHits.push(entry);
          else if(decision === 'new-req') _genState.results.newReqs.push(entry);
          else if(decision === 'cross-req') _genState.results.crossReqs.push(entry);
          else _genState.results.needClarify.push(entry);
        }
      } catch(e){
        console.warn('Stage1 fail for ' + v.id + ':', e);
        // Fallback: mark as needs-clarify
        _genState.results.needClarify.push({ voiceId: v.id, module: v.module, confidence: 0, reasoning: 'Stage1 error: ' + e.message });
      }
    }

    // Stage 2: 4W TC matching (batch for partial/new-req/cross)
    _genState.stage = 2;
    const needMatchVoices = voices.filter(v =>
      _genState.results.partialHits.some(h => h.voiceId === v.id) ||
      _genState.results.newReqs.some(h => h.voiceId === v.id) ||
      _genState.results.crossReqs.some(h => h.voiceId === v.id)
    );

    for(let i = 0; i < needMatchVoices.length; i++){
      const v = needMatchVoices[i];
      _genState.current = i + 1;
      _updateGenProgress();

      try {
        const candidateTcs = DATA.tcs.filter(tc => tc.module === v.module).map(tc => ({
          id: tc.id, scene: tc.scene, expect: tc.expect,
          what: tc.scene, when: '', where: v.module, who: v.model
        }));
        const result = await PB.callStage2(v.id, v.text, candidateTcs);
        if(result && result.ok && result.parsed){
          // Create or update TC based on Stage2 result
          const parsed = result.parsed;
          if(parsed.baseTcId){
            const existingTc = DATA.tcs.find(tc => tc.id === parsed.baseTcId);
            if(existingTc){
              existingTc.from.push(v.id);
              existingTc.conf_n = parsed.confidence || existingTc.conf_n;
              existingTc.conf = existingTc.conf_n >= 0.8 ? 'high' : existingTc.conf_n >= 0.6 ? 'mid' : 'low';
              v.tcs.push(existingTc.id);
            }
          }
          // If new TC suggested, add it
          if(parsed.newTcSuggestion && parsed.newTcSuggestion.scene){
            const seq = String(DATA.tcs.length + 1).padStart(3, '0');
            const newTcId = 'TC-' + v.module.toUpperCase().slice(0,4) + '-' + seq;
            const newTc = {
              id: newTcId, module: v.module,
              conf: 'mid', conf_n: parsed.confidence || 0.6,
              scene: parsed.newTcSuggestion.scene || '',
              from: [v.id], req: parsed.reqId || '',
              decision: null, expect: parsed.newTcSuggestion.expect || '',
              dec_type: 'new-req'
            };
            DATA.tcs.push(newTc);
            v.tcs.push(newTcId);
          }
        }
      } catch(e){
        console.warn('Stage2 fail for ' + v.id + ':', e);
      }
    }

    // Stage 3: Persist to wiki
    _genState.stage = 3;
    _genState.current = 0;
    _updateGenProgress();

    try {
      await PB.persistWikiResult(_genState.results);
    } catch(e){
      console.warn('Wiki persist fail:', e);
    }

    // Sync back to appConfig
    _applyAppConfig();
    saveAppConfig();

    _genState.running = false;
    _genState.stage = 0;
    showToast('生成完成 · ' + DATA.tcs.length + ' 条用例已就绪','success');
    setTimeout(() => goPage('review'), 500);

  } catch(e){
    _genState.running = false;
    showToast('生成出错：' + e.message,'error');
  }
}

// ── Local mode: use existing data (no LLM) ──
function _runGenLocal(voices){
  _genState = { running: true, stage: 1, total: voices.length, current: 0, results: { exactHits:[], partialHits:[], newReqs:[], crossReqs:[], needClarify:[] } };
  _updateGenProgress();

  // Simulate stage 1 processing with progress animation
  let i = 0;
  const interval = setInterval(() => {
    if(i >= voices.length){
      clearInterval(interval);
      _genState.stage = 2;
      _genState.total = 1;
      _genState.current = 1;
      _updateGenProgress();

      setTimeout(() => {
        _genState.stage = 3;
        _updateGenProgress();
        setTimeout(() => {
          _genState.running = false;
          _genState.stage = 0;
          _applyAppConfig();
          saveAppConfig();
          showToast('本地模式生成完成 · ' + DATA.tcs.length + ' 条用例','success');
          setTimeout(() => goPage('review'), 300);
        }, 600);
      }, 600);
      return;
    }

    const v = voices[i];
    _genState.current = i + 1;
    _updateGenProgress();

    // Local rule-based classification
    if(v.status === 'pending') v.status = 'categorized';
    v.tcs = v.tcs || [];

    i++;
  }, 200);
}

function _updateGenProgress(){
  const pc = document.getElementById('pc');
  if(!pc || currentPage !== 'generate') return;

  // Update pipeline visualization
  const stageLabels = ['声音整理','需求归类','用例决策'];
  const stageIdx = _genState.stage - 1;

  // Update pipe nodes
  document.querySelectorAll('.pipe-node').forEach((el, idx) => {
    el.classList.remove('done','active');
    if(idx < stageIdx) el.classList.add('done');
    else if(idx === stageIdx) el.classList.add('active');
  });

  // Update pipe lines
  document.querySelectorAll('.pipe-line').forEach((el, idx) => {
    el.classList.remove('done','active');
    if(idx < stageIdx) el.classList.add('done');
    else if(idx === stageIdx) el.classList.add('active');
  });

  // Update card header to show progress
  const cardHeader = document.querySelector('.gen-grid .card-h');
  if(cardHeader && _genState.running){
    cardHeader.innerHTML = '三阶段流水线 <small>Stage ' + _genState.stage + '/3 · ' +
      (_genState.current > 0 ? _genState.current + '/' + _genState.total : '处理中...') + '</small>';
  }

  // Show progress toast for stage transitions
  if(_genState.stage === 1 && _genState.current === 1) showToast('Stage 1/3: 需求分类中...','');
  if(_genState.stage === 2 && _genState.current === 1) showToast('Stage 2/3: 用例匹配中...','');
  if(_genState.stage === 3) showToast('Stage 3/3: 持久化知识库...','');
}

// ===== DECISIONS (optimized: with notes support) =====
function decide(tcId, dec, note){
  const tc = DATA.tcs.find(t=>t.id===tcId);
  if(!tc) return;
  tc.decision = dec;
  // save original scene on first edit
  if(dec==='modify' && !grTcOriginalScenes[tcId]){
    grTcOriginalScenes[tcId] = tc.scene;
  }
  // save note
  if(note) grReviewNotes[tcId] = note;
  else if(dec==='accept') delete grReviewNotes[tcId]; // clear note on accept
  showToast(`${tcId} 已${dec==='accept'?'采纳':dec==='modify'?'标记修改':'驳回'}`,'success');
  render();
}

function openModifyModal(tcId){
  const tc = DATA.tcs.find(t=>t.id===tcId);
  if(!tc) return;
  // if no original saved yet, save now
  if(!grTcOriginalScenes[tcId]) grTcOriginalScenes[tcId] = tc.scene;
  const existingNote = grReviewNotes[tcId] || '';
  const existingScene = tc.scene;
  document.getElementById('dr-body').innerHTML = `
    <div class="dr-section">
      <h4>修改场景描述</h4>
      <textarea id="modify-scene-input" style="width:100%;min-height:80px;padding:8px 10px;border:1px solid var(--border-strong);border-radius:var(--r-sm);font-family:var(--font);font-size:var(--fs-body);resize:vertical">${existingScene}</textarea>
    </div>
    <div class="dr-section">
      <h4>修改原因 / 备注</h4>
      <textarea id="modify-note-input" placeholder="请填写修改原因（必填）" style="width:100%;min-height:60px;padding:8px 10px;border:1px solid var(--border-strong);border-radius:var(--r-sm);font-family:var(--font);font-size:var(--fs-small);resize:vertical">${existingNote}</textarea>
    </div>`;
  document.getElementById('dr-title').textContent = '修改用例 ' + tcId;
  document.getElementById('dr-actions').innerHTML = `
    <button class="btn btn-sm" onclick="closeDrawer()">取消</button>
    <button class="btn btn-primary" style="flex:1" onclick="confirmModify('${tcId}')">✎ 确认修改并采纳</button>`;
}
function confirmModify(tcId){
  const tc = DATA.tcs.find(t=>t.id===tcId);
  if(!tc) return;
  const newScene = document.getElementById('modify-scene-input').value.trim();
  const note = document.getElementById('modify-note-input').value.trim();
  if(!newScene) { showToast('场景描述不能为空','error'); return; }
  if(!note) { showToast('请填写修改原因','error'); return; }
  tc.scene = newScene;
  tc.decision = 'modify';
  grReviewNotes[tcId] = note;
  showToast(`${tcId} 已修改并采纳`,'success');
  closeDrawer();
  render();
}

function openRejectModal(tcId){
  const tc = DATA.tcs.find(t=>t.id===tcId);
  if(!tc) return;
  document.getElementById('dr-body').innerHTML = `
    <div class="dr-section">
      <h4>驳回原因（必填）</h4>
      <textarea id="reject-note-input" placeholder="请填写驳回原因…" style="width:100%;min-height:80px;padding:8px 10px;border:1px solid var(--border-strong);border-radius:var(--r-sm);font-family:var(--font);font-size:var(--fs-body);resize:vertical"></textarea>
    </div>`;
  document.getElementById('dr-title').textContent = '驳回用例 ' + tcId;
  document.getElementById('dr-actions').innerHTML = `
    <button class="btn btn-sm" onclick="closeDrawer()">取消</button>
    <button class="btn btn-danger" style="flex:1" onclick="confirmReject('${tcId}')">✕ 确认驳回</button>`;
}
function confirmReject(tcId){
  const note = document.getElementById('reject-note-input').value.trim();
  if(!note) { showToast('请填写驳回原因','error'); return; }
  decide(tcId, 'reject', note);
  // decide() calls render() already, but we need to close drawer
  closeDrawer();
}

function batchAccept(scope){
  let n=0;
  DATA.tcs.forEach(t=>{
    if(t.decision) return;
    if(scope==='all' || (scope==='high' && t.conf==='high')){
      t.decision='accept'; n++;
    }
  });
  showToast(`批量采纳 ${n} 条`,'success');
  render();
}
function clearDecisions(){
  DATA.tcs.forEach(t=>{ t.decision=null; delete grReviewNotes[t.id]; delete grTcOriginalScenes[t.id]; });
  showToast('已清除全部决策','success');
  render();
}

// ===== DRAWER =====
function openDrawer(tcId){
  const tc = DATA.tcs.find(t=>t.id===tcId);
  if(!tc) return;
  document.getElementById('dr-id').textContent = tc.id;
  document.getElementById('dr-title').textContent = tc.scene;
  const reqInfo = DATA.reqs[tc.req];
  const fromVoices = tc.from.map(vid => {
    const v = DATA.voices.find(vv=>vv.id===vid);
    return v ? `<div class="dr-trace-line"><span class="tag tag-gray">${v.id}</span><span style="flex:1;font-size:12px;color:var(--text-secondary);line-height:1.5">${v.text}</span></div>` : '';
  }).join('');

  const noteHtml = grReviewNotes[tcId]
    ? `<div class="dr-section"><h4>审核备注</h4><p style="font-size:13px;color:var(--warning);background:var(--warning-subtle);padding:8px 12px;border-radius:var(--r-sm)">${grReviewNotes[tcId]}</p></div>`
    : '';

  document.getElementById('dr-body').innerHTML = `
    <div class="dr-section">
      <h4>场景描述</h4>
      <p>${tc.scene}</p>
    </div>
    <div class="dr-section">
      <h4>预期结果</h4>
      <p style="font-family:var(--mono);font-size:12px;background:var(--bg-elevated);padding:10px 12px;border-radius:4px;color:var(--success)">${tc.expect}</p>
    </div>
    <div class="dr-section">
      <h4>溯源链路</h4>
      <div class="dr-trace">
        <div class="dr-trace-line"><span class="tag tag-gray">声音</span><span style="font-size:12px;color:var(--text-light)">${tc.from.length} 条原声</span></div>
        ${fromVoices}
        <div style="text-align:center;color:var(--text-light);font-size:14px;margin:4px 0">↓</div>
        <div class="dr-trace-line"><span class="tag ${reqInfo.isNew?'tag-amber':'tag-blue'}">${reqInfo.isNew?'新建':'已有'}</span><a>${tc.req}</a><span style="flex:1;font-size:12px;color:var(--text-secondary)">${reqInfo.name}</span></div>
        <div style="text-align:center;color:var(--text-light);font-size:14px;margin:4px 0">↓</div>
        <div class="dr-trace-line"><span class="tag tag-green">用例</span><a>${tc.id}</a><span style="flex:1;font-size:12px;color:var(--text-secondary)">本用例</span></div>
      </div>
    </div>
    <div class="dr-section">
      <h4>决策类型</h4>
      <p><span class="tag tag-blue">${DEC_LABELS[tc.dec_type]}</span> <span style="color:var(--text-light);margin-left:8px;font-size:12px">置信度 ${(tc.conf_n*100).toFixed(0)}%</span></p>
    </div>
    ${noteHtml}
    <div class="dr-section">
      <h4>操作</h4>
      <p style="font-size:12px;color:var(--text-light);line-height:1.6">点击右侧按钮可修改场景描述或填写驳回原因。审核备注将随导出文件一起保存。</p>
    </div>`;

  // drawer actions: if already decided, show status; else show action buttons
  document.getElementById('dr-actions').innerHTML = tc.decision
    ? `<span class="tag ${tc.decision==='accept'?'tag-green':tc.decision==='modify'?'tag-amber':'tag-red'}" style="font-size:13px;padding:6px 14px">已${tc.decision==='accept'?'采纳':tc.decision==='modify'?'修改':'驳回'}</span>
       <button class="btn btn-sm" style="margin-left:auto" onclick="undoDecision('${tc.id}');closeDrawer()">↺ 撤销</button>`
    : `<button class="btn btn-success" style="flex:1" onclick="decide('${tc.id}','accept');closeDrawer()">✓ 采纳</button>
       <button class="btn" style="flex:1" onclick="openModifyModal('${tc.id}')">✎ 修改</button>
       <button class="btn btn-danger" style="flex:1" onclick="openRejectModal('${tc.id}')">✕ 驳回</button>`;

  document.getElementById('overlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
}

function undoDecision(tcId){
  const tc = DATA.tcs.find(t=>t.id===tcId);
  if(!tc) return;
  tc.decision = null;
  delete grReviewNotes[tcId];
  showToast(`已撤销 ${tcId} 的决策`,'success');
  render();
}

function closeDrawer(){
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
}

function highlightTC(tcId){
  setTimeout(()=>{
    const row = document.getElementById('row-'+tcId);
    if(row){
      row.style.background='var(--primary-subtle)';
      row.scrollIntoView({block:'center',behavior:'smooth'});
      setTimeout(()=>row.style.background='',1500);
    }
  },200);
}

// ===== EXPORT FUNCTIONS =====
function _downloadBlob(content, filename, mime){
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportSingleTcYaml(tcId){
  const tc = DATA.tcs.find(t=>t.id===tcId);
  if(!tc) return;
  const note = grReviewNotes[tcId] || '';
  const decision = tc.decision || 'pending';
  const escape = s => (s||'').toString().replace(/"/g,'\\"');
  let yaml = `- id: ${tc.id}\n`;
  yaml += `  module: ${tc.module}\n`;
  yaml += `  confidence: ${tc.conf} (${tc.conf_n})\n`;
  yaml += `  from_voice: ${(tc.from||[]).join(', ') || ''}\n`;
  yaml += `  scene: "${escape(tc.scene)}"\n`;
  if(grTcOriginalScenes[tcId]) yaml += `  original_scene: "${escape(grTcOriginalScenes[tcId])}"\n`;
  yaml += `  decision: ${decision}\n`;
  if(note) yaml += `  review_note: "${escape(note)}"\n`;
  _downloadBlob(yaml, tcId + '.yaml', 'text/yaml;charset=utf-8');
  showToast('↓ ' + tcId + ' 已导出 YAML');
}

function exportAllYaml(){
  const list = DATA.tcs;
  if(!list.length) { showToast('⚠ 暂无用例可导出'); return; }
  const header = [
    '# HMI·GEN 测试用例集',
    '# 生成时间：' + new Date().toLocaleString('zh-CN'),
    '# 共 ' + list.length + ' 条用例',
    '',
    'test_cases:'
  ].join('\n') + '\n';
  const escape = s => (s||'').toString().replace(/"/g,'\\"');
  const body = list.map(tc => {
    const note = grReviewNotes[tc.id] || '';
    const decision = tc.decision || 'pending';
    return [
      `- id: ${tc.id}`,
      `  module: ${tc.module}`,
      `  confidence: ${tc.conf} (${tc.conf_n})`,
      `  from_voice: ${(tc.from||[]).join(', ') || ''}`,
      `  scene: "${escape(tc.scene)}"`,
      grTcOriginalScenes[tc.id] ? `  original_scene: "${escape(grTcOriginalScenes[tc.id])}"` : null,
      `  decision: ${decision}`,
      note ? `  review_note: "${escape(note)}"` : null,
      ''
    ].filter(Boolean).join('\n');
  }).join('\n');
  _downloadBlob(header + body, 'HMI_GEN_用例_' + _dateTag() + '.yaml', 'text/yaml;charset=utf-8');
  showToast('↓ 已导出 ' + list.length + ' 条 YAML');
}

function exportReviewNotesCsv(){
  const list = DATA.tcs;
  if(!list.length) { showToast('⚠ 暂无数据'); return; }
  const decisionMap = {accept:'采纳', modify:'修改采纳', reject:'驳回'};
  const lines = ['用例ID,模块,决策,审核备注,场景描述'];
  list.forEach(tc => {
    const dec = decisionMap[tc.decision] || '待审核';
    const note = (grReviewNotes[tc.id] || '').replace(/"/g,'""');
    const scene = (tc.scene || '').replace(/"/g,'""');
    lines.push([tc.id, tc.module, dec, '"'+note+'"', '"'+scene+'"'].join(','));
  });
  const csv = '\uFEFF' + lines.join('\n');
  _downloadBlob(csv, 'HMI_GEN_审核明细_' + _dateTag() + '.csv', 'text/csv;charset=utf-8');
  showToast('↓ 审核明细已导出');
}

function _dateTag() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + '_' +
    String(d.getHours()).padStart(2,'0') + String(d.getMinutes()).padStart(2,'0');
}

// ===== TOAST =====
function showToast(msg, type='success'){
  const t = document.getElementById('toast');
  t.className = 'toast ' + type;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__toastT);
  window.__toastT = setTimeout(()=>t.classList.remove('show'), 2400);
}

// ===== INIT =====
document.querySelectorAll('.nav-item').forEach(item=>{
  item.addEventListener('click', e=>{
    e.preventDefault();
    goPage(item.dataset.page);
  });
});

// ===== Wiki: 从 PocketBase 刷新数据 =====
async function refreshWikiFromBackend(){
  try {
    const res = await PB_FETCH('/api/wiki/state');
    if(res && res.reqs){
      // 合并后端数据到本地 appConfig
      (res.reqs||[]).forEach(r => {
        if(!appConfig.reqs[r.reqId]){
          appConfig.reqs[r.reqId] = {name: r.name || r.reqId, tcCnt: (r.tcIdList||[]).length, isNew: false};
        } else {
          appConfig.reqs[r.reqId].name = r.name || appConfig.reqs[r.reqId].name;
          appConfig.reqs[r.reqId].tcCnt = (r.tcIdList||[]).length || appConfig.reqs[r.reqId].tcCnt;
        }
      });
      _applyAppConfig();
      saveAppConfig();
      showToast(`从后端刷新 ${res.reqs.length} 个需求`,'success');
      render();
    } else {
      showToast('后端无数据或未连接','error');
    }
  } catch(e){
    showToast('连接后端失败：' + e.message,'error');
  }
}

// 启动时先从 localStorage 加载配置（若存在），再渲染
loadAppConfig();

// Async: check PocketBase health and sync if available
(async function initBackend(){
  const health = await PB.checkHealth();
  if(health){
    console.info('[PB] Backend connected:', PB.getUrl());
    // Update sidebar footer
    const footer = document.querySelector('.sidebar-footer span:last-child');
    if(footer) footer.textContent = '引擎运行中 · 后端已连';
    try {
      const stats = await PB.syncFromBackend();
      if(stats.voices + stats.reqs + stats.tcs > 0){
        console.info('[PB] Synced:', stats);
        render(); // re-render with backend data
      }
    } catch(e){ console.warn('[PB] Sync failed:', e); }
  } else {
    console.info('[PB] Backend not available, using localStorage fallback');
    const footer = document.querySelector('.sidebar-footer span:last-child');
    if(footer) footer.textContent = '本地模式 · localStorage';
  }
})();

render();
