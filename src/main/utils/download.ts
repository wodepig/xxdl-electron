import https from 'https'
import http from 'http'
import { createWriteStream } from 'fs'
import log from 'electron-log/main'
import { sendDownloadProgress } from './window'

/**
 * 下载配置常量
 */
const DOWNLOAD_CONFIG = {
  MAX_RETRIES: 3,
  TIMEOUT_MS: 300000 // 5分钟超时
} as const

/**
 * 下载文件
 * @param url 下载地址
 * @param destPath 保存路径
 * @param retryCount 当前重试次数
 * @returns Promise<void>
 */
export const downloadFile = async (
  url: string,
  destPath: string,
  retryCount = 0
): Promise<void> => {
  log.info(`[downloadFile] 开始下载，URL: ${url}`)
  log.info(`[downloadFile] 目标路径: ${destPath}`)
  log.info(`[downloadFile] 当前重试次数: ${retryCount}/${DOWNLOAD_CONFIG.MAX_RETRIES}`)

  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https:')
    const protocol = isHttps ? https : http

    let file: ReturnType<typeof createWriteStream>
    let downloadedBytes = 0
    let totalBytes = 0
    let lastProgressLog = Date.now()
    let timeoutId: NodeJS.Timeout

    // 清理函数
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
      try {
        if (file) file.close()
      } catch (e) {
        // ignore
      }
    }

    // 设置超时
    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        log.error(
          `[downloadFile] 下载超时 (${DOWNLOAD_CONFIG.TIMEOUT_MS}ms)，已下载: ${downloadedBytes}/${totalBytes} bytes`
        )
        cleanup()
        sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })

        // 尝试重试
        if (retryCount < DOWNLOAD_CONFIG.MAX_RETRIES) {
          log.info(`[downloadFile] 尝试第 ${retryCount + 1} 次重试...`)
          downloadFile(url, destPath, retryCount + 1).then(resolve).catch(reject)
        } else {
          reject(new Error(`下载超时，已重试 ${DOWNLOAD_CONFIG.MAX_RETRIES} 次`))
        }
      }, DOWNLOAD_CONFIG.TIMEOUT_MS)
    }

    try {
      file = createWriteStream(destPath)
      sendDownloadProgress({ visible: true, progress: 0, isDownloading: true })
      resetTimeout()
    } catch (error) {
      log.error('[downloadFile] 创建文件流失败:', error)
      reject(error)
      return
    }

    // 对于 HTTPS 请求，忽略证书验证错误
    const requestOptions: https.RequestOptions = isHttps
      ? {
          rejectUnauthorized: false,
          timeout: DOWNLOAD_CONFIG.TIMEOUT_MS
        }
      : {
          timeout: DOWNLOAD_CONFIG.TIMEOUT_MS
        }

    log.debug(`[downloadFile] 使用 ${isHttps ? 'HTTPS' : 'HTTP'} 协议下载`)

    const req = protocol.get(url, requestOptions, (response) => {
      log.debug(`[downloadFile] 收到响应，状态码: ${response.statusCode}`)

      if (response.statusCode === 301 || response.statusCode === 302) {
        log.debug(`[downloadFile] 检测到重定向，新URL: ${response.headers.location}`)
        cleanup()
        downloadFile(response.headers.location!, destPath, retryCount).then(resolve).catch(reject)
        return
      }

      if (response.statusCode !== 200) {
        cleanup()
        sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })
        reject(new Error(`下载失败: HTTP ${response.statusCode}`))
        return
      }

      const contentLengthHeader = response.headers['content-length']
      totalBytes = contentLengthHeader
        ? parseInt(
            Array.isArray(contentLengthHeader) ? contentLengthHeader[0] : contentLengthHeader,
            10
          )
        : 0
      log.info(
        `[downloadFile] 文件总大小: ${totalBytes} bytes (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`
      )

      response.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length
        resetTimeout() // 重置超时计时器

        // 每5秒或每10%打印一次进度日志
        const now = Date.now()
        const progress =
          totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0

        if (now - lastProgressLog > 5000 || progress % 10 === 0) {
          lastProgressLog = now
        }

        sendDownloadProgress({ visible: true, progress, isDownloading: true })
      })

      response.on('error', (err) => {
        log.error('[downloadFile] 响应流错误:', err)
        cleanup()
        sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })

        // 尝试重试
        if (retryCount < DOWNLOAD_CONFIG.MAX_RETRIES) {
          log.debug(`[downloadFile] 响应错误，尝试第 ${retryCount + 1} 次重试...`)
          downloadFile(url, destPath, retryCount + 1).then(resolve).catch(reject)
        } else {
          reject(err)
        }
      })

      response.pipe(file)

      file.on('finish', () => {
        cleanup()
        log.info(`[downloadFile] 文件写入完成: ${destPath}`)
        log.info(`[downloadFile] 实际下载大小: ${downloadedBytes} bytes`)

        // 验证文件大小
        if (totalBytes > 0 && downloadedBytes !== totalBytes) {
          log.error(`[downloadFile] 文件大小不匹配! 期望: ${totalBytes}, 实际: ${downloadedBytes}`)

          if (retryCount < DOWNLOAD_CONFIG.MAX_RETRIES) {
            log.debug(`[downloadFile] 文件不完整，尝试第 ${retryCount + 1} 次重试...`)
            downloadFile(url, destPath, retryCount + 1).then(resolve).catch(reject)
            return
          }
        }

        sendDownloadProgress({ visible: true, progress: 100, isDownloading: false })
        setTimeout(() => {
          sendDownloadProgress({ visible: false, progress: 100, isDownloading: false })
        }, 800)
        resolve()
      })

      file.on('error', (err) => {
        log.error('[downloadFile] 文件写入错误:', err)
        cleanup()
        sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })

        if (retryCount < DOWNLOAD_CONFIG.MAX_RETRIES) {
          log.debug(`[downloadFile] 写入错误，尝试第 ${retryCount + 1} 次重试...`)
          downloadFile(url, destPath, retryCount + 1).then(resolve).catch(reject)
        } else {
          reject(err)
        }
      })
    })

    req.on('error', (err: NodeJS.ErrnoException) => {
      log.error('[downloadFile] 请求错误:', err.message)
      cleanup()
      sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })

      // 检查是否是证书相关错误
      if (err.message && (err.message.includes('certificate') || err.message.includes('CERT'))) {
        log.debug(`[downloadFile] 检测到证书错误，尝试重试...`)
        if (isHttps && retryCount < DOWNLOAD_CONFIG.MAX_RETRIES) {
          downloadFile(url, destPath, retryCount + 1).then(resolve).catch(reject)
          return
        }
      }

      // 尝试重试
      if (retryCount < DOWNLOAD_CONFIG.MAX_RETRIES) {
        log.debug(`[downloadFile] 请求错误，尝试第 ${retryCount + 1} 次重试...`)
        downloadFile(url, destPath, retryCount + 1).then(resolve).catch(reject)
      } else {
        reject(err)
      }
    })

    req.on('timeout', () => {
      log.error('[downloadFile] 请求超时')
      req.destroy()
      cleanup()
      sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })

      if (retryCount < DOWNLOAD_CONFIG.MAX_RETRIES) {
        log.debug(`[downloadFile] 超时，尝试第 ${retryCount + 1} 次重试...`)
        downloadFile(url, destPath, retryCount + 1).then(resolve).catch(reject)
      } else {
        reject(new Error('下载请求超时'))
      }
    })
  })
}
