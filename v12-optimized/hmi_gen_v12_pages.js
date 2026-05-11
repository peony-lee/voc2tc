// ===== PAGE RENDERERS (v12-optimized) =====
const PAGES = {};

// ----- WORKBENCH -----
PAGES.workbench = () => {
  const totalVoice = DATA.voices.length;
  const pendingVoice = DATA.voices.filter(v=>v.status==='pending').length;
  const newReq = Object.values(DATA.reqs).filter(r=>r.isNew).length;
  const pendingReview = DATA.tcs.filter(t=>!t.decision).length;
  return `
  <div class="stat-grid">
    <div class="stat-card" onclick="goPage('voices')">
      <div class="stat-label">用户声音</div>
      <div class="stat-value">${totalVoice}<span class="unit">条</span></div>
      <div class="stat-sub">${pendingVoice} 条待处理 · 本批次</div>
    </div>
    <div class="stat-card green" onclick="goPage('generate')">
      <div class="stat-label">已生成用例</div>
      <div class="stat-value">${DATA.tcs.length}<span class="unit">条</span></div>
      <div class="stat-sub">覆盖 ${[...new Set(DATA.tcs.map(t=>t.module))].length} 个模块</div>
    </div>
    <div class="stat-card amber" onclick="goPage('review')">
      <div class="stat-label">待审核</div>
      <div class="stat-value">${pendingReview}<span class="unit">条</span></div>
      <div class="stat-sub">需要决策 · 采纳/修改/驳回</div>
    </div>
    <div class="stat-card red" onclick="goPage('report')">
      <div class="stat-label">新建需求</div>
      <div class="stat-value">${newReq}<span class="unit">个</span></div>
      <div class="stat-sub">本批次新发现 · 需指派</div>
    </div>
  </div>

  <div class="wb-grid">
    <div>
      <div style="font-size:var(--fs-tiny);color:var(--text-light);font-family:var(--mono);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">今日待办</div>
      <div class="wb-todos">
        <div class="wb-todo" onclick="goPage('voices')">
          <div class="wb-todo-icon" style="background:var(--error-subtle);color:var(--error)">♪</div>
          <div class="wb-todo-info"><div class="lbl">声音待处理</div><div class="cnt"><em>${pendingVoice}</em> 条新声音 · 需归类或确认</div></div>
          <div class="wb-todo-arrow">→</div>
        </div>
        <div class="wb-todo" onclick="goPage('review')">
          <div class="wb-todo-icon" style="background:var(--primary-subtle);color:var(--primary)">✓</div>
          <div class="wb-todo-info"><div class="lbl">用例待审核</div><div class="cnt"><em>${pendingReview}</em> 条 · 含 ${DATA.tcs.filter(t=>t.conf==='high'&&!t.decision).length} 条高置信度可一键采纳</div></div>
          <div class="wb-todo-arrow">→</div>
        </div>
        <div class="wb-todo" onclick="goPage('report')">
          <div class="wb-todo-icon" style="background:var(--warning-subtle);color:var(--warning)">▤</div>
          <div class="wb-todo-info"><div class="lbl">报告与移交</div><div class="cnt"><em>${newReq}</em> 个新建需求需要指派给测试经理</div></div>
          <div class="wb-todo-arrow">→</div>
        </div>
      </div>
    </div>

    <div class="card card-pad">
      <div class="card-h">最近操作 <small>近 24h</small></div>
      <div class="activity-list">
        <div class="activity-item"><span class="activity-time">14:32</span><span class="activity-dot" style="background:var(--success)"></span><span class="activity-text">系统采纳了 <strong>TC-NAVI-047</strong> 高架立交定位测试</span></div>
        <div class="activity-item"><span class="activity-time">14:15</span><span class="activity-dot" style="background:var(--primary)"></span><span class="activity-text">基于 8 条声音生成 <strong>13 条用例</strong> · 覆盖 5 个模块</span></div>
        <div class="activity-item"><span class="activity-time">13:50</span><span class="activity-dot" style="background:var(--warning)"></span><span class="activity-text">新建需求 <strong>REQ-BT-003</strong> 蓝牙稳定性 · 来源 V-007</span></div>
        <div class="activity-item"><span class="activity-time">13:28</span><span class="activity-dot" style="background:var(--error)"></span><span class="activity-text">驳回 <strong>TC-BT-009</strong> 蓝牙降级用例 · 描述模糊</span></div>
        <div class="activity-item"><span class="activity-time">12:10</span><span class="activity-dot" style="background:var(--text-light)"></span><span class="activity-text">导入 13 条声音数据 · 来源 汽车之家/知乎/微博/懂车帝</span></div>
      </div>
    </div>
  </div>

  <div class="card card-pad">
    <div class="card-h">快捷操作 <small>配置与备份</small></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="btn btn-sm" onclick="exportAppConfig()">⚙ 导出配置</button>
      <button class="btn btn-sm" onclick="document.getElementById('config-import-input').click()">⚙ 导入配置</button>
      <input type="file" id="config-import-input" accept=".json,application/json" style="display:none" onchange="handleConfigImport(this)">
      <button class="btn btn-sm" onclick="exportAllYaml()">↓ 导出全部 YAML</button>
      <button class="btn btn-sm" onclick="exportReviewNotesCsv()">↓ 导出审核明细</button>
    </div>
  </div>
  `;
};

