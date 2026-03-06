import { join, dirname } from 'path'
import https from 'https'
import http from 'http'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
  accessSync,
  readFileSync,
  writeFileSync,
  createWriteStream
} from 'fs'
import log from 'electron-log/main'
import { unzip } from 'unzipit'
import { getAppDir } from './path-utils'

// 下载进度回调类型
export type DownloadProgressCallback = (visible: boolean, progress: number, isDownloading: boolean) => void

// 全局下载进度回调（由外部设置）
let downloadProgressCallback: DownloadProgressCallback | null = null

/** 设置下载进度回调 */
export const setDownloadProgressCallback = (callback: DownloadProgressCallback | null): void => {
  downloadProgressCallback = callback
}

// ==================== 目录和路径 ====================

/** 获取程序运行目录 */
export { getAppDir }

/** 确保目录存在（不存在则创建） */
export const ensureDir = (dirPath: string): void => {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true })
}

// ==================== 文件删除 ====================

/** 递归删除目录或文件 */
export const deleteDir = async (folderName: string): Promise<void> => {
  const targetPath = join(getAppDir(), folderName)
  if (!existsSync(targetPath)) return

  const stat = statSync(targetPath)
  if (stat.isDirectory()) {
    for (const file of readdirSync(targetPath)) {
      const curPath = join(targetPath, file)
      statSync(curPath).isDirectory()
        ? await deleteDir(join(folderName, file))
        : unlinkSync(curPath)
    }
    rmdirSync(targetPath)
  } else {
    unlinkSync(targetPath)
  }
}

// ==================== ZIP 解压 ====================

/** 使用 unzipit 解压 ZIP 文件 */
export const extractZip4unzipit = async (zipPath: string, extractPath: string): Promise<void> => {
  try {
    log.info(`[解压] 开始: ${zipPath} -> ${extractPath}`)

    // 检查并读取 ZIP 文件
    accessSync(zipPath)
    const zipBuffer = readFileSync(zipPath)
    const { entries } = await unzip(zipBuffer)

    // 解压每个条目
    for (const [entryPath, entry] of Object.entries(entries)) {
      const targetPath = join(extractPath, entryPath)
      // @ts-ignore
      if (entry.isDirectory) {
        ensureDir(targetPath)
      } else {
        ensureDir(dirname(targetPath))
        // @ts-ignore
        writeFileSync(targetPath, Buffer.from(await entry.arrayBuffer()))
      }
    }

    log.info(`[解压] 完成: ${extractPath}`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误'
    log.error('[解压] 失败:', msg)
    throw new Error(`解压失败: ${msg}`)
  }
}

// ==================== 文件下载 ====================

/** 下载配置 */
const DL_CONFIG = { MAX_RETRIES: 3, TIMEOUT_MS: 300000 }

/** 下载文件 */
export const downloadFile = async (url: string, destPath: string, retryCount = 0): Promise<void> => {
  log.info(`[下载] ${url} -> ${destPath} (重试: ${retryCount}/${DL_CONFIG.MAX_RETRIES})`)

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http
    const file = createWriteStream(destPath)
    let downloaded = 0, total = 0, timeoutId: NodeJS.Timeout

    const cleanup = () => {
      clearTimeout(timeoutId)
      try { file.close() } catch { }
    }

    const sendProgress = (visible: boolean, progress: number, isDownloading: boolean) =>
      downloadProgressCallback?.(visible, progress, isDownloading)

    const retry = () => retryCount < DL_CONFIG.MAX_RETRIES
      ? downloadFile(url, destPath, retryCount + 1).then(resolve).catch(reject)
      : reject(new Error(`下载失败，已重试 ${DL_CONFIG.MAX_RETRIES} 次`))

    const setTimeout = () => {
      clearTimeout(timeoutId)
      timeoutId = global.setTimeout(() => { cleanup(); sendProgress(false, 0, false); retry() }, DL_CONFIG.TIMEOUT_MS)
    }

    file.on('error', (err) => { cleanup(); sendProgress(false, 0, false); retry() })
    sendProgress(true, 0, true)
    setTimeout()

    const req = protocol.get(url, { rejectUnauthorized: false, timeout: DL_CONFIG.TIMEOUT_MS }, (res) => {
      // 处理重定向
      if ([301, 302].includes(res.statusCode!)) {
        cleanup()
        return downloadFile(res.headers.location!, destPath, retryCount).then(resolve).catch(reject)
      }

      if (res.statusCode !== 200) {
        cleanup()
        sendProgress(false, 0, false)
        return reject(new Error(`HTTP ${res.statusCode}`))
      }

      total = parseInt(res.headers['content-length']?.toString() || '0', 10)
      log.info(`[下载] 文件大小: ${(total / 1024 / 1024).toFixed(2)} MB`)

      res.on('data', (chunk: Buffer) => {
        downloaded += chunk.length
        setTimeout()
        sendProgress(true, total > 0 ? Math.round((downloaded / total) * 100) : 0, true)
      })

      res.on('error', () => { cleanup(); sendProgress(false, 0, false); retry() })
      res.pipe(file)

      file.on('finish', () => {
        cleanup()
        if (total > 0 && downloaded !== total) return retry()
        log.info(`[下载] 完成: ${destPath}`)
        sendProgress(true, 100, false)
        global.setTimeout(() => sendProgress(false, 100, false), 800)
        resolve()
      })
    })

    req.on('error', () => { cleanup(); sendProgress(false, 0, false); retry() })
    req.on('timeout', () => { req.destroy(); cleanup(); sendProgress(false, 0, false); retry() })
  })
}
