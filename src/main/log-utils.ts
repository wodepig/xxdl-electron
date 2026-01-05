import fs from 'fs';
import readline from 'readline';
import { EventEmitter } from 'events';

// 定义日志监听器类，封装监听逻辑和资源管理
export class LogFileWatcher extends EventEmitter {
  private watcher: fs.FSWatcher | null = null; // 文件监听实例
  private filePath: string; // 日志文件路径
  private fileSize: number = 0; // 记录上次读取的文件大小（用于获取新增内容）

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
  }

  /**
   * 第一步：初始化日志监听（点击“日志”按钮调用）
   * @returns Promise<Array<string>> 前50条日志
   */
  async initWatch(): Promise<Array<string>> {
    try {
      // 1. 先读取前50条日志并返回
      const first50Logs = await this.readLastNLogs(50);
      this.emit('logReady', first50Logs); // 触发日志就绪事件

      // 2. 获取当前文件大小（用于后续监听新增内容）
      const stats = fs.statSync(this.filePath);
      this.fileSize = stats.size;

      // 3. 启动文件监听（监听文件变化）
      this.watcher = fs.watch(this.filePath, { encoding: 'utf-8' }, (eventType) => {
        // 只处理文件内容变化（忽略重命名等事件）
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
      fs.stat(this.filePath, (err, stats) => {
        if (err) {
          reject(err)
          return
        }

        const fileSize = stats.size
        const READ_SIZE = 32 * 1024 // 32KB，够 50 行日志用
        const start = Math.max(0, fileSize - READ_SIZE)
        const length = fileSize - start

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
   * 读取文件新增的日志内容（文件变动时调用）
   */
  private async readNewLogs(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 先获取最新文件大小
      fs.stat(this.filePath, (err, stats) => {
        if (err) return reject(err);
        const newSize = stats.size;

        // 如果文件大小变小（日志轮转/清空），重置文件大小并读取前50行
        if (newSize < this.fileSize) {
          this.fileSize = 0;
          this.readLastNLogs(50).then((logs) => {
            this.emit('newLogs', logs); // 触发新日志事件（文件重置）
            this.fileSize = newSize;
            resolve();
          }).catch(reject);
          return;
        }

        // 读取新增的内容（从上次的size位置开始）
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
          if (trimmedLine) { // 过滤空行
            logs.push(trimmedLine);
          }
        });

        rl.on('close', () => {
          if (logs.length > 0) {
            this.emit('newLogs', logs); // 触发新日志事件
            // console.log('新增日志：', logs); // 自动打印新增内容
          }
          this.fileSize = newSize; // 更新文件大小
          resolve();
        });

        rl.on('error', reject);
      });
    });
  }

  /**
   * 清理监听资源（点击“关闭”按钮调用）
   */
  cleanup(): void {
    if (this.watcher) {
      this.watcher.close(); // 关闭文件监听
      this.watcher = null;
    }
    this.fileSize = 0;
    this.removeAllListeners(); // 移除所有事件监听
    console.log('日志监听资源已清理');
  }
}


