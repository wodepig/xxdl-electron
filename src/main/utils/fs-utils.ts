import { is } from '@electron-toolkit/utils'
import { join, dirname } from 'path'
import { app } from 'electron'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
  accessSync,
  readFileSync,
  writeFileSync
} from 'fs'
import log from 'electron-log/main'
import { unzip } from 'unzipit'

// ==================== 目录和路径 ====================

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
 * 确保目录存在（不存在则创建）
 * @param dirPath 目录路径
 */
export const ensureDir = (dirPath: string): void => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

// ==================== 文件删除 ====================

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

// ==================== ZIP 解压 ====================

/**
 * 使用 unzipit 解压 ZIP 文件到指定目录
 * @param absoluteZipPath ZIP文件的绝对路径
 * @param absoluteExtractPath 解压目标目录路径
 * @returns Promise<void>
 */
export const extractZip4unzipit = async (
  absoluteZipPath: string,
  absoluteExtractPath: string
): Promise<void> => {
  try {
    log.debug('[extractZip4unzipit] 开始解压文件...')
    log.debug(`[extractZip4unzipit] ZIP路径: ${absoluteZipPath}`)
    log.debug(`[extractZip4unzipit] 解压目标: ${absoluteExtractPath}`)

    // 检查 ZIP 文件是否存在
    log.debug('[extractZip4unzipit] 检查ZIP文件是否存在...')
    try {
      await accessSync(absoluteZipPath)
      log.debug('[extractZip4unzipit] ZIP文件存在')
    } catch (err: any) {
      log.error('[extractZip4unzipit] ZIP文件不存在:', absoluteZipPath)
      throw new Error(`ZIP 文件不存在: ${absoluteZipPath}`)
    }

    // 读取 ZIP 文件内容为 Buffer
    log.debug('[extractZip4unzipit] 开始读取ZIP文件内容...')
    let zipBuffer: Buffer
    try {
      zipBuffer = await readFileSync(absoluteZipPath)
      log.debug(`[extractZip4unzipit] ZIP文件读取完成，大小: ${zipBuffer.length} bytes`)
    } catch (error) {
      log.error('[extractZip4unzipit] 读取ZIP文件失败:', error)
      throw error
    }

    // 使用 unzipit 解析 ZIP 文件
    log.debug('[extractZip4unzipit] 开始解析ZIP文件...')
    let entries: any
    try {
      const result = await unzip(zipBuffer)
      entries = result.entries
      const entryCount = Object.keys(entries).length
      log.debug(`[extractZip4unzipit] ZIP解析完成，包含 ${entryCount} 个条目`)
    } catch (error) {
      log.error('[extractZip4unzipit] 解析ZIP文件失败:', error)
      throw error
    }

    // 遍历所有文件/文件夹并解压
    log.debug('[extractZip4unzipit] 开始解压条目...')
    let processedCount = 0
    for (const [entryPath, entry] of Object.entries(entries)) {
      processedCount++

      // 拼接目标文件/文件夹的绝对路径
      const targetPath = join(absoluteExtractPath, entryPath)
      // @ts-ignore
      if (entry.isDirectory) {
        // 如果是文件夹，创建目录（递归创建父目录，已存在则忽略）
        try {
          await mkdirSync(targetPath, { recursive: true })
        } catch (error) {
          log.error(`[extractZip4unzipit] 创建目录失败: ${targetPath}`, error)
          throw error
        }
      } else {
        // 如果是文件：先创建父目录，再写入文件内容
        const parentDir = dirname(targetPath)
        try {
          await mkdirSync(parentDir, { recursive: true })
        } catch (error) {
          log.error(`[extractZip4unzipit] 创建父目录失败: ${parentDir}`, error)
          throw error
        }

        // 读取 ZIP 内文件内容并写入目标路径
        log.debug(`[extractZip4unzipit] 读取文件内容: ${entryPath}`)
        let fileContent: ArrayBuffer
        try {
          // @ts-ignore
          fileContent = await entry.arrayBuffer()
          log.debug(`[extractZip4unzipit] 文件内容读取完成，大小: ${fileContent.byteLength} bytes`)
        } catch (error) {
          log.error(`[extractZip4unzipit] 读取文件内容失败: ${entryPath}`, error)
          throw error
        }

        log.debug(`[extractZip4unzipit] 写入文件: ${targetPath}`)
        try {
          await writeFileSync(targetPath, Buffer.from(fileContent))
          log.debug(`[extractZip4unzipit] 文件写入完成: ${targetPath}`)
        } catch (error) {
          log.error(`[extractZip4unzipit] 写入文件失败: ${targetPath}`, error)
          throw error
        }
      }
    }

    log.info(`[extractZip4unzipit] ZIP文件已成功解压到: ${absoluteExtractPath}`)
  } catch (error) {
    // 统一捕获并抛出异常，方便调用方处理
    log.error('[extractZip4unzipit] 解压过程中发生错误:', error)
    const errMsg = error instanceof Error ? error.message : '解压过程中发生未知错误'
    throw new Error(`解压失败: ${errMsg}`)
  }
}
