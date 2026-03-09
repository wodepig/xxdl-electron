<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast-item"
        :class="`toast-${toast.type}`"
      >
        <div class="toast-icon">
          <span v-if="toast.type === 'success'">✓</span>
          <span v-else-if="toast.type === 'error'">✗</span>
          <span v-else-if="toast.type === 'warning'">⚠</span>
          <span v-else>ℹ</span>
        </div>
        <div class="toast-content">
          <div class="toast-title">{{ toast.title }}</div>
          <div class="toast-message" v-html="formatMessage(toast.message)"></div>
        </div>
        <button class="toast-close" @click="removeToast(toast.id)">×</button>
        <div class="toast-progress" :style="{ animationDuration: `${toast.duration}ms` }"></div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Toast 数据类型
 */
interface ToastData {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  duration: number
  timestamp: number
}

/**
 * Toast 列表
 */
const toasts = ref<ToastData[]>([])

/**
 * 格式化消息（将换行符转为 <br>）
 */
const formatMessage = (message: string): string => {
  return message.replace(/\n/g, '<br>')
}

/**
 * 添加 Toast
 */
const addToast = (data: ToastData): void => {
  // 检查是否已存在相同 ID 的通知
  const exists = toasts.value.some(t => t.id === data.id)
  if (exists) return

  toasts.value.push(data)

  // 自动移除
  setTimeout(() => {
    removeToast(data.id)
  }, data.duration)
}

/**
 * 移除 Toast
 */
const removeToast = (id: string): void => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

/**
 * 监听主进程通知
 */
onMounted(() => {
  console.log('[ToastNotification] 组件挂载，注册通知监听器')
  if (window.api?.onAppNotification) {
    window.api.onAppNotification((data: ToastData) => {
      console.log('[ToastNotification] 收到通知:', data)
      addToast(data)
    })
    console.log('[ToastNotification] 通知监听器注册成功')
  } else {
    console.warn('window.api.onAppNotification 不可用')
  }
})

/**
 * 清理监听器
 */
onUnmounted(() => {
  if (window.api?.removeAppNotificationListener) {
    window.api.removeAppNotificationListener()
  }
})
</script>

<style scoped>
/* CSS 变量定义 - 可配置的主题色 */
:global(:root) {
  --toast-success-color: #52c41a;
  --toast-success-bg: #f6ffed;
  --toast-success-progress: #b7eb8f;
  --toast-error-color: #ff4d4f;
  --toast-error-bg: #fff2f0;
  --toast-error-progress: #ffccc7;
  --toast-warning-color: #faad14;
  --toast-warning-bg: #fffbe6;
  --toast-warning-progress: #ffe58f;
  --toast-info-color: #1890ff;
  --toast-info-bg: #e6f7ff;
  --toast-info-progress: #91d5ff;
  --toast-title-color: #262626;
  --toast-message-color: #595959;
  --toast-close-color: #8c8c8c;
  --toast-close-hover-color: #262626;
}

.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

.toast-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 300px;
  max-width: 400px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: auto;
  overflow: hidden;
}

.toast-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.toast-success::before {
  background: var(--toast-success-color);
}

.toast-error::before {
  background: var(--toast-error-color);
}

.toast-warning::before {
  background: var(--toast-warning-color);
}

.toast-info::before {
  background: var(--toast-info-color);
}

.toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.toast-success .toast-icon {
  background: var(--toast-success-bg);
  color: var(--toast-success-color);
}

.toast-error .toast-icon {
  background: var(--toast-error-bg);
  color: var(--toast-error-color);
}

.toast-warning .toast-icon {
  background: var(--toast-warning-bg);
  color: var(--toast-warning-color);
}

.toast-info .toast-icon {
  background: var(--toast-info-bg);
  color: var(--toast-info-color);
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--toast-title-color);
  margin-bottom: 4px;
}

.toast-message {
  font-size: 14px;
  color: var(--toast-message-color);
  line-height: 1.5;
}

.toast-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  margin: 0;
  background: none;
  border: none;
  font-size: 18px;
  color: var(--toast-close-color);
  cursor: pointer;
  transition: color 0.2s;
  flex-shrink: 0;
}

.toast-close:hover {
  color: var(--toast-close-hover-color);
}

.toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.1);
  animation: progress linear forwards;
}

.toast-success .toast-progress {
  background: var(--toast-success-progress);
}

.toast-error .toast-progress {
  background: var(--toast-error-progress);
}

.toast-warning .toast-progress {
  background: var(--toast-warning-progress);
}

.toast-info .toast-progress {
  background: var(--toast-info-progress);
}

@keyframes progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* 过渡动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
