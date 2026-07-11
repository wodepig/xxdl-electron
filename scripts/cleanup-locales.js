const { join, basename } = require('path')
const { promises: fs, existsSync } = require('fs')

// ==================== Locales 清理 ====================

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

// ==================== 资源图片清理 ====================

/**
 * 读取 .env 文件，获取 VITE_APP_ICON 和 VITE_AUTHOR_WX_IMG 引用的图片名
 */
function getReferencedImages() {
  const mode = process.env.BUILD_MODE || process.env.MODE || 'production'
  const envCandidates = [`.env.${mode}`, '.env']
  let envContent = ''
  for (const name of envCandidates) {
    const envPath = join(process.cwd(), name)
    if (existsSync(envPath)) {
      envContent = require('fs').readFileSync(envPath, 'utf8')
      break
    }
  }

  if (!envContent) {
    console.warn('[cleanup-locales] 未找到 .env 文件，跳过图片清理')
    return []
  }

  // 手动解析 .env，避免依赖 dotenv
  const env = {}
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
  }

  const icon = env.VITE_APP_ICON || ''
  const wxImg = env.VITE_AUTHOR_WX_IMG || ''
  // icon.png 在 electron-builder.yml 中被引用为应用图标

  const names = new Set()
  if (icon) names.add(basename(icon))
  if (wxImg) names.add(basename(wxImg))
  names.add('icon.png')

  return [...names]
}

async function cleanupResourceImages(appOutDir) {
  // asarUnpack 的资源会解包到 app.asar.unpacked/ 下
  const candidateDirs = [
    join(appOutDir, 'resources', 'app.asar.unpacked', 'resources', 'image'),
    join(appOutDir, 'resources', 'image')
  ]

  const referenced = getReferencedImages()
  let cleaned = false
  let totalDeleted = 0

  for (const resourcesImageDir of candidateDirs) {
    if (!existsSync(resourcesImageDir)) continue

    console.log(`[cleanup-locales] 保留的资源图片: ${referenced.join(', ') || '(无)'}`)
    console.log(`[cleanup-locales] 清理目录: ${resourcesImageDir}`)

    const files = await fs.readdir(resourcesImageDir)
    let deletedCount = 0

    await Promise.all(
      files.map(async (fileName) => {
        const lowerName = fileName.toLowerCase()
        if (!/\.(png|jpg|jpeg|gif|svg|ico|webp)$/i.test(lowerName)) return
        if (referenced.includes(fileName) || referenced.includes(lowerName)) return

        await fs.rm(join(resourcesImageDir, fileName), { recursive: true, force: true })
        deletedCount++
      })
    )

    if (deletedCount > 0) {
      console.log(`[cleanup-locales] 已清理 ${deletedCount} 个未使用的资源图片`)
    }
    totalDeleted += deletedCount
    cleaned = true
  }

  if (!cleaned) {
    console.log('[cleanup-locales] 未找到 resources/image 目录，跳过图片清理')
  }
}

// ==================== 主入口 ====================

module.exports = async (context) => {
  const appOutDir = context.appOutDir

  // 1. 清理多余的语言包
  const candidateDirs = [
    join(appOutDir, 'locales'),
    join(appOutDir, 'resources', 'locales')
  ]
  await Promise.all(candidateDirs.map(removeLocaleFiles))

  // 2. 清理未使用的资源图片
  await cleanupResourceImages(appOutDir)
}
