<script lang="ts" setup>
import { reactive, onMounted } from 'vue'
import { theme } from '@renderer/config/theme.config'

// 主题配置
const { text, component, layout } = theme

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
    <div :class="layout.grid2">
      <!-- 系统信息卡片 -->
      <div :class="component.card">
        <h2 :class="component.cardTitle">系统信息</h2>
        <div class="space-y-3">
          <div :class="`${layout.flexBetween} py-2 border-b border-gray-200`">
            <span :class="`font-bold text-sm ${text.muted}`">平台</span>
            <span :class="`font-black text-base ${component.infoTag}`">{{ versions.platform }}</span>
          </div>
          <div :class="`${layout.flexBetween} py-2 border-b border-gray-200`">
            <span :class="`font-bold text-sm ${text.muted}`">架构</span>
            <span :class="`font-black text-base ${component.infoTag}`">{{ versions.arch }}</span>
          </div>
          <div :class="`${layout.flexBetween} py-2`">
            <span :class="`font-bold text-sm ${text.muted}`">语言</span>
            <span :class="`font-black text-base ${component.infoTag}`">{{ versions.language }}</span>
          </div>
        </div>
      </div>

      <!-- 版本信息卡片 -->
      <div :class="component.card">
        <h2 :class="component.cardTitle">版本信息</h2>
        <div class="space-y-3">
          <div :class="`${layout.flexBetween} py-2 border-b border-gray-200`">
            <span :class="`font-bold text-sm ${text.muted}`">应用构建版本</span>
            <span :class="`font-black text-base ${component.warningTag}`">{{ versions.appVersion }}</span>
          </div>
          <div :class="`${layout.flexBetween} py-2 border-b border-gray-200`">
            <span :class="`font-bold text-sm ${text.muted}`">Electron</span>
            <span :class="`font-black text-base ${component.warningTag}`">{{ versions.electronVersion }}</span>
          </div>
          <div :class="`${layout.flexBetween} py-2 border-b border-gray-200`">
            <span :class="`font-bold text-sm ${text.muted}`">Node</span>
            <span :class="`font-black text-base ${component.warningTag}`">{{ versions.nodeVersion }}</span>
          </div>
          <div :class="`${layout.flexBetween} py-2`">
            <span :class="`font-bold text-sm ${text.muted}`">Chrome</span>
            <span :class="`font-black text-base ${component.warningTag}`">{{ versions.chromeVersion }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
