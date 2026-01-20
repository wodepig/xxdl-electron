<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { resolveIconFromEnv } from '@renderer/utils/icon-utils'
const appName = ref('')
const appDesc = ref('')
const appIcon = ref('')
const nowMsg = ref('正在初始化...')
const progress = ref(0)
const authorInfo = ref<AuthorInfo>({})
// 计算图片 URL（支持通过 VITE_AUTHOR_WX_IMG 切换）
const iconUrl = computed(() => {
  const url = resolveIconFromEnv(appIcon.value)
  return url
})
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
        appName.value = info.name
        appDesc.value = info.desc
        appIcon.value = info.icon
      } else {
        console.warn('window.api.getSystemInfo 不可用')
      }
    }, 200)
  } catch (error) {
    console.error('获取系统信息失败:', error)
  }
}

// 解析日志消息
const parseLogMessage = (raw: string): string => {
  // 日志格式: [时间] [类型] 消息
  const LOG_REG = /^\[(.*?)\]\s*\[(info|debug|warn|error)\]\s*(.*)$/
  const match = raw.match(LOG_REG)
  if (match) {
    return match[3].slice(0,30) // 返回消息部分
  }
  return raw // 如果不匹配格式，返回原始消息
}

// 监听最新日志
const attachLatestLogListener = (): void => {
  if (!window.api?.onLatestLog) {
    console.warn('onLatestLog API 不可用')
    return
  }

  window.api.onLatestLog((log: string) => {
    nowMsg.value = parseLogMessage(log)
  })
}

onMounted(() => {
  getAppInfo()
  attachLatestLogListener()

  const timer = setInterval(() => {
    if (progress.value >= 100) {
      clearInterval(timer)
    } else {
      progress.value += 3 + Math.random() * 6
    }
  }, 90)
})


</script>

<template>
  <div class="fixed inset-0 overflow-hidden bg-[#FAF9F6] text-gray-900">
    <!-- 柔和的装饰块 -->
    <div
      class="absolute -top-[20vh] -left-[20vw] w-[140vw] h-[70vh]
             bg-[#B8D4E8] rotate-[-8deg]"
    />

    <!-- 橙色装饰方块（右下角） + 漂浮动画 -->
    <div
      class="absolute bottom-[-40vh] right-[-15vw]
             w-[80vw] max-w-[900px] h-[70vh]
             bg-[#FFB6A3] rotate-[12deg]
             animate-[floatRed_6s_ease-in-out_infinite]"
    />

    <!-- 右上角符号替换 -->
    <div class="absolute top-8 right-8 text-6xl font-black text-gray-900 opacity-50">
      🛠️
    </div>

    <!-- 点阵装饰 -->
    <div class="absolute top-24 left-24 grid grid-cols-6 gap-2 opacity-20">
      <span
        v-for="i in 36"
        :key="i"
        class="w-1.5 h-1.5 bg-gray-900 rounded-full"
      />
    </div>

    <!-- 主内容 -->
    <div class="relative z-10 h-full flex flex-col justify-between p-8 md:p-16">
      <!-- 上半区 -->
      <div class="max-w-xl space-y-8">
        <!-- Logo -->
        <div
          class="inline-flex items-center justify-center
                 w-20 h-20 bg-gray-900 text-white
                 text-3xl font-black tracking-tight border-4 border-gray-900
                 animate-[drift_6s_ease-in-out_infinite]"
        >
          <img :src="iconUrl" alt="应用图标" class="w-full h-full object-contain p-1" />
        </div>

        <!-- 标题 -->
        <h1 class="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight">
          {{ appName }}
        </h1>

        <!-- 描述 -->
        <p class="text-base md:text-lg max-w-md text-gray-800 font-medium">
          {{ appDesc }}
        </p>
      </div>

      <!-- 底部加载 -->
      <div class="max-w-md space-y-4">
        <div class="flex justify-between text-sm font-bold">
          <span>{{ nowMsg }}</span>
          <span>{{ Math.min(progress, 100).toFixed(0) }}%</span>
        </div>

        <div class="h-3 bg-gray-900/20 border-2 border-gray-900 overflow-hidden">
          <div
            class="h-full bg-gray-900 transition-all duration-300"
            :style="{ width: `${Math.min(progress, 100)}%` }"
          />
        </div>

        <div class="text-xs font-bold tracking-wide text-gray-700">
          Electron · 2026
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(6px, -6px); }
}

/* 右下方块漂浮动画 */
@keyframes floatRed {
  0%, 100% { transform: translateY(0) rotate(12deg); }
  50% { transform: translateY(-12px) rotate(12deg); }
}
</style>
