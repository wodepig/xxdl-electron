<script setup lang="ts">
import { ref, onMounted } from 'vue'

const progress = ref(0)

onMounted(() => {
  const timer = setInterval(() => {
    if (progress.value >= 100) {
      clearInterval(timer)
    } else {
      progress.value += 3 + Math.random() * 6
    }
  }, 90)
})
</script>
<!--
颜色:
FFEB3B-FF2E63
FFEB3B-FF2E63
-->
<template>
  <div class="fixed inset-0 overflow-hidden bg-[#F6F4EF] text-black">
    <!-- 不规则黄色大块 -->
    <div
      class="absolute -top-[20vh] -left-[20vw] w-[140vw] h-[70vh]
             bg-[#FFEB3B] rotate-[-8deg]"
    />

    <!-- 红色方块（右下角） + 漂浮动画 -->
    <div
      class="absolute bottom-[-40vh] right-[-15vw]
             w-[80vw] max-w-[900px] h-[70vh]
             bg-[#FF2E63] rotate-[12deg]
             animate-[floatRed_6s_ease-in-out_infinite]"
    />

    <!-- 右上角符号替换 -->
    <div class="absolute top-8 right-8 text-6xl font-black text-black opacity-70">
      🛠️
    </div>

    <!-- 点阵装饰 -->
    <div class="absolute top-24 left-24 grid grid-cols-6 gap-2 opacity-30">
      <span
        v-for="i in 36"
        :key="i"
        class="w-1.5 h-1.5 bg-black rounded-full"
      />
    </div>

    <!-- 主内容 -->
    <div class="relative z-10 h-full flex flex-col justify-between p-8 md:p-16">
      <!-- 上半区 -->
      <div class="max-w-xl space-y-8">
        <!-- Logo -->
        <div
          class="inline-flex items-center justify-center
                 w-20 h-20 bg-black text-white
                 text-3xl font-black tracking-tight
                 animate-[drift_6s_ease-in-out_infinite]"
        >
          NP
        </div>

        <!-- 标题 -->
        <h1 class="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight">
          BREAK<br />
          THE<br />
          FLOW
        </h1>

        <!-- 描述 -->
        <p class="text-base md:text-lg max-w-md">
          一个不循规蹈矩的桌面自动化平台。
          为速度、创造力与掌控感而生。
        </p>
      </div>

      <!-- 底部加载 -->
      <div class="max-w-md space-y-4">
        <div class="flex justify-between text-sm font-bold">
          <span>BOOTING SYSTEM</span>
          <span>{{ Math.min(progress, 100).toFixed(0) }}%</span>
        </div>

        <div class="h-3 bg-black/20 rounded-full overflow-hidden">
          <div
            class="h-full bg-black transition-all duration-300 rounded-full"
            :style="{ width: `${Math.min(progress, 100)}%` }"
          />
        </div>

        <div class="text-xs font-bold tracking-wide">
          NOVA DESKTOP · 2026
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

/* 红色右下方块漂浮动画 */
@keyframes floatRed {
  0%, 100% { transform: translateY(0) rotate(12deg); }
  50% { transform: translateY(-12px) rotate(12deg); }
}
</style>
