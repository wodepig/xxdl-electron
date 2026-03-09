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
import { app } from 'electron'
import log from 'electron-log/main'
import { getConfValue, setConfValue } from './config'
import { deleteDir, downloadFile,extractZip4unzipit,getAppDir } from './fs-utils'
import {showInfoNotification,showWarningNotification} from './window'
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
    showWarningNotification('更新频率为"从不更新"','“从不更新”会跳过更新检查, 可能会错过新功能和安全修复')
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
      showWarningNotification('更新频率为"每天更新一次"',`距离上次检查仅 ${hoursSinceLastCheck} 小时，本次启动跳过更新检查`)
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
 * 检查程序更新
 * @param distVersion 当前版本号
 * @returns 是否需要清理dist目录
 */
export const checkUpdate = async (distVersion: number): Promise<boolean> => {
  // 根据更新频率设置判断是否应该检查更新
  if (!shouldCheckUpdate()) {
    return false
  }

  const appDir = getConfValue('appDir', '')
  const distZipPath = join(appDir, 'dist.zip')
  log.info('检查程序更新...')

  // 使用当前版本号检查更新
  const res = await getFileUpgrade(
    import.meta.env.VITE_UL_CONF_AK!,
    import.meta.env.VITE_UL_CONF_SK!,
    import.meta.env.VITE_UL_CONF_FILEKEY!,
    distVersion
  )
  // console.log(JSON.stringify(res))

  // 更新检查完成后，更新最后检查时间（用于 daily 模式）
  const updateFrequency = getConfValue('updateFrequency', 'onStart', 'settings') as UpdateFrequency
  if (updateFrequency === 'daily') {
    setConfValue('lastUpdateCheckTime', Date.now(), 'settings')
  }

  if (res && res.code === 200) {
    // 检查是否有新版本
    const newVersionCode = res.data.versionCode
    if (newVersionCode > distVersion) {
      showInfoNotification('发现新版本',`版本号:${distVersion} -> ${newVersionCode},更新内容: ${res.data.promptUpgradeContent}`)
      log.info(
        `发现新版本:${distVersion} -> ${newVersionCode},更新内容: ${res.data.promptUpgradeContent}`
      )
      const distUrl = res.data.urlPath
      await downloadFile(distUrl, distZipPath)
      setConfValue('distVersion', newVersionCode)
      return true
    } else {
      showInfoNotification('当前最新版本', `版本号: ${distVersion}`)
      log.info(`当前已是最新版本: ${distVersion}`)
    }
  } else if (res && res.code === 0) {
    showInfoNotification('没有新版本','当前已是最新版本')
    log.info('没有新版本')
  } else {
    showWarningNotification('检查更新失败','使用当前版本')
    log.info('检查更新失败，使用当前版本')
  }
  return false
}

/**
 * 获取更新检查结果的详细信息
 * @param distVersion 当前版本号
 * @returns 更新检查结果
 */
export const checkUpdateDetail = async (distVersion: number): Promise<UpdateCheckResult> => {
  if (!shouldCheckUpdate()) {
    return { hasUpdate: false }
  }

  const res = await getFileUpgrade(
    import.meta.env.VITE_UL_CONF_AK!,
    import.meta.env.VITE_UL_CONF_SK!,
    import.meta.env.VITE_UL_CONF_FILEKEY!,
    distVersion
  )

  // 更新最后检查时间
  const updateFrequency = getConfValue('updateFrequency', 'onStart', 'settings') as UpdateFrequency
  if (updateFrequency === 'daily') {
    setConfValue('lastUpdateCheckTime', Date.now(), 'settings')
  }

  if (res && res.code === 200) {
    const newVersionCode = res.data.versionCode
    if (newVersionCode > distVersion) {
      return {
        hasUpdate: true,
        newVersionCode,
        url: res.data.urlPath
      }
    }
  }

  return { hasUpdate: false }
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
      showInfoNotification('首次下载','正在下载程序...请稍后...')
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
