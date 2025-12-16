import { spawn, ChildProcess, execSync } from 'child_process'
import { is } from '@electron-toolkit/utils'
import { join, dirname } from 'path'
import { createServer } from 'net'
// 使用 require 方式导入解压库
const AdmZip = require('adm-zip')
import { getFileUpgrade } from './ulUtils'

import https from 'https'
import http from 'http'
import { readFileSync, existsSync, mkdirSync, createWriteStream, rmdirSync, unlinkSync, statSync, readdirSync } from 'fs'
import { app, BrowserWindow, dialog, shell } from 'electron'
// import StorePkg from 'electron-store';
import Store from 'electron-store';
//@ts-ignore
// const Store = StorePkg.default || StorePkg;
const store = new Store();
import { logBuffer, isRendererReady, downloadProgressBuffer, type DownloadProgressPayload } from './index'

// 启动 Node 服务
let serverProcess: ChildProcess | null = null
let actualPort: number | null = null
// 清理服务器进程的函数
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

// 环境变量加载
export const loadEnvFile = () => {
    const envPath = getEnvPath()
    if (!existsSync(envPath)) {
        addLog2Vue('错误:.env 文件不存在:' + envPath)
        return
    }

    try {
        const content = readFileSync(envPath, 'utf-8')
        parseEnvFile(content)
        addLog2Vue('环境变量加载成功')
    } catch (error: any) {
        addLog2Vue('读取 .env 文件失败:' + error.message)
    }
    // 检查必需的环境变量
    const envCheck = checkRequiredEnvVars()
    if (!envCheck.valid) {
        const message = `缺少必要的环境变量配置：\n\n${envCheck.missing.map(v => `- ${v}`).join('\n')}\n\n请在项目根目录的 .env 文件中配置这些变量。`

        dialog.showErrorBox('配置错误', message)
        return
    }
}

export const startInitialize = async () => {
    store.set('nodeStart', 'false')
    const appDir = getAppDir()
    const distDir = join(appDir, 'dist')
    const serverPath = join(distDir, 'server', 'index.mjs')
    await handleDistZip()
    // if (true) {
    //     return
    // }
    if (!existsSync(serverPath)) {
        addLog2Vue(`错误: 服务器文件不存在: ${serverPath}`)
        throw new Error(`服务器文件不存在: ${serverPath}`)
    }
    await handleNodeServer()

    // 更新窗口加载地址
    const mainWindow = getMainWindow()
    if (mainWindow) {
        const finalUrl = actualPort !== null && actualPort !== undefined ? buildUrlWithPort(import.meta.env.VITE_UL_CONF_URL!, actualPort as number) : import.meta.env.VITE_UL_CONF_URL!
        store.set('finalUrl', finalUrl)
        const settingsStore = new Store({ name: 'settings' })
        const startupActions = settingsStore.get('startupActions', []) as string[]
        if (startupActions.includes('openBrowser')) {
            openBrowserWithType(finalUrl, settingsStore.get('browserType', 'default') as string)
            console.log('默认浏览器加载');
        }
        await sleep(100)
        const currentWindow = getMainWindow()
        if (currentWindow && !currentWindow.isDestroyed()) {
            try {
                currentWindow.loadURL(finalUrl)
            } catch (error) {
                console.error('加载URL失败:', error)
            }
        }
    }

}

export const sleep = async (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
}



// 启动 Node 服务
const handleNodeServer = async () => {
    const appDir = getAppDir()
    const distDir = join(appDir, 'dist')
    const serverPath = join(distDir, 'server', 'index.mjs')
    // 3. 检测端口占用并启动 Node 服务
    // 从 URL 中提取端口
    const originalUrl = import.meta.env.VITE_UL_CONF_URL!
    let targetPort = extractPortFromUrl(originalUrl)
    let targetUrl = originalUrl

    // 检查端口是否被占用
    addLog2Vue(`检查端口 ${targetPort} 是否可用...`)
    const portInUse = await isPortInUse(targetPort)

    if (portInUse) {
        addLog2Vue(`端口 ${targetPort} 已被占用，正在查找可用端口...`)
        // 查找可用端口（从原端口+1开始）
        const newPort = await findAvailablePort(targetPort + 1)
        addLog2Vue(`找到可用端口: ${newPort}`)
        targetPort = newPort
        targetUrl = buildUrlWithPort(originalUrl, newPort)
        addLog2Vue(`使用新端口启动程序: ${targetUrl}`)
    } else {
        addLog2Vue(`端口 ${targetPort} 可用`)
    }

    // 启动服务器（传入端口）
    await startServer(serverPath, targetPort)

    // 4. 等待服务启动成功后加载地址
    addLog2Vue(`等待程序就绪: ${targetUrl}, 正在打开...`)
    await waitForServer(targetUrl)
}

