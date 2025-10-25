import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Shared logger để capture logs từ tất cả processes và stream vào web console
export class SharedLogger {
  private static instance: SharedLogger;
  private logStream: fs.WriteStream;
  private broadcastFunction?: (botId: string, level: string, message: string, source: string) => void;

  private constructor() {
    // Tạo log file tạm
    const logPath = path.join(process.cwd(), 'temp-bot-logs.txt');
    this.logStream = fs.createWriteStream(logPath, { flags: 'a' });
    
    // Watch log file changes để stream real-time
    this.watchLogFile(logPath);
  }

  static getInstance(): SharedLogger {
    if (!SharedLogger.instance) {
      SharedLogger.instance = new SharedLogger();
    }
    return SharedLogger.instance;
  }

  setBroadcastFunction(fn: (botId: string, level: string, message: string, source: string) => void) {
    this.broadcastFunction = fn;
  }

  private watchLogFile(logPath: string) {
    if (fs.existsSync(logPath)) {
      fs.watchFile(logPath, { interval: 100 }, (curr, prev) => {
        if (curr.mtime > prev.mtime) {
          this.readNewLines(logPath, prev.size);
        }
      });
    }
  }

  private readNewLines(logPath: string, lastSize: number) {
    const data = fs.readFileSync(logPath);
    const newData = data.slice(lastSize);
    const lines = newData.toString().split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      if (this.broadcastFunction && line.trim()) {
        this.parseAndBroadcast(line);
      }
    });
  }

  private parseAndBroadcast(line: string) {
    if (!this.broadcastFunction) return;
    
    let source = 'bot';
    let level = 'info';
    let botId = 'external-bot';
    
    // Phân loại log dựa trên nội dung
    if (line.includes('🚀') || line.includes('Đang tạo bot')) {
      level = 'info';
      source = 'bot';
    } else if (line.includes('✅') || line.includes('thành công') || line.includes('spawn')) {
      level = 'success';
      source = 'bot';
    } else if (line.includes('🔍') || line.includes('Kiểm tra')) {
      level = 'info';
      source = 'bot';
    } else if (line.includes('📡') || line.includes('Kết nối')) {
      level = 'info';
      source = 'bot';
    } else if (line.includes('Status:')) {
      level = 'success';
      source = 'bot';
      botId = 'bot-status';
    } else if (line.includes('🔴') || line.includes('error') || line.includes('Error')) {
      level = 'error';
      source = 'bot';
    } else if (line.includes('⚠️') || line.includes('warn')) {
      level = 'warning';
      source = 'bot';
    }
    
    this.broadcastFunction(botId, level, line, source);
  }

  // Log message từ external process
  logExternal(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info', source: string = 'bot') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}\n`;
    
    this.logStream.write(logLine);
    
    // Broadcast trực tiếp nếu có function
    if (this.broadcastFunction) {
      this.broadcastFunction('external-bot', level, message, source);
    }
  }

  // Cleanup
  cleanup() {
    this.logStream.end();
    const logPath = path.join(process.cwd(), 'temp-bot-logs.txt');
    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
  }
}

// Export singleton instance
export const sharedLogger = SharedLogger.getInstance();