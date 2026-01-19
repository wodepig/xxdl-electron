// 预加载 assets/image 下的所有图片，确保打包后也包含
const imageAssets = import.meta.glob('../assets/image/*', {
  eager: true,
  import: 'default'
}) as Record<string, string>

/**
 * 从环境变量中解析图标
 * @param source 图标路径eg. '/image/shein.png'
 */
export const resolveIconFromEnv = (source:string | undefined): string => {
  const raw = source?.trim() || ''
  const normalized = raw.replace(/^\/+/, '')
  if (!normalized) {
    return new URL('../assets/image/icon.png', import.meta.url).href
  }

  // env 中通常为 'image/shein.png' 这种形式
  const candidates = [
    `../assets/${normalized}`,
    `../assets/image/${normalized.replace(/^image\//, '')}`
  ]

  for (const key of Object.keys(imageAssets)) {
    if (candidates.some((c) => key.endsWith(c.replace('..', '')))) {
      return imageAssets[key]
    }
  }

  // 找不到就退回默认图
  return new URL('../assets/image/wx_blank.png', import.meta.url).href
}
