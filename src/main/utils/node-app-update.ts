/**
 * Node 应用更新模块
 *
 * 用于 Nuxt/Next 等全栈应用的更新管理
 * 通过 Electron 以 node 模式启动 index.mjs 来运行服务端应用
 *
 * 主要功能：
 * 1. UpgradeLink API 客户端 - 与升级服务通信
 * 2. 更新检查逻辑 - 支持多种更新频率设置
 * 3. 自动下载更新包
 */
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import os from 'os'
import { app } from 'electron'
import log from 'electron-log/main'
import { getConfValue, setConfValue } from './config'
import { deleteDir, downloadFile, extractZip4unzipit, getAppDir } from './fs-utils'
import { showInfoNotification, showWarningNotification } from './window'
import { buildUrlWithPort, cleanupServerProcess, getActualPort, handleNodeServer, loadMainWindowUrl } from './server-manager'

// ==================== UpgradeLink API 客户端 ====================
const extract_dir_name = 'dist_server'
const { default: Client, Config, FileUpgradeRequest, AppReportRequest, ElectronVersionRequest } = require('@toolsetlink/upgradelink-api-typescript');

/**
 * UpgradeLink API 响应数据类型
 */
export interface UpgradeResponse {
  code: number
  msg: string
  data: {
    fileKey?: string
    versionName?: string
    versionCode?: number
    urlPath?: string
    upgradeType?: number
    promptUpgradeContent?: string
    [key: string]: any
  }
}

/**
 * 获取 Electron 应用升级信息
 * @param ak AccessKey
 * @param sk AccessSecret
 * @param electronKey Electron 应用密钥
 * @param versionCode 当前版本号
 * @returns 升级信息响应
 */
export async function getElectronUpgrade(
  ak: string,
  sk: string,
  electronKey: string,
  versionCode: number = 1
): Promise<UpgradeResponse | null> {
  try {
    const config = new Config({
      accessKey: ak,
      accessSecret: sk,
    });
    const client = new Client(config);

    const request = new ElectronVersionRequest({
      electronKey: electronKey,
      versionName: '1.1.1' + '',
      platform: "windows",
      arch: "x64"
    });


    const response = await client.ElectronVersion(request);


    return response as UpgradeResponse;
  } catch (error) {
    console.error('\n获取electron升级信息失败:', error);
    return null;
  }
}

/**
 * 获取文件升级信息
 * @param ak AccessKey
 * @param sk AccessSecret
 * @param fk FileKey
 * @param versionCode 当前版本号
 * @returns 升级信息响应
 */
export async function getFileUpgrade(
  ak: string,
  sk: string,
  fk: string,
  versionCode: number = 1
): Promise<UpgradeResponse | null> {
  try {
    const config = new Config({
      accessKey: ak,
      accessSecret: sk,
    });
    const client = new Client(config);
    const request = new FileUpgradeRequest({
      fileKey: fk,
      versionCode: versionCode,
      appointVersionCode: 0,
      devModelKey: '',
      devKey: ''
    });

    const response = await client.FileUpgrade(request);

    // console.log('\n文件升级信息响应:');
    // console.log(`code: ${response.code}`);
    // console.log(`msg: ${response.msg}`);
    // console.log('data:');
    // console.log(`  fileKey: ${response.data.fileKey}`);
    // console.log(`  versionName: ${response.data.versionName}`);
    // console.log(`  versionCode: ${response.data.versionCode}`);
    // console.log(`  urlPath: ${response.data.urlPath}`);
    // console.log(`  upgradeType: ${response.data.upgradeType}`);
    // console.log(`  promptUpgradeContent: ${response.data.promptUpgradeContent}`);

    return response as UpgradeResponse;
  } catch (error) {
    console.error('\n获取文件升级信息失败:', error);
    return null;
  }
}

/**
 * 上报应用事件
 * @param ak AccessKey
 * @param sk AccessSecret
 * @param params 上报参数
 * @returns 是否上报成功
 */
export async function reportAppEvent(
  ak: string,
  sk: string,
  params: {
    eventType: string
    appKey: string
    versionCode: number
    eventData: Record<string, any>
    devModelKey?: string
    devKey?: string
    timestamp?: string
  }
): Promise<boolean> {
  try {
    const config = new Config({
      accessKey: ak,
      accessSecret: sk,
    });
    const client = new Client(config);

    const request = new AppReportRequest({
      eventType: params.eventType,
      appKey: params.appKey,
      devModelKey: params.devModelKey || '',
      devKey: params.devKey || '',
      versionCode: params.versionCode,
      timestamp: params.timestamp || new Date().toISOString(),
      eventData: params.eventData
    });

    const response = await client.AppReport(request);

    console.log('\n事件上报响应:');
    console.log(`code: ${response.code}`);
    console.log(`msg: ${response.msg}`);

    return response.code === 200;
  } catch (error) {
    console.error('\n事件上报失败:', error);
    return false;
  }
}

