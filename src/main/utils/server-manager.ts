/**
 * 服务器管理模块
 *
 * 功能说明：
 * 1. 端口管理 - 提供端口检查、查找可用端口、构建 URL 等功能
 * 2. 服务器管理 - 启动/停止 Node.js 服务进程，管理服务器生命周期
 *
 * 使用场景：
 * - 启动 Nuxt/Next 等全栈应用的服务端
 * - 检查端口占用情况并自动切换可用端口
 * - 等待服务就绪后加载到主窗口
 *
 * @module server-manager
 */

import { spawn, ChildProcess, execSync } from 'child_process'
import { dirname } from 'path'
import { createServer } from 'net'
import https from 'https'
import http from 'http'
import log from 'electron-log/main'
import { getConfValue, setConfValue, getEnvConf } from './config'
import { getWindowsByTitle } from './window'
import { openBrowserWithType } from './browser'

// 默认端口
const DEFAULT_PORTS = { HTTP: 80, HTTPS: 443 }

// 启动 Node 服务
let serverProcess: ChildProcess | null = null
let actualPort: number | null = null

// ==================== 端口管理 ====================

/** 从 URL 中提取端口 */
export const extractPortFromUrl = (url: string): number => {
  try {
    const { port, protocol } = new URL(url)
    return port ? parseInt(port, 10) : (protocol === 'https:' ? DEFAULT_PORTS.HTTPS : DEFAULT_PORTS.HTTP)
  } catch {
    throw new Error(`无效的 URL: ${url}`)
  }
}

/** 在指定 host 上检查端口 */
export const checkPortOnHost = (port: number, host: string): Promise<boolean> =>
  new Promise((resolve) => {
    const server = createServer()
      .once('error', (err: NodeJS.ErrnoException) => resolve(err.code === 'EADDRINUSE' || err.code === 'EACCES'))
      .once('listening', () => { server.close(); resolve(false) })
      .listen(port, host)
  })

/** 检查端口是否被占用（检查 127.0.0.1、0.0.0.0、::1 和 ::） */
export const isPortInUse = async (port: number): Promise<boolean> => {
  const results = await Promise.all(['127.0.0.1', '0.0.0.0', '::1', '::'].map(host => checkPortOnHost(port, host)))
  return results.includes(true)
}

/** 查找可用端口 */
export const findAvailablePort = async (startPort: number, maxAttempts = 100): Promise<number> => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    if (!(await isPortInUse(port))) return port
  }
  throw new Error(`无法找到可用端口，已尝试 ${maxAttempts} 次`)
}

/** 构建新的 URL（替换端口） */
export const buildUrlWithPort = (originalUrl: string, newPort: number): string => {
  try {
    const url = new URL(originalUrl)
    url.port = String(newPort)
    return url.toString()
  } catch {
    throw new Error(`无法构建新 URL: ${originalUrl}`)
  }
}

/** 等待服务就绪 */
export const waitForServer = async (url: string, maxRetries = 30): Promise<void> => {
  const { hostname, port, protocol } = new URL(url)
  const client = protocol === 'https:' ? https : http
  const targetPort = port || (protocol === 'https:' ? DEFAULT_PORTS.HTTPS : DEFAULT_PORTS.HTTP)

  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = client.get(`${protocol}//${hostname}:${targetPort}`, (res) => {
          res.statusCode && [200, 404].includes(res.statusCode) ? resolve() : reject()
        })
        req.on('error', reject).setTimeout(2000, () => { req.destroy(); reject() })
      })
      log.info('程序已就绪')
      return
    } catch {
      if (i === maxRetries - 1) throw new Error('程序启动超时')
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}

// ==================== 服务器管理 ====================

/** 获取当前实际使用的端口 */
export const getActualPort = (): number | null => actualPort

/** 清理服务器进程 */
export const cleanupServerProcess = (): void => {
  if (!serverProcess) return

  try {
    console.log('正在停止服务器进程...')
    const pid = serverProcess.pid

    if (process.platform === 'win32' && pid) {
      try { execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' }) }
      catch { serverProcess.kill('SIGTERM') }
    } else {
      serverProcess.kill('SIGTERM')
    }

    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) serverProcess.kill('SIGKILL')
      serverProcess = null
    }, 2000)
  } catch (error) {
    console.error('清理服务器进程失败:', error)
    serverProcess = null
  }
}

/** 启动 Node 服务 */
const startServer = async (serverPath: string, port?: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const electronBinary = process.execPath
    log.info(`启动程序中: ${electronBinary} ${serverPath}`)

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      ELECTRON_RUN_AS_NODE: '1',
      ...(port && { PORT: port.toString() })
    }

    if (port) actualPort = port

    serverProcess = spawn(electronBinary, [serverPath], {
      cwd: dirname(serverPath),
      stdio: 'pipe',
      env,
      shell: false
    })

    serverProcess.stdout?.setEncoding('utf8').on('data', (data) => log.info(String(data)))
    serverProcess.stderr?.setEncoding('utf8').on('data', (data) => log.error(String(data)))

    serverProcess.on('error', (error) => reject(error))
    setTimeout(() => serverProcess && !serverProcess.killed ? resolve() : reject(new Error('服务器启动失败')), 2000)
  })
}

/** 处理 Node 服务启动流程 */
export const handleNodeServer = async (serverPath: string, originalUrl: string): Promise<void> => {
  let targetPort = extractPortFromUrl(originalUrl)
  let targetUrl = originalUrl

  log.info(`检查端口 ${targetPort} 是否可用...`)
  if (await isPortInUse(targetPort)) {
    log.warn(`端口 ${targetPort} 已被占用，正在查找可用端口...`)
    targetPort = await findAvailablePort(targetPort + 1)
    targetUrl = buildUrlWithPort(originalUrl, targetPort)
    log.info(`使用新端口启动程序: ${targetUrl}`)
  } else {
    log.info(`端口 ${targetPort} 可用`)
  }

  await startServer(serverPath, targetPort)
  log.info(`等待程序就绪: ${targetUrl}, 正在打开...`)
  await waitForServer(targetUrl)
  setConfValue('nodeStart', 'true')
}

/** 加载主窗口 URL */
export const loadMainWindowUrl = async (targetUrl: string): Promise<void> => {
  const mainWindow = getWindowsByTitle(getEnvConf('VITE_APP_EXE_NAME'))
  if (!mainWindow) return

  setConfValue('finalUrl', targetUrl)

  const startupActions = getConfValue('startupActions', [], 'settings') as string[]
  if (startupActions.includes('openBrowser')) {
    openBrowserWithType(targetUrl, getConfValue('browserType', 'default', 'settings') as string)
    console.log('默认浏览器加载')
  }

  await sleep(100)
  const currentWindow = getWindowsByTitle(getEnvConf('VITE_APP_EXE_NAME'))
  if (currentWindow?.isDestroyed()) return

  try { currentWindow?.loadURL(targetUrl) }
  catch (error) { console.error('加载URL失败:', error) }
}

/** 延迟函数 */
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

