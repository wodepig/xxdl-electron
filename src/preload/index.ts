import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
// import { Conf } from 'electron-conf'
// import { getAppDir } from '../main/utils'
// import {getConfValue} from '../main/conf'
// 添加调试日志
console.log('Preload script is loading...')
console.log('process.contextIsolated:', process.contextIsolated)

// 获取系统版本信息
const getSystemVersions = () => {
  console.log('getSystemVersions',import.meta.env.VITE_APP_NAME)
  return {
    platform: process.platform,
    arch: process.arch,
    language: navigator.language,
    app:  api.getConfValue({key:'appVersion',defaultValue:'1'}), // 可以从package.json获取实际版本
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
}


// Custom APIs for renderer
const api = {
  // 记录日志
  onUpdateLog: (callback: (log: string) => void) => {
    console.log('onUpdateLog called, 注册 log-message 监听器')
    ipcRenderer.on('log-message', (_event, value) => {
      console.log('从主进程接收到日志:', value)
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
