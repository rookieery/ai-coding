import { config } from '../config';

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

const logLevels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

const currentLogLevel = config.logging.level as LogLevel;
const currentLevel = logLevels[currentLogLevel] || logLevels.info;

function log(level: LogLevel, message: string, ...args: any[]) {
  if (logLevels[level] <= currentLevel) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (level === 'error') {
      console.error(prefix, message, ...args);
    } else if (level === 'warn') {
      console.warn(prefix, message, ...args);
    } else {
      console.log(prefix, message, ...args);
    }
  }
}

export const logger = {
  error: (message: string, ...args: any[]) => log('error', message, ...args),
  warn: (message: string, ...args: any[]) => log('warn', message, ...args),
  info: (message: string, ...args: any[]) => log('info', message, ...args),
  debug: (message: string, ...args: any[]) => log('debug', message, ...args),
  trace: (message: string, ...args: any[]) => log('trace', message, ...args),
};

// 请求日志中间件
export function requestLogger(req: any, res: any, next: any) {
  const startTime = Date.now();

  // 记录请求开始
  logger.info(`${req.method} ${req.originalUrl} - Request started`);

  // 记录响应完成
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel](
      `${req.method} ${req.originalUrl} - ${res.statusCode} ${res.statusMessage} - ${duration}ms`
    );
  });

  next();
}