<template>
  <div class="log-viewer">
    <h3>应用初始化日志</h3>
   
    <div class="log-container">
      <div 
        v-for="(log, index) in logs" 
        :key="index" 
        class="log-entry"
        :class="getLogClass(log)"
      >
        {{ log }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const logs = ref<string[]>([])

// 根据日志内容确定样式类
const getLogClass = (log: string): string => {
  if (log.includes('失败') || log.includes('错误')) {
    return 'error'
  } else if (log.includes('完成') || log.includes('成功')) {
    return 'success'
  } else if (log.includes('开始') || log.includes('检查') || log.includes('下载')) {
    return 'info'
  }
  return 'default'
}

// 接收主进程发送的日志
const handleLogUpdate = ( log: string): void => {
     logs.value.push(log)
  // 滚动到底部
  setTimeout(() => {
    const container = document.querySelector('.log-container')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, 0)
}




onMounted(() => {
  try {
    // 检查API是否存在
    console.log('Checking API availability...', window.api)
    console.log('Window object:', window)

    if (window.api && typeof window.api.onUpdateLog === 'function') {
      // 监听主进程发送的日志
      window.api.onUpdateLog(handleLogUpdate)
      
      // 通知主进程渲染进程已准备好
      if (window.electron && typeof window.electron.ipcRenderer.send === 'function') {
        window.electron.ipcRenderer.send('renderer-ready')
        logs.value.push('日志准备就绪')
      } else {
        console.error('无法通知主进程渲染进程准备就绪')
        logs.value.push('警告: 无法通知主进程渲染进程准备就绪')
      }
    } else {
      console.error('API not available or onUpdateLog is not a function')
      console.error('window.api:', window.api)
      logs.value.push('错误: 无法连接到主进程API')
      logs.value.push('API状态: ' + (window.api ? '存在' : '不存在'))
      if (window.api) {
        logs.value.push('onUpdateLog类型: ' + typeof window.api.onUpdateLog)
      }
    }
  } catch (error) {
    console.error('Failed to setup log listener:', error)
    logs.value.push('错误: 设置日志监听器失败')
    logs.value.push('错误详情: ' + (error as Error).message)
  }
})

onUnmounted(() => {
  // 检查API是否存在再移除监听器
  if (window.api && typeof window.api.removeUpdateLogListener === 'function') {
    window.api.removeUpdateLogListener()
  }
})
</script>

<style scoped>
.log-viewer {
  margin-top: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  background-color: #f9f9f9;
}

.log-viewer h3 {
  margin-top: 0;
  color: #333;
}

.log-container {
  height: 300px;
  overflow-y: auto;
  background-color: #fff;
  border: 1px solid #eee;
  padding: 10px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.log-entry {
  padding: 5px 0;
  border-bottom: 1px solid #f0f0f0;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.error {
  color: #d32f2f;
  font-weight: bold;
}

.log-entry.success {
  color: #388e3c;
}

.log-entry.info {
  color: #1976d2;
}

.log-entry.default {
  color: #666;
}
</style>