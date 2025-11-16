import { ElectronAPI } from '@electron-toolkit/preload'

export type SystemInfo = {
  platform: string
  arch: string
  language: string
}

export type VersionInfo = {
  app: string
  electron: string
  chrome: string
  node: string
}

type Settings = {
  updateFrequency: 'onStart' | 'never' | 'daily' | string
  startupActions: string[]
  browserType?: 'default' | 'chrome' | 'edge' | '360' | 'firefox' | 'safari' | string
}

type RendererAPI = {
  onUpdateLog: (callback: (log: string) => void) => void
  removeUpdateLogListener: () => void
  getSystemInfo: () => SystemInfo
  getVersions: () => VersionInfo
  onNavigate: (callback: (path: string) => void) => void
  removeNavigateListener: () => void
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<{ success: boolean; error?: string }>
  showMessage: (message: string, type?: 'info' | 'error' | 'warning' | 'success') => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: RendererAPI
  }
}

export {}
