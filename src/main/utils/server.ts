import { spawn, ChildProcess, execSync } from 'child_process'
import { dirname } from 'path'
import log from 'electron-log/main'
import { getConfValue, setConfValue, getEnvConf } from './config'
import { getWindowsByTitle } from './window'
import { openBrowserWithType } from './browser'
import { extractPortFromUrl, isPortInUse, findAvailablePort, buildUrlWithPort, waitForServer } from './port'

// 启动 Node 服务
let serverProcess: ChildProcess | null = null
let actualPort: number | null = null

/**
 * 获取当前实际使用的端口
 * @returns 端口号
 */
export const getActualPort = (): number | null => actualPort

/**
 * 清理服务器进程
 */
export const cleanupServerProcess = (): void => {
  if (serverProcess) {
    try {
      console.log('正在停止服务器进程...')
      // 尝试优雅关闭
      if (process.platform === 'win32') {
        // Windows 上使用 taskkill 强制关闭
        try {
          const pid = serverProcess.pid
          if (pid) {
            execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' })
          }
        } catch (error) {
          // 如果 taskkill 失败，使用 kill
          serverProcess.kill('SIGTERM')
        }
      } else {
        // Unix 系统使用 kill
        serverProcess.kill('SIGTERM')
      }

      // 等待进程退出
      setTimeout(() => {
        if (serverProcess && !serverProcess.killed) {
          serverProcess.kill('SIGKILL')
        }
        serverProcess = null
      }, 2000)
    } catch (error) {
      console.error('清理服务器进程失败:', error)
      serverProcess = null
    }
  }
}

/**
 * 启动 Node 服务
 * @param serverPath 服务入口文件路径
 * @param port 可选的端口号
 * @returns Promise<void>
 */
const startServer = async (serverPath: string, port?: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const electronBinary = process.execPath
    log.info(`启动程序中: ${electronBinary} ${serverPath}`)

    // 准备环境变量
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      ELECTRON_RUN_AS_NODE: '1'
    }

    if (port) {
      env.PORT = port.toString()
      actualPort = port
    }

    serverProcess = spawn(electronBinary, [serverPath], {
      cwd: dirname(serverPath),
      stdio: 'pipe',
      env,
      shell: false
    })

    // 设置子进程输出的编码
    if (serverProcess.stdout) {
      serverProcess.stdout.setEncoding('utf8')
    }
    if (serverProcess.stderr) {
      serverProcess.stderr.setEncoding('utf8')
    }

    serverProcess.stdout?.on('data', (data) => {
      // 确保输出使用 UTF-8 编码
      const output = Buffer.isBuffer(data) ? data.toString('utf8') : String(data)
      log.info(output)
    })

    serverProcess.stderr?.on('data', (data) => {
      // 确保错误输出使用 UTF-8 编码
      const output = Buffer.isBuffer(data) ? data.toString('utf8') : String(data)
      log.error(output)
    })

    serverProcess.on('error', (error) => {
      log.info('启动服务器失败:' + error.message)
      reject(error)
    })

    // 等待一段时间确保服务启动
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        log.info('服务器启动成功')
        resolve()
      } else {
        reject(new Error('服务器启动失败'))
      }
    }, 2000)
  })
}

/**
 * 处理 Node 服务启动流程
 * @param serverPath 服务入口文件路径
 * @param originalUrl 原始 URL
 */
export const handleNodeServer = async (serverPath: string, originalUrl: string): Promise<void> => {
  // 从 URL 中提取端口
  let targetPort = extractPortFromUrl(originalUrl)
  let targetUrl = originalUrl

  // 检查端口是否被占用
  log.info(`检查端口 ${targetPort} 是否可用...`)
  const portInUse = await isPortInUse(targetPort)

  if (portInUse) {
    log.warn(`端口 ${targetPort} 已被占用，正在查找可用端口...`)
    // 查找可用端口（从原端口+1开始）
    const newPort = await findAvailablePort(targetPort + 1)
    log.info(`找到可用端口: ${newPort}`)
    targetPort = newPort
    targetUrl = buildUrlWithPort(originalUrl, newPort)
    log.info(`使用新端口启动程序: ${targetUrl}`)
  } else {
    log.info(`端口 ${targetPort} 可用`)
  }

  // 启动服务器（传入端口）
  await startServer(serverPath, targetPort)

  // 等待服务启动成功后加载地址
  log.info(`等待程序就绪: ${targetUrl}, 正在打开...`)
  await waitForServer(targetUrl)

  // 标记 Node 服务已启动
  setConfValue('nodeStart', 'true')
}

/**
 * 加载主窗口 URL
 * @param targetUrl 目标 URL
 */
export const loadMainWindowUrl = async (targetUrl: string): Promise<void> => {
  const mainWindow = getWindowsByTitle(getEnvConf('VITE_APP_EXE_NAME'))
  if (!mainWindow) return

  // 保存最终 URL
  setConfValue('finalUrl', targetUrl)

  // 检查是否需要自动打开浏览器
  const startupActions = getConfValue('startupActions', [], 'settings') as string[]
  if (startupActions.includes('openBrowser')) {
    const browserType = getConfValue('browserType', 'default', 'settings') as string
    openBrowserWithType(targetUrl, browserType)
    console.log('默认浏览器加载')
  }

  // 延迟后加载 URL 到主窗口
  await sleep(100)
  const currentWindow = getWindowsByTitle(getEnvConf('VITE_APP_EXE_NAME'))
  if (currentWindow && !currentWindow.isDestroyed()) {
    try {
      currentWindow.loadURL(targetUrl)
    } catch (error) {
      console.error('加载URL失败:', error)
    }
  }
}

/**
 * 延迟函数
 * @param ms 毫秒数
 * @returns Promise
 */
export const sleep = async (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
