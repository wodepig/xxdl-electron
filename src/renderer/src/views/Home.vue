<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, nextTick ,computed} from 'vue'

type SystemInfo = {
  platform: string
  arch: string
  language: string
}

type VersionInfo = {
  app: string
  electron: string
  chrome: string
  node: string
}
const appInfo = ref({
  name: import.meta.env.VITE_APP_NAME || '应用名称',
  icon: import.meta.env.VITE_APP_ICON || '../assets/image/electron.svg',
  desc: import.meta.env.VITE_APP_DESC || '应用描述',
  home: import.meta.env.VITE_APP_HOME || '应用首页',
})
const systemInfo = reactive<SystemInfo>({
  platform: '未知',
  arch: '未知',
  language: '未知'
})

const versions = reactive<VersionInfo>({
  app: '1.0.0',
  electron: 'N/A',
  chrome: 'N/A',
  node: 'N/A'
})

type DownloadProgressPayload = {
  visible: boolean
  progress: number
  isDownloading: boolean
}

const logs = ref<string[]>([])
const logContainer = ref<HTMLDivElement | null>(null)
const downloadProgress = ref(0)
const isDownloading = ref(false)
const showDownloadCard = ref(false)
// 预加载 assets/image 下的所有图片，确保打包后也包含
const imageAssets = import.meta.glob('../assets/image/*', {
  eager: true,
  import: 'default'
}) as Record<string, string>

const resolveIconFromEnv = (): string => {
  const raw = import.meta.env.VITE_APP_ICON?.trim() || ''
  const normalized = raw.replace(/^\/+/, '')
  if (!normalized) {
    return new URL('../assets/image/icon.png', import.meta.url).href
  }

  // env 中通常为 'image/shein.png' 这种形式
  const candidates = [
    `../assets/${normalized}`,
    `../assets/image/${normalized.replace(/^image\//, '')}`
  ]

  for (const key of Object.keys(imageAssets)) {
    if (candidates.some(c => key.endsWith(c.replace('..', '')))) {
      return imageAssets[key]
    }
  }

  // 找不到就退回默认图
  return new URL('../assets/image/icon.png', import.meta.url).href
}

// 计算图片 URL（支持通过 VITE_APP_ICON 切换）
const logoIconUrl = computed(() => {
  const url = resolveIconFromEnv()
  console.log('logoIconUrl ->', url)
  return url
})
const autoScroll = (): void => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

const appendLog = (message: string): void => {
  logs.value.push(message)
  autoScroll()
}

const getLogClass = (log: string): string => {
  if (log.includes('失败') || log.includes('错误') || log.includes('注意')) {
    return 'error'
  }
  if (log.includes('完成') || log.includes('成功')) {
    return 'success'
  }
  const infoText = ['开始','检查','下载','可用']
  if (infoText.filter(item => log.includes(item)).length > 0) {
    return 'info'
  }
  return 'default'
}

const hydrateSystemInfo = (): void => {
  try {

    
    // 延迟执行确保 preload 脚本已加载
    setTimeout(() => {
      if (window.api?.getSystemInfo) {
        const info = window.api.getSystemInfo()
        systemInfo.platform = info.platform || '未知'
        systemInfo.arch = info.arch || '未知'
        systemInfo.language = info.language || '未知'
        console.log('系统信息已加载:', info)
      } else {
        console.warn('window.api.getSystemInfo 不可用')
      }

      if (window.api?.getVersions) {
        const vers = window.api.getVersions()
        versions.app =     vers.app  || '1'
        versions.electron = vers.electron || 'N/A'
        versions.chrome = vers.chrome || 'N/A'
        versions.node = vers.node || 'N/A'
        console.log('版本信息已加载:', versions)
      } else {
        console.warn('window.api.getVersions 不可用')
      }
    }, 200)
  } catch (error) {
    console.error('获取系统信息失败:', error)
    appendLog('错误: 无法获取系统或版本信息')
  }
}

const handleLogUpdate = (log: string): void => {
  appendLog(log)
}

let logListenerAttached = false

const attachLogListener = (): void => {
  if (logListenerAttached) return

  if (!window.api?.onUpdateLog) {
    appendLog('错误: 无法连接到主进程日志接口')
    return
  }

  window.api.onUpdateLog(handleLogUpdate)
  logListenerAttached = true

  if (window.electron?.ipcRenderer?.send) {
    window.electron.ipcRenderer.send('renderer-ready')
    appendLog('日志监听器已连接')
  } else {
    appendLog('警告: 无法通知主进程渲染进程状态')
  }
}

const detachLogListener = (): void => {
  if (!logListenerAttached) return
  window.api?.removeUpdateLogListener?.()
  logListenerAttached = false
}

let downloadListenerAttached = false

const handleDownloadProgress = (payload: DownloadProgressPayload): void => {
  if (typeof payload.progress === 'number') {
    downloadProgress.value = Math.max(0, Math.min(100, payload.progress))
  }
  isDownloading.value = !!payload.isDownloading
  showDownloadCard.value = !!payload.visible
  if (!payload.visible) {
    setTimeout(() => {
      showDownloadCard.value = false
      isDownloading.value = false
      downloadProgress.value = 0
    }, 500)
  }
}

