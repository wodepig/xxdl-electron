import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
// 添加调试日志
console.log('Preload script is loading...')
console.log('process.contextIsolated:', process.contextIsolated)
import StorePkg from 'electron-store';
//@ts-ignore
const Store = StorePkg.default || StorePkg;
const store = new Store();
// 获取系统信息和版本信息
const getSystemInfo = () => {
  return {
    platform: process.platform,
    arch: process.arch,
    language: navigator.language
  }
}

const getVersions = () => {
  return {
    app: store.get('distVersion', '1'), // 可以从package.json获取实际版本
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
}

// Custom APIs for renderer
const api = {
  onUpdateLog: (callback: (log: string) => void) => {
    console.log('onUpdateLog called')
    ipcRenderer.on('log-message', (_event, value) => callback(value))
  },
  
  removeUpdateLogListener: () => {
    console.log('removeUpdateLogListener called')
    // 移除所有日志监听器
    ipcRenderer.removeAllListeners('log-message')
  },
  
  // 添加获取系统信息和版本信息的方法
  getSystemInfo: getSystemInfo,
  getVersions: getVersions,
  
  // 添加导航监听
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on('navigate-to', (_event, path) => callback(path))
  },
  
  removeNavigateListener: () => {
    ipcRenderer.removeAllListeners('navigate-to')
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
