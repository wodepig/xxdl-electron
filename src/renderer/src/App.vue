<script setup lang="ts">
import Versions from './components/Versions.vue'
import LogViewer from './components/LogViewer.vue'

// 调试信息
console.log('window.electron:', window.electron)
console.log('window.api:', window.api)

const ipcHandle = (): void => {
  if (window.electron && window.electron.ipcRenderer) {
    window.electron.ipcRenderer.send('ping')
  } else {
    console.error('Electron API not available')
  }
}
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <img alt="logo" class="logo" src="./assets/electron.svg" />
      <h1>Electron 应用</h1>
    </header>
    
    <main class="app-main">
      <div class="welcome-section">
        <div class="creator">Powered by electron-vite</div>
        <div class="text">
          使用 <span class="vue">Vue</span> 和 <span class="ts">TypeScript</span> 构建 Electron 应用
        </div>
        <p class="tip">提示：按 <code>F12</code> 打开开发者工具</p>
      </div>
      
      <div class="actions-section">
        <button class="action-button" @click="ipcHandle">发送 IPC 消息</button>
        <a class="action-link" href="https://electron-vite.org/" target="_blank" rel="noreferrer">查看文档</a>
      </div>
      
      <div class="components-section">
        <Versions />
        <LogViewer />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.app-header {
  text-align: center;
  margin-bottom: 30px;
  color: white;
}

.app-header .logo {
  width: 100px;
  height: 100px;
  margin-bottom: 15px;
}

.app-header h1 {
  font-size: 2.5rem;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.welcome-section {
  text-align: center;
  margin-bottom: 30px;
}

.welcome-section .creator {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 10px;
}

.welcome-section .text {
  font-size: 1.1rem;
  color: #555;
  margin-bottom: 15px;
}

.welcome-section .vue {
  color: #42b883;
  font-weight: bold;
}

.welcome-section .ts {
  color: #3178c6;
  font-weight: bold;
}

.welcome-section .tip {
  background: #e3f2fd;
  padding: 10px 15px;
  border-radius: 8px;
  color: #1976d2;
  display: inline-block;
  margin: 15px 0;
}

.actions-section {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.action-button {
  background: #667eea;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.action-button:hover {
  background: #5a6fd8;
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.action-link {
  display: inline-block;
  background: #f5f5f5;
  color: #333;
  padding: 12px 24px;
  border-radius: 25px;
  text-decoration: none;
  font-size: 1rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.action-link:hover {
  background: #e0e0e0;
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
}

.components-section > div {
  margin-bottom: 30px;
}

.components-section > div:last-child {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .app-container {
    padding: 10px;
  }
  
  .app-main {
    padding: 20px;
  }
  
  .app-header h1 {
    font-size: 2rem;
  }
  
  .actions-section {
    flex-direction: column;
    align-items: center;
  }
  
  .action-button,
  .action-link {
    width: 80%;
    text-align: center;
  }
}
</style>
