<template>
  <div class="space-y-6">
    <!-- 作者信息卡片 -->
    <div
      class="bg-white border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all">
      <h2 class="text-xl font-black mb-5 tracking-tight text-gray-900 pb-3 border-b-2 border-gray-900">作者信息</h2>

      <div class="flex flex-col lg:flex-row gap-6">
        <!-- 左侧信息 -->
        <div class="flex-1 space-y-3">
          <div v-if="authorInfo.name" class="flex justify-between items-center py-2.5 border-b border-gray-200">
            <span class="font-bold text-sm text-gray-700">作者</span>
            <span class="font-black text-base text-gray-900">{{ authorInfo.name }}</span>
          </div>

          <div v-if="authorInfo.email" class="flex justify-between items-center py-2.5 border-b border-gray-200">
            <span class="font-bold text-sm text-gray-700">邮箱</span>
            <button @click="copyToClipboard(authorInfo.email!)"
              class="font-bold text-xs bg-[#B8D4E8] text-gray-900 px-3 py-1.5 border-2 border-gray-900 hover:translate-x-0.5 hover:translate-y-0.5 transition-all active:translate-x-1 active:translate-y-1"
              title="点击复制">
              {{ authorInfo.email }}
            </button>
          </div>

          <div v-if="authorInfo.website" class="flex justify-between items-center py-2.5 border-b border-gray-200">
            <span class="font-bold text-sm text-gray-700">网站</span>
            <button @click="copyToClipboard(authorInfo.website!)"
              class="font-bold text-xs bg-[#B8D4E8] text-gray-900 px-3 py-1.5 border-2 border-gray-900 hover:translate-x-0.5 hover:translate-y-0.5 transition-all active:translate-x-1 active:translate-y-1"
              title="点击复制">
              {{ authorInfo.website }}
            </button>
          </div>

          <div v-if="authorInfo.wx" class="flex justify-between items-center py-2.5 border-b border-gray-200">
            <span class="font-bold text-sm text-gray-700">微信</span>
            <button @click="copyToClipboard(authorInfo.wx!)"
              class="font-bold text-xs bg-[#B8D4E8] text-gray-900 px-3 py-1.5 border-2 border-gray-900 hover:translate-x-0.5 hover:translate-y-0.5 transition-all active:translate-x-1 active:translate-y-1"
              title="点击复制">
              {{ authorInfo.wx }}
            </button>
          </div>

          <div v-if="authorInfo.github" class="flex justify-between items-center py-2.5">
            <span class="font-bold text-sm text-gray-700">GitHub</span>
            <button @click="copyToClipboard(authorInfo.github!)"
              class="font-bold text-xs bg-[#B8D4E8] text-gray-900 px-3 py-1.5 border-2 border-gray-900 hover:translate-x-0.5 hover:translate-y-0.5 transition-all active:translate-x-1 active:translate-y-1"
              title="点击复制">
              {{ authorInfo.github }}
            </button>
          </div>
        </div>

        <!-- 右侧二维码 -->
        <div v-if="qrCodeUrl" class="flex flex-col items-center gap-3 lg:items-start">
          <div class="border-3 border-gray-900 bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <img :src="qrCodeUrl" alt="二维码" class="w-32 h-32 object-contain" />
          </div>
          <p class="text-xs font-bold bg-gray-900 text-white px-3 py-1.5 border-2 border-gray-900">
            {{ authorInfo.qrLabel || '扫码联系' }}
          </p>
        </div>
      </div>
    </div>

    <!-- 相关链接卡片 -->
    <div v-if="links.length > 0"
      class="bg-white border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all">
      <h2 class="text-xl font-black mb-5 tracking-tight text-gray-900 pb-3 border-b-2 border-gray-900">相关链接</h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <button v-for="(link, index) in links" :key="index" @click="copyToClipboard(link.url)"
          class="flex items-center gap-2 p-3 bg-[#FFD4C8] text-gray-900 border-3 border-gray-900 font-bold shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          title="点击复制链接">
          <span class="text-xl">{{ link.icon || '🔗' }}</span>
          <span class="text-sm font-black tracking-tight">{{ link.name }}</span>
        </button>
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
  return url
})

const authorInfo = ref<AuthorInfo>({})
let links: LinkInfo[] = []

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
