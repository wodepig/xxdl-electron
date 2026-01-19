<template>
  <div class="app-main">

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
          <span
            class="link copyable"
            @click="copyToClipboard(authorInfo.email!)"
            :title="'点击复制'"
            >{{ authorInfo.email }}</span
          >
        </div>
        <div class="info-item" v-if="authorInfo.website">
          <strong>网站:</strong>
          <span
            class="link copyable"
            @click="copyToClipboard(authorInfo.website!)"
            :title="'点击复制'"
            >{{ authorInfo.website }}</span
          >
        </div>
        <div class="info-item" v-if="authorInfo.wx">
          <strong>微信:</strong>
          <span
            class="link copyable"
            @click="copyToClipboard(authorInfo.wx!)"
            :title="'点击复制'"
            >{{ authorInfo.wx }}</span
          >
        </div>
        <div class="info-item" v-if="authorInfo.github">
          <strong>GitHub:</strong>
          <span
            class="link copyable"
            @click="copyToClipboard(authorInfo.github!)"
            :title="'点击复制'"
            >{{ authorInfo.github }}</span
          >
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { resolveIconFromEnv } from '@renderer/utils/icon-utils'




// 计算图片 URL（支持通过 VITE_AUTHOR_WX_IMG 切换）
const qrCodeUrl = computed(() => {
  const url = resolveIconFromEnv(authorInfo.value.qrCode)
  console.log('logoIconUrl ->', url)
  return url
})
const authorInfo = ref<AuthorInfo>({})

// 从环境变量读取相关链接（支持多个链接，用分号分隔）
let links: LinkInfo[] = []

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
const getAppInfo = (): void => {
  try {
    setTimeout(() => {
      if (window.api?.getAppInfos) {
        const info = window.api.getAppInfos()
        authorInfo.value.name = info.auth.name
        authorInfo.value.email = info.auth.email
        authorInfo.value.website = info.auth.website
        authorInfo.value.wx = info.auth.wx
        authorInfo.value.github = info.auth.github
        authorInfo.value.qrLabel = info.auth.qrLabel
        authorInfo.value.qrCode = info.auth.qrCode
        links = info.links
      } else {
        console.warn('window.api.getSystemInfo 不可用')
      }


    }, 200)
  } catch (error) {
    console.error('获取系统信息失败:', error)
  }
}
onMounted(() => {
  getAppInfo()
})
</script>

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
.about-header h1 {
  font-size: 1.8rem;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
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

@media (max-width: 768px) {
  .about-header h1 {
    font-size: 1.5rem;
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
