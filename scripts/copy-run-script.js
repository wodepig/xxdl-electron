const { join } = require('path')
const { promises: fs } = require('fs')
const { exec } = require('child_process')
const { promisify } = require('util')

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

  const psScript = `
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut('${shortcutPath}')
    $Shortcut.TargetPath = '${targetPath}'
    $Shortcut.WorkingDirectory = '${appOutDir}'
    $Shortcut.Save()
  `

  try {
    await execAsync(`powershell -Command "${psScript}"`, { shell: 'powershell.exe' })
    console.log(`Created shortcut: ${shortcutPath}`)
  } catch (error) {
    console.error(`Failed to create shortcut: ${error.message}`)
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
