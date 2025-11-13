import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { createWriteStream } from 'fs'
import https from 'https'
import http from 'http'
 
import { spawn, ChildProcess, execSync } from 'child_process'
import { createServer } from 'net'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { getFileUpgrade } from './ulUtils'
import {fileCheckVersion} from './up-utils'
import icon from '../../resources/icon.png?asset'
import StorePkg from 'electron-store';
//@ts-ignore
const Store = StorePkg.default || StorePkg;
const store = new Store();
// 使用 require 方式导入解压库
const AdmZip = require('adm-zip')

// 使用 import 方式导入 electron-store（主进程中使用）
 



let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 环境变量加载
const getEnvPath = (): string => {
  // 在开发环境中使用项目根目录，在生产环境中使用app路径
  if (is.dev) {
    return join(__dirname, '../../.env')
  }
  return join(app.getAppPath(), '.env')
}

const parseEnvFile = (content: string): void => {
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    // 跳过注释和空行
    if (!trimmed || trimmed.startsWith('#')) continue
    
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      // 加载到 process.env
      process.env[key] = value
    }
  }
}

const loadEnvFile = (): void => {
  const envPath = getEnvPath()
  if (!existsSync(envPath)) {
    console.warn('.env 文件不存在:', envPath)
    return
  }
  
  try {
    const content = readFileSync(envPath, 'utf-8')
    parseEnvFile(content)
    console.log('环境变量加载成功')
  } catch (error) {
    console.error('读取 .env 文件失败:', error)
  }
}

 

const checkRequiredEnvVars = (): { valid: boolean; missing: string[] } => {
  const requiredVars = ['UL_CONF_AK', 'UL_CONF_SK', 'UL_CONF_FILEKEY', 'UL_CONF_URL']
  const missing: string[] = []
  
  for (const varName of requiredVars) {
    const value = process.env[varName]
    console.log(varName,value);
    
    if (!value || value.trim() === '') {
      missing.push(varName)
    }
  }
  
  return {
    valid: missing.length === 0,
    missing
  }
}

const showConfigError = (missingVars: string[]): void => {
  const message = `缺少必要的环境变量配置：\n\n${missingVars.map(v => `- ${v}`).join('\n')}\n\n请在项目根目录的 .env 文件中配置这些变量。`
  
  dialog.showErrorBox('配置错误', message)
  app.quit()
}

 

// 获取程序运行目录
const getAppDir = (): string => {
  if (is.dev) {
    return join(__dirname, '../../')
  }
  return app.getAppPath()
}

// 下载文件
const downloadFile = async (url: string, destPath: string): Promise<void> => {
  console.log(`开始下载新版本...`)
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http
    
    const file = createWriteStream(destPath)
    
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // 处理重定向
        downloadFile(response.headers.location!, destPath).then(resolve).catch(reject)
        return
      }
      
      if (response.statusCode !== 200) {
        file.close()
        reject(new Error(`下载失败: HTTP ${response.statusCode}`))
        return
      }
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        console.log(`文件下载完成: ${destPath}`)
        resolve()
      })
      
      file.on('error', (err) => {
        file.close()
        reject(err)
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

// 解压 ZIP 文件
const extractZip = async (zipPath: string, extractTo: string): Promise<void> => {
  try {
    const zip = new AdmZip(zipPath)
    zip.extractAllTo(extractTo, true)
    console.log(`文件解压完成: ${extractTo}`)
  } catch (error) {
    throw new Error(`解压失败: ${(error as Error).message}`)
  }
}

// 启动 Node 服务
let serverProcess: ChildProcess | null = null
let actualPort: number | null = null

// 检查端口是否被占用
const isPortInUse = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = createServer()
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true) // 端口被占用
      } else {
        resolve(false)
      }
    })
    
    server.once('listening', () => {
      server.close()
      resolve(false) // 端口可用
    })
    
    server.listen(port)
  })
}

// 查找可用端口
const findAvailablePort = async (startPort: number, maxAttempts: number = 100): Promise<number> => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    const inUse = await isPortInUse(port)
    if (!inUse) {
      return port
    }
  }
  throw new Error(`无法找到可用端口，已尝试 ${maxAttempts} 次`)
}

// 从 URL 中提取端口
const extractPortFromUrl = (url: string): number => {
  try {
    const urlObj = new URL(url)
    if (urlObj.port) {
      return parseInt(urlObj.port, 10)
    }
    // 如果没有指定端口，根据协议返回默认端口
    return urlObj.protocol === 'https:' ? 443 : 80
  } catch (error) {
    throw new Error(`无效的 URL: ${url}`)
  }
}

// 构建新的 URL（替换端口）
const buildUrlWithPort = (originalUrl: string, newPort: number): string => {
  try {
    const urlObj = new URL(originalUrl)
    urlObj.port = newPort.toString()
    return urlObj.toString()
  } catch (error) {
    throw new Error(`无法构建新 URL: ${originalUrl}`)
  }
}

