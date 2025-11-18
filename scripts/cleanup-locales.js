const { join } = require('path')
const { promises: fs } = require('fs')

const KEEP_LOCALES = new Set(['en-US.pak', 'en.pak', 'zh-CN.pak'])

const exists = async (targetPath) => {
  try {
    await fs.access(targetPath)
    return true
  } catch (_) {
    return false
  }
}

const removeLocaleFiles = async (dirPath) => {
  if (!(await exists(dirPath))) {
    return
  }

  const localeFiles = await fs.readdir(dirPath)
  await Promise.all(
    localeFiles.map(async (fileName) => {
      const lowerName = fileName.toLowerCase()
      const shouldKeep =
        KEEP_LOCALES.has(fileName) ||
        KEEP_LOCALES.has(lowerName) ||
        (lowerName.endsWith('.pak.info') &&
          KEEP_LOCALES.has(fileName.replace(/\.info$/i, '')))

      if (shouldKeep) {
        return
      }
      const fullPath = join(dirPath, fileName)
      await fs.rm(fullPath, { recursive: true, force: true })
    })
  )
}

module.exports = async (context) => {
  const appOutDir = context.appOutDir
  const candidateDirs = [
    join(appOutDir, 'locales'),
    join(appOutDir, 'resources', 'locales')
  ]

  await Promise.all(candidateDirs.map(removeLocaleFiles))
}