/**
 * 启动 Node 服务
 * @param serverPath 服务入口文件路径
 * @param port 可选的端口号，默认使用环境变量 PORT 或 3000
 * @returns 服务实际监听的端口号
 */
const startServer = async (serverPath: string, port?: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        const electronBinary = process.execPath
        addLog2Vue(`启动程序中: ${electronBinary} ${serverPath}`)

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
            // addLog2Vue('设置输出1')
            serverProcess.stdout.setEncoding('utf8')
        }
        if (serverProcess.stderr) {
            // addLog2Vue('设置输出2')
            serverProcess.stderr.setEncoding('utf8')
        }

        serverProcess.stdout?.on('data', (data) => {
            // addLog2Vue('设置编码')
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
            addLog2Vue('启动服务器失败:' + error.message)
            reject(error)
        })

        // 等待一段时间确保服务启动
        setTimeout(() => {
            if (serverProcess && !serverProcess.killed) {
                addLog2Vue('服务器启动成功')
                resolve()
            } else {
                reject(new Error('服务器启动失败'))
            }
        }, 2000)
    })
}

/**
 * 判断是否应该检查更新（根据更新频率设置）
 * @returns 是否应该检查更新
 */
const shouldCheckUpdate = (): boolean => {
    const settingsStore = new Store({ name: 'settings' })
    const updateFrequency = settingsStore.get('updateFrequency', 'onStart') as string

    // 从不更新
    if (updateFrequency === 'never') {
        addLog2Vue('注意: 更新频率已设置为"从不更新"，跳过更新检查')
        return false
    }

    // 每次启动时更新
    if (updateFrequency === 'onStart') {
        return true
    }

    // 每天更新一次
    if (updateFrequency === 'daily') {
        const lastCheckTime = store.get('lastUpdateCheckTime', 0) as number
        const now = Date.now()
        const oneDayInMs = 24 * 60 * 60 * 1000 // 24小时的毫秒数
        console.log('上次检查时间:', lastCheckTime);

        // 如果从未检查过，或者距离上次检查已经超过24小时
        if (lastCheckTime === 0 || (now - lastCheckTime) >= oneDayInMs) {
            return true
        } else {
            const hoursSinceLastCheck = Math.floor((now - lastCheckTime) / (60 * 60 * 1000))
            addLog2Vue(`注意: 更新频率设置为"每天更新一次"，距离上次检查仅 ${hoursSinceLastCheck} 小时，跳过更新检查`)
            return false
        }
    }

    // 默认行为：每次启动时更新
    return true
}

/**
 * 检查程序更新
 * @param distVersion 当前版本号
 * @returns 是否需要清理dist目录
 */
const checkUpdate = async (distVersion: number) => {
    // 根据更新频率设置判断是否应该检查更新
    if (!shouldCheckUpdate()) {
        return false
    }

    const appDir = getAppDir()
    const distZipPath = join(appDir, 'dist.zip')
    addLog2Vue('检查程序更新...')
    // 使用当前版本号检查更新
    const res = await getFileUpgrade(
        import.meta.env.VITE_UL_CONF_AK!,
        import.meta.env.VITE_UL_CONF_SK!,
        import.meta.env.VITE_UL_CONF_FILEKEY!,
        distVersion
    )
    console.log(JSON.stringify(res))

    // 更新检查完成后，更新最后检查时间（用于 daily 模式）
    const settingsStore = new Store({ name: 'settings' })
    const updateFrequency = settingsStore.get('updateFrequency', 'onStart') as string
    if (updateFrequency === 'daily') {
        store.set('lastUpdateCheckTime', Date.now())
    }

    if (res && res.code === 200) {
        // 检查是否有新版本
        const newVersionCode = res.data.versionCode
        if (newVersionCode > distVersion) {
            addLog2Vue(`发现新版本:${distVersion} -> ${newVersionCode},更新内容: ${res.data.promptUpgradeContent}`)
            const distUrl = res.data.urlPath
            await downloadFile(distUrl, distZipPath)
            store.set('distVersion', newVersionCode)
            return true
        } else {
            addLog2Vue(`当前已是最新版本: ${distVersion}`)
        }
    } else if (res && res.code === 0) {
        addLog2Vue('没有新版本')
    } else {
        addLog2Vue('检查更新失败，使用当前版本')
    }
    return false
}
/**
 * 处理dist.zip
 * @param distZipPath 程序压缩包路径
 */
