/* ============================================================
   陪伴桌宠 · 主程序
   ============================================================ */
(function(){
'use strict';

var MOTIONS = {
  '待机':   { frames: 1, fps: 1, loop: true  },
  '跳跃':   { frames: 1, fps: 2, loop: false },
  '睡觉':   { frames: 1, fps: 1, loop: true  },
  '惊讶':   { frames: 1, fps: 2, loop: false },
  '打招呼': { frames: 1, fps: 2, loop: false }
};
var CHARS = ['小灯'];
var AVATAR_MOTION = '待机';

var KEY = 'peiban-zhuangchong-v3';
var state = {
  char: '小灯', motion: '待机', base: '待机', frame: 0,
  size: 320, speed: 1, shadow: true,
  todos: [], aiKey: '', hist: [], searchHistory: [], idlePack: 0,
  provider: 'deepseek', keys: {}, models: {}
};
try {
  var raw = localStorage.getItem(KEY);
  if (raw){ var s = JSON.parse(raw); for (var k in s) if (s.hasOwnProperty(k)) state[k] = s[k]; }
} catch(e){}
if (state.aiKey && (!state.keys || !Object.keys(state.keys).length)) state.keys = { deepseek: state.aiKey };
if (!state.keys) state.keys = {};
if (!state.models) state.models = {};
if (!state.provider) state.provider = 'deepseek';
if (CHARS.indexOf(state.char) === -1) state.char = CHARS[0];
if (state.idlePack === undefined) state.idlePack = 0;
state.motion = '待机'; state.base = '待机'; state.frame = 0;

function save(){
  try { localStorage.setItem(KEY, JSON.stringify({
    char: state.char, size: state.size, speed: state.speed,
    shadow: state.shadow, todos: state.todos,
    aiKey: state.aiKey, hist: state.hist,
    searchHistory: (state.searchHistory || []).slice(0, 20),
    provider: state.provider, keys: state.keys, models: state.models,
    idlePack: state.idlePack
  })); } catch(e){}
}

function $(id){ return document.getElementById(id); }
function el(tag, cls, txt){
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
}
function frameSrc(ch, mo, i){
  return '角色/' + ch + '/' + mo + '/' + String(i+1).padStart(2,'0') + '.svg';
}

/* ============================================================
   台词库
   ============================================================ */
var BRAIN = {
'小灯': {
  greet: ['你回来啦。','灯一直亮着呢。','我刚刚在看窗外。','今天也见到你了，真好。','嗯，我在这儿。'],
  tired: ['累了就坐一会儿吧。','今天的电量用完了也没关系。','先喝口水，别急着继续。','我陪你安静待一会儿。','休息不是偷懒，是在充电。'],
  sad: ['难过的时候不用马上振作。','我在，慢慢说也可以。','不高兴也可以。今天先照顾自己。','灯会一直亮着，等你缓过来。','要不要先深呼吸一下？'],
  happy: ['你心情好，我也亮了一点。','说来听听呀。','今天有什么好事？','那就把这一刻记下来吧。','你笑起来的时候，房间都暖了。'],
  food: ['记得吃饭，别只喝咖啡。','先吃点热的东西吧。','忙完这一小段就去吃饭。','我给你记着：不要饿肚子。','今天想吃点什么？'],
  bye: ['晚安，记得关灯。','明天见。','去休息吧，我留在这里。','好，路上小心。','明天也要来呀。'],
  love: ['……谢谢，我会好好收着的。','我也喜欢和你待在一起。','你这样说，我的灯会更亮。','嗯，我记住了。','那就一起慢慢走吧。'],
  ask: ['我是小灯，一个原创的桌面小伙伴。','我会陪你、提醒待办，也能接上 AI 聊天。','我是一盏会走路的小灯，喜欢星星和安静的房间。','我的工作就是在这里陪你。','我可以帮你记事、搜索和聊天。'],
  insult: ['没关系，我把灯调暗一点。','也许你今天心情不太好。','我还是会在这里。','等你想说话的时候再叫我。','嗯，我听着呢。'],
  laugh: ['你笑了，我也开心。','什么事情这么好笑？','听见笑声，灯也跟着晃了一下。','那就多笑一会儿吧。'],
  question: ['让我想一想。','这个问题有点意思。','我也不确定，不过可以一起查。','你觉得答案会是什么？','我还在学习中。'],
  cmd: ['好呀。','看我的。','马上。','收到。'],
  def: ['嗯，我在听。','然后呢？','我记住了。','继续说，我听着。','这件事可以慢慢讲。','我陪你一起想。'],
  idle: ['灯还亮着。','今天也要慢慢来。','我刚刚数了数窗外的星星。','你忙你的，我在这儿。','房间安静的时候，很适合想事情。','需要我的时候叫我。','别忘了眨眨眼、伸个懒腰。','水杯就在手边吗？','我把这里照得暖一点。','嗯，今天也还算不错。'],
  idlePacks: [
    ['光落在桌角，像一小片晚霞。','我不太会讲大道理，但我会陪你。','如果你累了，就把事情放慢一点。','有时候发一会儿呆也很好。','我会记得你认真生活的样子。','今天有没有哪一刻让你开心？','别急，时间还够。','星星不是一直看得见，但它们都在。'],
    ['喝口水吧。','坐久了，起来走两步。','肩膀放松一点。','呼吸慢一点。','做不完的事可以明天继续。','你已经做得比想象中多了。','要不要看看窗外？','今天记得早点休息。']
  ],
  celebrate: ['全部完成啦！','清单空了，今天辛苦了。','一件不剩，做得很好。','灯为你亮到最亮。','可以安心休息了。'],
  done: ['完成一件！','划掉啦。','又前进一步。','做得好。','这个记下了。','继续加油。'],
  actGreet: ['你好呀。','挥挥小手。','见到你很高兴。','嗨！'],
  actJump: ['跳一下！','看我的。','轻轻一蹦。','嘿咻。'],
  actSurprise: ['哇！','吓我一跳。','怎么啦？','哇哦。'],
  actSleep: ['晚安。','我去充会儿电。','困了，眯一下。','灯调暗啦。'],
  actWake: ['醒啦。','早安。','我还在。','灯又亮起来了。']
}
};
/* ============================================================
   意图识别
   ============================================================ */
var INTENTS = [
  { id:'cmd',      re:/跳一下|蹦一下|跳跳|跳个|睡吧|去睡|睡觉吧|醒醒|起床|打招呼|招个手|挥挥手/ },
  { id:'greet',    re:/^(你好|您好|嗨|hi|hello|哈喽|在吗|在么|早上好|晚上好|中午好|下午好)/i },
  { id:'bye',      re:/再见|拜拜|晚安|睡了|走了|下线|我走|先走/ },
  { id:'tired',    re:/累|困|疲|加班|辛苦|熬夜|撑不住|没力气/ },
  { id:'sad',      re:/难过|不开心|烦|郁闷|想哭|伤心|崩溃|emo|委屈|难受|焦虑|压力/ },
  { id:'happy',    re:/开心|高兴|好耶|成功|搞定|完成了|太棒|爽|哈哈哈|嘻嘻/ },
  { id:'food',     re:/吃|饿|饭|外卖|零食|奶茶|喝|夜宵/ },
  { id:'love',     re:/喜欢你|爱你|想你|可爱|好萌|好帅|好漂亮|最喜欢/ },
  { id:'insult',   re:/傻|笨|丑|讨厌|无聊|滚|烦人|没用|垃圾/ },
  { id:'laugh',    re:/哈哈|笑死|搞笑|233/i },
  { id:'ask',      re:/你是谁|你叫什么|你会什么|你的名字|你是什么|你能做什么|介绍一下你/ },
  { id:'question', re:/[？?]$|为什么|怎么|如何|是什么|能不能|可不可以|吗$|呢$/ }
];
function detect(text){
  for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].re.test(text)) return INTENTS[i].id;
  return 'def';
}
function asCommand(text){
  if (/跳|蹦/.test(text)) return '跳跃';
  if (/睡|困了/.test(text)) return '睡觉';
  if (/醒|起床/.test(text)) return '醒';
  if (/打招呼|招手|挥手/.test(text)) return '打招呼';
  return null;
}