// ==================== Node 应用更新逻辑 ====================

/**
 * 更新频率类型
 */
type UpdateFrequency = 'never' | 'onStart' | 'daily'

/**
 * 更新检查结果
 */
interface UpdateCheckResult {
  hasUpdate: boolean
  newVersionCode?: number
  url?: string
}

/**
 * 判断是否应检查更新（根据更新频率设置）
 * @returns 是否应该检查更新
 */
export const shouldCheckUpdate = (): boolean => {
  const updateFrequency = getConfValue('updateFrequency', 'onStart', 'settings') as UpdateFrequency

  // 从不更新
  if (updateFrequency === 'never') {
    showWarningNotification('更新频率为"从不更新"', '“从不更新”会跳过更新检查, 可能会错过新功能和安全修复')
    log.warn('注意: 更新频率已设置为"从不更新"，跳过更新检查')
    return false
  }

  // 每次启动时更新
  if (updateFrequency === 'onStart') {
    return true
  }

  // 每天更新一次
  if (updateFrequency === 'daily') {
    const lastCheckTime = getConfValue('lastUpdateCheckTime', 0, 'settings') as number
    const now = Date.now()
    const oneDayInMs = 24 * 60 * 60 * 1000 // 24小时的毫秒数
    log.info('上次检查时间:', lastCheckTime)

    // 如果从未检查过，或者距离上次检查已经超过24小时
    if (lastCheckTime === 0 || now - lastCheckTime >= oneDayInMs) {
      return true
    } else {
      const hoursSinceLastCheck = Math.floor((now - lastCheckTime) / (60 * 60 * 1000))
      showWarningNotification('更新频率为"每天更新一次"', `距离上次检查仅 ${hoursSinceLastCheck} 小时，本次启动跳过更新检查`)
      log.info(
        `注意: 更新频率设置为"每天更新一次"，距离上次检查仅 ${hoursSinceLastCheck} 小时，跳过更新检查`
      )
      return false
    }
  }

  // 默认行为：每次启动时更新
  return true
}

/**
 * 生成客户端唯一标识（计算机名 + CPU 型号哈希，不报错、不为空）
 */
