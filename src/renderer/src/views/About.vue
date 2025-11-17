<template>
  <div class="about-container">
    <header class="about-header">
      <h1>关于</h1>
    </header>
    <main class="about-main">
  

      <!-- 作者信息和联系方式 -->
      <div class="card author-card">
        <h2>作者信息</h2>
        <div class="author-content">
          <div class="author-info">
            <div class="info-item" v-if="authorInfo.name">
              <strong>作者:</strong>
              <span>{{ authorInfo.name }}</span>
            </div>
            <div class="info-item" v-if="authorInfo.email">
              <strong>邮箱:</strong>
              <span class="link copyable" @click="copyToClipboard(authorInfo.email!)" :title="'点击复制'">{{ authorInfo.email }}</span>
            </div>
            <div class="info-item" v-if="authorInfo.website">
              <strong>网站:</strong>
              <span class="link copyable" @click="copyToClipboard(authorInfo.website!)" :title="'点击复制'">{{ authorInfo.website }}</span>
            </div>
            <div class="info-item" v-if="authorInfo.wx">
              <strong>微信:</strong>
              <span class="link copyable" @click="copyToClipboard(authorInfo.wx!)" :title="'点击复制'">{{ authorInfo.wx }}</span>
            </div>
            <div class="info-item" v-if="authorInfo.github">
              <strong>GitHub:</strong>
              <span class="link copyable" @click="copyToClipboard(authorInfo.github!)" :title="'点击复制'">{{ authorInfo.github }}</span>
            </div>
          </div>
          <div class="qr-code-section" v-if="qrCodeUrl">
            <img :src="qrCodeUrl" alt="二维码" class="qr-code" />
            <p class="qr-label">{{ authorInfo.qrLabel || '扫码联系' }}</p>
          </div>
        </div>
      </div>

      <!-- 相关链接 -->
      <div class="card links-card" v-if="links.length > 0">
        <h2>相关链接</h2>
        <div class="links-grid">
          <div
            v-for="(link, index) in links"
            :key="index"
            @click="copyToClipboard(link.url)"
            class="link-item copyable"
            :title="'点击复制链接'"
          >
            <span class="link-icon">{{ link.icon || '🔗' }}</span>
            <span class="link-text">{{ link.name }}</span>
          </div>
        </div>
      </div>
    <!-- 紧凑的信息栏 -->
    <div class="info-grid">
        <div class="card compact-card">
          <h2>应用信息</h2>
          <div class="info-item">
            <strong>应用名称:</strong>
            <span>{{ appInfo.name }}</span>
          </div>
          <div class="info-item">
            <strong>版本:</strong>
            <span>{{ versions.app }}</span>
          </div>
          <div class="info-item">
            <strong>描述:</strong>
            <span>{{ appInfo.desc }}</span>
          </div>
        </div>

        <div class="card compact-card">
          <h2>技术信息</h2>
          <div class="info-item">
            <strong>Electron:</strong>
            <span>{{ versions.electron }}</span>
          </div>
          <div class="info-item">
            <strong>Chrome:</strong>
            <span>{{ versions.chrome }}</span>
          </div>
          <div class="info-item">
            <strong>Node:</strong>
            <span>{{ versions.node }}</span>
          </div>
        </div>

        <div class="card compact-card">
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
      </div>
      <!-- 关闭按钮 -->
      <div class="card button-card">
        <button class="back-button" @click="closeWindow">关闭</button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'

// 动态导入图片资源的辅助函数
const getImageUrl = (path: string): string => {
  if (!path) return ''
    try {
      return new URL(`${path}`, import.meta.url).href
    } catch (error) {
      console.error('加载图片失败:', error, path)
      return new URL('../public/image/wx_blank.png', import.meta.url).href
    }
}

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

type AuthorInfo = {
  name?: string
  email?: string
  website?: string
  wx?: string
  github?: string
  qrCode?: string
  qrLabel?: string
}

type LinkInfo = {
  name: string
  url: string
  icon?: string
}

const appInfo = ref({
  name: import.meta.env.VITE_APP_NAME || '应用名称',
  icon: import.meta.env.VITE_APP_ICON || '应用图标',
  desc: import.meta.env.VITE_APP_DESC || '应用描述',
  home: import.meta.env.VITE_APP_HOME || '应用首页',
})


// 计算二维码图片 URL
const qrCodeUrl = computed(() => {
  let envPath  = '../public/image/wx_blank.png'
  if(import.meta.env.VITE_AUTHOR_WX_IMG){
    envPath  = '../public/' + import.meta.env.VITE_AUTHOR_WX_IMG
  }

  return getImageUrl(envPath)
})

const authorInfo = ref<AuthorInfo>({
  name: import.meta.env.VITE_AUTHOR_NAME || '作者',
  email: import.meta.env.VITE_AUTHOR_EMAIL || '作者邮箱',
  website: import.meta.env.VITE_APP_HOME || '作者网站',
  wx: import.meta.env.VITE_AUTHOR_WX || '作者微信',
  github: import.meta.env.VITE_APP_AUTHOR_GITHUB || '作者GitHub',
  qrLabel: import.meta.env.VITE_AUTHOR_QRLABEL || '扫码联系'
})

