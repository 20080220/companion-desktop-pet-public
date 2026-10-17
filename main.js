/* ============================================================
   陪伴桌宠 · 桌面版
   - 透明无边框窗口，铺满屏幕，只显示小精灵和面板
   - 鼠标穿透：只有移到小精灵/面板上才拦截
   - 置顶、系统托盘、开机自启、系统通知
   - AI 请求走主进程 → 不受浏览器跨域限制
   ============================================================ */
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, Notification, shell, nativeImage, dialog } = require('electron');

/* ============================================================
   防闪烁设置（必须在 app ready 之前调用）
   透明窗口 + 硬件加速 在某些显卡/壁纸软件下会互相打架，
   关掉 GPU 加速可以让画面稳定下来。
   ============================================================ */
/* 默认关掉 GPU 加速（防止和动态壁纸冲突导致闪屏）
   如果觉得拖动卡，可以在托盘里开「流畅模式」，下次启动就会启用 GPU */
let useGPU = false;
try {
  const cfgPath = require('path').join(app.getPath('userData'), 'desktop-pet.json');
  const cfg0 = JSON.parse(require('fs').readFileSync(cfgPath, 'utf8'));
  useGPU = !!cfg0.useGPU;
} catch(e){}
if (!useGPU){ try { app.disableHardwareAcceleration(); } catch(e){} }
try { app.commandLine.appendSwitch('enable-transparent-visuals'); } catch(e){}
const path = require('path');
const fs = require('fs');

let win = null;
let tray = null;
let ignoring = true;
let quitting = false;

/* ---------- 出错时写日志，方便排查 ---------- */
const LOG = path.join(app.getPath('userData'), 'pet-error.log');
function logErr(where, err){
  try {
    fs.appendFileSync(LOG, '[' + new Date().toISOString() + '] ' + where + ': ' + (err && err.stack || err) + '\n', 'utf8');
  } catch(e){}
}
process.on('uncaughtException', function(e){ logErr('uncaught', e); });

/* ---------- 配置 ---------- */
const CFG = path.join(app.getPath('userData'), 'desktop-pet.json');
function readCfg(){ try { return JSON.parse(fs.readFileSync(CFG, 'utf8')); } catch(e){ return {}; } }
function writeCfg(o){ try { fs.writeFileSync(CFG, JSON.stringify(o, null, 2), 'utf8'); } catch(e){} }

/* ---------- 主窗口 ---------- */
/* 窗口只占右下角一小块 —— 铺满全屏会和动态壁纸抢画布，导致壁纸闪 */
/* 窗口尺寸：宽要够「面板 + 气泡」并排，高要够「小精灵 + 气泡」叠加
   高度从 720 降到 580 —— 少 19% 面积，拖动更省力，又不至于把气泡挤扁 */
const PET_W = 620;
const PET_H = 580;

function createWindow(){
  const wa = screen.getPrimaryDisplay().workArea;
  const px = Math.round(wa.x + wa.width  - PET_W - 20);
  const py = Math.round(wa.y + wa.height - PET_H - 20);

  win = new BrowserWindow({
    x: px, y: py, width: PET_W, height: PET_H,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  /* 用 floating 而不是 screen-saver —— 层级低一档，和壁纸冲突更小 */
  win.setAlwaysOnTop(true, 'floating');
  try { win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false }); } catch(e){}
  win.setIgnoreMouseEvents(true, { forward: true });

  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  win.once('ready-to-show', function(){ win.show(); });

  win.webContents.on('did-finish-load', function(){
    try { win.webContents.send('pet:set-static', !!readCfg().staticMode); } catch(e){}
  });

  /* 保险：万一窗口被系统的隐藏参数影响，3 秒后再强制显示一次 */
  setTimeout(function(){
    try {
      if (win && !win.isDestroyed()){
        win.show();
        win.setAlwaysOnTop(true, 'floating');
      }
    } catch(e){}
  }, 3000);

  win.on('close', function(e){
    if (!quitting){ e.preventDefault(); win.hide(); updateTray(); }
  });

  /* 启动时按配置文件同步一次（会同时修复启动文件夹里的自启脚本） */
  const cfg = readCfg();
  if (cfg.openAtLogin !== undefined) applyLogin(!!cfg.openAtLogin);
}

/* ---------- 鼠标穿透（主进程直接问系统光标在哪，不依赖事件转发） ---------- */
let hotAreas = [];   /* 页面报上来的"可点击区域"，窗口坐标 */

