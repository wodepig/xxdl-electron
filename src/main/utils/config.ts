import { Conf } from 'electron-conf/main'
import { getAppDir } from './fs-utils'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app, dialog } from 'electron'
import { is } from '@electron-toolkit/utils'
import log from 'electron-log/main'
import { addLog2Vue } from './window'

// ==================== 配置命名空间 ====================

/**
 * 配置命名空间
 */
export type ConfigNamespace = 'common' | 'settings' | 'window' | string

// ==================== 环境变量配置 (.env 文件) ====================

/**
 * 必需的环境变量列表
 */
const REQUIRED_ENV_VARS = ['UL_CONF_AK', 'UL_CONF_SK', 'UL_CONF_FILEKEY', 'UL_CONF_URL']

/**
 * 获取 .env 文件路径
 * @returns .env 文件绝对路径
 */
export const getEnvPath = (): string => {
  if (is.dev) {
    return join(__dirname, '../../.env')
  }
  return join(app.getAppPath(), '.env')
}

/**
 * 解析 .env 文件内容
 * @param content 文件内容
 */
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

/**
 * 检查是否缺少必要的环境变量
 * @returns 检查结果
 */
const checkRequiredEnvVars = (): { valid: boolean; missing: string[] } => {
  const missing: string[] = []

  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName]
    if (!value || value.trim() === '') {
      missing.push(varName)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * 加载 .env 环境变量文件
 */
export const loadEnvFile = (): void => {
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
    const message = `缺少必要的环境变量配置：\n\n${envCheck.missing.map((v) => `- ${v}`).join('\n')}\n\n请在项目根目录的 .env 文件中配置这些变量。`
    dialog.showErrorBox('配置错误', message)
  }
}

// ==================== 应用配置 (conf.json 文件) ====================

/**
 * 获取环境变量（构建时）
 * @param key 环境变量名
 * @param defaultValue 默认值
 * @returns 环境变量值
 */
export const getEnvConf = (key: string, defaultValue: string = 'default'): string => {
  const value = import.meta.env[key]
  if (value) {
    return value
  }
  return defaultValue
}

/**
 * 获取配置项
 * @param key 配置键名，支持 a.b 嵌套属性
 * @param defaultValue 默认值
 * @param nameSpace 命名空间，默认为 'common'
 * @returns 配置值
 */
export const getConfValue = <T = any>(
  key: string,
  defaultValue?: T,
  nameSpace?: ConfigNamespace
): T => {
  const ns = nameSpace || 'common'
  const conf = new Conf({ name: ns, dir: getAppDir() })
  const v = conf.get(key)
  if (!v) {
    return defaultValue !== undefined ? defaultValue : ('' as T)
  }
  return v as T
}

/**
 * 设置配置项
 * @param key 配置键名，支持 a.b 嵌套属性
 * @param value 配置值
 * @param nameSpace 命名空间，默认为 'common'
 */
export const setConfValue = <T = any>(
  key: string,
  value: T,
  nameSpace?: ConfigNamespace
): void => {
  const ns = nameSpace || 'common'
  const conf = new Conf({ name: ns, dir: getAppDir() })
  conf.set(key, value)
}

/**
 * 清除指定命名空间的所有配置
 * @param nameSpace 命名空间
 */
export const clearConf = (nameSpace?: ConfigNamespace): void => {
  const conf = new Conf({ name: nameSpace, dir: getAppDir() })
  conf.clear()
}

/**
 * 删除指定配置项
 * @param key 配置键名
 * @param nameSpace 命名空间
 */
export const deleteConfValue = (key: string, nameSpace?: ConfigNamespace): void => {
  const ns = nameSpace || 'common'
  const conf = new Conf({ name: ns, dir: getAppDir() })
  conf.delete(key)
}

/**
 * 检查配置项是否存在
 * @param key 配置键名
 * @param nameSpace 命名空间
 * @returns 是否存在
 */
export const hasConfValue = (key: string, nameSpace?: ConfigNamespace): boolean => {
  const ns = nameSpace || 'common'
  const conf = new Conf({ name: ns, dir: getAppDir() })
  return conf.has(key)
}
