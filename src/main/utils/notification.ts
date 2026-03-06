import { getWindowsByTitle } from './window'
import { getEnvConf } from './config'
import log from 'electron-log/main'

/**
 * 通知类型
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

/**
 * 通知数据
 */
export interface NotificationData {
  /** 通知唯一ID */
  id: string
  /** 通知类型 */
  type: NotificationType
  /** 通知标题 */
  title: string
  /** 通知内容 */
  message: string
  /** 显示时长（毫秒），默认10000ms */
  duration: number
  /** 创建时间 */
  timestamp: number
}

/**
 * 默认通知配置
 */
const DEFAULT_NOTIFICATION_CONFIG = {
  duration: 10000, // 10秒自动消失
  type: 'info' as NotificationType
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 向主窗口发送通知
 * @param data 通知数据
 */
const sendNotification = (data: NotificationData): void => {
  const mainWindow = getWindowsByTitle(getEnvConf('VITE_APP_EXE_NAME'))
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('app-notification', data)
    log.debug(`[Notification] 发送通知: ${data.title} - ${data.message}`)
  } else {
    log.warn('[Notification] 主窗口不存在或已销毁，无法发送通知')
  }
}

/**
 * 显示软件更新通知
 * @param version 新版本号
 * @param updateContent 更新内容描述
 * @param duration 显示时长（毫秒），默认10000ms
 */
export const showUpdateNotification = (
  version: string,
  updateContent: string,
  duration?: number
): void => {
  const notification: NotificationData = {
    id: generateId(),
    type: 'success',
    title: `软件更新至 v${version}`,
    message: updateContent,
    duration: duration || DEFAULT_NOTIFICATION_CONFIG.duration,
    timestamp: Date.now()
  }
  sendNotification(notification)
}

/**
 * 显示信息通知
 * @param title 通知标题
 * @param message 通知内容
 * @param duration 显示时长（毫秒），默认10000ms
 */
export const showInfoNotification = (
  title: string,
  message: string,
  duration?: number
): void => {
  const notification: NotificationData = {
    id: generateId(),
    type: 'info',
    title,
    message,
    duration: duration || DEFAULT_NOTIFICATION_CONFIG.duration,
    timestamp: Date.now()
  }
  sendNotification(notification)
}

/**
 * 显示成功通知
 * @param title 通知标题
 * @param message 通知内容
 * @param duration 显示时长（毫秒），默认10000ms
 */
export const showSuccessNotification = (
  title: string,
  message: string,
  duration?: number
): void => {
  const notification: NotificationData = {
    id: generateId(),
    type: 'success',
    title,
    message,
    duration: duration || DEFAULT_NOTIFICATION_CONFIG.duration,
    timestamp: Date.now()
  }
  sendNotification(notification)
}

/**
 * 显示警告通知
 * @param title 通知标题
 * @param message 通知内容
 * @param duration 显示时长（毫秒），默认10000ms
 */
export const showWarningNotification = (
  title: string,
  message: string,
  duration?: number
): void => {
  const notification: NotificationData = {
    id: generateId(),
    type: 'warning',
    title,
    message,
    duration: duration || DEFAULT_NOTIFICATION_CONFIG.duration,
    timestamp: Date.now()
  }
  sendNotification(notification)
}

/**
 * 显示错误通知
 * @param title 通知标题
 * @param message 通知内容
 * @param duration 显示时长（毫秒），默认10000ms
 */
export const showErrorNotification = (
  title: string,
  message: string,
  duration?: number
): void => {
  const notification: NotificationData = {
    id: generateId(),
    type: 'error',
    title,
    message,
    duration: duration || DEFAULT_NOTIFICATION_CONFIG.duration,
    timestamp: Date.now()
  }
  sendNotification(notification)
}

/**
 * 显示自定义通知
 * @param type 通知类型
 * @param title 通知标题
 * @param message 通知内容
 * @param duration 显示时长（毫秒），默认10000ms
 */
export const showNotification = (
  type: NotificationType,
  title: string,
  message: string,
  duration?: number
): void => {
  const notification: NotificationData = {
    id: generateId(),
    type,
    title,
    message,
    duration: duration || DEFAULT_NOTIFICATION_CONFIG.duration,
    timestamp: Date.now()
  }
  sendNotification(notification)
}
