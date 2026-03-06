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

type InitProgressPayload = {
  progress: number
  message: string
}

type NotificationData = {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  duration: number
  timestamp: number
}

type RendererAPI = {
  onUpdateLog: (callback: (log: string) => void) => void
  removeUpdateLogListener: () => void
  onLatestLog: (callback: (log: string) => void) => void
  removeLatestLogListener: () => void
  getSystemInfo: () => SystemInfo
  getVersions: () => VersionInfo
  onNavigate: (callback: (path: string) => void) => void
  removeNavigateListener: () => void
  getSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<{ success: boolean; error?: string }>
  checkPortInUse: (port: number) => Promise<{ success: boolean; inUse?: boolean; error?: string }>
  onInitProgress: (callback: (payload: InitProgressPayload) => void) => void
  removeInitProgressListener: () => void
  onAppNotification: (callback: (data: NotificationData) => void) => void
  removeAppNotificationListener: () => void
  showNotification: (type: 'info' | 'success' | 'warning' | 'error', title: string, message: string, duration?: number) => Promise<void>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: RendererAPI
  }
}

export {}