const startServer = async (serverPath: string, port?: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    // 在 Windows 上，需要找到 node.exe
    // Electron 内置了 Node.js，但我们需要使用系统的 Node.js 或者 Electron 的 Node
    // 实际上，我们可以直接使用 node 命令，或者使用 Electron 的 Node
    const nodeExecutable = process.platform === 'win32' 
      ? join(dirname(process.execPath), 'node.exe')
      : join(dirname(process.execPath), 'node')
    
    // 如果 Electron 的 node 不存在，尝试使用系统的 node
    const useSystemNode = !existsSync(nodeExecutable)
    const nodeCmd = useSystemNode ? 'node' : nodeExecutable
    
    console.log(`启动服务器: ${nodeCmd} ${serverPath}`)
    
    // 准备环境变量
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      // 设置环境变量确保子进程使用 UTF-8 编码
      PYTHONIOENCODING: 'utf-8',
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8'
    }
    
    // 如果指定了端口，设置到环境变量中（服务器可能需要 PORT 环境变量）
    if (port) {
      env.PORT = port.toString()
      actualPort = port
    }
    
    serverProcess = spawn(nodeCmd, [serverPath], {
      cwd: dirname(serverPath),
      stdio: 'pipe',
      shell: process.platform === 'win32',
      env
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
      // 使用 Buffer 确保正确输出中文
      process.stdout.write(Buffer.from(output, 'utf8'))
    })
    
    serverProcess.stderr?.on('data', (data) => {
      // 确保错误输出使用 UTF-8 编码
      const output = Buffer.isBuffer(data) ? data.toString('utf8') : String(data)
      // 使用 Buffer 确保正确输出中文
      process.stderr.write(Buffer.from(output, 'utf8'))
    })
    
    serverProcess.on('error', (error) => {
      console.error('启动服务器失败:', error)
      reject(error)
    })
    
    // 等待一段时间确保服务启动
    setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        console.log('服务器启动成功')
        resolve()
      } else {
        reject(new Error('服务器启动失败'))
      }
    }, 2000)
  })
}

// 等待服务就绪
const waitForServer = async (url: string, maxRetries: number = 30): Promise<void> => {
  const urlObj = new URL(url)
  const hostname = urlObj.hostname
  const port = urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80)
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const protocol = urlObj.protocol === 'https:' ? https : http
        const req = protocol.get(`${urlObj.protocol}//${hostname}:${port}`, (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            resolve()
          } else {
            reject(new Error(`HTTP ${res.statusCode}`))
          }
        })
        req.on('error', reject)
        req.setTimeout(2000, () => {
          req.destroy()
          reject(new Error('请求超时'))
        })
      })
      console.log('服务已就绪')
      return
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error('服务启动超时')
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

/**
 * 应用初始化方法
 * 在环境变量检查通过后执行
 */
