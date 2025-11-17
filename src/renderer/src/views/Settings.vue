<template>
  <div class="settings-container">
    <header class="settings-header">
      <h1>设置</h1>
    </header>
    <main class="settings-main">
      <!-- 更新频率设置 -->
      <div class="card">
        <h2>更新频率</h2>
        <div class="radio-group">
          <label class="radio-item">
            <input
              type="radio"
              name="updateFrequency"
              value="onStart"
              v-model="settings.updateFrequency"
            />
            <span>每次启动时</span>
          </label>
          <label class="radio-item">
            <input
              type="radio"
              name="updateFrequency"
              value="never"
              v-model="settings.updateFrequency"
            />
            <span>从不更新</span>
          </label>
          <label class="radio-item">
            <input
              type="radio"
              name="updateFrequency"
              value="daily"
              v-model="settings.updateFrequency"
            />
            <span>每天更新一次</span>
          </label>
        </div>
      </div>

      <!-- 启动后操作设置 -->
      <div class="card">
        <h2>启动后操作</h2>
        <div class="checkbox-group">
          <div class="checkbox-with-select">
            <label class="checkbox-item">
              <input
                type="checkbox"
                value="openBrowser"
                v-model="settings.startupActions"
              />
              <span>启动后打开浏览器</span>
            </label>
            <div v-if="settings.startupActions.includes('openBrowser')" class="browser-select-wrapper">
              <label class="select-label">选择浏览器类型：</label>
              <select v-model="settings.browserType" class="browser-select">
                <option value="default">默认浏览器</option>
                <option value="chrome">Chrome</option>
                <option value="edge">Edge</option>
                <option value="360">360浏览器</option>
                <option value="firefox">Firefox</option>
                <option value="safari">Safari</option>
              </select>
            </div>
          </div>
          <label class="checkbox-item">
            <input
              type="checkbox"
              value="sendNotification"
              v-model="settings.startupActions"
            />
            <span>启动后发送通知</span>
          </label>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="card button-card">
        <div class="button-group">
          <button class="reset-button" @click="resetSettings">重置应用</button>
          <button class="save-button" @click="saveSettings">保存设置</button>
          <button class="cancel-button" @click="closeWindow">关闭</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

type BrowserType = 'default' | 'chrome' | 'edge' | '360' | 'firefox' | 'safari'

type Settings = {
  updateFrequency: 'onStart' | 'never' | 'daily'
  startupActions: string[]
  browserType: BrowserType
}

const defaultSettings: Settings = {
  updateFrequency: 'onStart',
  startupActions: [],
  browserType: 'default'
}

const allowedUpdateFrequencies: Settings['updateFrequency'][] = ['onStart', 'never', 'daily']
const allowedBrowserTypes: BrowserType[] = ['default', 'chrome', 'edge', '360', 'firefox', 'safari']

const settings = ref<Settings>({ ...defaultSettings })

const normalizeSettings = (incoming: Partial<Settings> = {}): Settings => {
  const updateFrequency = incoming.updateFrequency
  const browserType = incoming.browserType
  return {
    updateFrequency: allowedUpdateFrequencies.includes(updateFrequency as Settings['updateFrequency'])
      ? (updateFrequency as Settings['updateFrequency'])
      : defaultSettings.updateFrequency,
    startupActions: Array.isArray(incoming.startupActions) ? [...incoming.startupActions] : [],
    browserType: allowedBrowserTypes.includes(browserType as BrowserType)
      ? (browserType as BrowserType)
      : defaultSettings.browserType
  }
}

