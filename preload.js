/* 桌面版的"桥梁"：把主进程的能力安全地暴露给网页 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  isDesktop: true,
  version: '1.0.0',

  /* 告诉主进程「我正在拖」 */
  setDragging: function(v){ ipcRenderer.send('pet:dragging', !!v); },

  /* 改窗口高度（切页面用） */
  setHeight: function(h){ ipcRenderer.send('pet:set-height', h); },

  /* 移动窗口（拖小精灵用） */
  moveBy: function(dx, dy){ ipcRenderer.send('pet:move-by', { dx: dx, dy: dy }); },

  /* 上报「可点击区域」（主进程据此决定鼠标是否穿透） */
  setHotAreas: function(rects){ ipcRenderer.send('pet:hot-areas', rects); },

  /* 鼠标穿透开关 */
  setIgnore: function(ignore){ ipcRenderer.send('pet:set-ignore', ignore); },

  /* AI 请求交给主进程发（绕过浏览器跨域限制） */
  aiFetch: function(url, init){ return ipcRenderer.invoke('ai:fetch', { url: url, init: init }); },

  /* 系统通知 */
  notify: function(title, body){ ipcRenderer.send('pet:notify', { title: title, body: body }); },

  /* 打开外部链接 */
  openExternal: function(url){ ipcRenderer.send('pet:open', url); },

  /* 换待机台词包 */
  onIdlePack: function(cb){ ipcRenderer.on('pet:set-idle-pack', function(e, v){ try { cb(v); } catch(err){} }); },
  onSayIdle: function(cb){ ipcRenderer.on('pet:say-idle', function(){ try { cb(); } catch(err){} }); },

  /* 静止模式（防闪屏） */
  onStatic: function(cb){ ipcRenderer.on('pet:set-static', function(e, v){ try { cb(!!v); } catch(err){} }); },

  /* 开机自启 */
  setLogin: function(on){ return ipcRenderer.invoke('pet:set-login', on); },
  getLogin: function(){ return ipcRenderer.invoke('pet:get-login'); }
});
