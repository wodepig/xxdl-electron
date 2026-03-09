/**
 * 主题配置
 * 自定义主题 - 由主题生成器创建
 */

// 背景颜色
export const bgColors = {
  // 主背景色
  primary: 'bg-[#faf9f6]',
  // 装饰色 - 蓝色系
  accentBlue: 'bg-[#b8d4e8]',
  accentBlueLight: 'bg-[#a7c7e7]',
  // 装饰色 - 橙色系
  accentOrange: 'bg-[#ffb6a3]',
  accentOrangeLight: 'bg-[#ffd4c8]',
  // 中性色
  white: 'bg-white',
  gray50: 'bg-gray-50',
  gray900: 'bg-[#111827]',
  // 透明背景
  transparent: 'bg-transparent'
} as const

// 文字颜色
export const textColors = {
  // 主文字色
  primary: 'text-[#111827]',
  // 次要文字色
  secondary: 'text-[#1f2937]',
  // 辅助文字色
  muted: 'text-[#374151]',
  light: 'text-[#e5e7eb]',
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
  primary: 'border-[#111827]',
  secondary: 'border-gray-200',
  light: 'border-white',
  transparent: 'border-transparent'
} as const

// 阴影样式
export const shadows = {
  // 卡片阴影
  card: 'shadow-[6px_6px_0px_0px_%23000000]',
  cardHover: 'hover:shadow-[7px_7px_0px_0px_%23000000]',
  // 按钮阴影
  button: 'shadow-[4px_4px_0px_0px_%23000000]',
  buttonHover: 'hover:shadow-[5px_5px_0px_0px_%23000000]',
  buttonActive: 'active:shadow-[2px_2px_0px_0px_%23000000]',
  // 小按钮阴影
  buttonSm: 'shadow-[3px_3px_0px_0px_%23000000]',
  buttonSmHover: 'hover:shadow-[4px_4px_0px_0px_%23000000]',
  // 无阴影
  none: 'shadow-none'
} as const

// 边框样式
export const borders = {
  // 主边框
  primary: 'border-4 border-[#111827]',
  secondary: 'border-2 border-[#111827]',
  thin: 'border border-[#111827]',
  // 浅色边框
  light: 'border-2 border-gray-200',
  thinLight: 'border border-gray-200',
  // 无边框
  none: 'border-0'
} as const

// 通用组件样式组合
export const componentStyles = {
  // 卡片容器
  card: 'bg-white border-4 border-[#111827] shadow-[6px_6px_0px_0px_%23000000] hover:shadow-[7px_7px_0px_0px_%23000000] hover:-translate-y-0.5 transition-all p-8',
  // 卡片内容区
  cardContent: 'p-6',
  // 卡片标题
  cardTitle: 'text-xl font-black mb-5 tracking-tight text-[#111827] pb-3 border-b-2 border-[#111827]',
  // 页面容器
  pageContainer: 'fixed inset-0 overflow-auto bg-[#faf9f6]',
  // 页面内容区
  pageContent: 'relative z-10 min-h-screen p-6 md:p-12',
  // 页面标题
  pageTitle: 'text-4xl md:text-5xl font-black tracking-tight text-[#111827] mb-3',
  // 标题下划线
  titleUnderline: 'h-1.5 w-20 bg-[#111827]',
  // 主按钮
  primaryButton: 'bg-[#b8d4e8] border-2 border-[#111827] font-black text-base tracking-tight text-[#111827] shadow-[4px_4px_0px_0px_%23000000] hover:shadow-[5px_5px_0px_0px_%23000000] hover:-translate-y-1 transition-all active:shadow-[2px_2px_0px_0px_%23000000] active:translate-y-0',
  // 次要按钮
  secondaryButton: 'bg-white border-2 border-[#111827] font-black text-base tracking-tight text-[#111827] shadow-[4px_4px_0px_0px_%23000000] hover:shadow-[5px_5px_0px_0px_%23000000] hover:-translate-y-1 transition-all active:shadow-[2px_2px_0px_0px_%23000000] active:translate-y-0',
  // 小按钮（标签样式）
  tagButton: 'font-bold text-xs px-3 py-1.5 border-2 border-[#111827] hover:translate-x-0.5 hover:translate-y-0.5 transition-all active:translate-x-1 active:translate-y-1',
  // 选中状态标签
  selectedTag: 'bg-[#b8d4e8] border-2 border-[#111827] shadow-[3px_3px_0px_0px_%23000000]',
  // 复选框选中状态
  selectedCheckbox: 'bg-[#ffd4c8] border-2 border-[#111827] shadow-[3px_3px_0px_0px_%23000000]',
  // 信息标签（蓝色背景）
  infoTag: 'bg-[#b8d4e8] text-[#111827] px-3 py-1 border-2 border-[#111827]',
  // 警告标签（橙色背景）
  warningTag: 'bg-[#ffd4c8] text-[#111827] px-3 py-1 border-2 border-[#111827]',
  // 链接按钮（橙色背景）
  linkButton: 'bg-[#ffd4c8] text-[#111827] border-3 border-[#111827] font-bold shadow-[3px_3px_0px_0px_%23000000] hover:shadow-[4px_4px_0px_0px_%23000000] hover:-translate-y-0.5 transition-all active:shadow-[2px_2px_0px_0px_%23000000] active:translate-y-0',
  // 输入框
  input: 'w-full p-3 border-4 border-[#111827] font-bold text-base bg-white focus:outline-none focus:ring-2 focus:ring-[#111827] text-[#111827]',
  // 单选/复选框
  checkbox: 'w-5 h-5 accent-[#111827] cursor-pointer',
  // 日志容器
  logContainer: 'bg-[#111827] text-white font-mono text-sm border-4 border-[#111827] p-4 overflow-y-auto flex-1 min-h-0',
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