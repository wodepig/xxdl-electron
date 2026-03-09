# 主题配置说明文档

## 概述

`theme.config.ts` 是应用的集中式主题配置文件，使用 Tailwind CSS 类名定义所有颜色、样式和组件外观。

## 配置结构

### 1. 背景颜色 (bgColors)

定义应用中使用的所有背景色。

```typescript
export const bgColors = {
  primary: 'bg-[#FAF9F6]',        // 主背景色 - 米白色
  accentBlue: 'bg-[#B8D4E8]',     // 装饰蓝
  accentBlueLight: 'bg-[#A7C7E7]', // 浅蓝
  accentOrange: 'bg-[#FFB6A3]',   // 装饰橙
  accentOrangeLight: 'bg-[#FFD4C8]', // 浅橙
  white: 'bg-white',               // 纯白
  gray50: 'bg-gray-50',           // 浅灰
  gray900: 'bg-gray-900',         // 深灰
  transparent: 'bg-transparent'   // 透明
}
```

### 2. 文字颜色 (textColors)

定义文字颜色配置。

```typescript
export const textColors = {
  primary: 'text-gray-900',    // 主文字 - 深灰
  secondary: 'text-gray-800',  // 次要文字
  muted: 'text-gray-700',      // 辅助文字
  light: 'text-gray-200',      // 浅色文字
  inverse: 'text-white',       // 反色文字
  success: 'text-green-400',   // 成功状态
  info: 'text-blue-400',       // 信息状态
  warning: 'text-yellow-300',  // 警告状态
  error: 'text-red-400'        // 错误状态
}
```

### 3. 边框颜色 (borderColors)

定义边框颜色。

```typescript
export const borderColors = {
  primary: 'border-gray-900',      // 主边框
  secondary: 'border-gray-200',    // 次要边框
  light: 'border-white',           // 白色边框
  transparent: 'border-transparent' // 透明边框
}
```

### 4. 阴影样式 (shadows)

定义新拟态风格的阴影效果。

```typescript
export const shadows = {
  card: 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',      // 卡片阴影
  cardHover: 'hover:shadow-[7px_7px_0px_0px_rgba(0,0,0,1)]', // 卡片悬停
  button: 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',    // 按钮阴影
  buttonHover: 'hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]',
  buttonActive: 'active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
  buttonSm: 'shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]',  // 小按钮阴影
  buttonSmHover: 'hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
  none: 'shadow-none'
}
```

### 5. 边框样式 (borders)

定义边框宽度和颜色组合。

```typescript
export const borders = {
  primary: 'border-4 border-gray-900',    // 粗边框
  secondary: 'border-2 border-gray-900',  // 中等边框
  thin: 'border border-gray-900',         // 细边框
  light: 'border-2 border-gray-200',      // 浅色中等边框
  thinLight: 'border border-gray-200',    // 浅色细边框
  none: 'border-0'                        // 无边框
}
```

### 6. 组件样式 (componentStyles)

预定义的组件样式组合，直接使用即可。

| 样式名 | 用途 | 示例 |
|--------|------|------|
| `card` | 卡片容器 | 设置面板、信息卡片 |
| `cardContent` | 卡片内容区 | 卡片内部填充 |
| `cardTitle` | 卡片标题 | 卡片头部标题 |
| `pageContainer` | 页面容器 | 整个页面背景 |
| `pageContent` | 页面内容区 | 页面内边距区域 |
| `pageTitle` | 页面标题 | 大标题样式 |
| `primaryButton` | 主按钮 | 蓝色背景按钮 |
| `secondaryButton` | 次要按钮 | 白色背景按钮 |
| `tagButton` | 标签按钮 | 小标签样式 |
| `selectedTag` | 选中标签 | 选中状态的标签 |
| `selectedCheckbox` | 选中复选框 | 选中状态的复选框 |
| `infoTag` | 信息标签 | 蓝色信息标签 |
| `warningTag` | 警告标签 | 橙色警告标签 |
| `linkButton` | 链接按钮 | 橙色链接样式 |
| `input` | 输入框 | 表单输入框 |
| `checkbox` | 复选框 | 单选/复选框 |
| `logContainer` | 日志容器 | 日志显示区域 |
| `logRow` | 日志行 | 单行日志样式 |

### 7. 布局 (layout)

定义布局相关的工具类。

```typescript
export const layout = {
  maxWidth: 'max-w-4xl mx-auto',           // 标准最大宽度
  maxWidthWide: 'max-w-5xl mx-auto',       // 宽屏最大宽度
  grid2: 'grid grid-cols-1 md:grid-cols-2 gap-6', // 2列网格
  grid3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3', // 3列网格
  flexBetween: 'flex justify-between items-center', // 两端对齐
  flexCol: 'flex flex-col',                // 纵向flex
  flexRow: 'flex flex-row'                 // 横向flex
}
```

### 8. 动画 (animations)

定义动画效果。

```typescript
export const animations = {
  float: 'animate-[floatRed_6s_ease-in-out_infinite]',  // 漂浮动画
  drift: 'animate-[drift_6s_ease-in-out_infinite]'      // 漂移动画
}
```

## 使用方法

### 导入主题

```typescript
import { theme, bgColors, textColors, componentStyles } from './config/theme.config'
```

### 使用单个配置

```vue
<template>
  <div :class="bgColors.primary">
    <h1 :class="textColors.primary">标题</h1>
  </div>
</template>

<script setup>
import { bgColors, textColors } from '../config/theme.config'
</script>
```

### 使用组件样式

```vue
<template>
  <div :class="componentStyles.card">
    <h2 :class="componentStyles.cardTitle">卡片标题</h2>
    <div :class="componentStyles.cardContent">
      卡片内容
    </div>
  </div>
</template>

<script setup>
import { componentStyles } from '../config/theme.config'
</script>
```

### 组合使用

```vue
<template>
  <button :class="[bgColors.accentBlue, textColors.primary, borders.secondary]">
    自定义按钮
  </button>
</template>
```

## 自定义主题

### 修改颜色

编辑 `bgColors`、`textColors`、`borderColors` 中的颜色值：

```typescript
// 修改前
accentBlue: 'bg-[#B8D4E8]',

// 修改后
accentBlue: 'bg-[#4A90D9]', // 更深的蓝色
```

### 修改阴影

调整阴影的偏移量和颜色：

```typescript
// 修改前
card: 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',

// 修改后 - 更大的阴影
card: 'shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]',
```

### 修改边框

调整边框宽度和颜色：

```typescript
// 修改前
primary: 'border-4 border-gray-900',

// 修改后 - 更细的边框
primary: 'border-2 border-gray-800',
```

## 设计原则

1. **新拟态风格 (Neubrutalism)**: 使用粗边框、实色阴影、高对比度
2. **一致性**: 所有组件使用相同的边框宽度和阴影风格
3. **可访问性**: 确保文字与背景有足够的对比度
4. **响应式**: 使用 Tailwind 的响应式前缀 (md:, lg:)

## 注意事项

1. 修改主题后需要重新构建应用
2. 颜色值使用 Tailwind 的任意值语法 `bg-[#颜色值]`
3. 组件样式是预设的组合，可以根据需要覆盖
4. 保持阴影和边框风格的一致性
