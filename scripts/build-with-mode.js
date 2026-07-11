#!/usr/bin/env node

const { spawnSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const process = require('node:process')

const [modeArg, target = 'win'] = process.argv.slice(2)
const mode = modeArg || ''
const envFile = mode
  ? [`.env.${mode}`, '.env'].find((file) => existsSync(file))
  : ['.env'].find((file) => existsSync(file))

if (!envFile) {
  const envHint = mode ? `.env.${mode} and .env` : '.env'
  console.warn(`[build-with-mode] ${envHint} were not found; using process env only.`)
} else {
  console.log(`[build-with-mode] mode=${mode || '(default)'}, env=${envFile}`)
}

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      BUILD_MODE: mode
    }
  })

  if (result.status !== 0) {
    throw new Error(`[${command} ${args.join(' ')}] failed with exit code ${result.status}`)
  }
}

run('pnpm', ['typecheck'])
run('pnpm', mode ? ['electron-vite', 'build', '--mode', mode] : ['electron-vite', 'build'])
run('pnpm', ['electron-builder', `--${target}`, '--config', 'electron-builder.config.cjs'])

console.log('[build-with-mode] Build finished successfully.')
