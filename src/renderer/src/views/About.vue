<template>
  <div class="fixed inset-0 overflow-auto bg-[#FAF9F6]">
    <!-- 柔和的装饰块 - 降低透明度 -->
    <div class="absolute top-[-10vh] -left-[20vw] w-[90vw] h-[45vh] bg-[#A7C7E7] opacity-20 rotate-[-10deg] -z-0" />
    <div class="absolute bottom-[-15vh] -right-[25vw] w-[85vw] h-[50vh] bg-[#FFB6A3] opacity-20 rotate-[10deg] -z-0" />

    <!-- 主内容区 -->
    <div class="relative z-10 min-h-screen p-6 md:p-12">
      <!-- 标题 -->
      <div class="mb-10">
        <h1 class="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-3">关于</h1>
        <div class="h-1.5 w-20 bg-gray-900" />
      </div>

      <!-- 内容区 -->
      <div class="max-w-5xl mx-auto space-y-6">
        <VersionInfo>
          <AuthorInfo />
        </VersionInfo>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AuthorInfo from '../components/AuthorInfo.vue'
import VersionInfo from '../components/VersionInfo.vue'
import { onMounted } from 'vue'



onMounted(() => {
})
</script>
