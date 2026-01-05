<template>
  <div class="about-container">
    <header class="about-header">
      <h1>关于</h1>
    </header>
    <main class="about-main">
      <VersionInfo>
        <AuthorInfo/>
      </VersionInfo>
      <!-- 关闭按钮 -->
      <div class="card button-card">
        <button class="back-button" @click="closeWindow">关闭</button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import AuthorInfo from '../components/AuthorInfo.vue'
import VersionInfo from '../components/VersionInfo.vue'
import {  onMounted } from 'vue'



const closeWindow = (): void => {
  // 关闭当前窗口
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('close-window','关于')
  } else {
    // 如果 IPC 不可用，尝试使用 window.close()
    window.close()
  }
}

onMounted(() => {
})
</script>

<style scoped>
.about-container {
  overflow: auto;
  min-height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  flex-direction: column;
}

.about-header {
  color: white;
  padding: 24px 32px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.about-header h1 {
  font-size: 1.8rem;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.about-main {
  flex: 1;
  width: 100%;
  padding: 16px 24px 24px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
}

.card h2 {
  color: #333;
  margin: 0 0 12px 0;
  font-size: 1.1rem;
  border-bottom: 2px solid #667eea;
  padding-bottom: 8px;
}



.compact-card h2 {
  font-size: 1rem;
  margin-bottom: 8px;
  padding-bottom: 6px;
}



.info-item strong {
  color: #555;
  margin-right: 8px;
  font-size: 0.85rem;
}

.info-item span {
  color: #333;
  font-weight: 500;
  text-align: right;
  word-break: break-all;
}

.compact-card .info-item {
  padding: 4px 0;
  font-size: 0.85rem;
}

.compact-card .info-item strong {
  font-size: 0.8rem;
}





/* 按钮卡片 */
.button-card {
  padding: 12px;
}

.back-button {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  width: 100%;
}

.back-button:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .about-header {
    padding: 16px 20px 8px;
  }

  .about-header h1 {
    font-size: 1.5rem;
  }

  .about-main {
    padding: 12px 16px 16px;
    gap: 12px;
  }


  .card {
    padding: 12px;
  }
}
</style>