var _recent = {};
function pickLine(ch, key, arr){
  if (!arr || !arr.length) return '……嗯。';
  var rk = ch + '|' + key;
  if (!_recent[rk]) _recent[rk] = [];
  var hist = _recent[rk];
  var pool = arr.filter(function(l){ return hist.indexOf(l) === -1; });
  if (!pool.length){ hist.length = 0; pool = arr.slice(); }
  var line = pool[Math.floor(Math.random() * pool.length)];
  hist.push(line);
  var cap = Math.max(2, Math.floor(arr.length * 0.7));
  while (hist.length >= cap) hist.shift();
  return line;
}

function contextLine(ch){
  var h = new Date().getHours();
  var C = {
    '小灯': { late:'这么晚啦，记得早点休息。', early:'早呀，今天也慢慢来。', todo:'待办里还有 {n} 件，不急，我替你记着。' }
  }[ch];
  if (!C) return null;
  var pending = state.todos.filter(function(t){ return !t.done; }).length;
  var pool = [];
  if (h >= 23 || h < 5) pool.push(C.late);
  else if (h >= 5 && h < 9) pool.push(C.early);
  if (pending > 0) pool.push(C.todo.replace('{n}', pending));
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function currentIdleLines(ch){
  var B = BRAIN[ch] || BRAIN[CHARS[0]];
  var packs = [B.idle].concat(B.idlePacks || []);
  var idx = state.idlePack;
  if (idx === 'auto') idx = Math.floor(Math.random() * packs.length);
  if (typeof idx !== 'number' || idx < 0 || idx >= packs.length) idx = 0;
  return packs[idx];
}

function think(text){
  var ch = state.char;
  var B = BRAIN[ch];
  var id = detect(text);
  if (id === 'cmd') return pickLine(ch, 'cmd', B.cmd);
  var main = pickLine(ch, id, B[id] || B.def);
  if (Math.random() < 0.30 && (id === 'greet' || id === 'def' || id === 'tired')){
    var c = contextLine(ch);
    if (c) return main + '　' + c;
  }
  return main;
}

/* ============================================================
   AI 服务商
   ============================================================ */
var AI_SYS = {
  '小灯': '你是一个原创桌面伙伴“小灯”。你是一盏会走路的小灯，性格温和、好奇、可靠，表达简短自然。你会陪伴用户、提醒待办、回答问题，但不会假装自己是人类。一次只说一两句话，不使用表情符号，不编造未确认的事实。'
};

var PROVIDERS = {
  deepseek: { name:'DeepSeek', base:'https://api.deepseek.com', chat:'/chat/completions',
    models:['deepseek-chat','deepseek-reasoner'], balance:'/user/balance',
    topup:'https://platform.deepseek.com/top_up', usage:'https://platform.deepseek.com/usage',
    keyUrl:'https://platform.deepseek.com/api_keys', note:'余额可直接在桌宠里查' },
  openai: { name:'OpenAI', base:'https://api.openai.com/v1', chat:'/chat/completions',
    models:['gpt-4o-mini','gpt-4o','gpt-4.1-mini'], balance:null,
    topup:'https://platform.openai.com/settings/organization/billing/overview',
    usage:'https://platform.openai.com/usage', keyUrl:'https://platform.openai.com/api-keys',
    note:'OpenAI 没有公开的余额接口，请点「用量与账单」去官网看' },
  moonshot: { name:'Kimi', base:'https://api.moonshot.cn/v1', chat:'/chat/completions',
    models:['moonshot-v1-8k','moonshot-v1-32k'], balance:'/users/me/balance',
    topup:'https://platform.moonshot.cn/console/info', usage:'https://platform.moonshot.cn/console/info',
    keyUrl:'https://platform.moonshot.cn/console/api-keys', note:'余额可直接在桌宠里查' },
  qwen: { name:'通义千问', base:'https://dashscope.aliyuncs.com/compatible-mode/v1', chat:'/chat/completions',
    models:['qwen-plus','qwen-turbo','qwen-max'], balance:null,
    topup:'https://bailian.console.aliyun.com/', usage:'https://bailian.console.aliyun.com/',
    keyUrl:'https://bailian.console.aliyun.com/', note:'通义千问没有公开的余额接口，请点「用量与账单」去官网看' },
  zhipu: { name:'智谱 GLM', base:'https://open.bigmodel.cn/api/paas/v4', chat:'/chat/completions',
    models:['glm-4-flash','glm-4-plus'], balance:null,
    topup:'https://open.bigmodel.cn/usercenter/apikeys', usage:'https://open.bigmodel.cn/usercenter/apikeys',
    keyUrl:'https://open.bigmodel.cn/usercenter/apikeys', note:'智谱没有公开的余额接口，请点「用量与账单」去官网看' }
};

function prov(){ return PROVIDERS[state.provider] || PROVIDERS.deepseek; }
function curKey(){ return ((state.keys || {})[state.provider] || '').trim(); }
function curModel(){
  var B = PROVIDERS[state.provider] || PROVIDERS.deepseek;
  return ((state.models || {})[state.provider]) || B.models[0];
}

/* 统一请求出口：桌面版交给主进程发（绕过跨域），网页版直接 fetch */
function httpFetch(url, init){
  if (window.petAPI && window.petAPI.aiFetch){
    return window.petAPI.aiFetch(url, init).then(function(r){
      if (r.error) throw new Error(r.error);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return { ok: true, status: r.status, json: function(){ return Promise.resolve(r.json); } };
    });
  }
  return fetch(url, init).then(function(r){
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r;
  });
}

function aiHistory(){ return state.hist || (state.hist = []); }

function askAI(text, opts){
  opts = opts || {};
  var key = curKey();
  if (!key) return Promise.resolve(null);
  var P = prov();
  var sys = opts.system || AI_SYS[state.char];
  var hist = opts.noHistory ? [] : aiHistory();
  var msgs = [{ role:'system', content: sys }]
    .concat(hist.slice(-8))
    .concat([{ role:'user', content:text }]);

  var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  var timer = setTimeout(function(){ if (ctrl) ctrl.abort(); }, 15000);

  return httpFetch(P.base + P.chat, {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + key },
    body: JSON.stringify({ model: curModel(), messages: msgs, temperature: 0.95, max_tokens: 160 })
  }).then(function(r){
    clearTimeout(timer);
    return r.json();
  }).then(function(j){
    var s = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!s) throw new Error('空回复');
    s = s.trim().replace(/^["「]|["」]$/g,'');
    if (!opts.noHistory){
      hist.push({ role:'user', content:text });
      hist.push({ role:'assistant', content:s });
      if (hist.length > 16) hist.splice(0, hist.length - 16);
      save();
    }
    return s;
  }).catch(function(e){
    clearTimeout(timer);
    var m = e.message || '';
    if (e.name === 'AbortError') m = '超时（15秒没回应）';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) m = '浏览器拦住了跨域请求';
    return { __err: m };
  });
}

/* ============================================================
   主题装饰（雾丝 / 猫爪 / 蝴蝶 / 泡泡）
   ============================================================ */
function clearFx(){
  var box = $('pfx');
  if (box) box.innerHTML = '';
}
function spawnMist(){
  var box = $('pfx'); if (!box) return;
  for (var i = 0; i < 7; i++){
    var d = document.createElement('div');
    d.className = 'mist';
    var s = 14 + Math.random() * 26;
    d.style.width = s + 'px'; d.style.height = s + 'px';
    d.style.left = (6 + Math.random() * 86) + '%';
    d.style.bottom = (4 + Math.random() * 30) + '%';
    d.style.setProperty('--dx', (Math.random() * 46 - 23).toFixed(0) + 'px');
    d.style.animationDuration = (6 + Math.random() * 4).toFixed(1) + 's';
    d.style.animationDelay = (-Math.random() * 8).toFixed(1) + 's';
    box.appendChild(d);
  }
}
var PAW_SVG = '<svg width="{S}" height="{S}" viewBox="0 0 24 24" fill="currentColor">'
  + '<ellipse cx="12" cy="15.2" rx="5.6" ry="4.6"/>'
  + '<ellipse cx="6.2" cy="9.4" rx="3.1" ry="3.6"/>'
  + '<ellipse cx="12" cy="6.6" rx="3.1" ry="3.7"/>'
  + '<ellipse cx="17.8" cy="9.4" rx="3.1" ry="3.6"/></svg>';
