<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { theme } from '@renderer/config/theme.config'

// 主题配置
const { bg, text, component, layout } = theme

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
        if (window.api?.showNotification) {
          await window.api.showNotification('success', '保存成功', '设置已保存')
        } else {
          alert('设置已保存')
        }
      } else {
        if (window.api?.showNotification) {
          await window.api.showNotification('error', '保存失败', '保存设置失败')
        } else {
          alert('保存设置失败')
        }
      }
    }
  } catch (error) {
    console.error('保存设置失败:', error)
    if (window.api?.showNotification) {
      await window.api.showNotification('error', '保存失败', (error as Error).message)
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
      if (window.api?.showNotification) {
        await window.api.showNotification('success', '重置成功', '应用设置已恢复默认，请重启')
      } else {
        alert('应用设置已恢复默认')
      }
    } else {
      const errorMsg = result.error || '未知错误'
      if (window.api?.showNotification) {
        await window.api.showNotification('error', '重置失败', `重置失败: ${errorMsg}`)
      } else {
        alert(`重置失败: ${errorMsg}`)
      }
    }
  } catch (error) {
    console.error('重置设置失败:', error)
    if (window.api?.showNotification) {
      await window.api.showNotification('error', '重置失败', '重置设置失败: ' + (error as Error).message)
    } else {
      alert('重置设置失败')
    }
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<template>
  <div :class="component.pageContainer">
    <!-- 柔和的装饰块 - 降低透明度 -->
    <div :class="`absolute -top-[15vh] -right-[25vw] w-[100vw] h-[50vh] ${bg.accentBlueLight} opacity-20 rotate-[8deg] -z-0`" />
    <div :class="`absolute bottom-[-20vh] -left-[20vw] w-[80vw] h-[50vh] ${bg.accentOrange} opacity-20 rotate-[-6deg] -z-0`" />

    <!-- 主内容区 -->
    <div :class="component.pageContent">
      <!-- 标题 -->
      <div class="mb-10">
        <h1 :class="component.pageTitle">设置</h1>
        <div :class="component.titleUnderline" />
      </div>

      <!-- 设置卡片容器 -->
      <div :class="`${layout.maxWidth} space-y-6`">
        <!-- 更新频率设置 -->
        <div :class="component.card">
          <h2 :class="component.cardTitle">更新频率</h2>
          <div class="border-2 border-gray-900">
            <label v-for="(option, index) in updateFrequencyOptions" :key="option.value"
              :class="`flex items-center gap-4 p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${settings.updateFrequency === option.value ? component.selectedTag : bg.white} ${index !== updateFrequencyOptions.length - 1 ? 'border-b-2 border-gray-900' : ''}`">
              <input type="radio" name="updateFrequency" :value="option.value" v-model="settings.updateFrequency"
                :class="component.checkbox" />
              <span :class="`text-base font-bold ${text.primary}`">{{ option.label }}</span>
            </label>
          </div>
        </div>

        <!-- 启动后操作设置 -->
        <div :class="component.card">
          <h2 :class="component.cardTitle">启动后操作</h2>
          <div class="border-2 border-gray-900">
            <div class="border-b-2 border-gray-900">
              <label
                :class="`flex items-center gap-4 p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${settings.startupActions.includes('openBrowser') ? component.selectedCheckbox : bg.white}`">
                <input type="checkbox" value="openBrowser" v-model="settings.startupActions"
                  :class="component.checkbox" />
                <span :class="`text-base font-bold ${text.primary}`">启动后打开浏览器</span>
              </label>

              <!-- 浏览器选择器 -->
              <div v-if="settings.startupActions.includes('openBrowser')"
                :class="`p-4 ${bg.gray50} border-t-2 border-gray-900`">
                <label :class="`block text-sm font-bold mb-3 ${text.primary}`">选择浏览器类型：</label>
                <select v-model="settings.browserType"
                  :class="component.input">
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
              :class="`flex items-center gap-4 p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${settings.startupActions.includes('sendNotification') ? component.selectedCheckbox : bg.white}`">
              <input type="checkbox" value="sendNotification" v-model="settings.startupActions"
                :class="component.checkbox" />
              <span :class="`text-base font-bold ${text.primary}`">启动后发送通知</span>
            </label>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex flex-col sm:flex-row gap-4 pt-4">
          <button @click="resetSettings"
            :class="`px-6 py-3.5 ${component.secondaryButton}`">
            重置应用
          </button>

          <button @click="saveSettings"
            :class="`flex-1 px-6 py-3.5 ${component.primaryButton}`">
            保存设置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
