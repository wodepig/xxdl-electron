// 窗口工具类
import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { is } from '@electron-toolkit/utils'
// 创建窗口
export const createWindows =async  (name: string, parent?: BrowserWindow | null) =>{
  let pageUrl = '/about'
  if (name ==='设置'){
    pageUrl = '/settings'
  }
  if (name ==='版本'){
    pageUrl = '/version'
  }
  const defaultIcon = join(__dirname, getIconPath())
  // 创建新窗口
  let targetWindows = new BrowserWindow({
    width: 1000,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    resizable: true,
    icon:defaultIcon,
    minimizable: true,
    maximizable: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      devTools: true,
      contextIsolation: true
    },
    parent: parent || undefined, // 设置父窗口
    modal: false // 非模态窗口
  })

  // 窗口准备好后显示
  targetWindows.once('ready-to-show', () => {
    targetWindows?.show()
  })

  // 窗口关闭时清理引用
  targetWindows.on('closed', () => {
    // targetWindows = null
  })

  // 加载URL，使用hash路由
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    targetWindows.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${pageUrl}`)
  } else {
    // 生产环境：先加载文件，然后在页面加载完成后导航到 about 页面
    targetWindows.loadFile(join(__dirname, '../renderer/index.html'))
    targetWindows.webContents.once('did-finish-load', () => {
      targetWindows?.webContents.executeJavaScript(`
        if (window.location.hash !== '#${pageUrl}') {
          window.location.hash = '#${pageUrl}'
        }
      `)
    })
  }

  // 开发模式下打开开发者工具
  if (is.dev) {
    targetWindows.webContents.openDevTools()
  }
  return targetWindows

}

// 获取图标
function getIconPath(): string {
  let iconPath = '../../resources/image/icon.png'
  if(import.meta.env.VITE_APP_ICON){
    iconPath= '../../resources/'+ import.meta.env.VITE_APP_ICON
  }
  return iconPath
}