function spawnPaws(){
  var box = $('pfx'); if (!box) return;
  var pos = [[9,68],[78,74],[16,30],[82,26],[48,84]];
  pos.forEach(function(p, i){
    var d = document.createElement('div');
    d.className = 'paw';
    var s = 14 + Math.random() * 10;
    d.innerHTML = PAW_SVG.replace(/\{S\}/g, s.toFixed(0));
    d.style.left = p[0] + '%'; d.style.top = p[1] + '%';
    d.style.setProperty('--r', (Math.random() * 50 - 25).toFixed(0) + 'deg');
    d.style.animationDuration = (7 + Math.random() * 4).toFixed(1) + 's';
    d.style.animationDelay = (-Math.random() * 8).toFixed(1) + 's';
    box.appendChild(d);
  });
}
var BFLY_SVG = '<svg width="{S}" height="{S}" viewBox="0 0 24 24">'
  + '<path d="M12 12C7 5 2 6.5 3 11c.9 4 5.5 3.6 9 1Z" fill="#FF8FC7"/>'
  + '<path d="M12 12C17 5 22 6.5 21 11c-.9 4-5.5 3.6-9 1Z" fill="#FFB0DA"/>'
  + '<path d="M12 12c-4 6-8 5-7 1.4.8-2.9 4-2.6 7-1.4Z" fill="#E278D2"/>'
  + '<path d="M12 12c4 6 8 5 7 1.4-.8-2.9-4-2.6-7-1.4Z" fill="#F093E0"/>'
  + '<ellipse cx="12" cy="12" rx="1.1" ry="4.6" fill="#6E3A66"/></svg>';
function spawnButterflies(){
  var box = $('pfx'); if (!box) return;
  for (var i = 0; i < 4; i++){
    var d = document.createElement('div');
    d.className = 'bfly';
    var s = 15 + Math.random() * 11;
    d.innerHTML = BFLY_SVG.replace(/\{S\}/g, s.toFixed(0));
    d.style.left = (8 + Math.random() * 78) + '%';
    d.style.top = (18 + Math.random() * 64) + '%';
    d.style.setProperty('--dx', (Math.random() * 40 + 14).toFixed(0) + 'px');
    d.style.setProperty('--dy', (-(30 + Math.random() * 34)).toFixed(0) + 'px');
    d.style.animationDuration = (7 + Math.random() * 5).toFixed(1) + 's';
    d.style.animationDelay = (-Math.random() * 9).toFixed(1) + 's';
    box.appendChild(d);
  }
}
function spawnBubbles(){
  var box = $('pfx'); if (!box) return;
  for (var i = 0; i < 8; i++){
    var d = document.createElement('div');
    d.className = 'bub';
    var s = 8 + Math.random() * 18;
    d.style.width = s + 'px'; d.style.height = s + 'px';
    d.style.left = (6 + Math.random() * 86) + '%';
    d.style.bottom = (2 + Math.random() * 30) + '%';
    d.style.setProperty('--dx', (Math.random() * 40 - 20).toFixed(0) + 'px');
    d.style.animationDuration = (6 + Math.random() * 4).toFixed(1) + 's';
    d.style.animationDelay = (-Math.random() * 8).toFixed(1) + 's';
    box.appendChild(d);
  }
}
function applyTheme(){
  var p = $('panel');
  if (p) p.setAttribute('data-theme', state.char);
  document.body.setAttribute('data-theme', state.char);
  clearFx();
  spawnBubbles();
}


/* ============================================================
   帧缓存与绘制
   ============================================================ */
var cache = {};
function preload(ch){
  if (cache[ch]) return cache[ch];
  Object.keys(cache).forEach(function(k){ if (k !== ch) delete cache[k]; });   /* 只留当前角色的帧 */
  var set = { _done: 0, _total: 0 };
  Object.keys(MOTIONS).forEach(function(mo){
    set[mo] = [];
    for (var i = 0; i < MOTIONS[mo].frames; i++){
      set._total++;
      (function(mo, i){
        var im = new Image();
        im.onload = im.onerror = function(){ set._done++; };
        im.src = frameSrc(ch, mo, i);
        set[mo][i] = im;
      })(mo, i);
    }
  });
  cache[ch] = set;
  return set;
}

var cv = $('petCv'), cx = cv ? cv.getContext('2d') : null;
var av = $('pAv'), ax = av ? av.getContext('2d') : null;
var pet = $('pet');

function readyFrame(ch, mo, i){
  var set = cache[ch];
  if (!set || !set[mo]) return null;
  var im = set[mo][i];
  return (im && im.complete && im.naturalWidth) ? im : null;
}
function drawPet(){
  if (!cv || !cx) return;
  var im = readyFrame(state.char, state.motion, state.frame);
  if (!im) return;
  if (cv.width !== im.naturalWidth || cv.height !== im.naturalHeight){
    cv.width = im.naturalWidth; cv.height = im.naturalHeight;
  }
  cx.clearRect(0, 0, cv.width, cv.height);
  cx.drawImage(im, 0, 0);
}
function drawAvatar(){
  if (!av || !ax) return;
  var im = readyFrame(state.char, AVATAR_MOTION, 0);
  if (!im) return;
  av.width = im.naturalWidth; av.height = im.naturalHeight;
  av.style.height = '38px'; av.style.width = 'auto';
  ax.clearRect(0, 0, av.width, av.height);
  ax.drawImage(im, 0, 0);
}
function playMotion(name, base){
  if (!MOTIONS[name]) return;
  state.motion = name;
  if (base !== undefined) state.base = base;
  else if (MOTIONS[name].loop) state.base = name;
  state.frame = 0;
  if (pet) pet.dataset.motion = name;
  updateSub();
  if (pet) pet.classList.toggle('sleeping', name === '睡觉');
}
function updateSub(){ if ($('pSub')) $('pSub').textContent = '现在在：' + state.motion; }

var lastT = performance.now(), acc = 0, lastDrawnKey = '';
var STATIC_MODE = false;
function loop(now){
  var dt = now - lastT; lastT = now;
  if (dt > 400) dt = 400;
  var m = MOTIONS[state.motion];
  if (m && !STATIC_MODE && !drag){
    var dur = 1000 / Math.max(1, m.fps * state.speed);
    acc += dt;
    var guard = 0;
    while (acc >= dur && guard++ < 60){
      acc -= dur;
      state.frame++;
      if (state.frame >= m.frames){
        if (m.loop) state.frame = 0;
        else {
          state.motion = state.base; state.frame = 0; acc = 0;
          if (pet) pet.dataset.motion = state.motion;
          if (pet) pet.classList.toggle('sleeping', state.motion === '睡觉');
          updateSub(); break;
        }
      }
    }
  }
  var key = state.char + '|' + state.motion + '|' + state.frame;
  if (key !== lastDrawnKey){ lastDrawnKey = key; drawPet(); }
  requestAnimationFrame(loop);
}

/* ============================================================
   气泡
   ============================================================ */
var bubTimer = null;
var lastAnswer = '';

function copyText(str){
  function fallback(){
    try{
      var ta = document.createElement('textarea');
      ta.value = str; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }catch(e){ return false; }
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(str).then(function(){ return true; }, fallback);
  }
  return Promise.resolve(fallback());
}

