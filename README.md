# 陪伴桌宠

一个 Windows 桌面宠物项目，内置原创演示角色“小灯”。支持透明置顶窗口、角色动作、待办提醒、搜索、聊天、互动和多 AI 服务商切换。

## 功能

- 透明、无边框、始终置顶的桌面窗口
- 原创 SVG 演示角色“小灯”
- 待办事项和开机提醒
- AI 问答与角色聊天
- DeepSeek、OpenAI、Kimi、通义千问、智谱 GLM 服务商切换
- 系统托盘、开机自启和鼠标穿透
- 支持继续添加原创角色素材

## 环境

- Windows 10/11
- Node.js 20 或更高版本
- pnpm

## 运行源码

```powershell
pnpm install
pnpm start
```


## 数据与 API Key

待办、搜索记录、聊天记录和 API Key 只保存在本机的应用数据目录，不会写入仓库。

请不要提交以下内容：

- `desktop-pet.json`
- `pet-error.log`
- 桌宠诊断日志
- `.env`、私钥、证书和任何真实 API Key
- `node_modules/`
- 备份目录和临时文件

API Key 目前保存在 Electron 的本地存储中。如果准备把程序提供给更多人使用，建议进一步接入系统凭据存储，并明确提示用户 API Key 的保存位置。

## 原创演示素材

仓库中的 `app/角色/小灯/` 和 `icon*.png` 是为本项目制作的原创演示素材，不包含任何游戏角色图片或提取素材。

演示素材采用 CC0-1.0 许可，可自由复制、修改和再分发。详见 `ASSETS_LICENSE.md`。

如果要添加自己的角色，请阅读 `新角色添加说明.md`。请勿上传未经授权的第三方角色、游戏素材、客户资料或个人隐私。

## 项目结构

```text
陪伴桌宠-GitHub/
├─ app/
│  ├─ index.html
│  ├─ style.css
│  ├─ app.js
│  └─ 角色/小灯/          原创 SVG 动作素材
├─ main.js                Electron 主进程
├─ preload.js             安全通信桥
├─ 启动桌宠.vbs
├─ 关闭桌宠.bat
├─ 使用说明.md
├─ 新角色添加说明.md
├─ LICENSE                MIT 代码许可证
└─ ASSETS_LICENSE.md      演示素材许可证
```

## 许可证

- 源代码：MIT，详见 `LICENSE`
- 原创演示角色与图标素材：CC0-1.0，详见 `ASSETS_LICENSE.md`

项目与任何游戏发行商、AI 服务商均无隶属或背书关系。
