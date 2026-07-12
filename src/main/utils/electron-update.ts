import { app, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import { getConfValue } from './config'
import { sendInitProgress } from './window'
import log from 'electron-log/main'


const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

const getElectronUpdateFeedUrl = (): string => {
  const updUrl = getConfValue('VITE_UPD_URL', '', 'env') as string
  const updSlug = getConfValue('VITE_UPD_SLUG', '', 'env') as string

  if (!updUrl || !updSlug) {
    return ''
  }

  return `${trimTrailingSlash(updUrl)}/updates/${updSlug}/win32/latest/`
}

const formatBytes = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)}MB`

const removeAutoUpdaterListeners = (): void => {
  autoUpdater.removeAllListeners('checking-for-update')
  autoUpdater.removeAllListeners('update-available')
  autoUpdater.removeAllListeners('update-not-available')
  autoUpdater.removeAllListeners('download-progress')
  autoUpdater.removeAllListeners('update-downloaded')
  autoUpdater.removeAllListeners('error')
}

const registerAutoUpdaterListeners = (): Promise<void> => {
  removeAutoUpdaterListeners()

  return new Promise((resolve, reject) => {
    let finished = false

    const finish = (error?: Error): void => {
      if (finished) return
      finished = true
      removeAutoUpdaterListeners()

      if (error) {
        reject(error)
        return
      }
      resolve()
    }

    autoUpdater.on('checking-for-update', () => {
      log.info('[electron-update] checking for update...')
      sendInitProgress(1, '正在检查 Electron 更新...')
    })

    autoUpdater.on('update-available', (info) => {
      log.info(`[electron-update] update available: ${app.getVersion()} -> ${info.version}`)
      sendInitProgress(5, `发现新版本 ${info.version}，开始下载...`)
    })

    autoUpdater.on('update-not-available', () => {
      log.info('[electron-update] no update available')
      finish()
    })

    autoUpdater.on('download-progress', (progress) => {
      const percent = Number.isFinite(progress.percent) ? progress.percent : 0
      const pct = Math.min(95, Math.max(5, Math.round(percent * 0.9) + 5))
      const transferred = formatBytes(progress.transferred || 0)
      const total = progress.total ? `/${formatBytes(progress.total)}` : ''

      sendInitProgress(pct, `正在下载更新包 ${transferred}${total}`)
    })

    autoUpdater.on('update-downloaded', (info) => {
      log.info(`[electron-update] update downloaded: ${info.version}`)
      sendInitProgress(98, '下载完成，正在安装更新...')

      setImmediate(() => {
        autoUpdater.quitAndInstall(false, true)
        finish()
      })
    })

    autoUpdater.on('error', (error) => {
      log.error('[electron-update] autoUpdater error:', error)
      sendInitProgress(0, `更新失败: ${error.message}`)
      dialog.showErrorBox('更新失败', `Electron 更新失败: ${error.message}`)
      finish(error)
    })
  })
}

/**
 * 检查 Electron 更新，并在发现新版本后自动下载、自动安装。
 */
export const checkAndUpdate = async (): Promise<void> => {
  const feedUrl = getElectronUpdateFeedUrl()

  if (!feedUrl) {
    log.warn('[electron-update] VITE_UPD_URL 未配置')
    return
  }

  try {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.disableWebInstaller = true
    autoUpdater.logger = log
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: feedUrl
    })

    const updateFinished = registerAutoUpdaterListeners()

    log.info(`[electron-update] feed url: ${feedUrl}`)
    await autoUpdater.checkForUpdates()
    await updateFinished
  } catch (error) {
    removeAutoUpdaterListeners()
    log.error('[electron-update] check and update failed:', error)
    sendInitProgress(0, `检查更新失败: ${(error as Error).message}`)
  }
}
