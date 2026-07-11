const { existsSync, readFileSync } = require('node:fs')

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) {
    return {}
  }

  const env = {}
  const content = readFileSync(filePath, 'utf8')

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue

    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    env[key] = value
  }

  return env
}

const loadBuildEnv = () => {
  const mode = process.env.BUILD_MODE || process.env.MODE || ''
  const env = {
    ...parseEnvFile('.env'),
    ...(mode ? parseEnvFile(`.env.${mode}`) : {}),
    ...process.env
  }

  return { mode, env }
}

const { mode, env } = loadBuildEnv()

const packageName = env.VITE_APP_PACKAGE_NAME || env.VITE_APP_EXE_NAME || 'xxdl-electron'
const productName = env.VITE_APP_NAME || packageName
const executableName = env.VITE_APP_EXE_NAME || packageName
const description = env.VITE_APP_DESC || ''
const appId = env.VITE_APP_ID || 'electron.xxdl.xyz'
const icon = env.VITE_APP_ICON || 'image/icon.png'
const author = env.VITE_AUTHOR_WX || 'example.com'

console.log(
  `[electron-builder] mode=${mode || '(default)'}, productName=${productName}, executableName=${executableName}`
)

module.exports = {
  appId,
  productName,
  directories: {
    buildResources: 'build'
  },
  files: [
    '!**/.vscode/*',
    '!src/*',
    '!electron.vite.config.{js,ts,mjs,cjs}',
    '!{.eslintcache,eslint.config.mjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}',
    '!{.env,.env.*,.npmrc,pnpm-lock.yaml}',
    '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}',
    '!dist.zip',
    '!gen-env-config.html',
    '!dist_server/**',
    '!conf/**',
    '!scripts/**',
    '!logs/**'
  ],
  extraMetadata: {
    name: packageName,
    description,
    author
  },
  asarUnpack: ['resources/**'],
  win: {
    icon: `resources/${icon}`,
    compression: 'normal',
    executableName,
    legalTrademarks: productName,
    target: ['zip', 'nsis']
  },
  nsis: {
    artifactName: `${executableName}-\${version}-setup.\${ext}`,
    shortcutName: productName,
    uninstallDisplayName: productName,
    createDesktopShortcut: 'always',
    oneClick: false,
    allowToChangeInstallationDirectory: true
  },
  mac: {
    entitlementsInherit: 'build/entitlements.mac.plist',
    extendInfo: [
      {
        NSCameraUsageDescription: 'Application requests access to the device camera.'
      },
      {
        NSMicrophoneUsageDescription: 'Application requests access to the device microphone.'
      },
      {
        NSDocumentsFolderUsageDescription: 'Application requests access to the Documents folder.'
      },
      {
        NSDownloadsFolderUsageDescription: 'Application requests access to the Downloads folder.'
      }
    ],
    notarize: false
  },
  dmg: {
    artifactName: `${executableName}-\${version}.\${ext}`
  },
  linux: {
    target: ['AppImage', 'snap', 'deb'],
    maintainer: 'electronjs.org',
    category: 'Utility'
  },
  appImage: {
    artifactName: `${executableName}-\${version}.\${ext}`
  },
  npmRebuild: false,
  publish: {
    provider: 'generic',
    url: env.VITE_UPD_URL || 'https://example.com/auto-updates'
  },
  electronDownload: {
    mirror: 'https://npmmirror.com/mirrors/electron/'
  },
  afterPack: 'scripts/cleanup-locales.js',
  afterExtract: 'scripts/copy-run-script.js'
}