// ----- VOICES -----
PAGES.voices = () => {
  const rows = DATA.voices.map(v => {
    const stMap = {pending:['tag-amber','待处理'], categorized:['tag-blue','已归类'], new_req:['tag-green','新建REQ']};
    const [stCls, stLbl] = stMap[v.status] || ['tag-gray','未知'];
    const tcLink = v.tcs && v.tcs.length
      ? `<a class="mono" style="color:var(--primary);text-decoration:none;font-size:11px" onclick="event.stopPropagation();goPage('review');highlightTC('${v.tcs[0]}')">→ ${v.tcs.length} 条TC</a>`
      : `<span style="color:var(--text-disabled);font-size:11px;font-family:var(--mono)">— 0 —</span>`;
    return `<tr onclick="toggleVoiceSel('${v.id}')">
      <td style="width:40px;text-align:center"><input type="checkbox" class="checkbox v-sel" data-id="${v.id}" onclick="event.stopPropagation();toggleVoiceSel('${v.id}')"></td>
      <td class="id">${v.id}</td>
      <td><span class="tag tag-gray">${v.model}</span></td>
      <td class="main" style="max-width:380px;line-height:1.5">${v.text}</td>
      <td><span class="tag tag-gray">${v.module}</span></td>
      <td><span class="tag tag-gray">${v.source}</span></td>
      <td><span class="tag ${stCls}">${stLbl}</span></td>
      <td>${tcLink}</td>
    </tr>`;
  }).join('');

  return `
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-label">总声音数</div><div class="stat-value">${DATA.voices.length}<span class="unit">条</span></div><div class="stat-sub">本批次导入</div></div>
    <div class="stat-card green"><div class="stat-label">已归类</div><div class="stat-value">${DATA.voices.filter(v=>v.status==='categorized').length}<span class="unit">条</span></div><div class="stat-sub">匹配已有需求</div></div>
    <div class="stat-card amber"><div class="stat-label">新建REQ</div><div class="stat-value">${DATA.voices.filter(v=>v.status==='new_req').length}<span class="unit">条</span></div><div class="stat-sub">新发现问题</div></div>
    <div class="stat-card red"><div class="stat-label">待处理</div><div class="stat-value">${DATA.voices.filter(v=>v.status==='pending').length}<span class="unit">条</span></div><div class="stat-sub">需澄清</div></div>
  </div>

  <div class="tbl-wrap">
    <div class="tbl-toolbar">
      <span class="label">用户声音列表 · 共 <b>${DATA.voices.length}</b> 条 · 已选 <b id="vsel-cnt">0</b> 条</span>
      <button class="btn btn-sm btn-primary" onclick="document.getElementById('voice-import-input').click()">📥 导入Excel/CSV</button>
      <input type="file" id="voice-import-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleVoiceImport(this)">
      <button class="btn btn-sm" onclick="addVoiceManual()">+ 新增</button>
      <button class="btn btn-sm btn-danger" onclick="deleteSelected()">🗑️ 批量删除</button>
      <button class="btn btn-sm" onclick="exportVoiceData()">↓ 导出声音</button>
      <button class="btn btn-sm btn-primary" onclick="generateFromSelected()" style="margin-left:auto">▶ 用选中声音生成用例</button>
    </div>
    <div style="max-height:560px;overflow:auto">
    <table>
      <thead><tr><th></th><th>ID</th><th>车型</th><th>声音内容</th><th>模块</th><th>渠道</th><th>状态</th><th>已生成</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  </div>`;
};

