<script lang="ts">
import { defineComponent, ref, watch, nextTick, PropType } from 'vue'

type LogType = 'info' | 'success' | 'warn' | 'error'

interface ParsedLog {
  time: string
  type: LogType
  message: string
}

const LOG_REG =
  /^\[(.*?)\]\s*\[(info|success|warn|error)\]\s*(.*)$/

export default defineComponent({
  name: 'LogList',
  props: {
    logs: {
      type: Array as PropType<string[]>,
      required: true
    },
    autoScroll: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const containerRef = ref<HTMLDivElement | null>(null)

    const parseLog = (line: string): ParsedLog => {
      const match = line.match(LOG_REG)
      if (!match) {
        return {
          time: '',
          type: 'info',
          message: line
        }
      }

      return {
        time: match[1],
        type: match[2] as LogType,
        message: match[3]
      }
    }

    watch(
      () => props.logs.length,
      async () => {
        if (!props.autoScroll) return
        await nextTick()
        const el = containerRef.value
        if (el) el.scrollTop = el.scrollHeight
      }
    )

    return {
      containerRef,
      parseLog
    }
  }
})
</script>

<template>
  <div
    ref="containerRef"
    class="h-72 overflow-y-auto rounded-lg bg-slate-900 p-3
           font-mono text-xs space-y-1"
  >
    <div
      v-for="(raw, index) in logs"
      :key="index"
      class="flex gap-2 break-all leading-relaxed"
      :class="{
        'text-slate-200': parseLog(raw).type === 'info',
        'text-green-400': parseLog(raw).type === 'success',
        'text-yellow-400': parseLog(raw).type === 'warn',
        'text-red-400': parseLog(raw).type === 'error'
      }"
    >
      <span class="text-slate-400 shrink-0">
        [{{ parseLog(raw).time }}]
      </span>
      <span class="shrink-0">
        [{{ parseLog(raw).type }}]
      </span>
      <span>
        {{ parseLog(raw).message }}
      </span>
    </div>
  </div>
</template>