function spawnSatellites(){
  if (!pet) return;
  var n = 3 + Math.floor(Math.random() * 3);
  for (var i = 0; i < n; i++){
    (function(k){
      setTimeout(function(){
        var d = document.createElement('div');
        d.className = 'sat';
        var s = 6 + Math.random() * 12;
        d.style.width = s + 'px'; d.style.height = s + 'px';
        d.style.left = (34 + Math.random() * 32) + '%';
        d.style.bottom = '58%';
        d.style.setProperty('--dx', (Math.random() * 50 - 25).toFixed(0) + 'px');
        d.style.animationDuration = (1.1 + Math.random() * 0.8).toFixed(1) + 's';
        pet.appendChild(d);
        setTimeout(function(){ if (d.parentNode) d.parentNode.removeChild(d); }, 2200);
      }, k * 130);
    })(i);
  }
}

function say(text, holdMs, opts){
  opts = opts || {};
  var b = $('bubble');
  if (!b) return;
  b.textContent = text;
  b.classList.toggle('has-copy', !!opts.copy);
  if (opts.copy){
    var btn = document.createElement('span');
    btn.className = 'copybtn';
    btn.textContent = '复制';
    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      copyText(text).then(function(ok){
        btn.textContent = ok ? '已复制 ✓' : '复制失败';
        setTimeout(function(){ btn.textContent = '复制'; }, 1600);
      });
    });
    b.appendChild(btn);
  }
  b.style.marginLeft = '0px';
  b.classList.remove('pop');
  void b.offsetWidth;
  b.classList.add('show');
  spawnSatellites();
  clearTimeout(bubTimer);

  placeBubble();
  [60, 200, 600, 1200].forEach(function(t){ setTimeout(placeBubble, t); });

  bubTimer = setTimeout(function(){
    b.classList.add('pop');
    setTimeout(function(){ b.classList.remove('show','pop'); }, 260);
  }, holdMs || 4000);
}

/* ============================================================
   面板位置
   ============================================================ */
function placePanel(){
  var p = $('panel');
  if (!p || p.hidden) return;
  var desk = $('desk');
  var pr = pet.getBoundingClientRect(), dr = desk.getBoundingClientRect();
  var pw = p.offsetWidth || 352, ph = p.offsetHeight || 420, gap = 26;

  var left;
  if ((pr.left + pr.right) / 2 > dr.left + desk.clientWidth / 2){
    left = (pr.left - dr.left) - pw - gap;
    if (left < 16) left = 16;
  } else {
    left = (pr.right - dr.left) + gap;
    if (left + pw > desk.clientWidth - 16) left = desk.clientWidth - pw - 16;
  }
  var top = (pr.bottom - dr.top) - ph - 8;
  top = Math.max(12, Math.min(desk.clientHeight - ph - 12, top));

  p.style.right = 'auto'; p.style.bottom = 'auto';
  p.style.left = Math.round(left) + 'px';
  p.style.top = Math.round(top) + 'px';
}

function currentTab(){
  var t = document.querySelector('.ptab.on');
  return t ? t.getAttribute('data-tab') : 'todo';
}

function togglePanel(force){
  var p = $('panel');
  if (!p) return;
  var show = force !== undefined ? force : p.hidden;
  p.hidden = !show;
  document.body.classList.toggle('panel-closed', !show);
  if (show){
    p.setAttribute('data-tab', currentTab());
    applyTheme();
    applyWindowHeight(currentTab());
    setTimeout(placePanel, 0);
    setTimeout(placePanel, 260);
  } else {
    applyWindowHeight(null);
  }
}

/* ============================================================
   待办
   ============================================================ */
function renderTodos(){
  var ul = $('todoList');
  if (!ul) return;
  ul.innerHTML = '';
  var left = state.todos.filter(function(t){ return !t.done; }).length;
  if ($('todoHint')){
    $('todoHint').textContent = state.todos.length
      ? ('共 ' + state.todos.length + ' 件，还剩 ' + left + ' 件没做。只存在你自己电脑上。')
      : '待办只存在你自己电脑上。';
  }
  if (!state.todos.length){
    var li0 = el('li', 't-empty', '还没有待办。加一条试试？');
    li0.style.background = 'transparent';
    ul.appendChild(li0);
    return;
  }
  state.todos.forEach(function(t, i){
    var li = el('li', t.done ? 'done' : '');
    var chk = el('button', 't-chk'); chk.title = '打勾';
    chk.onclick = function(){ toggleTodo(i); };
    var tx = el('span', 't-txt', t.text);
    var del = el('button', 't-del', '✕'); del.title = '删除';
    del.onclick = function(){ state.todos.splice(i, 1); save(); renderTodos(); };
    li.appendChild(chk); li.appendChild(tx); li.appendChild(del);
    ul.appendChild(li);
  });
}

function addTodo(){
  var v = $('todoInput').value.trim();
  if (!v) return;
  state.todos.push({ text:v, done:false, rewarded:false });
  $('todoInput').value = '';
  save(); renderTodos(); addExp(1);
}

function toggleTodo(index){
  var t = state.todos[index];
  if (!t) return;
  t.done = !t.done;
  if (t.done && !t.rewarded){
    t.rewarded = true;
    addExp(6);
    var pending = state.todos.filter(function(x){ return !x.done; }).length;
    if (state.todos.length > 0 && pending === 0) celebrateAllDone();
    else say(pickLine(state.char, 'done', BRAIN[state.char].done), 3600);
  }
  save(); renderTodos();
}

var _lastCelebrate = 0;
function celebrateAllDone(){
  var now = Date.now();
  if (now - _lastCelebrate < 5000) return;
  _lastCelebrate = now;
  var B = BRAIN[state.char];
  say(pickLine(state.char, 'celebrate', B.celebrate), 10000);
  playMotion('跳跃', '待机');
  setTimeout(function(){ playMotion('打招呼', '待机'); }, 1500);
  spawnConfetti();
  try {
    var nBody = '今天的事，一件不剩。';
    if (window.petAPI && window.petAPI.notify) window.petAPI.notify('待办全部完成 ✓', nBody);
    else if (window.Notification && Notification.permission === 'granted') new Notification('待办全部完成 ✓', { body: nBody });
  } catch(e){}
}

function spawnConfetti(){
  if (!pet) return;
  var syms = ['✦','✧','·','★'];
  for (var i = 0; i < 20; i++){
    (function(k){
      setTimeout(function(){
        var d = document.createElement('div');
        d.className = 'confetti';
        d.textContent = syms[Math.floor(Math.random() * syms.length)];
        d.style.left = (15 + Math.random() * 70).toFixed(0) + '%';
        d.style.bottom = (25 + Math.random() * 45).toFixed(0) + '%';
        d.style.setProperty('--cx', (Math.random() * 180 - 90).toFixed(0) + 'px');
        d.style.setProperty('--cy', (-(90 + Math.random() * 150)).toFixed(0) + 'px');
        d.style.fontSize = (10 + Math.random() * 14).toFixed(0) + 'px';
        d.style.animationDuration = (1.8 + Math.random() * 1.0).toFixed(1) + 's';
        pet.appendChild(d);
        setTimeout(function(){ if (d.parentNode) d.parentNode.removeChild(d); }, 3200);
      }, k * 55);
    })(i);
  }
}

function addExp(n){ state.exp = (state.exp || 0) + n; save(); }


/* ============================================================
   搜索
   ============================================================ */
function updateSearchHint(){
  var has = !!curKey();
  if ($('searchHint')) $('searchHint').textContent = has
    ? '它会直接在这里回答。碰到它答不上的（比如最新消息）它会直说。'
    : '还没接 AI —— 现在只能跳去浏览器搜。在「设置」里填上 API Key，它就能直接回答。';
}

function addSearchHistory(q, a){
  if (!state.searchHistory) state.searchHistory = [];
  state.searchHistory = state.searchHistory.filter(function(x){ return x.q !== q; });
  state.searchHistory.unshift({ q:q, a:a || '', t: Date.now() });
  if (state.searchHistory.length > 20) state.searchHistory.length = 20;
  save(); renderSearchHistory();
}

