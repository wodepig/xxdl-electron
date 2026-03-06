// ==================== 端口管理 ====================
export {
  extractPortFromUrl,
  checkPortOnHost,
  isPortInUse,
  findAvailablePort,
  buildUrlWithPort,
  waitForServer
} from './port'

// ==================== 窗口管理 (包含窗口通信) ====================
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
  type DownloadProgressPayload
} from './window'

// ==================== 浏览器管理 ====================
export { openBrowserWithType } from './browser'

// ==================== 环境变量 ====================
export { loadEnvFile, getEnvPath } from './env'

// ==================== 文件下载 ====================
export { downloadFile } from './download'

// ==================== 服务器管理 ====================
export {
  cleanupServerProcess,
  handleNodeServer,
  loadMainWindowUrl,
  sleep,
  getActualPort
} from './server'

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

// ==================== 文件系统工具 (目录操作 + ZIP解压) ====================
export {
  getAppDir,
  deleteDir,
  ensureDir,
  extractZip4unzipit
} from './fs-utils'

// ==================== 配置管理 ====================
export {
  getEnvConf,
  getConfValue,
  setConfValue,
  clearConf,
  deleteConfValue,
  hasConfValue,
  type ConfigNamespace
} from './config'

// ==================== 通知 ====================
export {
  showUpdateNotification,
  showInfoNotification,
  showSuccessNotification,
  showWarningNotification,
  showErrorNotification,
  showNotification,
  type NotificationType,
  type NotificationData
} from './notification'

// ==================== 日志监听 ====================
export { LogFileWatcher } from './log-watcher'

// ==================== Electron 自动更新 ====================
export {
  checkElectronUpdrate,
  checkForUpdates
} from './electron-update'
