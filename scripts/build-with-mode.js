#!/usr/bin/env node
/**
 * 用法：node scripts/build-with-mode.js <mode> <target>
 * 例子：node scripts/build-with-mode.js shein win
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import yaml from 'js-yaml'
import dotenv from 'dotenv'

const [mode = 'production', target = 'win'] = process.argv.slice(2)

// 1) 加载 .env.<mode>（不存在则退回 .env）
const envFile = [`.env.${mode}`, '.env'].find(file => existsSync(file))
if (!envFile) {
  console.warn(`未找到 .env.${mode} 或 .env，继续使用默认环境变量`)
} else {
  dotenv.config({ path: envFile })
  console.log(`Loaded env from ${envFile}`)
}

// 2) 读取 electron-builder.yml、应用覆盖
const builderPath = resolve('electron-builder.yml')
const originalBuilderYaml = readFileSync(builderPath, 'utf8')
const builderConfig = yaml.load(originalBuilderYaml)

const overrides = {
  productName: process.env.VITE_APP_NAME,
  appId: process.env.VITE_APP_ID,
  // 如需更多字段，可继续在这里添加
}
if (process.env.VITE_APP_ICON) {
    overrides.win = { ...(builderConfig.win ?? {}), icon: 'resources/' + process.env.VITE_APP_ICON }
  }
let changed = false
if (Object.keys(overrides).length > 0) {
    const merged = { ...builderConfig, ...overrides }
    writeFileSync(builderPath, yaml.dump(merged), 'utf8')
    changed = true
  }


// 3) 运行 typecheck、electron-vite build 和 electron-builder
const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  if (result.status !== 0) {
    throw new Error(`[${command} ${args.join(' ')}] 失败，退出码 ${result.status}`)
  }
}

try {
  run('pnpm', ['typecheck'])
  run('pnpm', ['electron-vite', 'build', '--mode', mode])
  run('pnpm', ['electron-builder', `--${target}`])
  console.log('Build finished successfully.')
} finally {
  if (changed) {
    writeFileSync(builderPath, originalBuilderYaml, 'utf8')
    console.log('electron-builder.yml 已还原原始内容')
  }
}