function renderSearchHistory(){
  var ul = $('shistList');
  if (!ul) return;
  ul.innerHTML = '';
  var list = state.searchHistory || [];
  if (!list.length){ ul.appendChild(el('li', 'sh-empty', '还没有搜索记录')); return; }
  list.forEach(function(item){
    var li = document.createElement('li');
    li.appendChild(el('span', 'sh-q', item.q));
    var d = new Date(item.t);
    li.appendChild(el('span', 'sh-t',
      (d.getMonth()+1) + '/' + d.getDate() + ' ' + ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2)));
    li.title = item.a ? ('答案：' + item.a) : '点一下重新搜';
    li.onclick = function(){ $('sq').value = item.q; doSearch(); };
    ul.appendChild(li);
  });
}

var SEARCH_SYS = '你是一个简洁准确的问答助手。请直接回答用户的问题，用中文，简明扼要，控制在 80 字以内。'
  + '不要在开头重复问题，不要角色扮演，不要加括号说明。'
  + '如果问题需要最新消息而你不知道，就直说"这个我没法查最新的"，然后给出你能确定的部分。';

function doSearch(){
  var q = $('sq').value.trim(), out = $('sout');
  if (!out) return;
  out.innerHTML = '';
  if (!q){ out.textContent = '先输入点什么吧。'; return; }
  $('sq').value = '';

  function webLink(){
    var a = document.createElement('a');
    a.href = 'https://www.bing.com/search?q=' + encodeURIComponent(q);
    a.target = '_blank'; a.rel = 'noopener';
    a.textContent = '用浏览器搜「' + q + '」→';
    a.className = 'weblink';
    return a;
  }

  applyWindowHeight('search');

  if (!curKey()){
    out.appendChild(el('p', '', '还没接 AI，先用浏览器搜：'));
    out.appendChild(webLink());
    out.appendChild(el('p', 'hint', '接上 AI 之后，它能直接在这里把答案说出来。'));
    say('这个……我答不上来。先帮你去浏览器搜。', 6000);
    addSearchHistory(q, '');
    return;
  }

  out.appendChild(el('p', 'searching', '在想…'));
  say('让我想想…', 15000);

  askAI(q, { system: SEARCH_SYS, noHistory: true }).then(function(r){
    out.innerHTML = '';
    if (r && r.__err){
      out.appendChild(el('p', 'err', '❌ 没连上 AI：' + r.__err));
      out.appendChild(webLink());
      say('这个我暂时答不上来。', 4500);
      return;
    }
    lastAnswer = r;
    addSearchHistory(q, r);
    say(r, 20000, { copy: true });
    out.appendChild(el('p', 'hint', '答案已经说出来了 —— 看它头顶 ↑（气泡上可以点「复制」）'));
    var cp = el('button', 'btn cpbtn', '📋 复制这段答案');
    cp.onclick = function(){
      copyText(lastAnswer).then(function(ok){
        cp.textContent = ok ? '✓ 已复制到剪贴板' : '复制失败，请手动选中';
        setTimeout(function(){ cp.textContent = '📋 复制这段答案'; }, 1800);
      });
    };
    out.appendChild(cp);
    var more = el('p', 'hint', '');
    more.appendChild(webLink());
    out.appendChild(more);
  });
}

/* ============================================================
   聊天
   ============================================================ */
function pushMsg(who, text){
  var c = $('chatLog');
  if (!c) return null;
  var cls = (who === 'me' || who === 'us') ? 'us' : 'them';
  c.appendChild(el('div', 'msg ' + cls, text));
  while (c.childElementCount > 60) c.removeChild(c.firstElementChild);
  c.scrollTop = c.scrollHeight;
  return c.lastChild;
}

var aiWarned = false;
function sendChat(){
  var v = $('ci').value.trim();
  if (!v) return;
  $('ci').value = '';
  pushMsg('us', v);

  var cmd = asCommand(v);
  if (cmd){
    if (cmd === '醒') playMotion('打招呼', '待机');
    else if (cmd === '睡觉') playMotion('睡觉', '睡觉');
    else playMotion(cmd, '待机');
  }

  var hasAI = !!curKey();
  function finish(text){
    say(text);
  }
  if (!hasAI){ finish(think(v)); return; }

  say('…');
  askAI(v).then(function(r){
    if (r && r.__err) finish(think(v));
    else if (r) finish(r);
    else finish(think(v));
  });
}

/* ============================================================
   互动 / 台词包
   ============================================================ */
var ACT_KEY = { '打招呼':'actGreet', '跳跃':'actJump', '惊讶':'actSurprise', '睡觉':'actSleep', '醒':'actWake' };
var ACT_HINT = {
  '打招呼':'你刚刚朝对方慢慢挥了挥手，打了个招呼。',
  '跳跃':'你刚刚原地轻轻跳了一下，稳稳落地了。',
  '惊讶':'你刚刚被突然吓了一跳，抖了一下。',
  '睡觉':'你刚说要去睡觉，正慢慢沉下去、呼吸变慢。',
  '醒':'你刚刚被叫醒，不情不愿地睁开了眼。'
};

function renderPackRow(){
  var box = $('packRow');
  if (!box) return;
  buildSeg(box, [
    { v:0, label:'第 1 套' }, { v:1, label:'第 2 套' },
    { v:2, label:'第 3 套' }, { v:'auto', label:'随机混搭' }
  ], state.idlePack, function(v){
    state.idlePack = (v === 'auto') ? 'auto' : Number(v);
    save(); renderPackRow();
    setTimeout(function(){ say(pickLine(state.char, 'idle', currentIdleLines(state.char)), 4200); }, 150);
  });
}

/* ============================================================
   设置
   ============================================================ */
function buildSeg(box, options, current, onPick){
  if (!box) return;
  box.innerHTML = '';
  options.forEach(function(o){
    var b = el('button', o.v === current ? 'on' : '', o.label);
    b.onclick = function(){ onPick(o.v); };
    box.appendChild(b);
  });
}
function buildLoginSeg(on){
  buildSeg($('segLogin'), [{v:true,label:'开'},{v:false,label:'关'}], on, function(v){
    window.petAPI.setLogin(v).then(function(real){ buildLoginSeg(real); });
  });
}
function applySize(){
  if (cv) cv.style.height = state.size + 'px';
  if (pet) pet.classList.toggle('noshadow', !state.shadow);
}
function buildProviderPicker(){
  var box = $('provPicker');
  if (!box) return;
  box.innerHTML = '';
  Object.keys(PROVIDERS).forEach(function(k){
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'prov' + (state.provider === k ? ' on' : '');
    b.textContent = PROVIDERS[k].name;
    b.onclick = function(){ state.provider = k; save(); buildProviderPicker(); syncProviderUI(); };
    box.appendChild(b);
  });
}
function syncProviderUI(){
  var P = prov();
  var sel = $('aiModel');
  if (!sel) return;
  sel.innerHTML = '';
  P.models.forEach(function(m){
    var o = document.createElement('option');
    o.value = m; o.textContent = m;
    if (m === curModel()) o.selected = true;
    sel.appendChild(o);
  });
  $('aiKey').value = curKey();
  $('aiKey').placeholder = '填 ' + P.name + ' 的 API Key';
  $('aiTopup').href = P.topup;
  $('aiUsage').href = P.usage;
  $('aiGetKey').href = P.keyUrl;
  $('aiMsg').textContent = P.note;
  $('balMsg').textContent = '';
  $('balMsg').style.color = '';
}
function rebuildSettings(){
  buildSeg($('segChar'), CHARS.map(function(c){ return {v:c, label:c}; }), state.char, switchChar);
  buildSeg($('segSize'), [{v:240,label:'小'},{v:320,label:'中'},{v:420,label:'大'}], state.size,
    function(v){ state.size = v; save(); applySize(); rebuildSettings(); });
  buildSeg($('segSpeed'), [{v:0.7,label:'慢'},{v:1,label:'正常'},{v:1.4,label:'快'}], state.speed,
    function(v){ state.speed = v; save(); rebuildSettings(); });
  buildSeg($('segShadow'), [{v:true,label:'显示'},{v:false,label:'不显示'}], state.shadow,
    function(v){ state.shadow = v; save(); applySize(); rebuildSettings(); });
  buildProviderPicker();
  syncProviderUI();
  if (IS_DESKTOP && window.petAPI && window.petAPI.getLogin){
    var lr = $('loginRow');
    if (lr) lr.style.display = '';
    window.petAPI.getLogin().then(function(on){ buildLoginSeg(on); });
  }
}

