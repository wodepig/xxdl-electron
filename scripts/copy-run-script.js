const { join } = require('path')
const { promises: fs } = require('fs')
const { exec } = require('child_process')
const { promisify } = require('util')
const { tmpdir } = require('os')

const execAsync = promisify(exec)

const exists = async (targetPath) => {
  try {
    await fs.access(targetPath)
    return true
  } catch (_) {
    return false
  }
}

const createShortcut = async (appOutDir, exeName) => {
  const shortcutPath = join(appOutDir, `${exeName}.lnk`)
  const targetPath = join(appOutDir, `${exeName}.exe`)

  // 写入临时 ps1 文件，添加 UTF-8 BOM 防止 PowerShell 以 GBK 解析乱码
  const psScript = `
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut('${shortcutPath}')
    $Shortcut.TargetPath = '${targetPath}'
    $Shortcut.WorkingDirectory = '${appOutDir}'
    $Shortcut.Save()
  `
  const tmpFile = join(tmpdir(), `create-shortcut-${Date.now()}.ps1`)
  await fs.writeFile(tmpFile, '\uFEFF' + psScript, 'utf8')

  try {
    await execAsync(`powershell -ExecutionPolicy Bypass -File "${tmpFile}"`)
    console.log(`Created shortcut: ${shortcutPath}`)
  } catch (error) {
    console.error(`Failed to create shortcut: ${error.message}`)
  } finally {
    await fs.rm(tmpFile, { force: true })
  }
}

module.exports = async (context) => {
  const appOutDir = context.appOutDir
  const sourceFile = join(context.outDir, '..', 'scripts', 'run-with-log.bat')
  const targetFile = join(appOutDir, 'run-with-log.bat')

  if (await exists(sourceFile)) {
    await fs.copyFile(sourceFile, targetFile)
    console.log(`Copied run-with-log.bat to ${appOutDir}`)
  } else {
    console.warn(`Source file not found: ${sourceFile}`)
  }

  if (process.platform === 'win32') {
    const productName = context.packager.appInfo.productName
    await createShortcut(appOutDir, productName)
  }
}