// ----- GENERATE -----
PAGES.generate = () => {
  const ctx = DATA.ctx;
  const hasContext = ctx.selectedVoices.length > 0;
  const selectedV = ctx.selectedVoices.map(id => DATA.voices.find(v=>v.id===id)).filter(Boolean);

  const ctxBar = hasContext ? `
    <div class="gen-context">
      <span class="ctx-label">已带入</span>
      <span class="ctx-pill">${selectedV.length} 条声音</span>
      <span style="color:var(--text-light);font-size:13px">→ 自动勾选 ${ctx.autoModules.length} 个相关模块</span>
      <span style="margin-left:auto;display:flex;gap:8px">
        <a class="ctx-link" onclick="goPage('voices')">← 返回修改选择</a>
        <a class="ctx-link" onclick="DATA.ctx={selectedVoices:[],autoModules:[]};render()">✕ 清除上下文</a>
      </span>
    </div>` : '';

  const moduleItems = DATA.modules.map(m => {
    const isAuto = ctx.autoModules.includes(m.id);
    const cls = isAuto ? 'mod-item selected auto' : 'mod-item';
    return `<div class="${cls}" data-mod="${m.id}" onclick="toggleModule('${m.id}')">
      <div class="mod-cb">${isAuto?'✓':''}</div>
      <div class="mod-name">${m.name}</div>
      <div class="mod-count">${m.voiceCnt} 声音</div>
      ${isAuto?`<span class="mod-auto-flag">AUTO</span>`:''}
    </div>`;
  }).join('');

  const cnt = (t)=>DATA.tcs.filter(c=>c.dec_type===t).length;
  const tcCards = DATA.tcs.map(tc => {
    const fromVoices = tc.from.map(vid => `<a onclick="event.stopPropagation();goPage('voices')">${vid}</a>`).join(' · ');
    const reqInfo = DATA.reqs[tc.req];
    const reqTag = reqInfo && reqInfo.isNew ? `<span class="tag tag-amber" style="font-size:10px">${tc.req} 新建</span>` : `<span class="tag tag-blue" style="font-size:10px">${tc.req}</span>`;
    return `<div class="tc-card ${tc.conf==='mid'?'mid':tc.conf==='low'?'low':''}" onclick="openDrawer('${tc.id}')">
      <div class="tc-top">
        <span class="tc-id">${tc.id}</span>
        ${reqTag}
        <span class="tc-conf ${tc.conf}">${(tc.conf_n*100).toFixed(0)}%</span>
      </div>
      <div class="tc-scene">${tc.scene}</div>
      <div class="tc-trace">
        <span class="tlabel">来自</span>${fromVoices}
        <span style="margin-left:auto" class="tlabel">${DEC_LABELS[tc.dec_type]}</span>
      </div>
    </div>`;
  }).join('');

  return `
  ${ctxBar}

  <div class="gen-grid">
    <div>
      <div class="card card-pad">
        <div class="card-h" style="margin-bottom:10px">功能模块 <small>${DATA.modules.length} 个</small></div>
        <div class="module-list">${moduleItems}</div>
        <div style="display:flex;gap:6px;margin-top:10px">
          <button class="btn btn-sm" style="flex:1" onclick="selectAllModules()">☑ 全选</button>
          <button class="btn btn-sm" style="flex:1" onclick="clearModules()">☐ 清空</button>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:10px;height:36px" onclick="startGen()">▶ 开始生成用例</button>
      </div>
    </div>

    <div>
      <div class="card card-pad" style="margin-bottom:14px">
        <div class="card-h">三阶段流水线 <small>已完成</small></div>
        <div class="pipeline-flow">
          <div class="pipe-node done"><div class="pipe-icon">①</div><div class="pipe-label">声音整理</div><div class="pipe-count">${DATA.voices.length} 条</div></div>
          <div class="pipe-line done"></div>
          <div class="pipe-node done"><div class="pipe-icon">②</div><div class="pipe-label">需求归类</div><div class="pipe-count">${Object.keys(DATA.reqs).length} 个</div></div>
          <div class="pipe-line done"></div>
          <div class="pipe-node done"><div class="pipe-icon">③</div><div class="pipe-label">用例决策</div><div class="pipe-count">${DATA.tcs.length} 条</div></div>
        </div>
      </div>

      <div class="dstream-summary">
        <span class="ds-input"><b>${DATA.voices.length}</b>声音</span>
        <span class="ds-arrow">→</span>
        <span class="ds-chip exact"><b>${cnt('exact')}</b>完全命中</span>
        <span class="ds-chip partial"><b>${cnt('partial')}</b>部分命中</span>
        <span class="ds-chip new"><b>${cnt('new-req')}</b>新建REQ</span>
        <span class="ds-chip cross"><b>${cnt('cross-req')}</b>跨REQ</span>
        <span class="ds-chip clarify"><b>${cnt('clarify')}</b>需澄清</span>
        <button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="goPage('review')">→ 进入审核</button>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:var(--fs-h3);font-weight:700">生成的测试用例 <span style="font-size:12px;color:var(--text-light);font-weight:400">共 ${DATA.tcs.length} 条</span></div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm" onclick="exportAllYaml()">↓ 导出全部 YAML</button>
          <button class="btn btn-sm" onclick="exportSingleTcYaml(DATA.tcs[0]&&DATA.tcs[0].id)">↓ 导出首条示例</button>
        </div>
      </div>
      <div class="tc-cards">${tcCards}</div>
    </div>
  </div>`;
};