function checkBalance(){
  var box = $('balMsg');
  var P = prov();
  var typed = ($('aiKey').value || '').trim();
  if (typed){ state.keys[state.provider] = typed; state.models[state.provider] = $('aiModel').value; save(); }
  var key = typed || curKey();
  if (!key){ box.textContent = '先填 Key 再查余额。'; box.style.color = ''; return; }
  if (!P.balance){ box.style.color = '#FFD08A'; box.textContent = 'ℹ️ ' + P.note; return; }

  box.style.color = '';
  box.textContent = '正在查 ' + P.name + ' 余额…';
  httpFetch(P.base + P.balance, {
    method: 'GET',
    headers: { 'Accept':'application/json', 'Authorization':'Bearer ' + key }
  }).then(function(r){ return r.json(); }).then(function(j){
    if (j.balance_infos){
      var txt = j.balance_infos.map(function(b){
        var sym = (b.currency === 'CNY') ? '¥' : ((b.currency === 'USD') ? 'USD ' : (b.currency + ' '));
        return sym + b.total_balance + '（赠送 ' + sym + (b.granted_balance || '0') +
               ' + 充值 ' + sym + (b.topped_up_balance || '0') + '）';
      }).join('　|　');
      box.textContent = '💰 ' + P.name + ' 余额：' + txt;
      box.style.color = '#7FD8A8';
      return;
    }
    if (j.data && (j.data.available_balance !== undefined || j.data.voucher_balance !== undefined)){
      box.textContent = '💰 ' + P.name + ' 余额：¥' + (j.data.available_balance || 0);
      box.style.color = '#7FD8A8';
      return;
    }
    box.textContent = '💰 ' + P.name + ' 返回：' + JSON.stringify(j).slice(0, 160);
    box.style.color = '#7FD8A8';
  }).catch(function(e){
    var m = e.message || '';
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) m = '浏览器拦住了跨域请求';
    box.textContent = '❌ 查余额失败：' + m + '　—— 可以点下面的按钮去官网看';
    box.style.color = '#FF9AA8';
  });
}

/* ============================================================
   切换角色
   ============================================================ */
function switchChar(ch){
  state.char = ch;
  state.motion = '待机'; state.base = '待机'; state.frame = 0;
  state.hist = [];
  preload(ch);
  if ($('pName')) $('pName').textContent = ch;
  if ($('btnChar')) $('btnChar').textContent = ch;
  if (pet) pet.dataset.motion = '待机';
  if (pet) pet.classList.remove('sleeping');
  if ($('chatLog')) $('chatLog').innerHTML = '';
  var B = BRAIN[ch];
  if ($('chatHint')) $('chatHint').textContent = '它会好奇地听你说每一句话。';
  setTimeout(function(){ say(pickLine(ch, 'greet', B.greet)); }, 400);
  applyTheme();
  updateSearchHint();
  updateSub(); drawAvatar(); save();
  var im = new Image();
  im.onload = function(){
    if (!cv) return;
    cv.width = im.naturalWidth; cv.height = im.naturalHeight;
    applySize(); drawAvatar();
  };
  im.src = frameSrc(ch, '待机', 0);
  rebuildSettings();
}

/* ============================================================
   开机待办提醒
   ============================================================ */
function hideRemind(){
  var box = $('remind');
  if (!box) return;
  box.classList.remove('show');
  setTimeout(function(){ box.hidden = true; }, 320);
}
function showTodoReminder(){
  var pending = state.todos.filter(function(t){ return !t.done; });
  if (!pending.length) return;
  var box = $('remind');
  $('remindTitle').textContent = '你还有 ' + pending.length + ' 件事没做';
  var ul = $('remindList');
  ul.innerHTML = '';
  pending.slice(0, 6).forEach(function(t){
    var li = document.createElement('li');
    li.appendChild(document.createElement('i'));
    li.appendChild(document.createTextNode(t.text));
    ul.appendChild(li);
  });
  if (pending.length > 6){
    var more = document.createElement('li');
    more.className = 'more';
    more.textContent = '……还有 ' + (pending.length - 6) + ' 件';
    ul.appendChild(more);
  }
  box.hidden = false;
  requestAnimationFrame(function(){ box.classList.add('show'); });
  setTimeout(function(){
    say('你还有 ' + pending.length + ' 件事。不急，但我替你记着。', 9000);
  }, 650);
  try {
    var nBody = '你还有 ' + pending.length + ' 件事没做，第一件：' + pending[0].text;
    if (window.petAPI && window.petAPI.notify) window.petAPI.notify('陪伴桌宠 · 待办提醒', nBody);
    else if (window.Notification && Notification.permission === 'granted') new Notification('陪伴桌宠 · 待办提醒', { body: nBody });
  } catch(e){}
}


/* ============================================================
   桌面模式 / 窗口高度
   ============================================================ */
var IS_DESKTOP = !!(window.petAPI && window.petAPI.isDesktop);
var WIN_H_NORMAL = 580;
var WIN_H_SEARCH = 640;
var WIN_H_SET    = 920;

function applyWindowHeight(tabName){
  if (!(IS_DESKTOP && window.petAPI && window.petAPI.setHeight)) return;
  var h = WIN_H_NORMAL;
  if (tabName === 'set') h = WIN_H_SET;
  else if (tabName === 'search') h = WIN_H_SEARCH;
  try { window.petAPI.setHeight(h); } catch(e){}
}

function reportHotAreas(){
  if (!IS_DESKTOP) return;
  if (!(window.petAPI && window.petAPI.setHotAreas)) return;
  var rects = [];
  ['.pet', '.panel', '.remind', '.bubble'].forEach(function(sel){
    var e = document.querySelector(sel);
    if (!e || e.hidden) return;
    var st = window.getComputedStyle(e);
    if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return;
    var r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    rects.push([Math.round(r.left) - 8, Math.round(r.top) - 8, Math.round(r.right) + 8, Math.round(r.bottom) + 8]);
  });
  window.petAPI.setHotAreas(rects);
}

function placeBubble(){
  var b = $('bubble');
  if (!b || !b.classList.contains('show')) return;
  var desk = $('desk');
  var dr = desk.getBoundingClientRect();
  var pr = pet.getBoundingClientRect();
  var panel = $('panel');
  var gap = 14;
  var petMid = (pr.left + pr.right) / 2;

  b.style.marginBottom = '0px';
  var bh = b.offsetHeight;
  var bubBottom = pr.top - 18;
  var bubTop = bubBottom - bh;

  var lo = dr.left + gap, hi = dr.right - gap;

  if (!panel.hidden){
    var q = panel.getBoundingClientRect();
    var overlap = (bubBottom > q.top + 4) && (bubTop < q.bottom - 4);
    if (overlap){
      var pushUp = bubBottom - (q.top - 12);
      if (pushUp > 0 && (bubTop - pushUp) >= dr.top + 6){
        b.style.marginBottom = Math.round(pushUp) + 'px';
        bubBottom = bubBottom - pushUp;
        bubTop = bubBottom - bh;
        overlap = false;
      }
    }
    if (overlap){
      var qMid = (q.left + q.right) / 2;
      if (qMid <= petMid) lo = Math.max(lo, q.right + gap);
      else hi = Math.min(hi, q.left - gap);
    }
  }
  if (hi - lo < 120){ lo = dr.left + gap; hi = dr.right - gap; }

  var avail = hi - lo;
  b.style.maxWidth = Math.min(282, Math.round(avail)) + 'px';

  var bw = Math.min(b.offsetWidth, avail);
  var want = petMid;
  if (want - bw / 2 < lo) want = lo + bw / 2;
  if (want + bw / 2 > hi) want = hi - bw / 2;
  b.style.marginLeft = Math.round(want - petMid) + 'px';

  var rb = b.getBoundingClientRect();
  var cur = parseFloat(b.style.marginLeft) || 0;
  if (rb.right > dr.right - 4) b.style.marginLeft = (cur - (rb.right - (dr.right - 4))) + 'px';
  else if (rb.left < dr.left + 4) b.style.marginLeft = (cur + ((dr.left + 4) - rb.left)) + 'px';

  b.classList.remove('below');
}

