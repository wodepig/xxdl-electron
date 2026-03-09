<script lang="ts" setup>
import { ref, reactive, nextTick, onMounted } from 'vue'
import { theme } from '@renderer/config/theme.config'

// 主题配置
const { bg, text, component, shadow } = theme

type LogType = 'info' | 'debug' | 'warn' | 'error'

interface ParsedLog {
  time: string
  type: LogType
  message: string
}

let logListenerAttached = false
const MAX_LOGS = 500
const logs = reactive<ParsedLog[]>([])
const containerRef = ref<HTMLDivElement | null>(null)
const hover = ref(false)
const LOG_REG = /^\[(.*?)\]\s*\[(info|debug|warn|error)\]\s*(.*)$/

const initLogList = () => {
  if (window.electron?.ipcRenderer?.send) {
    window.electron.ipcRenderer.send('log-list-ready')
    console.debug('日志监听器已连接')
  } else {
    console.debug('警告: 无法通知主进程渲染进程状态')
  }
}

// 用来接受主进程发送的日志
const attachLogListener = (): void => {
  if (logListenerAttached) return

  if (!window.api?.onUpdateLog) {
    console.warn('错误: 无法连接到主进程日志接口')
    return
  }

  window.api.onUpdateLog(addLog)
  logListenerAttached = true
}

// 添加日志到日志列表
const addLog = (raw: string): void => {
  let parsed: ParsedLog
  const match = raw.match(LOG_REG)
  if (match) {
    parsed = { time: match[1], type: match[2] as LogType, message: match[3] }
  } else {
    parsed = { time: new Date().toLocaleTimeString(), type: 'info', message: raw }
  }

  logs.push(parsed)

  // 超过最大条数限制（仅当没有 hover）
  if (!hover.value && logs.length > MAX_LOGS) logs.shift()

  if (!hover.value) scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    if (containerRef.value) containerRef.value.scrollTop = containerRef.value.scrollHeight
  })
}

onMounted(() => {
  initLogList()
  attachLogListener()
})
</script>

<template>
  <div :class="`fixed inset-0 ${bg.primary} overflow-hidden`">
    <!-- 柔和的装饰块 -->
    <div :class="`absolute -top-[12vh] -left-[15vw] w-[70vw] h-[40vh] ${bg.accentBlue} opacity-20 rotate-[-12deg] -z-0`" />
    <div :class="`absolute bottom-[-18vh] -right-[20vw] w-[75vw] h-[45vh] ${bg.accentOrange} opacity-20 rotate-[8deg] -z-0`" />

    <!-- 右上角装饰 -->
    <div :class="`absolute top-8 right-8 text-5xl opacity-40 ${text.primary}`">📋</div>

    <!-- 主内容区 -->
    <div class="relative z-10 h-full p-6 md:p-12 flex flex-col">
      <!-- 标题 -->
      <div class="mb-6">
        <h1 :class="component.pageTitle">日志列表</h1>
        <div :class="component.titleUnderline" />
      </div>

      <!-- 日志面板容器 -->
      <div :class="`${bg.white} border-4 border-gray-900 ${shadow.card} p-6 flex flex-col min-h-0 flex-1`">
        <div class="mb-4 flex items-center justify-between">
          <h2 :class="`text-xl font-black tracking-tight ${text.primary}`">实时日志</h2>
          <div class="flex items-center gap-2">
            <span :class="`text-sm font-bold ${component.infoTag}`">
              共 {{ logs.length }} 条
            </span>
          </div>
        </div>

        <!-- 日志内容区域 -->
        <div
          ref="containerRef"
          :class="component.logContainer"
          @mouseenter="hover = true"
          @mouseleave="hover = false"
        >
          <div
            v-for="(log, index) in logs"
            :key="index"
            :class="[component.logRow, {
              [text.success]: log.type === 'info',
              [text.info]: log.type === 'debug',
              [text.warning]: log.type === 'warn',
              [text.error]: log.type === 'error'
            }]"
          >
            <span class="shrink-0 font-bold opacity-60">[{{ log.time }}]</span>
            <span class="shrink-0 font-black uppercase text-xs self-center px-2 py-0.5 border border-current">
              {{ log.type }}
            </span>
            <span class="flex-1 break-words">{{ log.message }}</span>
          </div>

          <!-- 空状态 -->
          <div v-if="logs.length === 0" class="flex items-center justify-center h-full text-white/50">
            <div class="text-center">
              <div class="text-4xl mb-3">📝</div>
              <p class="font-bold">暂无日志</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 滚到底部按钮 -->
      <button
        @click="scrollToBottom"
        :class="`fixed bottom-8 right-8 w-14 h-14 ${bg.accentOrange} ${text.primary} border-4 border-gray-900 font-black text-2xl ${shadow.button} ${shadow.buttonHover} hover:-translate-y-1 transition-all ${shadow.buttonActive} active:translate-y-0 flex items-center justify-center`"
        title="滚到底部"
      >
        ⬇
      </button>
    </div>
  </div>
</template>
