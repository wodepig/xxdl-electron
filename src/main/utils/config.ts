import { Conf } from 'electron-conf/main'
import { getAppDir } from './fs-utils'

/**
 * 配置命名空间
 */
export type ConfigNamespace = 'common' | 'settings' | 'window' | string

/**
 * 获取环境变量
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