var _smooth = new Map();
var _smoothRunning = false;
var _wheelBurst = { box:null, last:0 };

function smoothScrollBy(box, dy){
  if (!box) return;
  var max = box.scrollHeight - box.clientHeight;
  if (max <= 0) return;
  var now = (window.performance && performance.now) ? performance.now() : Date.now();
  // 新一轮滚轮动作从当前位置重新计算，避免快速滚动时把旧目标越叠越远。
  var newBurst = (box !== _wheelBurst.box) || (now - _wheelBurst.last > 110);
  var base = newBurst ? box.scrollTop : (_smooth.has(box) ? _smooth.get(box) : box.scrollTop);
  _wheelBurst.box = box;
  _wheelBurst.last = now;
  _smooth.set(box, Math.max(0, Math.min(max, base + dy)));
  if (!_smoothRunning){ _smoothRunning = true; requestAnimationFrame(_smoothStep); }
}
function _smoothStep(){
  var stillMoving = false;
  var finished = [];
  _smooth.forEach(function(target, box){
    if (!box.isConnected || box.clientHeight === 0){ finished.push(box); return; }
    var diff = target - box.scrollTop;
    var abs = Math.abs(diff);
    if (abs < 1.5){ box.scrollTop = target; finished.push(box); return; }
    // 慢滚保持柔和；快速滚动时加快追上目标，避免滚完还拖很久。
    var factor = abs > 260 ? 0.46 : (abs > 80 ? 0.32 : 0.22);
    var step = diff * factor;
    var minStep = abs > 220 ? 12 : (abs > 60 ? 3 : 1);
    if (Math.abs(step) < minStep) step = (diff > 0 ? minStep : -minStep);
    if (Math.abs(step) > abs) step = diff;
    box.scrollTop += step;
    stillMoving = true;
  });
  finished.forEach(function(b){ _smooth.delete(b); });
  if (stillMoving) requestAnimationFrame(_smoothStep);
  else _smoothRunning = false;
}

/* ============================================================
   小精灵交互（拖拽 / 点击）
   ============================================================ */
var drag = null;
var moveAcc = { dx:0, dy:0, raf:0 };
function queueMove(dx, dy){
  moveAcc.dx += dx; moveAcc.dy += dy;
  if (moveAcc.raf) return;
  moveAcc.raf = requestAnimationFrame(function(){
    moveAcc.raf = 0;
    var mx = Math.round(moveAcc.dx), my = Math.round(moveAcc.dy);
    moveAcc.dx = 0; moveAcc.dy = 0;
    if ((mx || my) && window.petAPI && window.petAPI.moveBy) window.petAPI.moveBy(mx, my);
  });
}

var lastPoke = 0;
function poke(){
  var now = Date.now();
  if (now - lastPoke < 700) return;
  lastPoke = now;
  var waking = (state.motion === '睡觉');
  if (waking) playMotion('打招呼', '待机');
  else playMotion('惊讶', '待机');

  if (curKey()){
    var hint = waking ? '对方把你叫醒了，你不情不愿地睁开了眼。' : '对方用鼠标戳了你一下，你吓了一跳。';
    askAI('（' + hint + aiContext() + ' 请用一句话回应，保持你的性格，不要解释，不要加括号说明，不要描写动作。）')
      .then(function(r){ if (r && !r.__err) say(r); });
  } else {
    var b = $('bubble');
    if (b) b.classList.remove('show', 'pop');
    clearTimeout(bubTimer);
  }
}
function aiContext(){
  var h = new Date().getHours();
  var part = h < 6 ? '凌晨' : h < 11 ? '早上' : h < 14 ? '中午' : h < 18 ? '下午' : h < 23 ? '晚上' : '深夜';
  var pending = state.todos.filter(function(t){ return !t.done; }).length;
  var s = '现在是' + part + '（' + h + ' 点）。';
  if (pending > 0) s += '对方还有 ' + pending + ' 件待办没做完。';
  return s;
}

if (pet){
  pet.addEventListener('pointerdown', function(e){
    var r = pet.getBoundingClientRect(), d = $('desk').getBoundingClientRect();
    drag = { sx:e.clientX, sy:e.clientY, ssx:e.screenX, ssy:e.screenY,
             ox:r.left - d.left, oy:r.top - d.top, moved:false };
    pet.classList.add('dragging');
    try { pet.setPointerCapture(e.pointerId); } catch(err){}
    if (IS_DESKTOP && window.petAPI && window.petAPI.setDragging) window.petAPI.setDragging(true);
  });
  pet.addEventListener('pointermove', function(e){
    if (!drag) return;
    var totalDX = e.screenX - drag.ssx, totalDY = e.screenY - drag.ssy;
    if (Math.abs(totalDX) > 4 || Math.abs(totalDY) > 4) drag.moved = true;
    if (!drag.moved) return;

    if (IS_DESKTOP && window.petAPI && window.petAPI.moveBy){
      if (drag.lastSX === undefined){ drag.lastSX = e.screenX; drag.lastSY = e.screenY; }
      var ddx = e.screenX - drag.lastSX, ddy = e.screenY - drag.lastSY;
      drag.lastSX = e.screenX; drag.lastSY = e.screenY;
      if (ddx || ddy) queueMove(ddx, ddy);
      return;
    }
    var desk = $('desk');
    var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    var nx = Math.max(-30, Math.min(desk.clientWidth - pet.offsetWidth + 30, drag.ox + dx));
    var ny = Math.max(10, Math.min(desk.clientHeight - pet.offsetHeight - 40, drag.oy + dy));
    pet.style.right = 'auto'; pet.style.bottom = 'auto';
    pet.style.left = nx + 'px'; pet.style.top = ny + 'px';
  });
  pet.addEventListener('pointerup', function(e){
    var moved = drag && drag.moved;
    drag = null;
    pet.classList.remove('dragging');
    try { pet.releasePointerCapture(e.pointerId); } catch(err){}
    if (IS_DESKTOP && window.petAPI && window.petAPI.setDragging) window.petAPI.setDragging(false);
    if (moved){ placePanel(); if (!($('panel') || {}).hidden) placePanel(); return; }
    poke();
  });
  pet.addEventListener('dblclick', function(){ togglePanel(true); });
}

/* ============================================================
   页面切换
   ============================================================ */
document.querySelectorAll('.ptab').forEach(function(t){
  t.onclick = function(){
    document.querySelectorAll('.ptab').forEach(function(x){ x.classList.remove('on'); });
    t.classList.add('on');
    var n = t.getAttribute('data-tab');
    document.querySelectorAll('.pane').forEach(function(p){
      p.classList.toggle('on', p.getAttribute('data-pane') === n);
    });
    if (n !== 'search' && $('sout')) $('sout').innerHTML = '';
    var pb = document.querySelector('.pbody');
    if (pb) pb.scrollTop = 0;
    if (typeof _smooth !== 'undefined') _smooth.clear();
    var pnl = $('panel');
    if (pnl) pnl.setAttribute('data-tab', n);
    applyWindowHeight(n);
    setTimeout(placePanel, 80);
    setTimeout(placePanel, 260);
    setTimeout(reportHotAreas, 300);
  };
});

/* ============================================================
   按钮绑定
   ============================================================ */