// 加载设置
const loadSettings = async (): Promise<void> => {
  try {
    if (window.api?.getSettings) {
      const savedSettings = await window.api.getSettings()
      settings.value = normalizeSettings(savedSettings as Partial<Settings>)
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

// 保存设置
const saveSettings = async (): Promise<void> => {
  try {
    if (window.api?.saveSettings) {
      // 确保数据是可序列化的：创建新的纯数据对象
      const settingsToSave: { updateFrequency: string; startupActions: string[]; browserType: string } = {
        updateFrequency: String(settings.value.updateFrequency),
        startupActions: Array.isArray(settings.value.startupActions) 
          ? [...settings.value.startupActions].map(String)
          : [],
        browserType: String(settings.value.browserType || 'default')
      }
      
      const result = await window.api.saveSettings(settingsToSave)
      console.log(result);
      
      if (result.success) {
        // 使用 Electron 的 dialog 显示消息
        if (window.api?.showMessage) {
          await window.api.showMessage('设置已保存', 'success')
        } else {
          alert('设置已保存')
        }
      } else {
        if (window.api?.showMessage) {
          await window.api.showMessage('保存设置失败', 'error')
        } else {
          alert('保存设置失败')
        }
      }
    }
  } catch (error) {
    console.error('保存设置失败:', error)
    if (window.api?.showMessage) {
      await window.api.showMessage('保存设置失败: ' + (error as Error).message, 'error')
    } else {
      alert('保存设置失败')
    }
  }
}

// 关闭窗口
const closeWindow = (): void => {
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.send('close-settings-window')
  } else {
    window.close()
  }
}

const resetSettings = async (): Promise<void> => {
  const confirmed = window.confirm('确定要重置应用设置并清空已保存的数据吗？此操作不可撤销。')
  if (!confirmed) {
    return
  }

  try {
    if (!window.api?.resetSettings) {
      throw new Error('resetSettings 接口不可用')
    }

    const result = await window.api.resetSettings()
    if (result.success && result.settings) {
      settings.value = normalizeSettings(result.settings as Partial<Settings>)
      if (window.api?.showMessage) {
        await window.api.showMessage('应用设置已恢复默认', 'success')
      } else {
        alert('应用设置已恢复默认')
      }
    } else {
      const errorMsg = result.error || '未知错误'
      if (window.api?.showMessage) {
        await window.api.showMessage(`重置失败: ${errorMsg}`, 'error')
      } else {
        alert(`重置失败: ${errorMsg}`)
      }
    }
  } catch (error) {
    console.error('重置设置失败:', error)
    if (window.api?.showMessage) {
      await window.api.showMessage('重置设置失败: ' + (error as Error).message, 'error')
    } else {
      alert('重置设置失败')
    }
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-container {
  min-height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  flex-direction: column;
}

.settings-header {
  color: white;
  padding: 24px 32px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.settings-header h1 {
  font-size: 1.8rem;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.settings-main {
  flex: 1;
  width: 100%;
  padding: 24px 32px 32px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.card {
  background: rgba(255, 255, 255, 0.96);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
}

.card h2 {
  color: #333;
  margin: 0 0 16px 0;
  font-size: 1.2rem;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

/* 单选框组 */
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.radio-item:hover {
  background-color: rgba(102, 126, 234, 0.1);
}

.radio-item input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #667eea;
}

.radio-item span {
  color: #333;
  font-size: 0.95rem;
  user-select: none;
}

/* 复选框组 */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.checkbox-item:hover {
  background-color: rgba(102, 126, 234, 0.1);
}

.checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #667eea;
}

.checkbox-item span {
  color: #333;
  font-size: 0.95rem;
  user-select: none;
}

/* 带下拉框的复选框 */
.checkbox-with-select {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.browser-select-wrapper {
  margin-left: 28px;
  padding: 12px;
  background: rgba(102, 126, 234, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(102, 126, 234, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-label {
  color: #555;
  font-size: 0.9rem;
  white-space: nowrap;
}

.browser-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  color: #333;
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.browser-select:hover {
  border-color: #667eea;
}

.browser-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

/* 按钮组 */
.button-card {
  padding: 16px;
}

.button-group {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.reset-button {
  margin-right: auto;
  background: transparent;
  color: #ff5f6d;
  border: 1px solid rgba(255, 95, 109, 0.4);
  padding: 10px 18px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.3s ease;
}

.reset-button:hover {
  background: rgba(255, 95, 109, 0.1);
  border-color: rgba(255, 95, 109, 0.8);
  transform: translateY(-1px);
}

.save-button,
.cancel-button {
  padding: 10px 24px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  border: none;
  font-weight: 500;
}

.save-button {
  background: #667eea;
  color: white;
}

.save-button:hover {
  background: #5a6fd8;
  transform: translateY(-1px);
}

.cancel-button {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.cancel-button:hover {
  background: rgba(102, 126, 234, 0.2);
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .settings-header {
    padding: 16px 20px 8px;
  }

  .settings-header h1 {
    font-size: 1.5rem;
  }

  .settings-main {
    padding: 16px 20px 20px;
    gap: 16px;
  }

  .card {
    padding: 16px;
  }

  .browser-select-wrapper {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .select-label {
    width: 100%;
  }

  .browser-select {
    width: 100%;
  }

  .button-group {
    flex-direction: column;
  }

  .save-button,
  .cancel-button {
    width: 100%;
  }
}
</style>

