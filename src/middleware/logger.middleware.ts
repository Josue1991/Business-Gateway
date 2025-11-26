/**
 * Middleware de logging personalizado
 */
import { Request, Response, NextFunction } from 'express'
import morgan from 'morgan'

/**
 * Formato personalizado de logs
 */
export const requestLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms - :remote-addr',
  {
    skip: (req) => {
      // Omitir logs de health check en producción
      return process.env.NODE_ENV === 'production' && req.url === '/health'
    }
  }
)

/**
 * Logger de errores personalizado
 */
export function errorLogger(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const timestamp = new Date().toISOString()
  
  console.error({
    timestamp,
    method: req.method,
    url: req.url,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    user: req.user?.usuario_id || 'anonymous'
  })

  next(err)
}

/**
 * Logger de acceso a módulos
 */
export function moduleAccessLogger(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.licencia) {
    console.log({
      timestamp: new Date().toISOString(),
      action: 'module_access',
      user: req.user?.usuario_id,
      cliente: req.user?.cliente_id,
      module: req.licencia.moduloCodigo,
      path: req.path
    })
  }
  next()
}