const attachDownloadListener = (): void => {
  if (downloadListenerAttached) return
  const registerDownloadProgress = window.api?.onDownloadProgress
  if (registerDownloadProgress) {
    registerDownloadProgress(handleDownloadProgress)
    downloadListenerAttached = true
  } else {
    console.warn('window.api.onDownloadProgress 不可用')
  }
}

const detachDownloadListener = (): void => {
  if (!downloadListenerAttached) return
  const removeListener = window.api?.removeDownloadProgressListener
  if (removeListener) {
    removeListener()
  }
  downloadListenerAttached = false
}

onMounted(() => {
  appendLog('应用启动中...')
  hydrateSystemInfo()
  appendLog('系统信息加载完成')
  attachLogListener()
  attachDownloadListener()
  // 根据需要显示下载卡片
  // triggerDownload()
})

onUnmounted(() => {
  detachLogListener()
  detachDownloadListener()
})
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="brand">
        <!-- <div style="object-position: bottom;"> -->
          <img style=" object-fit: contain;padding: 4px"   alt="logo" class="logo" :src="logoIconUrl" />
         
        <!-- </div> -->
        <div>
          <h1>{{ appInfo.name }}</h1>
          <p>{{ appInfo.desc }}</p>
        </div>
      </div>
    </header>

    <main class="app-main">
      <section class="info-grid">
        <div class="card system-info-card">
          <h2>系统信息</h2>
          <div class="info-item">
            <strong>平台:</strong>
            <span>{{ systemInfo.platform }}</span>
          </div>
          <div class="info-item">
            <strong>架构:</strong>
            <span>{{ systemInfo.arch }}</span>
          </div>
          <div class="info-item">
            <strong>语言:</strong>
            <span>{{ systemInfo.language }}</span>
          </div>
        </div>

        <div class="card version-info-card">
          <h2>版本信息</h2>
          <div class="info-item">
            <strong>应用版本:</strong>
            <span>{{ versions.app }}</span>
          </div>
          <div class="info-item">
            <strong>Electron:</strong>
            <span>{{ versions.electron }}</span>
          </div>
          <div class="info-item">
            <strong>Node:</strong>
            <span>{{ versions.node }}</span>
          </div>
          <div class="info-item">
            <strong>Chrome:</strong>
            <span>{{ versions.chrome }}</span>
          </div>
        </div>
      </section>

      <section class="card log-card">
        <div class="section-header">
          <h2>应用初始化日志</h2>
          <!-- <button @click="appendLog('1')">点我添加日志</button> -->
          <div v-if="showDownloadCard" class="progress-inline">
            <span class="progress-text">{{ downloadProgress }}%</span>
            <div class="progress-bar-inline">
              <div
                class="progress-fill"
                :style="{ width: downloadProgress + '%' }"
                :class="{ animated: isDownloading }"
              ></div>
            </div>
          </div>
        </div>
        <div class="log-container" ref="logContainer">
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="log-entry"
            :class="getLogClass(log)"
          >
            {{ log }}
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  color: white;
  padding: 24px 32px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.app-header .logo {
  width: 64px;
  height: 64px;
}

.app-header h1 {
  font-size: 1.8rem;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.app-header p {
  margin: 4px 0 0;
  opacity: 0.8;
}

.app-main {
  flex: 1;
  width: 100%;
  padding: 24px 32px 32px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow: hidden;
  min-height: 0;
}

.card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 14px;
  padding: 24px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
}

.card h2 {
  color: #333;
  margin: 0;
  font-size: 1.25rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item strong {
  color: #555;
  margin-right: 10px;
}

.info-item span {
  color: #333;
  font-weight: 500;
}

.log-card {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 320px;
  overflow: hidden;
  position: relative;
}

.log-container {
  flex: 1 1 0;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  padding: 14px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  border-radius: 10px;
  margin-top: 16px;
  min-height: 0;
  height: 0;
}

/* 确保滚动条可见 */
.log-container::-webkit-scrollbar {
  width: 8px;
}

.log-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.log-entry {
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.error {
  color: #d32f2f;
  font-weight: 500;
}

.log-entry.success {
  color: #388e3c;
}

.log-entry.info {
  color: #1976d2;
}

.log-entry.default {
  color: #666;
}

.progress-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 300px;
}

.progress-bar-inline {
  flex: 1;
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  min-width: 150px;
}

.progress-bar {
  width: 100%;
  height: 14px;
  background-color: #e9ecef;
  border-radius: 7px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s ease;
}

.progress-fill.animated {
  animation: pulse 1.5s infinite;
}

.progress-text {
  font-weight: bold;
  font-size: 0.9rem;
  color: #667eea;
  min-width: 45px;
  text-align: right;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .app-header {
    padding: 20px;
  }

  .brand {
    flex-direction: column;
    align-items: flex-start;
  }

  .app-main {
    padding: 20px;
  }

  .card {
    padding: 18px;
  }

  .progress-inline {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    min-width: auto;
    width: 100%;
  }

  .progress-bar-inline {
    width: 100%;
  }
}
</style>