// ----- REVIEW -----
PAGES.review = () => {
  const total = DATA.tcs.length;
  const accepted = DATA.tcs.filter(t=>t.decision==='accept').length;
  const modified = DATA.tcs.filter(t=>t.decision==='modify').length;
  const rejected = DATA.tcs.filter(t=>t.decision==='reject').length;
  const pending = total - accepted - modified - rejected;
  const rate = total ? Math.round((accepted+modified)/total*100) : 0;

  const rows = DATA.tcs.map(tc => {
    const fromV = (tc.from||[]).join(', ');
    const decBtns = tc.decision
      ? `<span class="tag ${tc.decision==='accept'?'tag-green':tc.decision==='modify'?'tag-amber':'tag-red'}">${tc.decision==='accept'?'已采纳':tc.decision==='modify'?'已修改':'已驳回'}</span>`
      : `<button class="btn btn-sm btn-success" onclick="event.stopPropagation();decide('${tc.id}','accept')">采纳</button>
         <button class="btn btn-sm" onclick="event.stopPropagation();openModifyModal('${tc.id}')">修改</button>
         <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();openRejectModal('${tc.id}')">驳回</button>`;
    const noteIcon = grReviewNotes[tc.id]
      ? `<span title="${grReviewNotes[tc.id].replace(/"/g,'&quot;')}" style="color:var(--warning);cursor:pointer" onclick="event.stopPropagation();openDrawer('${tc.id}')">📝</span>`
      : '';
    return `<tr class="tc-eval-row" id="row-${tc.id}" onclick="openDrawer('${tc.id}')">
      <td class="id">${tc.id}</td>
      <td><span class="tag tag-gray">${tc.module}</span></td>
      <td class="main" style="max-width:280px">${tc.scene}</td>
      <td><span class="conf-badge ${tc.conf}">${(tc.conf_n*100).toFixed(0)}%</span></td>
      <td><span class="mono" style="font-size:11px;color:var(--text-light)">${fromV}</span></td>
      <td><span class="tag tag-blue" style="font-size:10px">${tc.req}${DATA.reqs[tc.req]&&DATA.reqs[tc.req].isNew?' 新':''}</span></td>
      <td class="action-cell">${decBtns} ${noteIcon}</td>
    </tr>`;
  }).join('');

  return `
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">待审核</div><div class="kpi-value">${pending}</div><div class="kpi-sub">/ 共 ${total} 条</div></div>
    <div class="kpi green"><div class="kpi-label">已采纳</div><div class="kpi-value">${accepted}</div><div class="kpi-sub">直接采纳</div></div>
    <div class="kpi amber"><div class="kpi-label">已修改</div><div class="kpi-value">${modified}</div><div class="kpi-sub">修改后采纳</div></div>
    <div class="kpi red"><div class="kpi-label">采纳率</div><div class="kpi-value">${rate}%</div><div class="kpi-sub">(采纳+修改) / 总数</div></div>
  </div>

  <div class="tbl-wrap">
    <div class="tbl-toolbar">
      <span class="label">用例审核列表 · 待审核 <b>${pending}</b> 条</span>
      <button class="btn btn-sm btn-success" onclick="batchAccept('high')">⭐ 一键采纳高置信度</button>
      <button class="btn btn-sm btn-success" onclick="batchAccept('all')">✓ 全部采纳</button>
      <button class="btn btn-sm" onclick="clearDecisions()">↺ 清除决策</button>
      <button class="btn btn-sm" onclick="exportReviewNotesCsv()">↓ 导出审核明细</button>
      <button class="btn btn-sm" onclick="exportAllYaml()">↓ 导出全部 YAML</button>
      <button class="btn btn-sm btn-primary" onclick="goPage('report')">→ 生成报告</button>
    </div>
    <div style="max-height:560px;overflow:auto">
    <table>
      <thead><tr><th>用例ID</th><th>模块</th><th>场景</th><th>置信度</th><th>来源声音</th><th>关联需求</th><th>决策</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    </div>
  </div>`;
};

