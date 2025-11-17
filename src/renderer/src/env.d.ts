/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_ICON?: string
  readonly VITE_APP_DESC?: string
  readonly VITE_APP_HOME?: string
  readonly VITE_APP_AUTHOR_NAME?: string
  readonly VITE_APP_AUTHOR_EMAIL?: string
  readonly VITE_APP_AUTHOR_WEBSITE?: string
  readonly VITE_APP_AUTHOR_GITHUB?: string
  readonly VITE_APP_AUTHOR_QRCODE?: string
  readonly VITE_APP_AUTHOR_QRLABEL?: string
  readonly VITE_APP_LINKS?: string
  // more env variables...
}

interface Window {
  electron?: any
  api?: {
    onUpdateLog?: (callback: (log: string) => void) => void
    removeUpdateLogListener?: () => void
    getSystemInfo?: () => { platform: string; arch: string; language: string }
    getVersions?: () => Record<string, string>
    onNavigate?: (callback: (path: string) => void) => void
    removeNavigateListener?: () => void
    getSettings?: () => Promise<{
      updateFrequency: string
      startupActions: string[]
      browserType: string
    }>
    saveSettings?: (settings: {
      updateFrequency: string
      startupActions: string[]
      browserType?: string
    }) => Promise<{ success: boolean }>
    resetSettings?: () => Promise<{
      success: boolean
      settings?: {
        updateFrequency: string
        startupActions: string[]
        browserType: string
      }
      error?: string
    }>
    showMessage?: (
      message: string,
      type?: 'info' | 'error' | 'warning' | 'success'
    ) => Promise<void>
  }
}