<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { resolveIconFromEnv } from '@renderer/utils/icon-utils'
import { theme } from '@renderer/config/theme.config'

// 主题配置
const { bg, text, component, layout } = theme

// 计算图片 URL（支持通过 VITE_AUTHOR_WX_IMG 切换）
const qrCodeUrl = computed(() => {
  const url = resolveIconFromEnv(authorInfo.value.qrCode)
  return url
})

const authorInfo = ref<AuthorInfo>({})
const links = ref<LinkInfo[]>([])

// 图片放大弹窗状态
const showImageModal = ref(false)
const modalImageUrl = ref('')

// 打开图片放大弹窗
const openImageModal = (url: string): void => {
  modalImageUrl.value = url
  showImageModal.value = true
}

// 关闭图片放大弹窗
const closeImageModal = (): void => {
  showImageModal.value = false
  modalImageUrl.value = ''
}

// 复制到剪贴板
const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
    if (window.api?.showNotification) {
      await window.api.showNotification('success', '复制成功', `已复制: ${text}`)
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
      if (window.api?.showNotification) {
        await window.api.showNotification('success', '复制成功', `已复制: ${text}`)
      } else {
        alert(`已复制: ${text}`)
      }
    } catch (fallbackErr) {
      if (window.api?.showNotification) {
        await window.api.showNotification('error', '复制失败', '复制失败，请手动复制')
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
        links.value = info.links || []
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

<template>
  <div class="space-y-6">
    <!-- 作者信息卡片 -->
    <div :class="component.card">
      <h2 :class="component.cardTitle">作者信息</h2>

      <div class="flex flex-col lg:flex-row gap-6">
        <!-- 左侧信息 -->
        <div class="flex-1 space-y-3">
          <div v-if="authorInfo.name" :class="`${layout.flexBetween} py-2.5 border-b border-gray-200`">
            <span :class="`font-bold text-sm ${text.muted}`">作者</span>
            <span :class="`font-black text-base ${text.primary}`">{{ authorInfo.name }}</span>
          </div>

          <div v-if="authorInfo.email" :class="`${layout.flexBetween} py-2.5 border-b border-gray-200`">
            <span :class="`font-bold text-sm ${text.muted}`">邮箱</span>
            <button @click="copyToClipboard(authorInfo.email!)"
              :class="`${component.tagButton} ${bg.accentBlue} ${text.primary}`"
              title="点击复制">
              {{ authorInfo.email }}
            </button>
          </div>

          <div v-if="authorInfo.website" :class="`${layout.flexBetween} py-2.5 border-b border-gray-200`">
            <span :class="`font-bold text-sm ${text.muted}`">网站</span>
            <button @click="copyToClipboard(authorInfo.website!)"
              :class="`${component.tagButton} ${bg.accentBlue} ${text.primary}`"
              title="点击复制">
              {{ authorInfo.website }}
            </button>
          </div>

          <div v-if="authorInfo.wx" :class="`${layout.flexBetween} py-2.5 border-b border-gray-200`">
            <span :class="`font-bold text-sm ${text.muted}`">微信</span>
            <button @click="copyToClipboard(authorInfo.wx!)"
              :class="`${component.tagButton} ${bg.accentBlue} ${text.primary}`"
              title="点击复制">
              {{ authorInfo.wx }}
            </button>
          </div>

          <div v-if="authorInfo.github" :class="`${layout.flexBetween} py-2.5`">
            <span :class="`font-bold text-sm ${text.muted}`">GitHub</span>
            <button @click="copyToClipboard(authorInfo.github!)"
              :class="`${component.tagButton} ${bg.accentBlue} ${text.primary}`"
              title="点击复制">
              {{ authorInfo.github }}
            </button>
          </div>
        </div>

        <!-- 右侧二维码 -->
        <div v-if="qrCodeUrl" class="flex flex-col items-center gap-3 lg:items-start">
          <div :class="`border-3 border-gray-900 ${bg.white} p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5`"
               @click="openImageModal(qrCodeUrl)"
               title="点击放大">
            <img :src="qrCodeUrl" alt="二维码" class="w-32 h-32 object-contain" />
          </div>
          <p :class="`text-xs font-bold ${bg.gray900} ${text.inverse} px-3 py-1.5 border-2 border-gray-900`">
            {{ authorInfo.qrLabel || '点击图片放大' }}
          </p>
        </div>
      </div>
    </div>

    <!-- 相关链接卡片 -->
    <div v-if="links.length > 0" :class="component.card">
      <h2 :class="component.cardTitle">相关链接</h2>

      <div :class="layout.grid3">
        <button v-for="(link, index) in links" :key="index" @click="copyToClipboard(link.url)"
          :class="`flex items-center gap-2 p-3 ${component.linkButton}`"
          title="点击复制链接">
          <span class="text-xl">{{ link.icon || '🔗' }}</span>
          <span class="text-sm font-black tracking-tight">{{ link.name }}</span>
        </button>
      </div>
    </div>
  </div>

  <!-- 图片放大弹窗 -->
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="showImageModal"
           class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
           @click="closeImageModal">
        <div class="relative p-4 bg-white border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]"
             @click.stop>
          <img :src="modalImageUrl" alt="放大图片" class="max-w-[80vw] max-h-[80vh] object-contain" />
          <button @click="closeImageModal"
                  class="absolute -top-3 -right-3 w-10 h-10 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-lg hover:bg-gray-700 transition-colors border-2 border-white shadow-lg"
                  title="关闭">
            ×
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