// ----- REPORT -----
PAGES.report = () => {
  const total = DATA.tcs.length;
  const accepted = DATA.tcs.filter(t=>t.decision==='accept').length;
  const modified = DATA.tcs.filter(t=>t.decision==='modify').length;
  const rejected = DATA.tcs.filter(t=>t.decision==='reject').length;
  const pending = total - accepted - modified - rejected;
  const rate = total ? Math.round((accepted+modified)/total*100) : 0;
  const newReqs = Object.entries(DATA.reqs).filter(([_,r])=>r.isNew);

  return `
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">总用例</div><div class="kpi-value">${total}</div><div class="kpi-sub">已决策 ${(accepted+modified+rejected)} 条</div></div>
    <div class="kpi green"><div class="kpi-label">已采纳</div><div class="kpi-value">${accepted}</div><div class="kpi-sub">直接通过</div></div>
    <div class="kpi amber"><div class="kpi-label">已修改</div><div class="kpi-value">${modified}</div><div class="kpi-sub">修改后通过</div></div>
    <div class="kpi red"><div class="kpi-label">采纳率</div><div class="kpi-value">${rate}%</div><div class="kpi-sub">含修改采纳</div></div>
  </div>

  <div class="card card-pad" style="margin-bottom:16px">
    <div class="card-h">后续行动 <small>新建需求需指派</small></div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
      ${newReqs.length ? newReqs.map(([rid,r]) => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--bg-elevated);border-radius:var(--r-sm)">
          <span class="tag tag-amber">${rid}</span>
          <span style="flex:1;font-size:13px">${r.name}</span>
          <span class="tag tag-gray">${r.tcCnt} 条TC</span>
          <button class="btn btn-sm">指派</button>
        </div>`).join('') : '<div style="font-size:13px;color:var(--text-light)">无新建需求 · 所有需求均已归类</div>'}
    </div>
  </div>

  <div class="card card-pad">
    <div class="card-h">导出报告 <small>多种格式</small></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="btn btn-sm btn-primary" onclick="exportAllYaml()">↓ 导出全部 YAML</button>
      <button class="btn btn-sm" onclick="exportReviewNotesCsv()">↓ 导出审核明细 CSV</button>
      <button class="btn btn-sm" onclick="exportAppConfig()">⚙ 导出系统配置</button>
      <button class="btn btn-sm" onclick="window.print()">🖨️ 打印报告</button>
    </div>
  </div>`;
};

// ----- IMPORT FUNCTIONS (called from pages) -----
function handleVoiceImport(input){
  const file = input.files && input.files[0];
  if(!file) return;
  showToast('导入功能需在完整版中启用 XLSX.js','error');
  // Stub: 实际导入逻辑需引入 XLSX.js 库
  input.value = '';
}

function addVoiceManual(){
  const model = prompt('车型（如 IM5、MG7）：');
  if(!model) return;
  const text = prompt('声音内容：');
  if(!text) return;
  const source = prompt('渠道（如 汽车之家、知乎）：') || '手动添加';
  // auto-generate ID
  const seq = String(DATA.voices.length + 1).padStart(3,'0');
  const newId = 'V-' + seq;
  DATA.voices.push({id:newId, model, text, source, status:'pending', module:'NAVI', tcs:[]});
  // update module voiceCnt
  const mod = DATA.modules.find(m=>m.id==='NAVI');
  if(mod) mod.voiceCnt++;
  showToast(`已新增 ${newId}`,'success');
  render();
}

function deleteSelected(){
  if(!DATA.ctx.selectedVoices.length){
    showToast('请先选中要删除的声音','error');
    return;
  }
  if(!confirm(`确定删除选中的 ${DATA.ctx.selectedVoices.length} 条声音？`)) return;
  DATA.voices = DATA.voices.filter(v=>!DATA.ctx.selectedVoices.includes(v.id));
  DATA.ctx.selectedVoices = [];
  showToast('已删除选中声音','success');
  render();
}

function exportVoiceData(){
  const rows = DATA.voices;
  if(!rows.length) { showToast('暂无数据可导出','warn'); return; }
  const lines = ['ID,车型,声音内容,渠道,状态'];
  rows.forEach(v => {
    const escape = s => s.includes(',') ? `"${s}"` : s;
    lines.push([v.id, escape(v.model), escape(v.text), v.source, v.status].join(','));
  });
  const csv = '\uFEFF' + lines.join('\n');
  _downloadBlob(csv, '用户声音数据_' + _dateTag() + '.csv', 'text/csv;charset=utf-8');
  showToast(`已导出 ${rows.length} 条声音数据`);
}

function handleConfigImport(input){
  const file = input.files && input.files[0];
  if(!file) return;
  importAppConfig(file, true).then(()=>{
    showToast('配置已合并导入','success');
    render();
  }).catch(err=>{
    showToast('导入失败：' + err.message,'error');
  });
  input.value = '';
}
