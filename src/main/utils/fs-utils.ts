import { is } from '@electron-toolkit/utils'
import { join } from 'path'
import { app } from 'electron'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync
} from 'fs'
import log from 'electron-log/main'

/**
 * 获取程序运行目录
 * @returns 应用目录路径
 */
export const getAppDir = (): string => {
  if (is.dev) {
    return join(__dirname, '../../')
  }
  return join(app.getAppPath(), '../')
}

/**
 * 递归删除目录或文件
 * @param folderName 相对于应用目录的文件夹或文件名
 */
export const deleteDir = async (folderName: string): Promise<void> => {
  const appDir = getAppDir()
  const targetPath = join(appDir, folderName)

  if (!existsSync(targetPath)) return
  const stat = statSync(targetPath)

  if (stat.isDirectory()) {
    // 先删除目录内的所有文件和子目录
    const files = readdirSync(targetPath)
    for (const file of files) {
      const curPath = join(targetPath, file)
      const childStat = statSync(curPath)
      if (childStat.isDirectory()) {
        await deleteDir(join(folderName, file))
      } else {
        unlinkSync(curPath)
      }
    }
    // 删除空目录
    rmdirSync(targetPath)
  } else {
    log.info('开始清理' + folderName + '文件')
    // 是文件直接删除
    unlinkSync(targetPath)
  }
}

/**
 * 确保目录存在（不存在则创建）
 * @param dirPath 目录路径
 */
export const ensureDir = (dirPath: string): void => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}
