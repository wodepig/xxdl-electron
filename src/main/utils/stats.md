# Utils 模块代码行数统计

生成时间: 2026-03-06

## 📊 文件列表

| 文件名 | 行数 | 功能说明 |
|--------|------|----------|
| browser.ts | 148 | 浏览器管理（多平台浏览器路径配置、打开URL） |
| env.ts | 90 | 环境变量管理（加载.env文件、检查必需变量） |
| zip.ts | 122 | 文件解压（使用unzipit解压ZIP文件） |
| download.ts | 227 | 文件下载（HTTP/HTTPS下载、重试机制、进度反馈） |
| fs-utils.ts | 65 | 文件系统工具（获取应用目录、删除目录、确保目录存在） |
| port.ts | 143 | 端口管理（端口检查、查找可用端口、构建URL、等待服务） |
| index.ts | 96 | 统一导出文件（所有模块的集中导出） |
| server.ts | 198 | 服务器管理（启动Node服务、清理进程、加载窗口URL） |
| window-comm.ts | 56 | 窗口通信（向渲染进程发送日志、进度、下载状态） |
| notification.ts | 190 | 通知系统（显示各类通知、10秒自动消失） |
| window.ts | 730 | 窗口管理（创建窗口、菜单管理、消息框、管理员验证） |
| update.ts | 149 | 更新检查（检查频率控制、版本对比、下载更新） |
| config.ts | 90 | 配置管理（electron-conf封装、读写配置项） |
| log-watcher.ts | 174 | 日志监听（日志文件监听、读取新增日志） |
| upgrade-link.ts | 166 | UpgradeLink API（获取升级信息、上报事件） |
| electron-update.ts | 180 | Electron自动更新（autoUpdater封装） |

## 📈 统计汇总

| 指标 | 数值 |
|------|------|
| **总文件数** | 16 个 |
| **总代码行数** | 2,324 行 |
| **平均行数** | ~145 行/文件 |
| **最大文件** | window.ts (730 行) |
| **最小文件** | fs-utils.ts (65 行) |

## 🏗️ 模块分类

### 小型模块 (< 100行)
- index.ts (96行)
- env.ts (90行)
- fs-utils.ts (65行)
- config.ts (90行)

### 中型模块 (100-200行)
- browser.ts (148行)
- zip.ts (122行)
- port.ts (143行)
- server.ts (198行)
- notification.ts (190行)
- update.ts (149行)
- log-watcher.ts (174行)
- upgrade-link.ts (166行)
- electron-update.ts (180行)

### 大型模块 (> 200行)
- download.ts (227行)
- window.ts (730行)

## 📁 目录结构

```
src/main/utils/
├── index.ts            # 统一导出 (96行)
├── port.ts             # 端口管理 (143行)
├── window.ts           # 窗口管理 (730行) ⭐ 最大文件
├── window-comm.ts      # 窗口通信 (56行)
├── browser.ts          # 浏览器管理 (148行)
├── env.ts              # 环境变量 (90行)
├── zip.ts              # 文件解压 (122行)
├── download.ts         # 文件下载 (227行)
├── server.ts           # 服务器管理 (198行)
├── update.ts           # 更新检查 (149行)
├── fs-utils.ts         # 文件系统工具 (65行) ⭐ 最小文件
├── config.ts           # 配置管理 (90行)
├── notification.ts     # 通知 (190行)
├── log-watcher.ts      # 日志监听 (174行)
├── upgrade-link.ts     # UpgradeLink API (166行)
└── electron-update.ts  # Electron自动更新 (180行)
```

## 🔍 备注

- `window.ts` 是最大的模块，包含窗口创建、菜单管理、消息框显示、管理员密码验证等复杂功能
- `fs-utils.ts` 是最小的模块，仅包含基础的文件系统操作
- 所有模块都通过 `index.ts` 统一导出，便于外部引用