if ($('todoAdd')) $('todoAdd').onclick = addTodo;
if ($('todoInput')) $('todoInput').onkeydown = function(e){ if (e.key === 'Enter') addTodo(); };
if ($('shistClear')) $('shistClear').onclick = function(){
  if (!(state.searchHistory || []).length) return;
  state.searchHistory = []; save(); renderSearchHistory();
};
if ($('sgo')) $('sgo').onclick = doSearch;
if ($('sq')) $('sq').onkeydown = function(e){ if (e.key === 'Enter') doSearch(); };
if ($('csend')) $('csend').onclick = sendChat;
if ($('ci')) $('ci').onkeydown = function(e){ if (e.key === 'Enter') sendChat(); };

document.querySelectorAll('.act').forEach(function(b){
  b.onclick = function(){
    var a = b.getAttribute('data-act');
    if (a === '醒') playMotion('打招呼', '待机');
    else if (a === '睡觉') playMotion('睡觉', '睡觉');
    else playMotion(a, '待机');
    if (curKey()){
      var prompt = '（动作提示：' + (ACT_HINT[a] || '') + ' 请用一句话回应，保持你的性格，不要解释，不要加括号说明，不要描写动作。）';
      askAI(prompt).then(function(r){ if (r && !r.__err) say(r); });
    } else {
      var bb = $('bubble');
      if (bb) bb.classList.remove('show', 'pop');
      clearTimeout(bubTimer);
    }
  };
});

if ($('aiModel')) $('aiModel').onchange = function(){ state.models[state.provider] = this.value; save(); };
if ($('aiSave')) $('aiSave').onclick = function(){
  state.keys[state.provider] = $('aiKey').value.trim();
  state.models[state.provider] = $('aiModel').value;
  state.hist = []; save();
  $('aiMsg').textContent = curKey()
    ? ('已保存。现在用 ' + prov().name + ' / ' + curModel() + '。')
    : ('已清空 ' + prov().name + ' 的 Key，回到本地台词库。');
  updateSearchHint();
};
if ($('aiTest')) $('aiTest').onclick = function(){
  state.keys[state.provider] = $('aiKey').value.trim();
  state.models[state.provider] = $('aiModel').value;
  save();
  $('aiMsg').textContent = '正在测试 ' + prov().name + '…';
  $('balMsg').textContent = '';
  askAI('你好').then(function(r){
    if (r && r.__err) $('aiMsg').textContent = '❌ 连不上：' + r.__err;
    else $('aiMsg').textContent = '✅ ' + prov().name + ' / ' + curModel() + ' 通了。它回你：' + r;
    state.hist = []; save();
  });
};
if ($('aiBal')) $('aiBal').onclick = checkBalance;
if ($('btnChar')) $('btnChar').onclick = function(){
  var i = CHARS.indexOf(state.char);
  switchChar(CHARS[(i + 1) % CHARS.length]);
};
if ($('btnBg')) $('btnBg').onclick = function(){
  var dark = $('desk').classList.toggle('dark');
  this.textContent = dark ? '浅色桌面' : '深色桌面';
};
if ($('pClose')) $('pClose').onclick = function(){ $('panel').hidden = true; applyWindowHeight(null); };
if ($('tbPet')) $('tbPet').onclick = function(){
  if ($('panel').hidden){
    var pnl = $('panel');
    pnl.setAttribute('data-tab', currentTab());
    pnl.hidden = false;
    document.body.classList.remove('panel-closed');
    applyTheme(); applyWindowHeight(currentTab());
    setTimeout(placePanel, 0); setTimeout(placePanel, 260);
    if (!$('chatLog').childNodes.length) say(pickLine(state.char, 'greet', BRAIN[state.char].greet));
  } else { $('panel').hidden = true; applyWindowHeight(null); }
};
if ($('remindX')) $('remindX').onclick = hideRemind;
if ($('remindLater')) $('remindLater').onclick = hideRemind;
if ($('remindOpen')) $('remindOpen').onclick = function(){
  hideRemind();
  $('panel').hidden = false;
  document.body.classList.remove('panel-closed');
  document.querySelectorAll('.ptab').forEach(function(x){ x.classList.toggle('on', x.getAttribute('data-tab') === 'todo'); });
  document.querySelectorAll('.pane').forEach(function(p){ p.classList.toggle('on', p.getAttribute('data-pane') === 'todo'); });
  applyTheme(); applyWindowHeight('todo');
  setTimeout(placePanel, 60);
};

/* 滚轮兜底：从鼠标所在元素往外找，找到第一个真正能滚的盒子。
   这样搜索记录、结果、待办等区域不会有“滚不动”的死角。 */
document.addEventListener('wheel', function(e){
  var node = e.target, box = null;
  while (node && node !== document.body){
    if (node.matches && node.matches('.pbody, .todos, .shist-l, .chat, .sout') &&
        node.scrollHeight > node.clientHeight + 2){
      box = node;
      break;
    }
    node = node.parentElement;
  }
  if (!box) return;
  var dy = e.deltaY;
  if (e.deltaMode === 1) dy *= 16;
  if (e.deltaMode === 2) dy *= box.clientHeight;
  smoothScrollBy(box, dy);
  e.preventDefault();
}, { passive: false });

/* 外链用系统浏览器 */
document.addEventListener('click', function(e){
  var a = e.target && e.target.closest && e.target.closest('a[target="_blank"]');
  if (a && IS_DESKTOP && window.petAPI && window.petAPI.openExternal){
    e.preventDefault();
    window.petAPI.openExternal(a.href);
  }
}, true);

window.addEventListener('resize', function(){ placePanel(); });

/* ============================================================
   桌面模式初始化
   ============================================================ */
function initDesktopMode(){
  if (!IS_DESKTOP) return;
  document.body.classList.add('desktop-mode');
  reportHotAreas();
  setInterval(reportHotAreas, 200);
  ['pointerdown','pointerup','click','dblclick'].forEach(function(ev){
    document.addEventListener(ev, function(){ setTimeout(reportHotAreas, 30); }, true);
  });
  if (window.petAPI.onStatic){
    window.petAPI.onStatic(function(on){
      STATIC_MODE = on;
      document.body.classList.toggle('static-mode', on);
    });
  }
  if (window.petAPI.onIdlePack){
    window.petAPI.onIdlePack(function(v){
      state.idlePack = (v === 'auto') ? 'auto' : (Number(v) || 0);
      save();
      if (typeof renderPackRow === 'function') renderPackRow();
      setTimeout(function(){ say(pickLine(state.char, 'idle', currentIdleLines(state.char)), 4200); }, 250);
    });
  }
  if (window.petAPI.onSayIdle){
    window.petAPI.onSayIdle(function(){ say(pickLine(state.char, 'idle', currentIdleLines(state.char)), 4200); });
  }
  try { window.petAPI.setIgnore(true); } catch(e){}
}

/* ============================================================
   时钟
   ============================================================ */
function tick(){
  var d = new Date(), h = d.getHours(), m = d.getMinutes();
  if ($('clock')) $('clock').textContent = (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
}

/* ============================================================
   启动
   ============================================================ */
function boot(){
  document.body.classList.add('panel-closed');
  initDesktopMode();
  preload(state.char);
  renderTodos();
  renderSearchHistory();
  renderPackRow();
  switchChar(state.char);
  applySize();
  tick(); setInterval(tick, 10000);
  requestAnimationFrame(loop);
  setTimeout(showTodoReminder, 1200);

  function idleChatter(){
    var wait = 35000 + Math.random() * 55000;
    setTimeout(function(){
      if (state.motion === '待机' && $('panel').hidden){
        var B = BRAIN[state.char];
        if (Math.random() < 0.25){
          var c = contextLine(state.char);
          say(c || pickLine(state.char, 'idle', currentIdleLines(state.char)));
        } else {
          say(pickLine(state.char, 'idle', currentIdleLines(state.char)));
        }
      }
      idleChatter();
    }, wait);
  }
  idleChatter();
}

boot();

})();
