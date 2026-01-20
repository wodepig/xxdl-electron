<script lang="ts" setup>
import { reactive, onMounted } from 'vue'

const versions = reactive<SystemVersion>({
  platform: '未知',
  arch: '未知',
  language: '未知',
  appVersion: 'N/A',
  electronVersion: 'N/A',
  chromeVersion: 'N/A',
  nodeVersion: 'N/A'
})

const hydrateSystemInfo = async (): Promise<void> => {
  try {
      if (window.api?.getSystemVersions) {
        const info = await window.api.getSystemVersions()
        versions.platform = info.platform || '未知'
        versions.arch = info.arch || '未知'
        versions.language = info.language || '未知'
        versions.appVersion = info.appVersion || '1'
        versions.electronVersion = info.electronVersion || 'N/A'
        versions.chromeVersion = info.chromeVersion || 'N/A'
        versions.nodeVersion = info.nodeVersion || 'N/A'
        console.log('获取系统信息成功:', info)
      } else {
        console.warn('window.api.getSystemInfo 不可用')
      }

  } catch (error) {
    console.error('获取系统信息失败:', error)
  }
}

onMounted(async () => {
  await hydrateSystemInfo()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Slot for additional content (AuthorInfo) -->
    <slot />

    <!-- 系统和版本信息网格 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 系统信息卡片 -->
      <div class="bg-white border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all">
        <h2 class="text-xl font-black mb-5 tracking-tight pb-3 border-b-2 border-gray-900 text-gray-900">系统信息</h2>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b border-gray-200">
            <span class="font-bold text-sm text-gray-700">平台</span>
            <span class="font-black text-base bg-[#B8D4E8] text-gray-900 px-3 py-1 border-2 border-gray-900">{{ versions.platform }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-200">
            <span class="font-bold text-sm text-gray-700">架构</span>
            <span class="font-black text-base bg-[#B8D4E8] text-gray-900 px-3 py-1 border-2 border-gray-900">{{ versions.arch }}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="font-bold text-sm text-gray-700">语言</span>
            <span class="font-black text-base bg-[#B8D4E8] text-gray-900 px-3 py-1 border-2 border-gray-900">{{ versions.language }}</span>
          </div>
        </div>
      </div>

      <!-- 版本信息卡片 -->
      <div class="bg-white border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 hover:-translate-y-0.5 hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)] transition-all">
        <h2 class="text-xl font-black mb-5 tracking-tight pb-3 border-b-2 border-gray-900 text-gray-900">版本信息</h2>
        <div class="space-y-3">
          <div class="flex justify-between items-center py-2 border-b border-gray-200">
            <span class="font-bold text-sm text-gray-700">应用构建版本</span>
            <span class="font-black text-base bg-[#FFD4C8] text-gray-900 px-3 py-1 border-2 border-gray-900">{{ versions.appVersion }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-200">
            <span class="font-bold text-sm text-gray-700">Electron</span>
            <span class="font-black text-base bg-[#FFD4C8] text-gray-900 px-3 py-1 border-2 border-gray-900">{{ versions.electronVersion }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-200">
            <span class="font-bold text-sm text-gray-700">Node</span>
            <span class="font-black text-base bg-[#FFD4C8] text-gray-900 px-3 py-1 border-2 border-gray-900">{{ versions.nodeVersion }}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="font-bold text-sm text-gray-700">Chrome</span>
            <span class="font-black text-base bg-[#FFD4C8] text-gray-900 px-3 py-1 border-2 border-gray-900">{{ versions.chromeVersion }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