const handleDistZip = async () => {
    addLog2Vue('检查并下载程序...')
    let clearDistPath = false
    const appDir = getAppDir()
    const distZipPath = join(appDir, 'dist.zip')
    const distDir = join(appDir, 'dist')
    const serverPath = join(distDir, 'server', 'index.mjs')
    // 从配置中读取 distVersion，如果不存在则设置为 1
    let distVersion = store.get('distVersion', 1) as number
    addLog2Vue(`当前版本号: ${distVersion}`)
    // 如果不存在 dist.zip，首次下载
    if (!existsSync(distZipPath)) {
        addLog2Vue('程序不存在，首次下载...')
        const distUrl = `https://api.upgrade.toolsetlink.com/v1/file/download?fileKey=${import.meta.env.VITE_UL_CONF_FILEKEY!}`
        await downloadFile(distUrl, distZipPath)
    } else {
        clearDistPath = await checkUpdate(distVersion)
    }
    // 2. 解压到 dist 文件夹
    if (clearDistPath || !existsSync(serverPath)) {
        if (clearDistPath) {
            addLog2Vue('开始清理dist文件夹')
            await deleteDir('dist')
        }
        addLog2Vue('开始解压程序到...' + distDir)
        if (!existsSync(distDir)) {
            mkdirSync(distDir, { recursive: true })
        }
        await extractZip(distZipPath, distDir)
    } else {
        addLog2Vue('程序目录已存在，跳过解压')
    }
}


/**
 * 递归删除目录或文件
 * @param folderName 相对于应用目录的文件夹或文件名
 */
const deleteDir = async (folderName: string) => {
    const appDir = getAppDir();
    const targetPath = join(appDir, folderName);

    if (!existsSync(targetPath)) return;
    const stat = statSync(targetPath);

    if (stat.isDirectory()) {
        // addLog2Vue('开始清理' + folderName + '文件夹')
        // 先删除目录内的所有文件和子目录
        const files = readdirSync(targetPath);
        for (const file of files) {
            const curPath = join(targetPath, file);
            const childStat = statSync(curPath);
            if (childStat.isDirectory()) {
                deleteDir(join(folderName, file));
            } else {
                unlinkSync(curPath);
            }
        }
        // 删除空目录
        rmdirSync(targetPath);
    } else {
        addLog2Vue('开始清理' + folderName + '文件')
        // 是文件直接删除
        unlinkSync(targetPath);
    }
}
// 向 Vue 发送日志
export const addLog2Vue = (log: string): void => {
    const mainWindow = getMainWindow()
    console.log('addLog2Vue', log);
    // 如果渲染进程还没准备好，将日志添加到缓冲区
    if (!isRendererReady) {
        logBuffer.push(log)
        return
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('log-message', log)
    }
}

const sendDownloadProgress = (payload: DownloadProgressPayload): void => {
    const mainWindow = getMainWindow()
    if (!isRendererReady || !mainWindow || mainWindow.isDestroyed()) {
        downloadProgressBuffer.push(payload)
        return
    }
    mainWindow.webContents.send('download-progress', payload)
}

// 获取程序运行目录
const getAppDir = (): string => {
    if (is.dev) {
        return join(__dirname, '../../')
    }
    return join(app.getAppPath(), '../')
}

/**
 * 获取主窗口实例
 * 假设主窗口是第一个创建的窗口，或者具有特定的标题/URL来识别
 * @returns 主窗口实例（如果存在）
 */
const getMainWindow = (): BrowserWindow | undefined => {
    // 获取所有打开的窗口
    const windows = BrowserWindow.getAllWindows();

    // 这里需要一个可靠的方式来识别哪个是你的主窗口
    // 方法一：假设主窗口是第一个创建的（最简单，但不够健壮）
    return windows[0];

    // 方法二：通过窗口标题识别（推荐，更可靠）
    // 假设你在创建窗口时设置了 title: 'My App Log'
    //   return windows.find(win => win.getTitle() === 'My App Log');

    // 方法三：通过加载的URL识别
    // return windows.find(win => win.webContents.getURL().includes('log.html'));
}



/**
 * 下载文件
 * @param url 下载地址
 * @param destPath 保存路径
 * @returns 
 */
