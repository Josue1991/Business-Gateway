/**
 * Types y interfaces globales
 */

export interface AuthPayload {
  sub: number
  usuario_id: number
  usuario: string
  cliente_id?: number
  perfil_id: number
}

export interface LicenseInfo {
  valida: boolean
  licencia?: {
    moduloCodigo: string
    moduloNombre: string
    fechaVencimiento: string | null
    maxUsuarios: number
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
      licencia?: LicenseInfo['licencia']
    }
  }
}

export interface RouteConfig {
  path: string
  target: string
  requireAuth: boolean
  requireModule?: string
  rateLimit?: {
    windowMs: number
    max: number
  }
}

export interface ServiceHealth {
  name: string
  url: string
  status: 'online' | 'offline'
  responseTime?: number
}
