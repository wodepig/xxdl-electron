/**
 * 主题配置
 * 集中管理应用中的所有颜色、样式配置
 */

// 背景颜色
export const bgColors = {
  // 主背景色
  primary: 'bg-[#FAF9F6]',
  // 装饰色 - 蓝色系
  accentBlue: 'bg-[#B8D4E8]',
  accentBlueLight: 'bg-[#A7C7E7]',
  // 装饰色 - 橙色系
  accentOrange: 'bg-[#FFB6A3]',
  accentOrangeLight: 'bg-[#FFD4C8]',
  // 中性色
  white: 'bg-white',
  gray50: 'bg-gray-50',
  gray900: 'bg-gray-900',
  // 透明背景
  transparent: 'bg-transparent'
} as const

// 文字颜色
export const textColors = {
  // 主文字色
  primary: 'text-gray-900',
  // 次要文字色
  secondary: 'text-gray-800',
  // 辅助文字色
  muted: 'text-gray-700',
  light: 'text-gray-200',
  // 反色文字
  inverse: 'text-white',
  // 状态色
  success: 'text-green-400',
  info: 'text-blue-400',
  warning: 'text-yellow-300',
  error: 'text-red-400'
} as const

// 边框颜色
export const borderColors = {
  primary: 'border-gray-900',
  secondary: 'border-gray-200',
  light: 'border-white',
  transparent: 'border-transparent'
} as const

// 阴影样式
export const shadows = {
  // 卡片阴影
  card: 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
  cardHover: 'hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)]',
  // 按钮阴影
  button: 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
  buttonHover: 'hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]',
  buttonActive: 'active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
  // 小按钮阴影
  buttonSm: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',
  buttonSmHover: 'hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
  // 无阴影
  none: 'shadow-none'
} as const

// 边框样式
export const borders = {
  // 主边框
  primary: 'border-4 border-gray-900',
  secondary: 'border-2 border-gray-900',
  thin: 'border border-gray-900',
  // 浅色边框
  light: 'border-2 border-gray-200',
  thinLight: 'border border-gray-200',
  // 无边框
  none: 'border-0'
} as const

// 通用组件样式组合
export const componentStyles = {
  // 卡片容器
  card: `${bgColors.white} ${borders.primary} ${shadows.card} ${shadows.cardHover} hover:-translate-y-0.5 transition-all p-8`,
  // 卡片内容区
  cardContent: 'p-6',
  // 卡片标题
  cardTitle: 'text-xl font-black mb-5 tracking-tight text-gray-900 pb-3 border-b-2 border-gray-900',
  // 页面容器
  pageContainer: `fixed inset-0 overflow-auto ${bgColors.primary}`,
  // 页面内容区
  pageContent: 'relative z-10 min-h-screen p-6 md:p-12',
  // 页面标题
  pageTitle: 'text-4xl md:text-5xl font-black tracking-tight text-gray-900 mb-3',
  // 标题下划线
  titleUnderline: 'h-1.5 w-20 bg-gray-900',
  // 主按钮
  primaryButton: `${bgColors.accentBlue} ${borders.secondary} font-black text-base tracking-tight text-gray-900 ${shadows.button} ${shadows.buttonHover} hover:-translate-y-1 transition-all ${shadows.buttonActive} active:translate-y-0`,
  // 次要按钮
  secondaryButton: `${bgColors.white} ${borders.secondary} font-black text-base tracking-tight text-gray-900 ${shadows.button} ${shadows.buttonHover} hover:-translate-y-1 transition-all ${shadows.buttonActive} active:translate-y-0`,
  // 小按钮（标签样式）
  tagButton: `font-bold text-xs px-3 py-1.5 border-2 border-gray-900 hover:translate-x-0.5 hover:translate-y-0.5 transition-all active:translate-x-1 active:translate-y-1`,
  // 选中状态标签
  selectedTag: `${bgColors.accentBlue} border-2 border-gray-900 ${shadows.buttonSm}`,
  // 复选框选中状态
  selectedCheckbox: `${bgColors.accentOrangeLight} border-2 border-gray-900 ${shadows.buttonSm}`,
  // 信息标签（蓝色背景）
  infoTag: `${bgColors.accentBlue} text-gray-900 px-3 py-1 border-2 border-gray-900`,
  // 警告标签（橙色背景）
  warningTag: `${bgColors.accentOrangeLight} text-gray-900 px-3 py-1 border-2 border-gray-900`,
  // 链接按钮（橙色背景）
  linkButton: `${bgColors.accentOrangeLight} text-gray-900 border-3 border-gray-900 font-bold ${shadows.buttonSm} ${shadows.buttonSmHover} hover:-translate-y-0.5 transition-all ${shadows.buttonActive} active:translate-y-0`,
  // 装饰块 - 蓝色
  decorationBlue: `${bgColors.accentBlue} opacity-20`,
  // 装饰块 - 橙色
  decorationOrange: `${bgColors.accentOrange} opacity-20`,
  // 输入框
  input: `w-full p-3 border-3 border-gray-900 font-bold text-base bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900`,
  // 单选/复选框
  checkbox: 'w-5 h-5 accent-gray-900 cursor-pointer',
  // 日志容器
  logContainer: 'bg-gray-900 text-white font-mono text-sm border-4 border-gray-900 p-4 overflow-y-auto flex-1 min-h-0',
  // 日志行
  logRow: 'flex gap-3 py-1 px-2 hover:bg-white/10 transition-colors border-b border-white/10'
} as const

// 布局相关
export const layout = {
  // 最大宽度容器
  maxWidth: 'max-w-4xl mx-auto',
  maxWidthWide: 'max-w-5xl mx-auto',
  // 网格布局
  grid2: 'grid grid-cols-1 md:grid-cols-2 gap-6',
  grid3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
  // Flex 布局
  flexBetween: 'flex justify-between items-center',
  flexCol: 'flex flex-col',
  flexRow: 'flex flex-row'
} as const

// 动画相关
export const animations = {
  // 漂浮动画
  float: 'animate-[floatRed_6s_ease-in-out_infinite]',
  drift: 'animate-[drift_6s_ease-in-out_infinite]'
} as const

// 导出完整主题配置
export const theme = {
  bg: bgColors,
  text: textColors,
  border: borderColors,
  shadow: shadows,
  borders,
  component: componentStyles,
  layout,
  animation: animations
} as const

export default theme
