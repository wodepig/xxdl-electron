# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron launcher application (xxdl-electron) built with electron-vite. Its primary purpose is to download and run Node.js projects with auto-update capabilities. The app downloads a zipped Node.js server (Nuxt/Next full-stack projects), extracts it, runs it locally, and displays the web application in an Electron window.

**Key Technologies:**
- electron-vite for build tooling
- Vue 3 + Vue Router for renderer process
- Tailwind CSS 4.x for styling
- UpgradeLink service for file updates and version management
- electron-conf for persistent configuration storage
- electron-log for logging

## Architecture

### Process Structure

The application follows Electron's multi-process architecture:

1. **Main Process** (`src/main/`): Node.js environment managing application lifecycle
   - `index.ts`: Entry point, IPC handlers, window lifecycle
   - `utils.ts`: Core business logic (download, extract, server startup, port management)
   - `ulUtils.ts`: UpgradeLink API integration for file upgrades
   - `conf.ts`: Configuration management using electron-conf
   - `windowUtils.ts`: Window creation and menu management
   - `log-utils.ts`: Log file watching and event emission

2. **Preload Process** (`src/preload/`): Bridge between main and renderer
   - `index.ts`: Exposes safe APIs to renderer via contextBridge
   - Provides app/author info, system versions, IPC communication helpers

3. **Renderer Process** (`src/renderer/`): Vue 3 web application
   - `views/Home.vue`: Main landing page
   - `views/About.vue`: About and author information
   - `views/Settings.vue`: App settings (update frequency, startup actions, browser type)
   - `components/VersionInfo.vue`: Version display
   - `components/LogList.vue`: Real-time log viewer
   - `components/AuthorInfo.vue`: Author contact information

### Core Workflow

1. **Initialization** (`startInitialize` in `utils.ts`):
   - Checks for `dist.zip` in app directory
   - Downloads from UpgradeLink if missing or outdated
   - Extracts to `dist_server/` directory
   - Checks if configured port is available, finds alternative if needed
   - Spawns Node.js server as child process using `ELECTRON_RUN_AS_NODE`
   - Waits for server to be ready, then loads URL in main window

2. **Update System** (`checkUpdate` in `utils.ts`):
   - Version checking via UpgradeLink API (uses `versionCode` stored in electron-conf)
   - Update frequency controlled by settings: "onStart", "daily", or "never"
   - Downloads new version to `dist.zip`, extracts on next check
   - Tracks last update check time for "daily" mode

3. **Configuration** (`conf.ts`):
   - Uses electron-conf for persistent storage across app restarts
   - Namespaced configs: 'common', 'settings'
   - Stores: distVersion, nodeStart, finalUrl, updateFrequency, startupActions, browserType

4. **Logging** (`log-utils.ts`):
   - Main process logs via electron-log to `logs/main.log`
   - LogFileWatcher monitors log file and sends new entries to renderer via IPC
   - Real-time log display in LogList.vue component

## Environment Variables

Configuration is done via `.env` files (see `.env.example`):

