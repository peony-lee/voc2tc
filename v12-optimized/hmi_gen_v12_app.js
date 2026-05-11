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
function startGen(){
  if(!DATA.ctx.autoModules.length){
    showToast('请至少选中一个模块','error');
    return;
  }
  showToast('生成完成 · 13 条用例已就绪','success');
  goPage('review');
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

// 启动时先从 localStorage 加载配置（若存在），再渲染
loadAppConfig();
render();
