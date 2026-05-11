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
  if(typeof XLSX === 'undefined'){
    showToast('XLSX.js 未加载，请检查网络连接','error');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1});
      if(rows.length < 2) { showToast('文件为空或无数据行','error'); input.value=''; return; }

      // 自动检测表头：找到包含 "车型"/"model"/"声音"/"voice"/"渠道"/"source" 的行
      let headerRow = 0;
      let colModel = -1, colText = -1, colSource = -1;
      for(let i = 0; i < Math.min(rows.length, 5); i++){
        const h = (rows[i]||[]).map(c => String(c||'').toLowerCase().trim());
        colModel = h.findIndex(c => c.includes('车型') || c === 'model');
        colText = h.findIndex(c => c.includes('声音') || c.includes('内容') || c === 'voice' || c === 'text' || c === 'content');
        colSource = h.findIndex(c => c.includes('渠道') || c.includes('来源') || c === 'source' || c === 'channel');
        if(colModel >= 0 || colText >= 0){ headerRow = i; break; }
      }
      // 如果没找到表头，假设第一行是表头
      if(colModel < 0 && colText < 0){
        headerRow = 0;
        colText = 0; colModel = 1; colSource = 2; // 默认列顺序
      }

      let imported = 0;
      for(let i = headerRow + 1; i < rows.length; i++){
        const row = rows[i] || [];
        const text = String(row[colText >= 0 ? colText : 0] || '').trim();
        if(!text) continue;
        const model = String(row[colModel >= 0 ? colModel : 1] || '').trim() || '未知';
        const source = String(row[colSource >= 0 ? colSource : 2] || '').trim() || 'Excel导入';
        const seq = String(DATA.voices.length + 1).padStart(3,'0');
        DATA.voices.push({id:'V-'+seq, model, text, source, status:'pending', module:'NAVI', tcs:[]});
        imported++;
      }

      if(imported > 0){
        _applyAppConfig();
        saveAppConfig();
        showToast(`成功导入 ${imported} 条声音`,'success');
        render();
      } else {
        showToast('未找到有效数据行，请检查列名','error');
      }
    } catch(err) {
      showToast('解析失败：' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  input.value = '';
}

function addVoiceManual(){
  const model = prompt('车型（如 IM5、MG7）：');
  if(!model) return;
  const text = prompt('声音内容：');
  if(!text) return;
  const source = prompt('渠道（如 汽车之家、知乎）：') || '手动添加';
  // 动态选择模块
  const moduleOptions = DATA.modules.map((m,i) => `${i+1}. ${m.id} (${m.name})`).join('\n');
  const moduleChoice = prompt(`选择模块（输入序号或模块ID）：\n${moduleOptions}`);
  let module = 'NAVI';
  if(moduleChoice){
    const idx = parseInt(moduleChoice) - 1;
    if(idx >= 0 && idx < DATA.modules.length){
      module = DATA.modules[idx].id;
    } else {
      const found = DATA.modules.find(m => m.id.toUpperCase() === moduleChoice.toUpperCase());
      if(found) module = found.id;
    }
  }
  const seq = String(DATA.voices.length + 1).padStart(3,'0');
  const newId = 'V-' + seq;
  DATA.voices.push({id:newId, model, text, source, status:'pending', module, tcs:[]});
  const mod = DATA.modules.find(m=>m.id===module);
  if(mod) mod.voiceCnt++;
  _applyAppConfig();
  saveAppConfig();
  showToast(`已新增 ${newId} → ${module}`,'success');
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

// ----- GRAPH -----
PAGES.graph = () => {
  return `
  <div class="card card-pad" style="margin-bottom:14px">
    <div class="card-h">关系图谱 <small>Voice → REQ → TC 可视化</small></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <div class="graph-legend-inline">
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#3B82F6;display:inline-block"></span> 声音 Voice</span>
        <span style="display:inline-flex;align-items:center;gap:4px;margin-left:12px"><span style="width:10px;height:10px;border-radius:2px;background:#F59E0B;display:inline-block;transform:rotate(30deg)"></span> 需求 REQ</span>
        <span style="display:inline-flex;align-items:center;gap:4px;margin-left:12px"><span style="width:14px;height:8px;border-radius:3px;background:#10B981;display:inline-block"></span> 用例 TC</span>
      </div>
      <div style="margin-left:auto;display:flex;gap:6px">
        <button class="btn btn-sm" onclick="graphZoomIn()">＋</button>
        <button class="btn btn-sm" onclick="graphZoomOut()">－</button>
        <button class="btn btn-sm" onclick="graphResetZoom()">⟳ 重置</button>
      </div>
    </div>
    <div id="graph-container" style="width:100%;height:480px;background:#fff;border:1px solid var(--border);border-radius:var(--r-sm);position:relative;overflow:hidden">
      <svg id="relation-graph" width="100%" height="100%"></svg>
    </div>
  </div>

  <div class="tbl-wrap">
    <div class="tbl-toolbar">
      <span class="label">关系明细 · 共 <b id="relation-count">0</b> 条</span>
      <div style="display:flex;gap:4px" id="graph-module-filters"></div>
    </div>
    <div style="max-height:300px;overflow:auto">
      <table>
        <thead><tr><th>源节点</th><th>关系</th><th>目标节点</th><th>强度</th></tr></thead>
        <tbody id="relation-tbody"></tbody>
      </table>
    </div>
  </div>`;
};

// ----- WIKI -----
PAGES.wiki = () => {
  const reqEntries = Object.entries(DATA.reqs);
  const totalTc = DATA.tcs.length;
  const totalVoice = DATA.voices.length;
  const uncoveredVoices = DATA.voices.filter(v => !v.tcs || v.tcs.length === 0).length;

  const reqRows = reqEntries.map(([rid, r]) => {
    const relatedTcs = DATA.tcs.filter(t => t.req === rid);
    const relatedVoices = DATA.voices.filter(v => v.tcs && v.tcs.some(tcId => relatedTcs.some(tc => tc.id === tcId)));
    return `<tr onclick="openWikiReqDetail('${rid}')" style="cursor:pointer">
      <td class="id">${rid}</td>
      <td><span class="tag tag-gray">${r.name || '—'}</span></td>
      <td>${relatedTcs.length}</td>
      <td>${relatedVoices.length}</td>
      <td>${r.isNew ? '<span class="tag tag-amber">新建</span>' : '<span class="tag tag-green">已有</span>'}</td>
    </tr>`;
  }).join('');

  return `
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-label">用户声音</div><div class="stat-value">${totalVoice}<span class="unit">条</span></div><div class="stat-sub">本批次导入</div></div>
    <div class="stat-card green"><div class="stat-label">需求 Wiki</div><div class="stat-value">${reqEntries.length}<span class="unit">个</span></div><div class="stat-sub">已沉淀需求记录</div></div>
    <div class="stat-card amber"><div class="stat-label">测试用例</div><div class="stat-value">${totalTc}<span class="unit">条</span></div><div class="stat-sub">关联到需求的用例</div></div>
    <div class="stat-card red"><div class="stat-label">未覆盖声音</div><div class="stat-value">${uncoveredVoices}<span class="unit">条</span></div><div class="stat-sub">尚未生成用例</div></div>
  </div>

  <div class="wb-grid" style="margin-bottom:16px">
    <div class="card card-pad">
      <div class="card-h">三阶段决策原理</div>
      <div class="pipeline-flow" style="margin-bottom:16px">
        <div class="pipe-node done"><div class="pipe-icon">①</div><div class="pipe-label">声音整理</div></div>
        <div class="pipe-line done"></div>
        <div class="pipe-node done"><div class="pipe-icon">②</div><div class="pipe-label">需求归类</div></div>
        <div class="pipe-line done"></div>
        <div class="pipe-node done"><div class="pipe-icon">③</div><div class="pipe-label">用例决策</div></div>
      </div>
      <div style="font-size:var(--fs-small);color:var(--text-secondary);line-height:1.7">
        <p><b style="color:var(--text-main)">Stage 1 — 声音 → 需求分类</b></p>
        <p>每条用户声音经过 NLP 关键词匹配，自动识别功能模块和问题类型。与知识库中已有需求逐条比对，输出 5 类决策：</p>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0">
          <span class="ds-chip exact"><b>完全命中</b>精确匹配已有 REQ</span>
          <span class="ds-chip partial"><b>部分命中</b>REQ 相似但场景不同</span>
          <span class="ds-chip new"><b>新建 REQ</b>全新需求条目</span>
          <span class="ds-chip cross"><b>跨 REQ</b>涉及多个需求</span>
          <span class="ds-chip clarify"><b>需澄清</b>信息不足需补充</span>
        </div>
        <p style="margin-top:10px"><b style="color:var(--text-main)">Stage 2 — 4W 需求 → 用例匹配</b></p>
        <p>对分类结果执行 4W 比对（What / When / Where / Who），匹配已有测试用例。基于语义相似度计算置信度，高置信度用例可直接采纳。</p>
        <p style="margin-top:10px"><b style="color:var(--text-main)">Stage 3 — Wiki 持久化</b></p>
        <p>审核决策结果（采纳/修改/驳回）通过 PocketBase API 写入知识库，形成可追溯的决策链路。新建需求自动生成首条种子用例。</p>
      </div>
    </div>
    <div class="card card-pad">
      <div class="card-h">后端架构 <small>PocketBase</small></div>
      <div style="font-size:var(--fs-small);color:var(--text-secondary);line-height:1.7">
        <p>数据持久化通过 PocketBase 后端实现，API 端点：</p>
        <div style="margin:8px 0">
          <div style="padding:6px 10px;background:var(--bg-elevated);border-radius:var(--r-sm);margin-bottom:4px;font-family:var(--mono);font-size:11px"><span style="color:var(--success)">POST</span> /api/llm/stage1 → LLM 需求分类</div>
          <div style="padding:6px 10px;background:var(--bg-elevated);border-radius:var(--r-sm);margin-bottom:4px;font-family:var(--mono);font-size:11px"><span style="color:var(--success)">POST</span> /api/llm/stage2 → LLM 4W 比对</div>
          <div style="padding:6px 10px;background:var(--bg-elevated);border-radius:var(--r-sm);margin-bottom:4px;font-family:var(--mono);font-size:11px"><span style="color:var(--success)">POST</span> /api/wiki/persist → 批量写入决策结果</div>
          <div style="padding:6px 10px;background:var(--bg-elevated);border-radius:var(--r-sm);margin-bottom:4px;font-family:var(--mono);font-size:11px"><span style="color:var(--primary)">GET</span> /api/wiki/state → 获取知识库状态</div>
          <div style="padding:6px 10px;background:var(--bg-elevated);border-radius:var(--r-sm);margin-bottom:4px;font-family:var(--mono);font-size:11px"><span style="color:var(--primary)">GET</span> /api/llm/stats → LLM 调用统计</div>
          <div style="padding:6px 10px;background:var(--bg-elevated);border-radius:var(--r-sm);font-family:var(--mono);font-size:11px"><span style="color:var(--primary)">GET</span> /api/health/htmig → 健康检查</div>
        </div>
        <p>前端采用双模式：<b style="color:var(--text-main)">有 PocketBase</b> 时通过 API 读写；<b style="color:var(--text-main)">无后端</b> 时 fallback 到 localStorage 本地缓存。</p>
      </div>
    </div>
  </div>

  <div class="tbl-wrap">
    <div class="tbl-toolbar">
      <span class="label">需求 Wiki 列表 · 共 <b>${reqEntries.length}</b> 个</span>
      <button class="btn btn-sm" onclick="refreshWikiFromBackend()">↻ 从后端刷新</button>
    </div>
    <div style="max-height:400px;overflow:auto">
      <table>
        <thead><tr><th>REQ ID</th><th>需求名称</th><th>关联 TC</th><th>来源声音</th><th>类型</th></tr></thead>
        <tbody>${reqRows}</tbody>
      </table>
    </div>
  </div>`;
};

// ----- Graph 初始化（D3 力导向图）-----
let _graphZoom = null;

function initGraphV12() {
  const container = document.getElementById('graph-container');
  const svgEl = document.getElementById('relation-graph');
  if (!container || !svgEl) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  // 清空
  d3.select(svgEl).selectAll('*').remove();
  d3.select(svgEl).attr('width', width).attr('height', height);

  // 构建节点和边
  const nodes = [];
  const links = [];
  const nodeSet = new Set();

  // 添加 Voice 节点
  DATA.voices.forEach(v => {
    if (!nodeSet.has(v.id)) { nodeSet.add(v.id); nodes.push({id: v.id, type: 'voice', label: v.id, text: v.text}); }
  });
  // 添加 TC 节点 + Voice→TC 边
  DATA.tcs.forEach(tc => {
    if (!nodeSet.has(tc.id)) { nodeSet.add(tc.id); nodes.push({id: tc.id, type: 'tc', label: tc.id, scene: tc.scene}); }
    (tc.from || []).forEach(vid => {
      if (nodeSet.has(vid)) links.push({source: vid, target: tc.id, type: 'belong'});
    });
  });
  // 添加 REQ 节点 + TC→REQ 边
  Object.keys(DATA.reqs).forEach(rid => {
    if (!nodeSet.has(rid)) { nodeSet.add(rid); nodes.push({id: rid, type: 'req', label: rid, name: DATA.reqs[rid].name}); }
  });
  DATA.tcs.forEach(tc => {
    if (tc.req && nodeSet.has(tc.req)) {
      links.push({source: tc.id, target: tc.req, type: DATA.reqs[tc.req] && DATA.reqs[tc.req].isNew ? 'new' : 'derive'});
    }
  });

  // 空状态
  if (nodes.length === 0) {
    d3.select(svgEl).append('text').attr('x', width/2).attr('y', height/2 - 10)
      .attr('text-anchor', 'middle').attr('fill', '#8AAAC4').attr('font-size', 13).attr('font-family', 'monospace').text('◈ 暂无关系数据');
    d3.select(svgEl).append('text').attr('x', width/2).attr('y', height/2 + 14)
      .attr('text-anchor', 'middle').attr('fill', '#CBD8E6').attr('font-size', 11).attr('font-family', 'monospace').text('生成用例后关系图将自动更新');
    document.getElementById('relation-tbody').innerHTML = '';
    return;
  }

  // defs
  const defs = d3.select(svgEl).append('defs');

  // 网格背景
  const grid = defs.append('pattern').attr('id','g-grid').attr('width',36).attr('height',36).attr('patternUnits','userSpaceOnUse');
  grid.append('path').attr('d','M 36 0 L 0 0 0 36').attr('fill','none').attr('stroke','rgba(26,111,212,0.08)').attr('stroke-width',1);

  // 径向渐变
  const mkGrad = (id, c1, c2) => {
    const g = defs.append('radialGradient').attr('id',id).attr('cx','30%').attr('cy','30%');
    g.append('stop').attr('offset','0%').attr('stop-color',c1);
    g.append('stop').attr('offset','100%').attr('stop-color',c2);
  };
  mkGrad('gv','#60D4FF','#1A6FD4');
  mkGrad('gr','#FDE68A','#D97706');
  mkGrad('gt','#6EE7B7','#059669');

  // 辉光滤镜
  const mkGlow = (id, rgb, std) => {
    const f = defs.append('filter').attr('id',id).attr('x','-50%').attr('y','-50%').attr('width','200%').attr('height','200%');
    f.append('feColorMatrix').attr('type','matrix').attr('values',`0 0 0 0 ${rgb[0]} 0 0 0 0 ${rgb[1]} 0 0 0 0 ${rgb[2]} 0 0 0 1 0`).attr('result','col');
    f.append('feGaussianBlur').attr('in','col').attr('stdDeviation',std).attr('result','blur');
    const m = f.append('feMerge'); m.append('feMergeNode').attr('in','blur'); m.append('feMergeNode').attr('in','SourceGraphic');
  };
  mkGlow('glow-v',['0.18','0.55','1'],4);
  mkGlow('glow-r',['0.97','0.65','0.07'],4);
  mkGlow('glow-t',['0.06','0.73','0.51'],4);

  // 箭头
  [['arr-b','#3B82F6'],['arr-n','#10B981'],['arr-d','#F59E0B']].forEach(([id,color]) => {
    defs.append('marker').attr('id',id).attr('viewBox','0 -4 9 8')
      .attr('refX',32).attr('refY',0).attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
      .append('path').attr('d','M0,-4L9,0L0,4Z').attr('fill',color).attr('opacity',0.8);
  });

  // 背景
  d3.select(svgEl).append('rect').attr('width',width).attr('height',height).attr('fill','#FFFFFF');
  d3.select(svgEl).append('rect').attr('width',width).attr('height',height).attr('fill','url(#g-grid)');

  const g = d3.select(svgEl).append('g');

  // 力模拟
  const sim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(130).strength(0.7))
    .force('charge', d3.forceManyBody().strength(-420))
    .force('center', d3.forceCenter(width/2, height/2))
    .force('collide', d3.forceCollide().radius(38))
    .alphaDecay(0.022);

  // 边
  const edgeColor = {belong:'#3B82F6', new:'#10B981', derive:'#F59E0B'};
  const edgeArrow = {belong:'url(#arr-b)', new:'url(#arr-n)', derive:'url(#arr-d)'};
  const linkG = g.append('g').selectAll('line').data(links).enter().append('line')
    .attr('stroke', d => edgeColor[d.type]||'#8AAAC4')
    .attr('stroke-width', d => d.type==='belong' ? 1.8 : 1.4)
    .attr('stroke-opacity', 0.55)
    .attr('stroke-dasharray', d => d.type==='derive' ? '5,4' : d.type==='new' ? '3,3' : null)
    .attr('marker-end', d => edgeArrow[d.type]||null);

  // 六边形路径
  const hexPath = r => {
    const pts = Array.from({length:6},(_,i)=>{const a=Math.PI/180*(60*i-30);return [r*Math.cos(a),r*Math.sin(a)].join(',');});
    return 'M'+pts.join('L')+'Z';
  };

  // 节点
  const nodeG = g.append('g').selectAll('g').data(nodes).enter().append('g')
    .style('cursor','pointer')
    .call(d3.drag()
      .on('start',(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y;})
      .on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y;})
      .on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;}));

  // Voice: 双圆
  nodeG.filter(d=>d.type==='voice').each(function(d) {
    d3.select(this).append('circle').attr('r',22).attr('fill','rgba(59,130,246,0.10)');
    d3.select(this).append('circle').attr('r',14).attr('fill','rgba(59,130,246,0.18)');
    d3.select(this).append('circle').attr('r',10).attr('fill','url(#gv)').attr('filter','url(#glow-v)').attr('stroke','#60D4FF').attr('stroke-width',1.5);
  });
  // REQ: 六边形
  nodeG.filter(d=>d.type==='req').each(function(d) {
    d3.select(this).append('path').attr('d',hexPath(20)).attr('fill','rgba(245,158,11,0.12)');
    d3.select(this).append('path').attr('d',hexPath(13)).attr('fill','url(#gr)').attr('filter','url(#glow-r)').attr('stroke','#FDE68A').attr('stroke-width',1.5);
  });
  // TC: 胶囊形
  nodeG.filter(d=>d.type==='tc').each(function(d) {
    d3.select(this).append('rect').attr('width',40).attr('height',24).attr('x',-20).attr('y',-12).attr('rx',8).attr('fill','rgba(16,185,129,0.12)');
    d3.select(this).append('rect').attr('width',30).attr('height',17).attr('x',-15).attr('y',-8.5).attr('rx',5).attr('fill','url(#gt)').attr('filter','url(#glow-t)').attr('stroke','#6EE7B7').attr('stroke-width',1.5);
  });

  // 标签
  nodeG.append('text').text(d=>d.label).attr('text-anchor','middle').attr('dy',32)
    .attr('font-size',9).attr('font-family','monospace').attr('fill','#4A6A8A').attr('pointer-events','none');

  // 点击高亮
  nodeG.on('click', function(event, d) {
    event.stopPropagation();
    nodeG.selectAll('circle,path,rect').attr('opacity',0.25);
    d3.select(this).selectAll('circle,path,rect').attr('opacity',1);
    linkG.attr('stroke-opacity', l => {
      const src = typeof l.source==='object'?l.source.id:l.source;
      const tgt = typeof l.target==='object'?l.target.id:l.target;
      return (src===d.id||tgt===d.id) ? 0.9 : 0.1;
    }).attr('stroke-width', l => {
      const src = typeof l.source==='object'?l.source.id:l.source;
      const tgt = typeof l.target==='object'?l.target.id:l.target;
      return (src===d.id||tgt===d.id) ? 2.5 : 1;
    });
  });

  d3.select(svgEl).on('click', () => {
    nodeG.selectAll('circle,path,rect').attr('opacity',1);
    linkG.attr('stroke-opacity',0.55).attr('stroke-width', l => l.type==='belong'?1.8:1.4);
  });

  // tick
  sim.on('tick', () => {
    linkG.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y);
    nodeG.attr('transform',d=>`translate(${d.x},${d.y})`);
  });

  // zoom
  _graphZoom = d3.zoom().scaleExtent([0.25,5]).on('zoom', e => g.attr('transform',e.transform));
  d3.select(svgEl).call(_graphZoom);

  // 自动适配
  function fitToView() {
    if(!nodes.length) return;
    const pad = 55;
    const xs = nodes.map(n=>n.x), ys = nodes.map(n=>n.y);
    const x0=d3.min(xs)-pad, x1=d3.max(xs)+pad, y0=d3.min(ys)-pad, y1=d3.max(ys)+pad;
    const sc = Math.min(width/(x1-x0), height/(y1-y0), 1.3);
    const tx = (width-(x1-x0)*sc)/2 - x0*sc;
    const ty = (height-(y1-y0)*sc)/2 - y0*sc;
    d3.select(svgEl).transition().duration(700).ease(d3.easeCubicOut)
      .call(_graphZoom.transform, d3.zoomIdentity.translate(tx,ty).scale(sc));
  }
  sim.on('end', fitToView);
  setTimeout(fitToView, 1800);

  // 关系明细表
  renderRelationTableV12(links);
}