ipcMain.on('pet:set-ignore', function(e, ignore){
  if (!win) return;
  ignoring = !!ignore;
  try { win.setIgnoreMouseEvents(ignoring, { forward: true }); } catch(err){}
});

/* 切换页面时改窗口高度
   向上长（底边固定）→ 小精灵和面板都不会跳 */
ipcMain.on('pet:set-height', function(e, h){
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.getBounds();
    const bottom = b.y + b.height;
    let nh = Math.round(h);
    if (!nh || nh < 320) nh = 580;
    if (nh > 1000) nh = 1000;
    let ny = bottom - nh;
    const wa = screen.getPrimaryDisplay().workArea;
    if (ny < wa.y){ ny = wa.y; nh = bottom - ny; }     /* 别顶出屏幕 */
    if (Math.abs(nh - b.height) < 2) return;            /* 高度没变就别折腾 */
    win.setBounds({ x: b.x, y: ny, width: b.width, height: nh });
  } catch(err){}
});

/* 拖动小精灵 = 移动整个窗口（这样它就能去屏幕任何地方） */
ipcMain.on('pet:move-by', function(e, d){
  if (!win || win.isDestroyed()) return;
  try {
    const b = win.getBounds();
    /* setPosition 比 setBounds 便宜很多（不触发尺寸重算），拖动更顺 */
    win.setPosition(b.x + Math.round(d.dx || 0), b.y + Math.round(d.dy || 0));
  } catch(err){}
});

ipcMain.on('pet:hot-areas', function(e, rects){
  hotAreas = Array.isArray(rects) ? rects : [];
});

/* 诊断日志（每 2 秒写一次，方便排查鼠标问题） */
const DIAG = path.join(__dirname, '桌宠诊断.txt');
let diagOn = true;

let diagLines = 0;
let diagDone = false;

function writeDiag(line){
  if (!diagOn || diagDone) return;
  try {
    /* 最多写 200 条就不写了 —— 这东西只是排查用的，不需要一直记 */
    if (diagLines >= 200){
      diagDone = true;
      fs.appendFileSync(DIAG, '（诊断日志已满 200 条，停止记录。删掉这个文件即可重新开始）\n', 'utf8');
      return;
    }
    if (!fs.existsSync(DIAG)) diagLines = 0;
    else diagLines = fs.readFileSync(DIAG, 'utf8').split('\n').length;
    if (diagLines >= 200){ diagDone = true; return; }
    fs.appendFileSync(DIAG, line + '\n', 'utf8');
  } catch(e){}
}

let draggingNow = false;

/* 拖动期间冻结穿透判定 —— 否则快速拖动时窗口会"掉线"，拖到一半就断 */
ipcMain.on('pet:dragging', function(e, v){
  draggingNow = !!v;
  if (draggingNow && ignoring){
    ignoring = false;
    try { win.setIgnoreMouseEvents(false); } catch(err){}
  }
});

function startHitTest(){
  let tick = 0;
  setInterval(function(){
    if (!win || win.isDestroyed() || !win.isVisible()) return;
    if (draggingNow) return;          /* 正在拖动 → 不切换，保证拖得顺 */
    let pt;
    try { pt = screen.getCursorScreenPoint(); } catch(e){ return; }
    const b = win.getBounds();
    const x = pt.x - b.x;
    const y = pt.y - b.y;

    let hot = false;
    for (let i = 0; i < hotAreas.length; i++){
      const r = hotAreas[i];
      if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]){ hot = true; break; }
    }
    const shouldIgnore = !hot;
    if (shouldIgnore !== ignoring){
      ignoring = shouldIgnore;
      try { win.setIgnoreMouseEvents(ignoring, { forward: true }); } catch(err){}
      writeDiag('[' + new Date().toLocaleTimeString() + '] 切换穿透=' + ignoring +
                '  鼠标屏幕位置=(' + pt.x + ',' + pt.y + ')' +
                '  窗口位置=(' + b.x + ',' + b.y + ')' +
                '  窗口内坐标=(' + x + ',' + y + ')' +
                '  热区=' + JSON.stringify(hotAreas));
    }
    /* 只在"穿透状态变化"时写日志（上面那段），
       不再每 2 秒写一次 —— 否则会一直往硬盘写，费电又费硬盘 */
    tick++;
  }, 50);
}

