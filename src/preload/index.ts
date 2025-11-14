import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 添加调试日志
console.log('Preload script is loading...')
console.log('process.contextIsolated:', process.contextIsolated)

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