function renderRelationTableV12(links) {
  const tbody = document.getElementById('relation-tbody');
  const countEl = document.getElementById('relation-count');
  if (!tbody) return;
  const typeLabel = { belong:'归属', new:'新建', derive:'派生' };
  const strengthLabel = { belong:'强', new:'—', derive:'中' };
  if (countEl) countEl.textContent = (links||[]).length + ' 条';
  tbody.innerHTML = (links||[]).map(l => {
    const src = typeof l.source==='object'?l.source.id:l.source;
    const tgt = typeof l.target==='object'?l.target.id:l.target;
    return `<tr><td class="id">${src}</td><td>${typeLabel[l.type]||l.type}</td><td class="id">${tgt}</td><td>${strengthLabel[l.type]||'—'}</td></tr>`;
  }).join('');
}

function graphZoomIn() { if(_graphZoom) d3.select('#relation-graph').transition().duration(300).call(_graphZoom.scaleBy, 1.4); }
function graphZoomOut() { if(_graphZoom) d3.select('#relation-graph').transition().duration(300).call(_graphZoom.scaleBy, 0.7); }
function graphResetZoom() { if(_graphZoom) d3.select('#relation-graph').transition().duration(500).call(_graphZoom.transform, d3.zoomIdentity); }

// Wiki 详情（Drawer 复用）
function openWikiReqDetail(rid) {
  const r = DATA.reqs[rid];
  if (!r) return;
  const relatedTcs = DATA.tcs.filter(t => t.req === rid);
  const relatedVoices = DATA.voices.filter(v => v.tcs && v.tcs.some(tcId => relatedTcs.some(tc => tc.id === tcId)));

  document.getElementById('dr-id').textContent = rid;
  document.getElementById('dr-title').textContent = r.name || rid;
  document.getElementById('dr-body').innerHTML = `
    <div class="dr-section">
      <h4>需求信息</h4>
      <p><span class="tag ${r.isNew?'tag-amber':'tag-green'}">${r.isNew?'新建需求':'已有需求'}</span> ${r.tcCnt||0} 条关联 TC</p>
    </div>
    <div class="dr-section">
      <h4>关联用例 (${relatedTcs.length})</h4>
      ${relatedTcs.map(tc => `<div style="padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">
        <span class="tag tag-gray" style="font-size:10px">${tc.id}</span>
        <span style="color:var(--text-secondary);margin-left:6px">${tc.scene}</span>
        <span class="conf-badge ${tc.conf}" style="margin-left:auto;float:right">${(tc.conf_n*100).toFixed(0)}%</span>
      </div>`).join('')}
    </div>
    <div class="dr-section">
      <h4>来源声音 (${relatedVoices.length})</h4>
      ${relatedVoices.map(v => `<div style="padding:4px 0;font-size:12px;color:var(--text-secondary)">
        <span class="tag tag-gray" style="font-size:10px">${v.id}</span> ${v.model} — ${v.text}
      </div>`).join('')}
    </div>`;
  document.getElementById('dr-actions').innerHTML = `<button class="btn btn-sm" onclick="closeDrawer()">关闭</button>`;
  document.getElementById('overlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
}
