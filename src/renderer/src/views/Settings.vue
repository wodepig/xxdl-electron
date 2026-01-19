<template>
  <div class="fixed inset-0 overflow-auto bg-[#FAF9F6]">
    <!-- 柔和的装饰块 - 降低透明度 -->
    <div class="absolute -top-[15vh] -right-[25vw] w-[100vw] h-[50vh] bg-[#A7C7E7] opacity-20 rotate-[8deg] -z-0" />
    <div class="absolute bottom-[-20vh] -left-[20vw] w-[80vw] h-[50vh] bg-[#FFB6A3] opacity-20 rotate-[-6deg] -z-0" />

    <!-- 主内容区 -->
    <div class="relative z-10 min-h-screen p-6 md:p-12">
      <!-- 标题 -->
      <div class="mb-10">
        <h1 class="text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-3">设置</h1>
        <div class="h-1.5 w-20 bg-gray-900" />
      </div>

      <!-- 设置卡片容器 -->
      <div class="max-w-4xl mx-auto space-y-6">
        <!-- 更新频率设置 -->
        <div class="bg-white border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8">
          <h2 class="text-2xl font-black mb-6 tracking-tight text-gray-900 pb-3 border-b-2 border-gray-900">更新频率</h2>
          <div class="space-y-3">
            <label
              v-for="option in updateFrequencyOptions"
              :key="option.value"
              class="flex items-center gap-4 p-4 border-2 border-gray-900 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              :class="settings.updateFrequency === option.value ? 'bg-[#B8D4E8] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'"
            >
              <input
                type="radio"
                name="updateFrequency"
                :value="option.value"
                v-model="settings.updateFrequency"
                class="w-5 h-5 accent-gray-900 cursor-pointer"
              />
              <span class="text-base font-bold text-gray-900">{{ option.label }}</span>
            </label>
          </div>
        </div>

        <!-- 启动后操作设置 -->
        <div class="bg-white border-4 border-gray-900 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8">
          <h2 class="text-2xl font-black mb-6 tracking-tight text-gray-900 pb-3 border-b-2 border-gray-900">启动后操作</h2>
          <div class="space-y-4">
            <div>
              <label
                class="flex items-center gap-4 p-4 border-2 border-gray-900 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                :class="settings.startupActions.includes('openBrowser') ? 'bg-[#FFD4C8] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'"
              >
                <input
                  type="checkbox"
                  value="openBrowser"
                  v-model="settings.startupActions"
                  class="w-5 h-5 accent-gray-900 cursor-pointer"
                />
                <span class="text-base font-bold text-gray-900">启动后打开浏览器</span>
              </label>

              <!-- 浏览器选择器 -->
              <div
                v-if="settings.startupActions.includes('openBrowser')"
                class="mt-4 ml-10 p-5 bg-gray-50 border-2 border-gray-900"
              >
                <label class="block text-sm font-bold mb-3 text-gray-900">选择浏览器类型：</label>
                <select
                  v-model="settings.browserType"
                  class="w-full p-3 border-3 border-gray-900 font-bold text-base bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer text-gray-900"
                >
                  <option value="default">默认浏览器</option>
                  <option value="chrome">Chrome</option>
                  <option value="edge">Edge</option>
                  <option value="360">360浏览器</option>
                  <option value="firefox">Firefox</option>
                  <option value="safari">Safari</option>
                </select>
              </div>
            </div>

            <label
              class="flex items-center gap-4 p-4 border-2 border-gray-900 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              :class="settings.startupActions.includes('sendNotification') ? 'bg-[#FFD4C8] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'"
            >
              <input
                type="checkbox"
                value="sendNotification"
                v-model="settings.startupActions"
                class="w-5 h-5 accent-gray-900 cursor-pointer"
              />
              <span class="text-base font-bold text-gray-900">启动后发送通知</span>
            </label>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            @click="resetSettings"
            class="px-6 py-3.5 bg-white border-3 border-gray-900 font-black text-base tracking-tight text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            重置应用
          </button>

          <button
            @click="saveSettings"
            class="flex-1 px-6 py-3.5 bg-[#B8D4E8] border-3 border-gray-900 font-black text-base tracking-tight text-gray-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
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

const updateFrequencyOptions = [
  { value: 'onStart', label: '每次启动时' },
  { value: 'never', label: '从不更新' },
  { value: 'daily', label: '每天更新一次' }
]

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
      const settingsToSave: { updateFrequency: string; startupActions: string[]; browserType: string } = {
        updateFrequency: String(settings.value.updateFrequency),
        startupActions: Array.isArray(settings.value.startupActions)
          ? [...settings.value.startupActions].map(String)
          : [],
        browserType: String(settings.value.browserType || 'default')
      }

      const result = await window.api.saveSettings(settingsToSave)

      if (result.success) {
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
        await window.api.showMessage('应用设置已恢复默认, 请重启', 'success')
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
