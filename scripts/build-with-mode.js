#!/usr/bin/env node
/**
 * 这是一个构建指定mode的打包脚本
 * 功能是通过build:win:mode里面指定的mode, 读取.env.mode文件,并替换package.json和electron-builder.yml文件中的相关字段
 * 然后运行原版的打包命令
 * 最后把文件恢复成原始状态
 *
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import yaml from 'js-yaml'
import dotenv from 'dotenv'

const [mode = 'production', target = 'win'] = process.argv.slice(2)
let packageJsonPath = undefined
let packageJson = undefined
let packageJsonOld = undefined
let builderPath = undefined
let builderConfig = undefined
let builderConfigOld = undefined

const getEnvValue = (key)=>{
  if(!process.env[key]){
    throw new Error(`未找到 ${key}`)
  }
  return process.env[key]
}
const readConfig = ()=>{
  // 1) 加载 .env.<mode>（不存在则退回 .env）
  const envFile = [`.env.${mode}`, '.env'].find(file => existsSync(file))
  if (!envFile) {
    console.warn(`未找到 .env.${mode} 或 .env，继续使用默认环境变量`)
  } else {
    dotenv.config({ path: envFile })
    console.log(`Loaded env from ${envFile}`)
  }
  // 读取 package.json
  packageJsonPath = resolve('package.json')
  packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  packageJsonOld = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  // 读取 electron-builder.yml、应用覆盖
  builderPath = resolve('electron-builder.yml')
  const originalBuilderYaml = readFileSync(builderPath, 'utf8')
  builderConfig = yaml.load(originalBuilderYaml)
  builderConfigOld = yaml.load(originalBuilderYaml)
}
const build =()=>{

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
  }
}

const start = ()=>{
  // 读配置
  readConfig()
  // 变量替换
  packageJson.name = getEnvValue('VITE_APP_NAME')
  packageJson.description = getEnvValue('VITE_APP_DESC')
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')
  builderConfig.productName = getEnvValue('VITE_APP_NAME')
  builderConfig.appId = getEnvValue('VITE_APP_ID')
  builderConfig.win = { ...(builderConfig.win ?? {}) }
  if (process.env.VITE_APP_ICON) {
    builderConfig.win.icon = 'resources/' + process.env.VITE_APP_ICON
  }
  if (process.env.VITE_APP_EXE_NAME) {
    builderConfig.win.executableName = process.env.VITE_APP_EXE_NAME
  }
  writeFileSync(builderPath, yaml.dump(builderConfig), 'utf8')
  build()
  // 还原
  writeFileSync(packageJsonPath, JSON.stringify(packageJsonOld, null, 2), 'utf8')
  writeFileSync(builderPath, yaml.dump(builderConfigOld), 'utf8')
  console.log('package.json和electron-builder.yml 已还原内容')
}

start()

// const overrides = {
//   productName: getEnvValue('VITE_APP_NAME'),
//   appId: getEnvValue('VITE_APP_ID'),
//   // 如需更多字段，可继续在这里添加
// }
// if (process.env.VITE_APP_ICON) {
//     overrides.win = { ...(builderConfig.win ?? {}), icon: 'resources/' + process.env.VITE_APP_ICON }
//   }
// let changed = false
// if (Object.keys(overrides).length > 0) {
//     const merged = { ...builderConfig, ...overrides }
//     writeFileSync(builderPath, yaml.dump(merged), 'utf8')
//     changed = true
//   }



