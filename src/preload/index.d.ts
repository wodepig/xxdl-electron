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

type RendererAPI = {
  onUpdateLog: (callback: (log: string) => void) => void
  removeUpdateLogListener: () => void
  getSystemInfo: () => SystemInfo
  getVersions: () => VersionInfo
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: RendererAPI
  }
}

export {}
