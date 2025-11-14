import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      onUpdateLog: (callback: (log: string) => void) => void
      removeUpdateLogListener: () => void
    }
  }
}
