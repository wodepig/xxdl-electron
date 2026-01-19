<script lang="ts" setup>
import { ref, reactive, nextTick, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
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
  console.log('绑定日志接受器')

  window.api.onUpdateLog(addLog)
  logListenerAttached = true
}
// 添加日志到日志列表
const addLog = (raw: string): void => {
  console.log('接受到发来的日志')
  let parsed: ParsedLog
  const match = raw.match(LOG_REG)
  if (match) {
    parsed = { time: match[1], type: match[2] as LogType, message: match[3] }
  } else {
    parsed = { time: new Date().toLocaleTimeString(), type: 'info', message: raw }
  }

  logs.push(parsed)
  // console.log('我来自渲染>>>')
  // console.debug('我来自渲染>>>')
  // 超过最大条数限制（仅当没有 hover）
  if (!hover.value && logs.length > MAX_LOGS) logs.shift()

  if (!hover.value) scrollToBottom()
}

function scrollToBottom() {
  nextTick(() => {
    if (containerRef.value) containerRef.value.scrollTop = containerRef.value.scrollHeight
  })
}

// 测试日志
// setInterval(() => {
//   const types: LogType[] = ['info', 'success', 'warn', 'error']
//   const type = types[Math.floor(Math.random() * types.length)]
//   // window.electron.ipcRenderer.send('add-log','我来自渲染进程','debug')
//   // log.info('我来自渲染进程')
//
//   addLog(`[${new Date().toISOString()}] [${type}] 测试日志 ${Math.floor(Math.random() * 100)}`)
// }, 1200)
onMounted(() => {
  initLogList()
  attachLogListener()
})
</script>

<template>
  <div class="relative w-screen h-screen p-6 bg-gray-100">
    <!-- 日志面板 -->
    <div
      ref="containerRef"
      class="w-full h-full bg-slate-800/90 rounded-xl p-4 font-mono text-sm text-slate-200 overflow-y-auto shadow-xl backdrop-blur-sm flex flex-col select-text transition-all"
      @mouseenter="hover = true"
      @mouseleave="hover = false"
    >
      <div
        v-for="(log, index) in logs"
        :key="index"
        class="flex gap-2 break-words py-1 px-2 rounded hover:bg-slate-700/30 transition-colors"
        :class="{
          'text-slate-200': log.type === 'info',
          'text-green-400': log.type === 'success',
          'text-yellow-400': log.type === 'warn',
          'text-red-400': log.type === 'error'
        }"
      >
        <span class="text-slate-400 shrink-0 font-semibold">[{{ log.time }}]</span>
        <span class="shrink-0 font-medium">[{{ log.type }}]</span>
        <span class="flex-1">{{ log.message }}</span>
      </div>
    </div>

    <!-- 右下角滚到底部按钮（加大版） -->
    <button
      @click="scrollToBottom"
      class="absolute bottom-6 right-6 bg-slate-700/80 hover:bg-slate-600/90 text-white p-4 text-xl rounded-full shadow-xl flex items-center justify-center transition-colors"
      title="滚到底部"
    >
      ⬇️
    </button>
  </div>
</template>