**Required:**
- `VITE_UL_CONF_AK`: UpgradeLink Access Key
- `VITE_UL_CONF_SK`: UpgradeLink Secret Key
- `VITE_UL_CONF_FILEKEY`: UpgradeLink File Key for file upgrade service
- `VITE_UL_CONF_URL`: URL to open after server starts (e.g., http://localhost:3000)

**App Metadata:**
- `VITE_APP_NAME`, `VITE_APP_DESC`, `VITE_APP_ID`
- `VITE_APP_ICON`: Icon path (relative to resources/ and src/renderer/src/assets/)
- `VITE_APP_HOME`: Homepage URL
- `VITE_APP_LINKS`: Format: `label1|url1|emoji1;label2|url2|emoji2`

**Author Info:**
- `VITE_AUTHOR_NAME`, `VITE_AUTHOR_EMAIL`, `VITE_AUTHOR_WX`
- `VITE_AUTHOR_WX_IMG`: WeChat QR code image path
- `VITE_ADMIN_PASSWORD`: Password for opening DevTools (default: admin123)

**Multi-mode builds:** Create `.env.{mode}` files for different configurations (e.g., `.env.demo`, `.env.production`)

## Common Commands

### Development
```bash
pnpm dev              # Start dev server with hot reload (chcp 65001 for UTF-8 on Windows)
pnpm start            # Preview production build
```

### Type Checking
```bash
pnpm typecheck        # Check both main and renderer types
pnpm typecheck:node   # Check main process types only
pnpm typecheck:web    # Check renderer process types only
```

### Code Quality
```bash
pnpm lint             # Run ESLint with cache
pnpm format           # Format code with Prettier
```

### Building
```bash
pnpm build            # Type check + electron-vite build
pnpm build:unpack     # Build without packaging (for testing)
pnpm build:win        # Build Windows installer (zip format by default)
pnpm build:mac        # Build macOS app
pnpm build:linux      # Build Linux packages (AppImage, snap, deb)
```

### Multi-mode Building
```bash
pnpm build:win:mode   # Build with .env.demo config and custom mode
# Internally runs: node scripts/build-with-mode.js demo win
```
This script (`scripts/build-with-mode.js`):
- Loads `.env.{mode}` file
- Temporarily modifies package.json and electron-builder.yml
- Runs typecheck, electron-vite build, and electron-builder
- Restores original files after build

## Important Implementation Details

### Asset Handling
Icons and images should exist in TWO locations:
- `<rootDir>/resources/{path}`: Used by electron-builder for packaged app
- `<rootDir>/src/renderer/src/assets/{path}`: Used during development

Do NOT prefix paths with `/` in .env variables (e.g., use `image/icon.png`, not `/image/icon.png`)

See electron-vite asset docs: https://cn.electron-vite.org/guide/assets

### Port Management
The app intelligently handles port conflicts:
- Extracts port from `VITE_UL_CONF_URL`
- Tests if port is available using `isPortInUse`
- Finds next available port if occupied (`findAvailablePort`)
- Passes port to Node server via `PORT` environment variable
- Updates URL dynamically and loads in window

### Server Process Management
- Spawns Node server using `ELECTRON_RUN_AS_NODE=1` flag
- Child process uses Electron's Node.js runtime
- Proper cleanup on app quit, window close, and process signals (SIGINT, SIGTERM)
- Windows: Uses `taskkill /F /T /PID` for forceful termination
- Unix: Uses SIGTERM, then SIGKILL if needed

### IPC Communication Patterns
Main → Renderer:
- `log-message`: Real-time log updates
- `navigate-to`: Route navigation
- `download-progress`: Download progress updates

Renderer → Main:
- `log-list-ready`: Notifies main that log component is ready
- `log-list-close`: Cleanup log watcher
- `get-settings`, `save-settings`, `reset-settings`: Settings management
- `get-versions`: Get app/electron/chrome/node versions
- `show-message`: Display message to user

### Renderer Utility Functions
- `icon-utils.ts`: Helper for resolving icon paths in dev vs production
- Path resolution differs between development and packaged app

## File Structure Notes

- Server files are extracted to `{appDir}/dist_server/`
- Main server entry point: `dist_server/server/index.mjs`
- Logs stored in `{appDir}/logs/main.log`
- Config files stored by electron-conf in `{appDir}/`
- In dev: `appDir` = project root
- In production: `appDir` = parent directory of app.asar

## Build Configuration

See `electron-builder.yml`:
- Target format: zip (for Windows)
- ASAR unpack: `resources/**` (keeps resources accessible)
- Electron download mirror: npmmirror.com (for China)
- Compression: normal (maximum takes 3x longer with no size benefit)
- Post-install: Cleanup unused locale files via `scripts/cleanup-locales.js`

## Development Notes

- Use `log.xxx()` in main process for file logging
- Use `addLog2Vue()` to send logs to log component
- Window titles are used to identify windows (see `getWindowsByTitle` in windowUtils.ts)
- Vue Router uses hash history mode for Electron compatibility
- UTF-8 encoding explicitly set for child process output (PYTHONIOENCODING, LANG, LC_ALL)
