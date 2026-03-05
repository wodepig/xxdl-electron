import { getWindowsByTitle } from '../windowUtils'
import { getEnvConf } from './config'

/**
 * 下载进度数据类型
 */
export type DownloadProgressPayload = {
  visible: boolean
  progress: number
  isDownloading: boolean
}

/**
 * 向日志窗口添加日志
 * @param msg 日志消息
 */
export const addLog2Vue = (msg: string): void => {
  const logWindows = getWindowsByTitle('日志')

  if (logWindows && !logWindows.isDestroyed()) {
    logWindows.webContents.send('log-message', msg)
  } else {
    console.log(msg)
  }
}

/**
 * 向主窗口发送最新日志消息
 * @param msg 日志消息
 */
export const sendLatestLogToMainWindow = (msg: string): void => {
  const mainWindow = getWindowsByTitle(getEnvConf('VITE_APP_EXE_NAME'))
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('latest-log', msg)
  }
}

/**
 * 发送初始化进度
 * @param progress 进度百分比 (0-100)
 * @param message 进度消息
 */
export const sendInitProgress = (progress: number, message: string): void => {
  const mainWindow = getWindowsByTitle(getEnvConf('VITE_APP_EXE_NAME'))
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('init-progress', { progress, message })
  }
}

/**
 * 发送下载进度
 * @param payload 下载进度数据
 */
export const sendDownloadProgress = (payload: DownloadProgressPayload): void => {
  sendInitProgress(payload.progress, '正在下载程序:')
}