const downloadFile = async (url: string, destPath: string): Promise<void> => {
    console.log(`开始下载新版本...`)
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https:')
        const protocol = isHttps ? https : http

        const file = createWriteStream(destPath)
        sendDownloadProgress({ visible: true, progress: 0, isDownloading: true })

        // 对于 HTTPS 请求，忽略证书验证错误（包括证书过期）
        // 同时禁用代理，直接连接
        const requestOptions = isHttps ? {
            rejectUnauthorized: false
        } : {}

        const req = protocol.get(url, requestOptions, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // 处理重定向
                downloadFile(response.headers.location!, destPath).then(resolve).catch(reject)
                return
            }

            if (response.statusCode !== 200) {
                file.close()
                sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })
                reject(new Error(`下载失败: HTTP ${response.statusCode}`))
                return
            }

            const contentLengthHeader = response.headers['content-length']
            const totalBytes = contentLengthHeader
                ? parseInt(Array.isArray(contentLengthHeader) ? contentLengthHeader[0] : contentLengthHeader, 10)
                : 0
            let downloadedBytes = 0

            response.on('data', (chunk: Buffer) => {
                downloadedBytes += chunk.length

                if (totalBytes > 0) {
                    const progress = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
                    sendDownloadProgress({ visible: true, progress, isDownloading: true })
                }
            })

            response.pipe(file)

            file.on('finish', () => {
                file.close()
                addLog2Vue(`程序下载完成: ${destPath}`)
                sendDownloadProgress({ visible: true, progress: 100, isDownloading: false })
                setTimeout(() => {
                    sendDownloadProgress({ visible: false, progress: 100, isDownloading: false })
                }, 800)
                resolve()
            })

            file.on('error', (err) => {
                file.close()
                sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })
                reject(err)
            })
        })

        req.on('error', (err: NodeJS.ErrnoException) => {
            // 检查是否是证书相关错误
            if (err.message && (err.message.includes('certificate') || err.message.includes('CERT'))) {
                addLog2Vue(`警告: 检测到证书错误（${err.message}），已忽略并继续下载`)
                // 对于证书错误，尝试重新请求（忽略证书验证）
                if (isHttps) {
                    const retryReq = https.get(url, {
                        rejectUnauthorized: false,
                        agent: false  // 禁用代理
                    }, (response) => {
                        if (response.statusCode === 301 || response.statusCode === 302) {
                            downloadFile(response.headers.location!, destPath).then(resolve).catch(reject)
                            return
                        }

                        if (response.statusCode !== 200) {
                            file.close()
                            sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })
                            reject(new Error(`下载失败: HTTP ${response.statusCode}`))
                            return
                        }

                        const contentLengthHeader = response.headers['content-length']
                        const totalBytes = contentLengthHeader
                            ? parseInt(Array.isArray(contentLengthHeader) ? contentLengthHeader[0] : contentLengthHeader, 10)
                            : 0
                        let downloadedBytes = 0

                        response.on('data', (chunk: Buffer) => {
                            downloadedBytes += chunk.length
                            if (totalBytes > 0) {
                                const progress = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
                                sendDownloadProgress({ visible: true, progress, isDownloading: true })
                            }
                        })

                        response.pipe(file)

                        file.on('finish', () => {
                            file.close()
                            addLog2Vue(`程序下载完成: ${destPath}`)
                            sendDownloadProgress({ visible: true, progress: 100, isDownloading: false })
                            setTimeout(() => {
                                sendDownloadProgress({ visible: false, progress: 100, isDownloading: false })
                            }, 800)
                            resolve()
                        })

                        file.on('error', (fileErr) => {
                            file.close()
                            sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })
                            reject(fileErr)
                        })
                    })

                    retryReq.on('error', (retryErr) => {
                        sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })
                        reject(retryErr)
                    })
                } else {
                    sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })
                    reject(err)
                }
            } else {
                sendDownloadProgress({ visible: false, progress: 0, isDownloading: false })
                reject(err)
            }
        })
    })
}

// 解压 ZIP 文件
const extractZip = async (zipPath: string, extractTo: string): Promise<void> => {
    try {
        const zip = new AdmZip(zipPath)
        zip.extractAllTo(extractTo, true)
        addLog2Vue(`文件解压完成: ${extractTo}`)
    } catch (error) {
        throw new Error(`解压失败: ${(error as Error).message}`)
    }
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
            addLog2Vue('程序已就绪')
            store.set('nodeStart', 'true')
            return
        } catch (error) {
            if (i === maxRetries - 1) {
                addLog2Vue(JSON.stringify(error))
                throw new Error('程序启动超时')
            }
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }
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

