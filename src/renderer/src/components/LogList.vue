<script lang="ts" setup>
import { ref, reactive, nextTick, onMounted } from 'vue'
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
  <div class="fixed inset-0 bg-[#FAF9F6] overflow-hidden">
    <!-- 柔和的装饰块 -->
    <div class="absolute -top-[12vh] -left-[15vw] w-[70vw] h-[40vh] bg-[#B8D4E8] opacity-20 rotate-[-12deg] -z-0" />
    <div class="absolute bottom-[-18vh] -right-[20vw] w-[75vw] h-[45vh] bg-[#FFB6A3] opacity-20 rotate-[8deg] -z-0" />

    <!-- 右上角装饰 -->
    <div class="absolute top-8 right-8 text-5xl opacity-40">📋</div>

    <!-- 主内容区 -->
    <div class="relative z-10 h-full p-6 md:p-12 flex flex-col">
      <!-- 标题 -->
      <div class="mb-6">
        <h1 class="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-3">日志列表</h1>
        <div class="h-1.5 w-24 bg-gray-900" />
      </div>

      <!-- 日志面板容器 -->
      <div class="flex-1 bg-white border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 flex flex-col min-h-0">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-xl font-black tracking-tight text-gray-900">实时日志</h2>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold bg-[#B8D4E8] text-gray-900 px-3 py-1 border-2 border-gray-900">
              共 {{ logs.length }} 条
            </span>
          </div>
        </div>

        <!-- 日志内容区域 -->
        <div
          ref="containerRef"
          class="flex-1 bg-gray-900 text-white font-mono text-sm overflow-y-auto border-4 border-gray-900 p-4 select-text min-h-0"
          @mouseenter="hover = true"
          @mouseleave="hover = false"
        >
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="flex gap-3 py-1 px-2 hover:bg-white/10 transition-colors border-b border-white/10"
            :class="{
              'text-green-400': log.type === 'info',
              'text-blue-400': log.type === 'debug',
              'text-yellow-300': log.type === 'warn',
              'text-red-400': log.type === 'error'
            }"
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
        class="fixed bottom-8 right-8 w-14 h-14 bg-[#FFB6A3] text-gray-900 border-4 border-gray-900 font-black text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center"
        title="滚到底部"
      >
        ⬇
      </button>
    </div>
  </div>
</template>
