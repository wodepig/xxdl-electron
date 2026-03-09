<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { resolveIconFromEnv } from '@renderer/utils/icon-utils'
import { theme } from '@renderer/config/theme.config'

// 主题配置
const { bg, text, animation } = theme

const router = useRouter()
const appName = ref('')
const appDesc = ref('')
const appIcon = ref('')
const nowMsg = ref('正在初始化...')
const progress = ref(0)
const authorInfo = ref<AuthorInfo>({})
const testPort = ref(3000)
const portCheckResult = ref<string>('')
let progressTimer: ReturnType<typeof setInterval> | null = null

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

// 监听初始化进度
const attachInitProgressListener = (): void => {
  if (!window.api?.onInitProgress) {
    console.warn('onInitProgress API 不可用')
    return
  }

  window.api.onInitProgress((payload: { progress: number; message: string }) => {
    progress.value = payload.progress
    if (payload.message) {
      nowMsg.value = payload.message
    }
  })
}



// 监听进度变化，当达到100%时跳转
watch(progress, (newVal) => {
  if (newVal >= 100) {
    // 进度完成，延迟跳转到关于页面
    setTimeout(() => {
      router.push('/about')
    }, 500)
  }
})

onMounted(() => {
  getAppInfo()
  attachLatestLogListener()
  attachInitProgressListener()

  // 如果没有主进程更新，使用默认的模拟进度
  progressTimer = setInterval(() => {
    if (progress.value >= 100) {
      if (progressTimer) {
        clearInterval(progressTimer)
        progressTimer = null
      }
    } else {
      // 只有在没有收到主进程进度更新时才自动增加
      progress.value += 0.5
    }
  }, 100)
})

onUnmounted(() => {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
})


// 测试端口占用检查
const handleCheckPort = async (): Promise<void> => {
  if (!window.api?.checkPortInUse) {
    portCheckResult.value = 'API 不可用'
    return
  }
  portCheckResult.value = '检查中...'
  try {
    const result = await window.api.checkPortInUse(testPort.value)
    if (result.success) {
      portCheckResult.value = result.inUse ? `端口 ${testPort.value} 已被占用` : `端口 ${testPort.value} 可用`
    } else {
      portCheckResult.value = `检查失败: ${result.error}`
    }
  } catch (error) {
    portCheckResult.value = `检查出错: ${(error as Error).message}`
  }
}
</script>

<template>
  <div :class="`fixed inset-0 overflow-hidden ${bg.primary} ${text.primary}`">
    <!-- 柔和的装饰块 -->
    <div
      :class="`absolute -top-[20vh] -left-[20vw] w-[140vw] h-[70vh] ${bg.accentBlue} rotate-[-8deg]`"
    />

    <!-- 橙色装饰方块（右下角） + 漂浮动画 -->
    <div
      :class="`absolute bottom-[-40vh] right-[-15vw] w-[80vw] max-w-[900px] h-[70vh] ${bg.accentOrange} rotate-[12deg] ${animation.float}`"
    />

    <!-- 右上角符号替换 -->
    <div :class="`absolute top-8 right-8 text-6xl font-black ${text.primary} opacity-50`">
      🛠️
    </div>

    <!-- 点阵装饰 -->
    <div :class="`absolute top-24 left-24 grid grid-cols-6 gap-2 opacity-20`">
      <span
        v-for="i in 36"
        :key="i"
        :class="`w-1.5 h-1.5 ${bg.gray900} rounded-full`"
      />
    </div>

    <!-- 主内容 -->
    <div class="relative z-10 h-full flex flex-col justify-between p-8 md:p-16">
      <!-- 上半区 -->
      <div class="max-w-xl space-y-8">
        <!-- Logo -->
        <div
          :class="`inline-flex items-center justify-center w-20 h-20 ${bg.gray900} ${text.inverse} text-3xl font-black tracking-tight border-4 border-gray-900 ${animation.drift}`"
        >
          <img :src="iconUrl" alt="应用图标" class="w-full h-full object-contain p-1" />
        </div>

        <!-- 标题 -->
        <h1 class="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight">
          {{ appName }}
        </h1>

        <!-- 描述 -->
        <p :class="`text-base md:text-lg max-w-md ${text.secondary} font-medium`">
          {{ appDesc }}
        </p>
      </div>

      <!-- 底部加载 -->
      <div class="max-w-md space-y-4">
        <div class="flex justify-between text-sm font-bold">
          <span>{{ nowMsg }}</span>
          <span>{{ Math.min(progress, 100).toFixed(0) }}%</span>
        </div>

        <div :class="`h-3 ${bg.gray900}/20 border-2 border-gray-900 overflow-hidden`">
          <div
            :class="`h-full ${bg.gray900} transition-all duration-300`"
            :style="{ width: `${Math.min(progress, 100)}%` }"
          />
        </div>

        <div :class="`text-xs font-bold tracking-wide ${text.muted}`">
          Electron · 2026
        </div>

        <!-- 端口测试区域 -->
        <div v-if="false" :class="`mt-6 p-4 ${bg.white}/50 border-2 border-gray-900 rounded-lg`">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm font-bold">端口测试:</span>
            <input
              v-model.number="testPort"
              type="number"
              :class="`w-24 px-2 py-1 text-sm border-2 border-gray-900 rounded`"
              placeholder="端口号"
            />
            <button
              :class="`px-3 py-1 text-sm font-bold ${text.inverse} ${bg.gray900} border-2 border-gray-900 rounded hover:bg-gray-700 transition-colors`"
              @click="handleCheckPort"
            >
              检查端口
            </button>
          </div>
          <div v-if="portCheckResult" :class="`text-sm font-medium ${text.secondary}`">
            结果: {{ portCheckResult }}
          </div>
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
