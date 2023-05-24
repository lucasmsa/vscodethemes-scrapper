import winston from 'winston';
import path from 'path';

export function initializeLogger() {
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
      new winston.transports.File({
        filename: path.join('..', '..', 'logs', 'errors.log'),
        level: 'error',
      }),
      new winston.transports.File({
        filename: path.join('..', '..', 'logs', 'combined.log'),
      }),
    ],
  });

  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    );
  }

  return logger;
}
