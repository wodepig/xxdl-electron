<script setup lang="ts">
import AuthorInfo from '../components/AuthorInfo.vue'
import VersionInfo from '../components/VersionInfo.vue'
import { theme } from '@renderer/config/theme.config'

// 主题配置
const { bg, component, layout } = theme
</script>

<template>
  <div :class="component.pageContainer">
    <!-- 柔和的装饰块 - 降低透明度 -->
    <div :class="`absolute top-[-10vh] -left-[20vw] w-[90vw] h-[45vh] ${bg.accentBlueLight} opacity-20 rotate-[-10deg] -z-0`" />
    <div :class="`absolute bottom-[-15vh] -right-[25vw] w-[85vw] h-[50vh] ${bg.accentOrange} opacity-20 rotate-[10deg] -z-0`" />

    <!-- 主内容区 -->
    <div :class="component.pageContent">
      <!-- 标题 -->
      <div class="mb-10">
        <h1 :class="component.pageTitle">关于</h1>
        <div :class="component.titleUnderline" />
      </div>

      <!-- 内容区 -->
      <div :class="`${layout.maxWidthWide} space-y-6`">
        <VersionInfo>
          <AuthorInfo />
        </VersionInfo>
      </div>
    </div>
  </div>
</template>
