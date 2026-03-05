import { createServer } from 'net'
import https from 'https'
import http from 'http'
import log from 'electron-log/main'

/**
 * 从 URL 中提取端口
 * @param url URL 字符串
 * @returns 端口号
 */
export const extractPortFromUrl = (url: string): number => {
  try {
    const urlObj = new URL(url)
    if (urlObj.port) {
      return parseInt(urlObj.port, 10)
    }
    // 如果没有指定端口，根据协议返回默认端口
    return urlObj.protocol === 'https:' ? 443 : 80
  } catch (error) {
    throw new Error(`无效的 URL: ${url}`)
  }
}

/**
 * 在指定 host 上检查端口
 * @param port 端口号
 * @param host 主机地址
 * @returns 是否被占用
 */
export const checkPortOnHost = (port: number, host: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = createServer()

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(true) // 端口被占用或无权限
      } else {
        resolve(false) // 其他错误不一定意味着端口占用
      }
    })

    server.once('listening', () => {
      server.close()
      resolve(false) // 端口可用
    })

    // 启动服务器时，同时支持 IPv4 和 IPv6
    server.listen(port, host, () => {
      resolve(false) // 端口可用，服务器正常监听
    })
  })
}

/**
 * 检查端口是否被占用（同时检测 127.0.0.1, 0.0.0.0, ::1 和 ::）
 * @param port 端口号
 * @returns 是否被占用
 */
export const isPortInUse = async (port: number): Promise<boolean> => {
  // 同时检查本地回环和所有接口
  const hosts = ['127.0.0.1', '0.0.0.0', '::1', '::']

  // 使用 Promise.all 进行并发检查
  const results = await Promise.all(
    hosts.map(host => checkPortOnHost(port, host))
  )

  // 如果任一地址返回 true，即表示端口被占用
  return results.includes(true)
}

/**
 * 查找可用端口
 * @param startPort 起始端口号
 * @param maxAttempts 最大尝试次数
 * @returns 可用端口号
 */
export const findAvailablePort = async (startPort: number, maxAttempts: number = 100): Promise<number> => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    const inUse = await isPortInUse(port)
    if (!inUse) {
      return port
    }
  }
  throw new Error(`无法找到可用端口，已尝试 ${maxAttempts} 次`)
}

/**
 * 构建新的 URL（替换端口）
 * @param originalUrl 原始 URL
 * @param newPort 新端口号
 * @returns 新 URL
 */
export const buildUrlWithPort = (originalUrl: string, newPort: number): string => {
  try {
    const urlObj = new URL(originalUrl)
    urlObj.port = newPort.toString()
    return urlObj.toString()
  } catch (error) {
    throw new Error(`无法构建新 URL: ${originalUrl}`)
  }
}

/**
 * 等待服务就绪
 * @param url 服务 URL
 * @param maxRetries 最大重试次数
 * @returns Promise
 */
export const waitForServer = async (url: string, maxRetries: number = 30): Promise<void> => {
  const urlObj = new URL(url)
  const hostname = urlObj.hostname
  const port = urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80)

  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const protocol = urlObj.protocol === 'https:' ? https : http
        const req = protocol.get(`${urlObj.protocol}//${hostname}:${port}`, (res) => {
          if (res.statusCode === 200 || res.statusCode === 404) {
            resolve()
          } else {
            reject(new Error(`HTTP ${res.statusCode}`))
          }
        })
        req.on('error', reject)
        req.setTimeout(2000, () => {
          req.destroy()
          reject(new Error('请求超时'))
        })
      })
      log.info('程序已就绪')
      return
    } catch (error) {
      if (i === maxRetries - 1) {
        log.warn(`程序启动超时，请检查程序是否已启动`)
        throw new Error('程序启动超时')
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }
}