const initialize = async (): Promise<void> => {
  try {
    const appDir = getAppDir()
    const distZipPath = join(appDir, 'dist.zip')
    const distDir = join(appDir, 'dist')
    const serverPath = join(distDir, 'server', 'index.mjs')
    
    // 1. 检查并下载 dist.zip
    // 初始化配置存储
    // const store = new Store()
    
    // 从配置中读取 distVersion，如果不存在则设置为 1
    let distVersion = store.get('distVersion', 1) as number
    console.log(`当前版本号: ${distVersion}`)
    
    let distUrl = `https://api.upgrade.toolsetlink.com/v1/file/download?fileKey=${process.env.UL_CONF_FILEKEY!}`
    
    // 如果不存在 dist.zip，首次下载
    if (!existsSync(distZipPath)) {
      console.log('dist.zip 不存在，首次下载...')
      
      await downloadFile(distUrl, distZipPath)
      // 首次下载后，将版本号设置为 1（如果还没有设置）
      if (distVersion === 1) {
        store.set('distVersion', 1)
        console.log('已保存初始版本号: 1')
      }
    } else {
      console.log('dist.zip 存在，检查更新...')
      // 使用当前版本号检查更新
      const res = await getFileUpgrade(
        process.env.UL_CONF_AK!,
        process.env.UL_CONF_SK!,
        process.env.UL_CONF_FILEKEY!,
        distVersion
      )
      console.log(JSON.stringify(res))
      
      if (res && res.code === 200) {
        // 检查是否有新版本
        const newVersionCode = res.data.versionCode
        if (newVersionCode > distVersion) {
          console.log(`发现新版本: ${newVersionCode} (当前版本: ${distVersion})`)
          distUrl = res.data.urlPath
          await downloadFile(distUrl, distZipPath)
          
          // 更新版本号并持久化
          distVersion = newVersionCode
          store.set('distVersion', newVersionCode)
          console.log(`已更新版本号并保存: ${newVersionCode}`)
        } else {
          console.log(`当前已是最新版本: ${distVersion}`)
        }
      } else if (res && res.code === 0){
        console.log('没有新版本')
      }else{
        console.log('检查更新失败，使用当前版本')
      }
    }
    
    // // 2. 解压到 dist 文件夹
    // if (!existsSync(serverPath)) {
    //   console.log('开始解压 dist.zip...')
    //   if (!existsSync(distDir)) {
    //     mkdirSync(distDir, { recursive: true })
    //   }
    //   await extractZip(distZipPath, distDir)
    // } else {
    //   console.log('dist 文件夹已存在，跳过解压')
    // }
    
    // // 3. 检测端口占用并启动 Node 服务
    // if (!existsSync(serverPath)) {
    //   throw new Error(`服务器文件不存在: ${serverPath}`)
    // }
    
    // // 从 URL 中提取端口
    // const originalUrl = process.env.UL_CONF_URL!
    // let targetPort = extractPortFromUrl(originalUrl)
    // let targetUrl = originalUrl
    
    // // 检查端口是否被占用
    // console.log(`检查端口 ${targetPort} 是否可用...`)
    // const portInUse = await isPortInUse(targetPort)
    
    // if (portInUse) {
    //   console.log(`端口 ${targetPort} 已被占用，正在查找可用端口...`)
    //   // 查找可用端口（从原端口+1开始）
    //   const newPort = await findAvailablePort(targetPort + 1)
    //   console.log(`找到可用端口: ${newPort}`)
    //   targetPort = newPort
    //   targetUrl = buildUrlWithPort(originalUrl, newPort)
    //   console.log(`使用新端口启动服务: ${targetUrl}`)
    // } else {
    //   console.log(`端口 ${targetPort} 可用`)
    // }
    
    // // 启动服务器（传入端口）
    // await startServer(serverPath, targetPort)
    
    // // 4. 等待服务启动成功后加载地址
    // console.log(`等待服务就绪: ${targetUrl}`)
    // await waitForServer(targetUrl)
    
    // 更新窗口加载地址（窗口会在 initialize 之后创建）
    // 在 createWindow 之后会调用 loadURL
    
    console.log('应用初始化完成')
  } catch (error) {
    console.error('应用初始化失败:', error)
    dialog.showErrorBox('初始化错误', `应用初始化失败: ${(error as Error).message}`)
    app.quit()
  }
}

// 清理服务器进程的函数
const cleanupServerProcess = (): void => {
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

// 应用退出时清理服务器进程
app.on('before-quit', () => {
  cleanupServerProcess()
})

// 窗口关闭时也清理
app.on('window-all-closed', () => {
  cleanupServerProcess()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 进程退出时清理
process.on('exit', () => {
  cleanupServerProcess()
})

// 捕获未处理的异常和退出信号
process.on('SIGINT', () => {
  cleanupServerProcess()
  process.exit(0)
})

process.on('SIGTERM', () => {
  cleanupServerProcess()
  process.exit(0)
})

// 设置控制台编码为 UTF-8（解决中文乱码问题）
if (process.platform === 'win32') {
  // Windows 上设置控制台代码页为 UTF-8
  try {
    execSync('chcp 65001 >nul 2>&1', { shell: 'cmd.exe' })
  } catch (error) {
    // 忽略错误，继续执行
  }
}

// 设置 stdout 和 stderr 的编码
if (process.stdout.setDefaultEncoding) {
  process.stdout.setDefaultEncoding('utf8')
}
if (process.stderr.setDefaultEncoding) {
  process.stderr.setDefaultEncoding('utf8')
}

// 重写 console.log 和 console.error 确保中文正确输出
const originalLog = console.log
const originalError = console.error

console.log = (...args: any[]) => {
  const message = args.map(arg => {
    if (typeof arg === 'string') {
      return Buffer.from(arg, 'utf8').toString('utf8')
    }
    return arg
  }).join(' ')
  originalLog(message)
}

console.error = (...args: any[]) => {
  const message = args.map(arg => {
    if (typeof arg === 'string') {
      return Buffer.from(arg, 'utf8').toString('utf8')
    }
    return arg
  }).join(' ')
  originalError(message)
}

// 在应用启动时加载环境变量
loadEnvFile()

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // 检查必需的环境变量
  const envCheck = checkRequiredEnvVars()
  if (!envCheck.valid) {
    showConfigError(envCheck.missing)
    return
  }

  // 执行初始化操作
  await initialize()

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()
  
  // 初始化完成后加载目标 URL（使用实际使用的端口）
  if (mainWindow) {
    // 如果端口被切换了，使用新的 URL
    const finalUrl = actualPort ? buildUrlWithPort(process.env.UL_CONF_URL!, actualPort) : process.env.UL_CONF_URL!
    mainWindow.loadURL(finalUrl)
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
