// ===== DATA =====
// v12-optimized: 加入 appConfig 配置层，替代硬编码数据
// 参考 v11 的 appConfig 模式，支持 localStorage 持久化

const CONFIG_STORAGE_KEY = 'hmi_gen_v12_config';

// ── 统一配置对象（单一数据源）─
let appConfig = {
  voices: [],
  modules: [],
  tcs: [],
  reqs: {},
  ctx: { selectedVoices: [], autoModules: [] }
};

// ── 工作变量（由 _applyAppConfig 从 appConfig 同步）─
let DATA = null;  // 保持向后兼容，由 _applyAppConfig 维护

// ── Fallback 内置默认数据（首次使用时的初始数据）─
function _buildFallbackConfig() {
  return {
    voices: [
      {id:'V-001', model:'IM5', text:'每次开车用导航，定位一直在漂移，明明在高架上显示我在辅路', source:'汽车之家', status:'pending', module:'NAVI', tcs:['TC-NAVI-047']},
      {id:'V-002', model:'MG7', text:'希望能增加远程控制空调的功能，夏天提前开空调太需要了', source:'知乎', status:'categorized', module:'AC', tcs:['TC-AC-012']},
      {id:'V-003', model:'IM5', text:'在高速上想调空调温度和风速，但是要进三级菜单还得看路', source:'微博', status:'categorized', module:'AC', tcs:['TC-AC-013','TC-AC-014']},
      {id:'V-004', model:'MG ZS', text:'隔壁某品牌的语音确实强，连续对话不用反复唤醒', source:'汽车之家', status:'categorized', module:'VOICE', tcs:['TC-VOICE-023']},
      {id:'V-005', model:'IM5', text:'哨兵模式每次都要手动打开，建议能根据地点自动开启', source:'懂车帝', status:'categorized', module:'SENTRY', tcs:['TC-SEN-005']},
      {id:'V-006', model:'IM5', text:'导航语音播报延迟太严重了，路口已经过了它才说右转', source:'知乎', status:'categorized', module:'NAVI', tcs:['TC-NAVI-048']},
      {id:'V-007', model:'MG7', text:'蓝牙连不上手机，每次上车都要手动配对，太麻烦了', source:'汽车之家', status:'new_req', module:'BT', tcs:['TC-BT-008','TC-BT-009']},
      {id:'V-008', model:'IM5', text:'屏幕反光严重，白天根本看不清地图', source:'微博', status:'pending', module:'DISPLAY', tcs:[]},
      {id:'V-009', model:'IM5', text:'冬天上车空调风太冷，能不能记忆我的偏好', source:'知乎', status:'categorized', module:'AC', tcs:['TC-AC-015']},
      {id:'V-010', model:'MG7', text:'语音助手听不懂方言，全家就我能用', source:'懂车帝', status:'new_req', module:'VOICE', tcs:[]},
      {id:'V-011', model:'IM5', text:'CarPlay 偶尔自动断开，得重新插拔', source:'汽车之家', status:'categorized', module:'BT', tcs:['TC-BT-010']},
      {id:'V-012', model:'IM5', text:'导航和音乐切换的时候卡顿明显', source:'知乎', status:'categorized', module:'NAVI', tcs:['TC-NAVI-049']},
      {id:'V-013', model:'MG ZS', text:'希望加一个一键回家的快捷场景', source:'微博', status:'categorized', module:'SCENE', tcs:['TC-SCENE-003']}
    ],
    modules: [
      {id:'NAVI', name:'导航定位', voiceCnt:3, recommended:true},
      {id:'VOICE', name:'语音助手', voiceCnt:2, recommended:true},
      {id:'AC', name:'空调控制', voiceCnt:3, recommended:true},
      {id:'BT', name:'蓝牙/手车互联', voiceCnt:2, recommended:false},
      {id:'SENTRY', name:'哨兵模式', voiceCnt:1, recommended:false},
      {id:'DISPLAY', name:'屏幕显示', voiceCnt:1, recommended:false},
      {id:'SCENE', name:'场景编排', voiceCnt:1, recommended:false}
    ],
    tcs: [
      {id:'TC-NAVI-047', module:'NAVI', conf:'high', conf_n:0.92, scene:'高架立交场景下，GPS弱信号定位漂移恢复测试', from:['V-001'], req:'REQ-NAVI-012', decision:null, expect:'响应≤2s，偏移≤10m，恢复≤5s', dec_type:'partial'},
      {id:'TC-NAVI-048', module:'NAVI', conf:'high', conf_n:0.91, scene:'导航语音播报延迟与路口到达时间一致性测试', from:['V-006'], req:'REQ-NAVI-015', decision:null, expect:'语音播报领先路口≥150米', dec_type:'exact'},
      {id:'TC-NAVI-049', module:'NAVI', conf:'mid', conf_n:0.74, scene:'导航与音乐应用切换性能测试', from:['V-012'], req:'REQ-NAVI-020', decision:null, expect:'切换响应≤500ms，无卡顿', dec_type:'exact'},
      {id:'TC-VOICE-023', module:'VOICE', conf:'mid', conf_n:0.78, scene:'高速行车连续语音对话能力测试', from:['V-004'], req:'REQ-VC-008', decision:null, expect:'连续3轮对话识别率≥90%', dec_type:'partial'},
      {id:'TC-AC-012', module:'AC', conf:'high', conf_n:0.95, scene:'远程APP启动空调预冷功能测试', from:['V-002'], req:'REQ-AC-005', decision:null, expect:'APP指令到车响应≤30s', dec_type:'new-req'},
      {id:'TC-AC-013', module:'AC', conf:'high', conf_n:0.88, scene:'空调温度语音快捷调节路径测试', from:['V-003'], req:'REQ-AC-002', decision:null, expect:'语音指令到执行≤2s', dec_type:'partial'},
      {id:'TC-AC-014', module:'AC', conf:'mid', conf_n:0.71, scene:'空调风速物理按键单层级直达测试', from:['V-003'], req:'REQ-AC-002', decision:null, expect:'按键单次操作完成调节', dec_type:'cross-req'},
      {id:'TC-AC-015', module:'AC', conf:'mid', conf_n:0.72, scene:'空调用户偏好记忆与自动应用测试', from:['V-009'], req:'REQ-AC-006', decision:null, expect:'识别用户后自动应用上次偏好', dec_type:'new-req'},
      {id:'TC-BT-008', module:'BT', conf:'high', conf_n:0.93, scene:'蓝牙自动回连与重试机制测试', from:['V-007'], req:'REQ-BT-003', decision:null, expect:'上车30秒内自动回连', dec_type:'new-req'},
      {id:'TC-BT-009', module:'BT', conf:'low', conf_n:0.55, scene:'蓝牙断开后用户体验降级测试', from:['V-007'], req:'REQ-BT-003', decision:null, expect:'断开后明确告知用户', dec_type:'clarify'},
      {id:'TC-BT-010', module:'BT', conf:'high', conf_n:0.86, scene:'CarPlay 有线连接稳定性测试', from:['V-011'], req:'REQ-BT-004', decision:null, expect:'30分钟连接零中断', dec_type:'exact'},
      {id:'TC-SEN-005', module:'SENTRY', conf:'mid', conf_n:0.69, scene:'哨兵模式基于地理围栏自动启用测试', from:['V-005'], req:'REQ-SEN-002', decision:null, expect:'进入指定区域30秒内自动开启', dec_type:'new-req'},
      {id:'TC-SCENE-003', module:'SCENE', conf:'high', conf_n:0.84, scene:'一键回家快捷场景编排测试', from:['V-013'], req:'REQ-SCENE-001', decision:null, expect:'空调/导航/座椅一键执行', dec_type:'partial'}
    ],
    reqs: {
      'REQ-NAVI-012':{name:'高架GPS弱信号场景定位优化', tcCnt:4},
      'REQ-NAVI-015':{name:'导航语音播报时序优化', tcCnt:3},
      'REQ-NAVI-020':{name:'多媒体应用切换性能', tcCnt:2},
      'REQ-VC-008':{name:'连续对话与免唤醒', tcCnt:3},
      'REQ-AC-005':{name:'远程空调预启动 (新建)', tcCnt:1, isNew:true},
      'REQ-AC-002':{name:'空调操作路径优化', tcCnt:5},
      'REQ-AC-006':{name:'空调偏好记忆 (新建)', tcCnt:1, isNew:true},
      'REQ-BT-003':{name:'蓝牙稳定性 (新建)', tcCnt:2, isNew:true},
      'REQ-BT-004':{name:'CarPlay 连接质量', tcCnt:3},
      'REQ-SEN-002':{name:'哨兵自动触发 (新建)', tcCnt:1, isNew:true},
      'REQ-SCENE-001':{name:'一键场景编排', tcCnt:4}
    },
    ctx: { selectedVoices: [], autoModules: [] }
  };
}

