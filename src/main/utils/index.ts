// ==================== 窗口管理 (包含窗口通信 + 通知) ====================
export {
  createMainWindow,
  createWindows,
  getWindowsByTitle,
  getMainWindow,
  ensureMenuCreated,
  createMenu,
  showMessageBox,
  // 窗口通信
  addLog2Vue,
  sendLatestLogToMainWindow,
  sendInitProgress,
  sendDownloadProgress,
  type DownloadProgressPayload,
  // 通知系统
  showUpdateNotification,
  showInfoNotification,
  showSuccessNotification,
  showWarningNotification,
  showErrorNotification,
  showNotification,
  type NotificationType,
  type NotificationData
} from './window'

// ==================== 浏览器管理 ====================
export { openBrowserWithType } from './browser'

// ==================== 服务器管理 (包含端口管理) ====================
export {
  // 端口管理
  extractPortFromUrl,
  checkPortOnHost,
  isPortInUse,
  findAvailablePort,
  buildUrlWithPort,
  waitForServer,
  // 服务器管理
  cleanupServerProcess,
  handleNodeServer,
  loadMainWindowUrl,
  sleep,
  getActualPort
} from './server-manager'

// ==================== Node 应用更新 (Nuxt/Next 全栈应用) ====================
export {
  // 更新检查
  shouldCheckUpdate,
  checkUpdate,
  checkUpdateDetail,
  // UpgradeLink API
  getElectronUpgrade,
  getFileUpgrade,
  reportAppEvent,
  type UpgradeResponse
} from './node-app-update'

// ==================== 文件系统工具 (目录操作 + ZIP解压 + 文件下载) ====================
export {
  getAppDir,
  deleteDir,
  ensureDir,
  extractZip4unzipit,
  downloadFile,
  setDownloadProgressCallback,
  type DownloadProgressCallback
} from './fs-utils'

// ==================== 路径工具 ====================
export { getAppDir as getAppPath } from './path-utils'

// ==================== 配置管理 (conf.json + .env 环境变量) ====================
export {
  // 应用配置 (conf.json)
  getEnvConf,
  getConfValue,
  setConfValue,
  clearConf,
  deleteConfValue,
  hasConfValue,
  type ConfigNamespace,
  // 环境变量 (.env 文件)
  loadEnvFile,
  getEnvPath
} from './config'

// ==================== 日志监听 ====================
export { LogFileWatcher } from './log-watcher'

// ==================== Electron 自动更新 ====================
export {
  checkElectronUpdrate,
  checkForUpdates
} from './electron-update'
