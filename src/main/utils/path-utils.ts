/**
 * 路径工具模块
 *
 * 提供应用路径相关的工具函数
 * 注意：此模块不应依赖其他 utils 模块，以避免循环依赖
 *
 * @module path-utils
 */

import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { app } from 'electron'

/** 获取程序运行目录 */
export const getAppDir = (): string =>
  is.dev ? join(__dirname, '../../') : join(app.getAppPath(), '../')
