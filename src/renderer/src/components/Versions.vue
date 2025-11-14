<script setup lang="ts">
import { reactive } from 'vue'

// 安全地访问 window.electron.process.versions，提供默认值以防属性不存在
const versions = reactive({
  electron: window.electron?.process?.versions?.electron || 'N/A',
  chrome: window.electron?.process?.versions?.chrome || 'N/A',
  node: window.electron?.process?.versions?.node || 'N/A'
})
</script>

<template>
  <ul class="versions">
    <li class="electron-version">Electron v{{ versions.electron }}</li>
    <li class="chrome-version">Chromium v{{ versions.chrome }}</li>
    <li class="node-version">Node v{{ versions.node }}</li>
  </ul>
</template>
