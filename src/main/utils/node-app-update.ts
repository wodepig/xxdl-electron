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

import { join } from 'path'
import log from 'electron-log/main'
import { getConfValue, setConfValue } from './config'
import { downloadFile } from './download'

// ==================== UpgradeLink API 客户端 ====================

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

    console.log('ak', ak);
    console.log('sk', sk);
    console.log('electronKey', electronKey);
    console.log('versionCode', versionCode);
    console.log('request', request);

    const response = await client.ElectronVersion(request);

    console.log('\nelectron升级信息响应:');
    console.log(`code: ${response.code}`);
    console.log(`msg: ${response.msg}`);
    console.log('data:');
    console.log(response);

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

    console.log('\n文件升级信息响应:');
    console.log(`code: ${response.code}`);
    console.log(`msg: ${response.msg}`);
    console.log('data:');
    console.log(`  fileKey: ${response.data.fileKey}`);
    console.log(`  versionName: ${response.data.versionName}`);
    console.log(`  versionCode: ${response.data.versionCode}`);
    console.log(`  urlPath: ${response.data.urlPath}`);
    console.log(`  upgradeType: ${response.data.upgradeType}`);
    console.log(`  promptUpgradeContent: ${response.data.promptUpgradeContent}`);

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
  console.log(JSON.stringify(res))

  // 更新检查完成后，更新最后检查时间（用于 daily 模式）
  const updateFrequency = getConfValue('updateFrequency', 'onStart', 'settings') as UpdateFrequency
  if (updateFrequency === 'daily') {
    setConfValue('lastUpdateCheckTime', Date.now(), 'settings')
  }

  if (res && res.code === 200) {
    // 检查是否有新版本
    const newVersionCode = res.data.versionCode
    if (newVersionCode > distVersion) {
      log.info(
        `发现新版本:${distVersion} -> ${newVersionCode},更新内容: ${res.data.promptUpgradeContent}`
      )
      const distUrl = res.data.urlPath
      await downloadFile(distUrl, distZipPath)
      setConfValue('distVersion', newVersionCode)
      return true
    } else {
      log.info(`当前已是最新版本: ${distVersion}`)
    }
  } else if (res && res.code === 0) {
    log.info('没有新版本')
  } else {
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