// ── 将 appConfig 同步到 DATA 工作变量（保持向后兼容）─
function _applyAppConfig() {
  DATA = {
    voices: appConfig.voices || [],
    modules: appConfig.modules || [],
    tcs: appConfig.tcs || [],
    reqs: appConfig.reqs || {},
    ctx: appConfig.ctx || { selectedVoices: [], autoModules: [] }
  };
}

// ── 从 localStorage 加载配置，失败则用 fallback ─
function loadAppConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg && Array.isArray(cfg.voices)) {
        appConfig = cfg;
        _applyAppConfig();
        return true;
      }
    }
  } catch(e) { console.warn('loadAppConfig failed', e); }
  // fallback
  appConfig = _buildFallbackConfig();
  _applyAppConfig();
  return false;
}

// ── 保存配置到 localStorage ─
function saveAppConfig() {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(appConfig));
    return true;
  } catch(e) {
    console.warn('saveAppConfig failed', e);
    return false;
  }
}

// ── 导出配置为 JSON 文件 ─
function exportAppConfig() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), version:'v12', appConfig }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'HMI_GEN_v12_配置_' + _dateTag() + '.json';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── 从 JSON 文件导入配置 ─
function importAppConfig(file, merge) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (merge) {
          // 合并模式：追加声音，跳过重复 ID
          const existingIds = new Set(appConfig.voices.map(v => v.id));
          imported.appConfig.voices.forEach(v => {
            if (!existingIds.has(v.id)) appConfig.voices.push(v);
          });
          // 合并模块（按 id 去重）
          const modIds = new Set(appConfig.modules.map(m => m.id));
          imported.appConfig.modules.forEach(m => {
            if (!modIds.has(m.id)) appConfig.modules.push(m);
          });
        } else {
          appConfig = imported.appConfig;
        }
        _applyAppConfig();
        saveAppConfig();
        resolve();
      } catch(err) { reject(err); }
    };
    reader.readAsText(file);
  });
}

// ── 工具：生成日期标签用于文件名 ─
function _dateTag() {
  const d = new Date();
  return d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + '_' +
    String(d.getHours()).padStart(2,'0') + String(d.getMinutes()).padStart(2,'0');
}

const DEC_LABELS = {
  exact:'完全命中', partial:'部分命中', 'new-req':'新建REQ', 'cross-req':'跨REQ', clarify:'需澄清'
};

// ── 初始化：页面加载时调用 ─
// loadAppConfig(); // 由主 HTML 的 init() 调用