/* ---------- AI 请求（主进程发，绕过跨域） ---------- */
ipcMain.handle('ai:fetch', async function(e, arg){
  const url = arg && arg.url;
  const init = (arg && arg.init) || {};
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(function(){ ctrl.abort(); }, 20000);
    const res = await fetch(url, {
      method: init.method || 'GET',
      headers: init.headers || {},
      body: init.body,
      signal: ctrl.signal
    });
    clearTimeout(timer);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch(err){}
    return { ok: res.ok, status: res.status, json: json, text: text };
  } catch (err) {
    const m = String(err && err.message || err);
    return { ok: false, error: (err && err.name === 'AbortError') ? '请求超时' : m };
  }
});

/* ---------- 系统通知 ---------- */
ipcMain.on('pet:notify', function(e, arg){
  try {
    if (Notification.isSupported()){
      new Notification({
        title: (arg && arg.title) || '陪伴桌宠',
        body: (arg && arg.body) || '',
        icon: path.join(__dirname, 'icon.png')
      }).show();
    }
  } catch(err){ logErr('notify', err); }
});

/* ---------- 打开外部链接 ---------- */
ipcMain.on('pet:open', function(e, url){
  try { if (/^https?:/i.test(url)) shell.openExternal(url); } catch(err){ logErr('open', err); }
});

/* ---------- 开机自启 ---------- */
function loginArgs(){
  try { return [app.getAppPath()]; } catch(e){ return [__dirname]; }
}

/* Electron 自带的注册方式在部分 Windows + 开发模式下不可靠。
   这里同时在「启动」文件夹放一个很小的 VBS，双保险；只要文件在，开关就一定是开。 */