// 环境变量加载
const getEnvPath = (): string => {
    // 在开发环境中使用项目根目录，在生产环境中使用app路径
    if (is.dev) {
        return join(__dirname, '../../.env')
    }
    return join(app.getAppPath(), '.env')
}

// 检查是否缺少必要的环境变量
const checkRequiredEnvVars = (): { valid: boolean; missing: string[] } => {
    const requiredVars = ['UL_CONF_AK', 'UL_CONF_SK', 'UL_CONF_FILEKEY', 'UL_CONF_URL']
    const missing: string[] = []

    for (const varName of requiredVars) {
        const value = process.env[varName]
        console.log(varName, value);

        if (!value || value.trim() === '') {
            missing.push(varName)
        }
    }

    return {
        valid: missing.length === 0,
        missing
    }
}

// 根据浏览器类型打开 URL
export function openBrowserWithType(url: string, browserType: string = 'default'): void {
    const targetUrl = url || 'http://localhost:3000'

    if (browserType === 'default' || !browserType) {
        // 使用默认浏览器
        shell.openExternal(targetUrl)
        return
    }

    // 根据平台和浏览器类型获取浏览器路径
    let browserPath = ''
    const platform = process.platform

    if (platform === 'win32') {
        // Windows 平台
        const commonPaths: { [key: string]: string[] } = {
            chrome: [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
            ],
            edge: [
                'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
                'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
                join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe')
            ],
            '360': [
                'C:\\Users\\' + (process.env.USERNAME || '') + '\\AppData\\Roaming\\360se6\\Application\\360se.exe',
                'C:\\Program Files\\360\\360se\\360se.exe',
                'C:\\Program Files (x86)\\360\\360se\\360se.exe'
            ],
            firefox: [
                'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
                'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
            ],
            safari: [] // Safari 主要在 macOS 上
        }

        const paths = commonPaths[browserType.toLowerCase()] || []
        for (const path of paths) {
            if (existsSync(path)) {
                browserPath = path
                break
            }
        }
    } else if (platform === 'darwin') {
        // macOS 平台 - 使用应用程序名称
        const appNames: { [key: string]: string[] } = {
            chrome: ['Google Chrome', 'Google Chrome.app'],
            edge: ['Microsoft Edge', 'Microsoft Edge.app'],
            firefox: ['Firefox', 'Firefox.app'],
            safari: ['Safari', 'Safari.app'],
            '360': [] // 360 浏览器在 macOS 上不常见
        }

        const names = appNames[browserType.toLowerCase()] || []
        let opened = false
        for (const appName of names) {
            try {
                // 使用 open -a 命令打开应用程序
                spawn('open', ['-a', appName, targetUrl], { detached: true })
                opened = true
                break
            } catch (e) {
                // 继续尝试下一个
            }
        }
        if (!opened) {
            // 如果找不到指定的浏览器，使用默认浏览器
            console.warn(`未找到浏览器: ${browserType}，使用默认浏览器`)
            shell.openExternal(targetUrl)
        }
        return
    } else {
        // Linux 平台 - 直接尝试启动，如果失败则使用默认浏览器
        const commonCommands: { [key: string]: string[] } = {
            chrome: ['google-chrome', 'chromium-browser', 'chromium'],
            edge: ['microsoft-edge', 'microsoft-edge-stable'],
            firefox: ['firefox'],
            safari: [], // Safari 不在 Linux 上
            '360': [] // 360 浏览器在 Linux 上不常见
        }

        const commands = commonCommands[browserType.toLowerCase()] || []
        if (commands.length > 0) {
            // 尝试使用第一个命令启动
            try {
                spawn(commands[0], [targetUrl], { detached: true })
                return
            } catch (e) {
                // 如果失败，尝试其他命令或使用默认浏览器
                console.warn(`无法启动浏览器 ${commands[0]}:`, e)
            }
        }
        // 如果找不到指定的浏览器，使用默认浏览器
        console.warn(`未找到浏览器: ${browserType}，使用默认浏览器`)
        shell.openExternal(targetUrl)
        return
    }

    // Windows 平台：如果找到了浏览器路径，启动它
    if (browserPath) {
        try {
            spawn(browserPath, [targetUrl], { detached: true })
        } catch (error) {
            console.error(`无法启动浏览器 ${browserType}:`, error)
            // 降级到默认浏览器
            shell.openExternal(targetUrl)
        }
    } else {
        // 如果找不到指定的浏览器，使用默认浏览器
        console.warn(`未找到浏览器: ${browserType}，使用默认浏览器`)
        shell.openExternal(targetUrl)
    }
}