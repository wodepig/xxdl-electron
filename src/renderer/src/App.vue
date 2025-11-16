<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 监听来自主进程的导航请求
onMounted(() => {
  // 延迟执行确保 preload 脚本已加载
  setTimeout(() => {
    if (window.api?.onNavigate) {
      window.api.onNavigate((path: string) => {
        router.push(path)
      })
    } else {
      console.warn('window.api.onNavigate 不可用')
    }
  }, 200)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