const getClientId = (): string => {
  try {
    const parts: string[] = []

    // 计算机名
    const hostname = os.hostname()
    if (hostname) parts.push(hostname)

    const username = os.userInfo()?.username || ''
    if (username) parts.push(username)
    if (parts.length > 0) return parts.join('-')
  } catch {
    // 忽略任何异常
  }

  // 绝对兜底
  return `unknown-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 获取系统硬件信息（不报错）
 */
const getSystemInfo = (): Record<string, any> => {
  try {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      type: os.type(),
      arch: os.arch(),
      version: os.version(),
      electronVersion: process.versions.electron,
      cpuModel: os.cpus()[0]?.model || '',
      cpuCores: os.cpus().length,
      totalMem: os.totalmem(),
      username: os.userInfo()?.username || '',
    }
  } catch {
    return {}
  }
}

/**
 * 上报客户端事件（不影响主线程）
 * @param eventType 事件类型（startup/download/install/error/crash/exception/exit 等）
 * @param metadata 扩展数据
 */
export const reportClientEvent = async (
  eventType: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const slug = getConfValue('VITE_UPD_SLUG', '', 'env')
    const updUrl = getConfValue('VITE_UPD_URL', '', 'env')
    let distVersion = getConfValue('distVersion', '0.0.1')
    if (!slug || !updUrl) {
      log.warn('[reportClientEvent] slug 或 updUrl 未配置，跳过上报')
      return
    }

    const body: Record<string, any> = {
      eventType,
      clientId: getClientId(),
      clientName: os.version(),
      clientVersion: app.getVersion(),
      version: distVersion,
      source: 'file',
      platform: process.platform,
      arch: process.arch,
      channel: 'latest',
      metadata: getSystemInfo()
    }

    // 合并用户传入的扩展数据
    if (metadata) {
      body.metadata = { ...body.metadata, ...metadata }
    }

    const url = `${updUrl}/api/public/files/${slug}/events`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (resp.ok) {
      log.info(`[reportClientEvent] 事件上报成功: ${eventType}`)
    } else {
      log.warn(`[reportClientEvent] 事件上报失败: ${eventType}, status=${resp.status}`)
    }
  } catch (error) {
    log.error('[reportClientEvent] 上报异常:', error)
  }
}

/**
 * 比较版本号，判断是否需要更新
 * @param old 旧版本号（格式：x.y.z）
 * @param newV 新版本号（格式：x.y.z）
 * @returns true 表示需要更新，false 表示不需要更新或版本号格式错误
 */
const compareVersion = async (old: string, newV: string): Promise<boolean> => {
  const versionRegex = /^\d+\.\d+\.\d+$/

  if (!versionRegex.test(old) || !versionRegex.test(newV)) {
    log.warn(`[compareVersion] 版本号格式错误: old="${old}", new="${newV}"`)
    return false
  }

  const oldParts = old.split('.').map(Number)
  const newParts = newV.split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    if (newParts[i] > oldParts[i]) return true
    if (newParts[i] < oldParts[i]) return false
  }

  return false // 版本相同，不需要更新
}

/**
 * 检查程序更新
 * @param distVersion 当前版本号
 * @returns 是否需要清理dist目录
 */
export const checkUpdate = async (distVersion: string): Promise<boolean> => {
  // 根据更新频率设置判断是否应该检查更新
  if (!shouldCheckUpdate()) {
    return false
  }

  const appDir = getAppDir()

  const distZipPath = join(appDir, 'dist.zip')


  const slug = getConfValue('VITE_UPD_SLUG', '', 'env')
  const updUrl = getConfValue('VITE_UPD_URL', '', 'env')
  const url = `${updUrl}/api/public/files/${slug}/check-update?channel=stable&env=prod`
  log.info('检查' + slug + '程序更新...:' + url)

  const resp = await fetch(url)
  const res = await resp.json()
  if (!resp.ok) {
    log.warn('检查更新失败, 继续使用旧文件')
    showWarningNotification('更新失败', res.statusMessage || '检查更新失败')
    throw new Error(res.statusMessage || '检查更新失败')

  }

  if (res.error) {
    showWarningNotification('更新失败', res.statusMessage)
    throw new Error(res.statusMessage)
  }
  if (!res.updateAvailable) {
    showWarningNotification('更新失败', res.reason || '无可用更新文件')
    throw new Error(res.reason || '无可用更新文件')
  }
  // 对比版本号，判断是否需要更新
  const newVersion = res.latest.version
  if (await compareVersion(distVersion, newVersion)) {

    showInfoNotification('发现新版本', `版本号:${distVersion} -> ${newVersion},更新内容: ${res.latest.releaseNotes || '无'}`)
    log.info(
      `发现新版本:${distVersion} -> ${newVersion},更新内容: ${res.latest.releaseNotes || '无'}`
    )
    const distUrl = res.latest.downloadUrl

    await downloadFile(distUrl, distZipPath)
    setConfValue('distVersion', newVersion)
    // 汇报下载信息
    reportClientEvent('download')
    return true
  } else {
    const allowRollback = getConfValue('allowRollback', false, 'settings') as boolean
    // 如果允许回滚，且当前版本号与最新版本号不同(等于或小于最新版本号)
    if (allowRollback && distVersion !== newVersion) {
      showInfoNotification('版本开始回滚', `版本号: ${distVersion} -> ${newVersion}\n${res.latest.releaseNotes || '无'}`)
      const distUrl = res.latest.downloadUrl
      await downloadFile(distUrl, distZipPath)
      setConfValue('distVersion', newVersion)
      // 汇报下载信息
      reportClientEvent('download')
      return true
    }else{
      showInfoNotification('当前已是最新版本', `版本号: ${distVersion}`)
    }
  }
  return false
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
  if (!existsSync(distZipPath)) {
    // 文件不存在, 就重置版本号触发下载
    setConfValue('distVersion', '0.0.1')
  }
  // 从配置中读取 distVersion，如果不存在则设置为 1
  let distVersion = getConfValue('distVersion', '0.0.1')
  log.debug(`[handleDistZip] 当前版本号: ${distVersion}`)

  try {
    clearDistPath = await checkUpdate(distVersion)
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
 * 启动初始化流程
 * 这是主要的初始化入口函数
 */
export const startInitialize = async (): Promise<void> => {
  setConfValue('nodeStart', 'false')
  // 从 Electron app 获取版本号（与 package.json 保持一致）
  setConfValue('startExeVersion', app.getVersion())

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
