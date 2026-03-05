import { spawn } from 'child_process'
import { shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import log from 'electron-log/main'

/**
 * 浏览器路径配置（Windows 平台）
 */
const WINDOWS_BROWSER_PATHS: { [key: string]: string[] } = {
  chrome: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ],
  edge: [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe')
  ],
  '360': [
    'C:\\Users\\' +
      (process.env.USERNAME || '') +
      '\\AppData\\Roaming\\360se6\\Application\\360se.exe',
    'C:\\Program Files\\360\\360se\\360se.exe',
    'C:\\Program Files (x86)\\360\\360se\\360se.exe'
  ],
  firefox: [
    'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
  ],
  safari: [] // Safari 主要在 macOS 上
}

/**
 * macOS 浏览器应用名称
 */
const MACOS_BROWSER_NAMES: { [key: string]: string[] } = {
  chrome: ['Google Chrome', 'Google Chrome.app'],
  edge: ['Microsoft Edge', 'Microsoft Edge.app'],
  firefox: ['Firefox', 'Firefox.app'],
  safari: ['Safari', 'Safari.app'],
  '360': [] // 360 浏览器在 macOS 上不常见
}

/**
 * Linux 浏览器命令
 */
const LINUX_BROWSER_COMMANDS: { [key: string]: string[] } = {
  chrome: ['google-chrome', 'chromium-browser', 'chromium'],
  edge: ['microsoft-edge', 'microsoft-edge-stable'],
  firefox: ['firefox'],
  safari: [], // Safari 不在 Linux 上
  '360': [] // 360 浏览器在 Linux 上不常见
}

/**
 * 根据浏览器类型打开 URL
 * @param url 目标 URL
 * @param browserType 浏览器类型（default, chrome, edge, firefox, safari, 360）
 */
export function openBrowserWithType(url: string, browserType: string = 'default'): void {
  const targetUrl = url || 'http://localhost:3000'

  if (browserType === 'default' || !browserType) {
    shell.openExternal(targetUrl)
    return
  }

  const platform = process.platform
  const normalizedType = browserType.toLowerCase()

  switch (platform) {
    case 'win32':
      openBrowserOnWindows(targetUrl, normalizedType)
      break
    case 'darwin':
      openBrowserOnMacOS(targetUrl, normalizedType)
      break
    default:
      openBrowserOnLinux(targetUrl, normalizedType)
      break
  }
}

/**
 * Windows 平台打开浏览器
 */
function openBrowserOnWindows(url: string, browserType: string): void {
  const paths = WINDOWS_BROWSER_PATHS[browserType] || []
  let browserPath = ''

  for (const path of paths) {
    if (existsSync(path)) {
      browserPath = path
      break
    }
  }

  if (browserPath) {
    spawn(browserPath, [url], { detached: true })
  } else {
    log.warn(`未找到浏览器: ${browserType}，使用默认浏览器`)
    shell.openExternal(url)
  }
}

/**
 * macOS 平台打开浏览器
 */
function openBrowserOnMacOS(url: string, browserType: string): void {
  const appNames = MACOS_BROWSER_NAMES[browserType] || []
  let opened = false

  for (const appName of appNames) {
    try {
      spawn('open', ['-a', appName, url], { detached: true })
      opened = true
      break
    } catch (e) {
      // 继续尝试下一个
    }
  }

  if (!opened) {
    log.warn(`未找到浏览器: ${browserType}，使用默认浏览器`)
    shell.openExternal(url)
  }
}

/**
 * Linux 平台打开浏览器
 */
function openBrowserOnLinux(url: string, browserType: string): void {
  const commands = LINUX_BROWSER_COMMANDS[browserType] || []

  if (commands.length > 0) {
    try {
      spawn(commands[0], [url], { detached: true })
      return
    } catch (e) {
      // 如果失败，尝试其他命令或使用默认浏览器
    }
  }

  log.warn(`未找到浏览器: ${browserType}，使用默认浏览器`)
  shell.openExternal(url)
}
