/**
 * Middleware de validación de licencias por módulo
 */
import { Request, Response, NextFunction } from 'express'
import axios from 'axios'

const LICENSING_SERVICE_URL = process.env.LICENSING_SERVICE_URL || 'http://localhost:3001'

/**
 * Cache simple para licencias (TTL: 5 minutos)
 */
const licenseCache = new Map<string, { valida: boolean; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Middleware factory para validar módulos específicos
 */
export function requireModule(moduloCodigo: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Usuario no autenticado',
          message: 'Debe autenticarse antes de acceder a este recurso'
        })
      }

      const clienteId = req.user.cliente_id

      if (!clienteId) {
        return res.status(403).json({
          error: 'Cliente no identificado',
          message: 'El usuario no está asociado a un cliente'
        })
      }

      // Verificar cache
      const cacheKey = `${clienteId}-${moduloCodigo}`
      const cached = licenseCache.get(cacheKey)
      
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        if (!cached.valida) {
          return res.status(403).json({
            error: `Módulo '${moduloCodigo}' no está activo`,
            message: 'Contacte al administrador para activar este módulo',
            modulo: moduloCodigo
          })
        }
        return next()
      }

      // Validar licencia contra microservicio Licensing
      try {
        const response = await axios.get(
          `${LICENSING_SERVICE_URL}/api/licencias/validate/${clienteId}/${moduloCodigo}`,
          { timeout: 5000 }
        )

        const valida = response.data.valida === true

        // Guardar en cache
        licenseCache.set(cacheKey, { valida, timestamp: Date.now() })

        if (!valida) {
          return res.status(403).json({
            error: `Módulo '${moduloCodigo}' no está activo`,
            message: 'Contacte al administrador para activar este módulo',
            modulo: moduloCodigo
          })
        }

        // Agregar info de licencia al request (opcional)
        if (response.data.licencia) {
          req.licencia = response.data.licencia
        }

        next()
      } catch (error: any) {
        console.error(`Error validando módulo ${moduloCodigo}:`, error.message)

        // Si el servicio de licensing está caído, denegar acceso por seguridad
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return res.status(503).json({
            error: 'Servicio de licencias no disponible',
            message: 'No se puede validar el acceso al módulo en este momento'
          })
        }

        if (error.response?.status === 403) {
          return res.status(403).json({
            error: `No tiene acceso al módulo '${moduloCodigo}'`,
            message: 'Su licencia no incluye este módulo'
          })
        }

        return res.status(500).json({
          error: 'Error validando licencia',
          message: 'Ocurrió un error al verificar su acceso'
        })
      }
    } catch (error: any) {
      console.error('Error en middleware de licencia:', error)
      
      return res.status(500).json({
        error: 'Error interno de validación de licencia',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

/**
 * Limpiar cache periódicamente
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of licenseCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      licenseCache.delete(key)
    }
  }
}, CACHE_TTL)