function startupFile(){
  return path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', '陪伴桌宠.vbs');
}
function oldStartupFile(){
  return path.join(path.dirname(startupFile()), '陪伴桌宠.cmd');
}
function vbsEscape(s){ return String(s).replace(/"/g, '""'); }
function makeStartupVbs(){
  const exe = process.execPath;
  const appDir = app.getAppPath();
  const workDir = app.isPackaged ? path.dirname(exe) : appDir;
  const run = app.isPackaged ? ('"' + exe + '"') : ('"' + exe + '" "' + appDir + '"');
  return 'Set ws = CreateObject("WScript.Shell")\r\n' +
    'ws.CurrentDirectory = "' + vbsEscape(workDir) + '"\r\n' +
    'ws.Run "' + vbsEscape(run) + '", 0, False\r\n';
}
function startupFileOn(){ try { return fs.existsSync(startupFile()); } catch(e){ return false; } }
function electronLoginOn(){
  try { return !!app.getLoginItemSettings({ path: process.execPath, args: loginArgs() }).openAtLogin; } catch(e){ return false; }
}
function isLoginOn(){ return startupFileOn() || electronLoginOn(); }
function applyLogin(on){
  on = !!on;
  const cfg = readCfg(); cfg.openAtLogin = on; writeCfg(cfg);
  try {
    if (on){
      const f = startupFile();
      fs.mkdirSync(path.dirname(f), { recursive:true });
      fs.writeFileSync(f, Buffer.from('\uFEFF' + makeStartupVbs(), 'utf16le'));
      try { fs.unlinkSync(oldStartupFile()); } catch(e){}
    } else {
      try { fs.unlinkSync(startupFile()); } catch(e){}
      try { fs.unlinkSync(oldStartupFile()); } catch(e){}
    }
  } catch(e){ logErr('startup-file', e); }
  try {
    app.setLoginItemSettings({ openAtLogin:(!startupFileOn() && on), name:'陪伴桌宠', path:process.execPath, args:loginArgs() });
  } catch(e){ logErr('setLogin', e); }
  return isLoginOn();
}

ipcMain.handle('pet:set-login', function(e, on){ return applyLogin(on); });
ipcMain.handle('pet:get-login', function(){ return isLoginOn(); });

/* ---------- 托盘 ---------- */
function iconPath(){
  const a = path.join(__dirname, 'icon-32.png');
  const b = path.join(__dirname, 'icon.png');
  return fs.existsSync(a) ? a : b;
}

function updateTray(){
  if (!tray) return;
  try {
    const shown = win && win.isVisible();
    const loginOn = isLoginOn();
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: shown ? '隐藏小精灵' : '显示小精灵', click: function(){ if (!win) return; if (win.isVisible()) win.hide(); else win.show(); updateTray(); } },
      { type: 'separator' },
      { label: '开机自动启动', type: 'checkbox', checked: loginOn, click: function(item){
          const real = applyLogin(item.checked);
          if (real !== item.checked) item.checked = real;
          updateTray();
        } },
      { label: '流畅模式（更顺滑，但可能闪屏）', type: 'checkbox', checked: !!readCfg().useGPU, click: function(item){
          const cfg = readCfg(); cfg.useGPU = item.checked; writeCfg(cfg);
          dialog.showMessageBox({
            type: 'info',
            title: '陪伴桌宠',
            message: item.checked ? '已开启流畅模式' : '已关闭流畅模式',
            detail: '这个设置需要重启桌宠才生效。\n\n右键托盘图标 → 退出，然后重新启动即可。',
            buttons: ['知道了']
          });
        } },
      { label: '鼠标不穿透（如果点不到就勾这个）', type: 'checkbox', checked: !!readCfg().noPassthrough, click: function(item){
          const cfg = readCfg(); cfg.noPassthrough = item.checked; writeCfg(cfg);
          if (item.checked){
            ignoring = false;
            try { win.setIgnoreMouseEvents(false); } catch(e){}
            diagOn = false;
          } else {
            ignoring = true;
            try { win.setIgnoreMouseEvents(true, { forward: true }); } catch(e){}
          }
        } },
      { label: '换待机台词', submenu: [
          { label: '第 1 套 · 原味', type: 'radio', checked: (readCfg().idlePack === 0), click: function(){
              const c = readCfg(); c.idlePack = 0; writeCfg(c);
              if (win) win.webContents.send('pet:set-idle-pack', 0);
            } },
          { label: '第 2 套', type: 'radio', checked: (readCfg().idlePack === 1), click: function(){
              const c = readCfg(); c.idlePack = 1; writeCfg(c);
              if (win) win.webContents.send('pet:set-idle-pack', 1);
            } },
          { label: '第 3 套', type: 'radio', checked: (readCfg().idlePack === 2), click: function(){
              const c = readCfg(); c.idlePack = 2; writeCfg(c);
              if (win) win.webContents.send('pet:set-idle-pack', 2);
            } },
          { type: 'separator' },
          { label: '每句随机（混着来）', type: 'radio', checked: (readCfg().idlePack === 'auto'), click: function(){
              const c = readCfg(); c.idlePack = 'auto'; writeCfg(c);
              if (win) win.webContents.send('pet:set-idle-pack', 'auto');
            } },
          { type: 'separator' },
          { label: '说说看（换来听听）', click: function(){
              if (win) win.webContents.send('pet:say-idle');
            } }
        ] },
      { label: '静止模式（防闪屏）', type: 'checkbox', checked: !!readCfg().staticMode, click: function(item){
          const cfg = readCfg(); cfg.staticMode = item.checked; writeCfg(cfg);
          if (win) win.webContents.send('pet:set-static', item.checked);
        } },
      { label: '位置回到右下角', click: function(){
          try {
            const a = screen.getPrimaryDisplay().workArea;
            win.setBounds({ x: Math.round(a.x + a.width - PET_W - 20), y: Math.round(a.y + a.height - PET_H - 20), width: PET_W, height: PET_H });
          } catch(e){}
        } },
      { label: '重新加载', click: function(){ if (win) win.reload(); } },
      { type: 'separator' },
      { label: '退出', click: function(){ quitting = true; app.quit(); } }
    ]));
  } catch(err){ logErr('updateTray', err); }
}

function createTray(){
  try {
    const img = nativeImage.createFromPath(iconPath());
    tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img);
    tray.setToolTip('陪伴桌宠');
    tray.on('click', function(){ if (!win) return; if (win.isVisible()) win.hide(); else win.show(); updateTray(); });
    updateTray();
  } catch(err){ logErr('createTray', err); }
}

/* ---------- 单实例 ---------- */
if (!app.requestSingleInstanceLock()){
  app.quit();
} else {
  app.on('second-instance', function(){ if (win){ win.show(); updateTray(); } });

  app.whenReady().then(function(){
    try {
      createWindow();
      createTray();
      startHitTest();
      if (readCfg().noPassthrough){
        ignoring = false;
        try { win.setIgnoreMouseEvents(false); } catch(e){}
        diagOn = false;
      }
    } catch(err){ logErr('whenReady', err); }
  });

  app.on('window-all-closed', function(){ /* 留在托盘，不退出 */ });
  app.on('before-quit', function(){ quitting = true; });
}