// 从环境变量读取相关链接（支持多个链接，用分号分隔）
const links = computed<LinkInfo[]>(() => {
  const linksStr = import.meta.env.VITE_APP_LINKS || ''
  if (!linksStr) return []
  
  return linksStr.split(';').filter(link => link.trim()).map(link => {
    const parts = link.trim().split('|')
    return {
      name: parts[0] || '链接',
      url: parts[1] || '#',
      icon: parts[2] || '🔗'
    }
  })
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

const hydrateSystemInfo = (): void => {
  try {
    setTimeout(() => {
      if (window.api?.getSystemInfo) {
        const info = window.api.getSystemInfo()
        systemInfo.platform = info.platform || '未知'
        systemInfo.arch = info.arch || '未知'
        systemInfo.language = info.language || '未知'
      }

      if (window.api?.getVersions) {
        const vers = window.api.getVersions()
        versions.app = vers.app || '1'
        versions.electron = vers.electron || 'N/A'
        versions.chrome = vers.chrome || 'N/A'
        versions.node = vers.node || 'N/A'
      }
    }, 200)
  } catch (error) {
    console.error('获取系统信息失败:', error)
  }
}

// 复制到剪贴板
const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
    // 显示复制成功提示（可以使用更优雅的提示方式）
    if (window.api?.showMessage) {
          await window.api.showMessage(`已复制: ${text}`, 'success')
        } else {
          alert(`已复制: ${text}`)
        }
  } catch (err) {
    // 降级方案：使用传统方法
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      if (window.api?.showMessage) {
          await window.api.showMessage(`已复制: ${text}`, 'success')
        } else {
          alert(`已复制: ${text}`)
        }
      
    } catch (fallbackErr) {
      if (window.api?.showMessage) {
          await window.api.showMessage('复制失败，请手动复制', 'error')
        } else {
          alert('复制失败，请手动复制')
        }
      console.error('复制失败:', fallbackErr)
      
    }
  }
}

const closeWindow = (): void => {
  // 关闭当前窗口
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('close-about-window')
  } else {
    // 如果 IPC 不可用，尝试使用 window.close()
    window.close()
  }
}

onMounted(() => {
  hydrateSystemInfo()
})
</script>

<style scoped>
.about-container {
  min-height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  flex-direction: column;
}

.about-header {
  color: white;
  padding: 24px 32px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.about-header h1 {
  font-size: 1.8rem;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.about-main {
  flex: 1;
  width: 100%;
  padding: 16px 24px 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
}

.card h2 {
  color: #333;
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  border-bottom: 2px solid #667eea;
  padding-bottom: 8px;
}

/* 紧凑的信息栏 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.compact-card {
  padding: 12px;
}

.compact-card h2 {
  font-size: 1rem;
  margin-bottom: 8px;
  padding-bottom: 6px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item strong {
  color: #555;
  margin-right: 8px;
  font-size: 0.85rem;
}

.info-item span {
  color: #333;
  font-weight: 500;
  text-align: right;
  word-break: break-all;
}

.compact-card .info-item {
  padding: 4px 0;
  font-size: 0.85rem;
}

.compact-card .info-item strong {
  font-size: 0.8rem;
}

/* 作者信息卡片 */
.author-card {
  padding: 16px;
}

.author-content {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.author-info {
  flex: 1;
}

.qr-code-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.qr-code {
  width: 220px;
  height: 220px;
  border-radius: 8px;
  border: 2px solid #eee;
  background: white;
  padding: 4px;
}

.qr-label {
  font-size: 0.85rem;
  color: #666;
  margin: 0;
  text-align: center;
}

/* 链接样式 */
.link {
  color: #667eea;
  text-decoration: none;
  transition: color 0.3s ease;
}

.link:hover {
  color: #5a6fd8;
  text-decoration: underline;
}

/* 可复制的链接样式 */
.copyable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.copyable:hover {
  opacity: 0.8;
}

.copyable:active {
  opacity: 0.6;
}

/* 相关链接卡片 */
.links-card {
  padding: 16px;
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  text-decoration: none;
  color: #667eea;
  transition: all 0.3s ease;
  border: 1px solid rgba(102, 126, 234, 0.2);
  cursor: pointer;
}

.link-item:hover {
  background: rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
  border-color: #667eea;
}

.link-item:active {
  transform: translateY(0);
}

.link-icon {
  font-size: 1.2rem;
}

.link-text {
  font-weight: 500;
  font-size: 0.9rem;
}

/* 按钮卡片 */
.button-card {
  padding: 12px;
}

.back-button {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  width: 100%;
}

.back-button:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .about-header {
    padding: 16px 20px 8px;
  }

  .about-header h1 {
    font-size: 1.5rem;
  }

  .about-main {
    padding: 12px 16px 16px;
    gap: 12px;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .author-content {
    flex-direction: column;
    gap: 16px;
  }

  .qr-code {
    width: 100px;
    height: 100px;
  }

  .links-grid {
    grid-template-columns: 1fr;
  }

  .card {
    padding: 12px;
  }
}
</style>

