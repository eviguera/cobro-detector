import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

/**
 * Logger estructurado para CobroDetector
 * Usa Pino para mejor rendimiento
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname'
        }
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label }
    }
  },
  base: {
    app: 'cobro-detector',
    env: process.env.NODE_ENV || 'development'
  }
})

/**
 * Convierte un error a formato logeable
 */
export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    }
  }
  return { message: String(error) }
}

/**
 * Wrapper para console.error que usa Pino
 */
export function logError(message: string, error?: unknown, context?: Record<string, unknown>) {
  logger.error({
    msg: message,
    error: error ? serializeError(error) : undefined,
    ...context
  })
}

/**
 * Log de API request (para monitoreo)
 */
export function logAPIRequest(
  method: string,
  path: string,
  userId?: string,
  duration?: number,
  statusCode?: number
) {
  logger.info({
    type: 'api_request',
    method,
    path,
    userId,
    duration,
    statusCode
  })
}
