/**
 * @deprecated 此文件已弃用，请直接从 '@/main/utils/index' 导入
 * 保留此文件是为了向后兼容，所有功能已迁移到 utils/ 目录下的模块
 */

// ==================== 重新导出所有功能 ====================

// 服务器管理 (包含端口管理)
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
} from './utils/server-manager'

// 窗口管理 (包含窗口通信 + 通知)
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
} from './utils/window'

// 浏览器管理
export { openBrowserWithType } from './utils/browser'

// 文件系统工具 (目录操作 + ZIP解压 + 文件下载)
export {
  getAppDir,
  deleteDir,
  ensureDir,
  extractZip4unzipit,
  downloadFile,
  setDownloadProgressCallback
} from './utils/fs-utils'

// Node 应用更新 (Nuxt/Next 全栈应用)
export {
  shouldCheckUpdate,
  checkUpdate,
  checkUpdateDetail,
  getElectronUpgrade,
  getFileUpgrade,
  reportAppEvent,
  type UpgradeResponse
} from './utils/node-app-update'



// 配置管理 (conf.json + .env 环境变量)
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
} from './utils/config'

// 日志监听
export { LogFileWatcher } from './utils/log-watcher'

// Electron 自动更新
export {
  checkElectronUpdrate,
  checkForUpdates
} from './utils/electron-update'

// ==================== 初始化流程（保留在原文件）====================

import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import log from 'electron-log/main'
import { setConfValue, getConfValue } from './utils/config'
import { extractZip4unzipit, downloadFile } from './utils/fs-utils'
import { checkUpdate } from './utils/node-app-update'
import {
  handleNodeServer,
  loadMainWindowUrl,
  sleep,
  getActualPort,
  cleanupServerProcess,
  buildUrlWithPort
} from './utils/server-manager'
import { getAppDir, deleteDir } from './utils/fs-utils'

const extract_dir_name = 'dist_server'

/**
 * 启动初始化流程
 * 这是主要的初始化入口函数
 */
export const startInitialize = async (): Promise<void> => {
  setConfValue('nodeStart', 'false')

  const appDir = getAppDir()
  const distDir = join(appDir, extract_dir_name)
  const serverPath = join(distDir, 'server', 'index.mjs')

  // 处理 dist.zip（下载/检查更新/解压）
  await handleDistZip()

  // 检查服务器文件是否存在
  if (!existsSync(serverPath)) {
    log.warn(`错误: 服务器文件不存在: ${serverPath}`)
    throw new Error(`服务器文件不存在: ${serverPath}`)
  }

  // 启动 Node 服务
  const originalUrl = import.meta.env.VITE_UL_CONF_URL!
  await handleNodeServer(serverPath, originalUrl)

  // 加载主窗口 URL
  const finalUrl =
    getActualPort() !== null
      ? buildUrlWithPort(originalUrl, getActualPort()!)
      : originalUrl

  await loadMainWindowUrl(finalUrl)
}

/**
 * 清理程序数据
 */
export const deleteAppData = async (): Promise<void> => {
  log.info('清理程序目录...')
  cleanupServerProcess()
  await deleteDir(extract_dir_name)
  await deleteDir('dist.zip')
}

/**
 * 处理 dist.zip 文件
 * 包括：首次下载、检查更新、解压
 */
const handleDistZip = async (): Promise<void> => {
  log.debug('[handleDistZip] 开始执行...')
  let clearDistPath = false

  const appDir = getAppDir()
  const distZipPath = join(appDir, 'dist.zip')
  const distDir = join(appDir, extract_dir_name)
  const serverPath = join(distDir, 'server', 'index.mjs')

  // 从配置中读取 distVersion，如果不存在则设置为 1
  let distVersion = getConfValue('distVersion', 1)
  log.debug(`[handleDistZip] 当前版本号: ${distVersion}`)

  try {
    // 如果不存在 dist.zip，首次下载
    if (!existsSync(distZipPath)) {
      log.info('[handleDistZip] dist.zip 不存在，开始首次下载...')
      const distUrl = `https://api.upgrade.toolsetlink.com/v1/file/download?fileKey=${import.meta.env.VITE_UL_CONF_FILEKEY!}`
      log.debug(`[handleDistZip] 下载URL: ${distUrl}`)
      await downloadFile(distUrl, distZipPath)
      log.info('[handleDistZip] 首次下载完成')
    } else {
      log.debug('[handleDistZip] dist.zip 已存在，检查更新...')
      clearDistPath = await checkUpdate(distVersion)
      log.debug(`[handleDistZip] 检查更新完成，clearDistPath: ${clearDistPath}`)
    }
  } catch (error) {
    log.error('[handleDistZip] 下载/检查更新阶段出错:', error)
    throw error
  }

  // 解压到 dist 文件夹
  log.debug('[handleDistZip] 进入解压阶段...')
  log.debug(
    `[handleDistZip] clearDistPath: ${clearDistPath}, serverPath存在: ${existsSync(serverPath)}`
  )

  if (clearDistPath || !existsSync(serverPath)) {
    if (clearDistPath) {
      log.debug('[handleDistZip] 开始清理dist文件夹...')
      try {
        await deleteDir(extract_dir_name)
        log.debug('[handleDistZip] 清理dist文件夹完成')
      } catch (error) {
        log.error('[handleDistZip] 清理dist文件夹出错:', error)
        throw error
      }
    }

    log.debug('[handleDistZip] 开始解压程序到: ' + distDir)

    if (!existsSync(distDir)) {
      log.debug('[handleDistZip] distDir 不存在，创建目录...')
      try {
        mkdirSync(distDir, { recursive: true })
        log.debug('[handleDistZip] 目录创建完成')
      } catch (error) {
        log.error('[handleDistZip] 创建目录出错:', error)
        throw error
      }
    }

    log.debug('[handleDistZip] 开始调用 extractZip4unzipit...')
    log.debug(`[handleDistZip] 解压参数 - 源文件: ${distZipPath}, 目标目录: ${distDir}`)

    try {
      await extractZip4unzipit(distZipPath, distDir)
      log.info('[handleDistZip] extractZip4unzipit 解压完成')
    } catch (error) {
      log.error('[handleDistZip] extractZip4unzipit 解压出错:', error)
      throw error
    }
  } else {
    log.debug('[handleDistZip] 程序目录已存在，跳过解压')
  }

  log.debug('[handleDistZip] 执行完成')
}
