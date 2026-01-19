import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// import { Conf } from 'electron-conf'
// import { getAppDir } from '../main/utils'
// import {getConfValue} from '../main/conf'
// 添加调试日志

/**
 * 获取应用和作者信息
 */
const getAppInfos = () =>{
  const auth = {
    name: import.meta.env.VITE_AUTHOR_NAME || '作者',
    email: import.meta.env.VITE_AUTHOR_EMAIL || '作者邮箱',
    website: import.meta.env.VITE_APP_HOME || '作者网站',
    wx: import.meta.env.VITE_AUTHOR_WX || '作者微信',
    github: import.meta.env.VITE_APP_AUTHOR_GITHUB || '作者GitHub',
    qrLabel: import.meta.env.VITE_AUTHOR_QRLABEL || '扫码联系',
    qrCode: import.meta.env.VITE_AUTHOR_WX_IMG || 'image/wx_qr.png'
  }
  let links = []
  const linksStr = import.meta.env.VITE_APP_LINKS || ''
  if (linksStr){
    links = linksStr
      .split(';')
      .filter((link) => link.trim())
      .map((link) => {
        const parts = link.trim().split('|')
        return {
          name: parts[1] || '链接',
          url: parts[2] || '#',
          icon: parts[0] || '🔗'
        }
      })
  }
  return {
    name: import.meta.env.VITE_APP_EXE_NAME || '应用名',
    desc: import.meta.env.VITE_APP_DESC || '_',
    icon: import.meta.env.VITE_APP_ICON || 'image/icon.png',
    links: links,
    auth: auth
  }
}
// 获取系统版本信息
const getSystemVersions = () => {
  console.log('作者:',import.meta.env.VITE_AUTHOR_NAME)
  const resp = {
    platform: process.platform,
    arch: process.arch,
    language: navigator.language,
    appVersion:  api.getConfValue({key:'appVersion',defaultValue:'1'}), // 可以从package.json获取实际版本
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node
  }
  return resp
}


// Custom APIs for renderer
const api = {
  // 记录日志
  onUpdateLog: (callback: (log: string) => void) => {
    ipcRenderer.on('log-message', (_event, value) => {
      callback(value)
    })
  },

  removeUpdateLogListener: () => {
    console.log('removeUpdateLogListener called')
    // 移除所有日志监听器
    ipcRenderer.removeAllListeners('log-message')
  },

  // 添加获取系统信息和版本信息的方法
  getSystemVersions: getSystemVersions,
  // 获取应用的信息和作者信息
  getAppInfos: getAppInfos,


  getConfValue: (conf:{key: string,defaultValue?: any,nameSpace?:string}) => {
    return ipcRenderer.send('get-conf-value', conf)
  },
  // 添加导航监听
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on('navigate-to', (_event, path) => callback(path))
  },

  removeNavigateListener: () => {
    ipcRenderer.removeAllListeners('navigate-to')
  },

  onDownloadProgress: (callback: (payload: { visible: boolean; progress: number; isDownloading: boolean }) => void) => {
    ipcRenderer.on('download-progress', (_event, payload) => callback(payload))
  },

  removeDownloadProgressListener: () => {
    ipcRenderer.removeAllListeners('download-progress')
  },

  // 设置相关 API
  getSettings: () => {
    return ipcRenderer.invoke('get-settings')
  },

  saveSettings: (settings: { updateFrequency: string; startupActions: string[]; browserType?: string }) => {
    return ipcRenderer.invoke('save-settings', settings)
  },

  // 重置设置
  resetSettings: () => {
    return ipcRenderer.invoke('reset-settings')
  },

  // 显示消息框
  showMessage: (message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
    return ipcRenderer.invoke('show-message', message, type)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
try {
  console.log('Attempting to expose APIs via contextBridge...')
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
  console.log('Successfully exposed APIs via contextBridge')
} catch (error) {
  console.error('Failed to expose APIs via contextBridge:', error)
  // Fallback to direct assignment
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  console.log('Fallback: Direct assignment of APIs to window object')
}
