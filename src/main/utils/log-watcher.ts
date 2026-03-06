import fs from 'fs';
import readline from 'readline';
import { EventEmitter } from 'events';

/**
 * 日志文件监听器类
 * 封装日志文件监听逻辑和资源管理
 */
export class LogFileWatcher extends EventEmitter {
  private watcher: fs.FSWatcher | null = null;
  private filePath: string;
  private fileSize: number = 0;

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
  }

  /**
   * 初始化日志监听
   * @returns Promise<Array<string>> 前50条日志
   */
  async initWatch(): Promise<Array<string>> {
    try {
      let first50Logs: string[] = []
      try {
        first50Logs = await this.readLastNLogs(50);
      } catch (err) {
        console.log('读取日志错误...')
      }
      this.emit('logReady', first50Logs);

      const stats = fs.statSync(this.filePath);
      this.fileSize = stats.size;

      this.watcher = fs.watch(this.filePath, { encoding: 'utf-8' }, (eventType) => {
        if (eventType === 'change') {
          this.readNewLogs().catch(err => {
            this.emit('error', `读取新增日志失败：${err.message}`);
          });
        }
      });

      this.watcher.on('error', (err) => {
        this.emit('error', `文件监听失败：${err.message}`);
      });

      return first50Logs;
    } catch (err) {
      this.emit('error', `初始化监听失败：${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * 读取文件前N条日志
   * @param n 要读取的行数
   * @returns Promise<Array<string>>
   */
  private async readLastNLogs(n = 50): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(this.filePath)) {
        resolve([])
        return
      }

      fs.stat(this.filePath, (err, stats) => {
        if (err || stats.size === 0) {
          resolve([])
          return
        }
        if (err) {
          reject(err)
          return
        }

        const fileSize = stats.size
        const READ_SIZE = 32 * 1024
        const start = Math.max(0, fileSize - READ_SIZE)
        const length = fileSize - start
        if (length <= 0) {
          resolve([])
          return
        }
        fs.open(this.filePath, 'r', (err, fd) => {
          if (err) {
            reject(err)
            return
          }

          const buffer = Buffer.alloc(length)

          fs.read(fd, buffer, 0, length, start, (err) => {
            fs.close(fd, () => {})

            if (err) {
              reject(err)
              return
            }

            const content = buffer.toString('utf8')
            const lines = content
              .split(/\r?\n/)
              .filter(Boolean)

            resolve(lines.slice(-n))
          })
        })
      })
    })
  }

  /**
   * 读取文件新增的日志内容
   */
  private async readNewLogs(): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.stat(this.filePath, (err, stats) => {
        if (err) return reject(err);
        const newSize = stats.size;

        if (newSize < this.fileSize) {
          this.fileSize = 0;
          this.readLastNLogs(50).then((logs) => {
            this.emit('newLogs', logs);
            this.fileSize = newSize;
            resolve();
          }).catch(reject);
          return;
        }

        const logs: string[] = [];
        const stream = fs.createReadStream(this.filePath, {
          start: this.fileSize,
          end: newSize - 1
        });
        const rl = readline.createInterface({
          input: stream,
          crlfDelay: Infinity
        });

        rl.on('line', (line) => {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            logs.push(trimmedLine);
          }
        });

        rl.on('close', () => {
          if (logs.length > 0) {
            this.emit('newLogs', logs);
          }
          this.fileSize = newSize;
          resolve();
        });

        rl.on('error', reject);
      });
    });
  }

  /**
   * 清理监听资源
   */
  cleanup(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.fileSize = 0;
    this.removeAllListeners();
    console.log('日志监听资源已清理');
  }
}
