// ==================== 端口管理 ====================
export {
  extractPortFromUrl,
  checkPortOnHost,
  isPortInUse,
  findAvailablePort,
  buildUrlWithPort,
  waitForServer
} from './port'

// ==================== 窗口管理 ====================
export {
  createMainWindow,
  createWindows,
  getWindowsByTitle,
  getMainWindow,
  ensureMenuCreated,
  createMenu,
  showMessageBox
} from './window'

// ==================== 窗口通信 ====================
export {
  addLog2Vue,
  sendLatestLogToMainWindow,
  sendInitProgress,
  sendDownloadProgress,
  type DownloadProgressPayload
} from './window-comm'

// ==================== 浏览器管理 ====================
export { openBrowserWithType } from './browser'

// ==================== 环境变量 ====================
export { loadEnvFile, getEnvPath } from './env'

// ==================== 文件解压 ====================
export { extractZip4unzipit } from './zip'

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

// ==================== 更新检查 ====================
export { shouldCheckUpdate, checkUpdate, checkUpdateDetail } from './update'

// ==================== 文件系统工具 ====================
export { getAppDir, deleteDir, ensureDir } from './fs-utils'

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

// ==================== UpgradeLink API ====================
export {
  getElectronUpgrade,
  getFileUpgrade,
  reportAppEvent,
  type UpgradeResponse
} from './upgrade-link'

// ==================== Electron 自动更新 ====================
export {
  checkElectronUpdrate,
  checkForUpdates
} from './electron-update'
