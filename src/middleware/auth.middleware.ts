/**
 * Middleware de autenticación JWT
 */
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import axios from 'axios'
import { AuthPayload } from '../types'

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8000'
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-here'

/**
 * Middleware para validar JWT token
 * Puede validar localmente o contra el servicio de Auth
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token no proporcionado',
        message: 'Debe incluir el header Authorization: Bearer <token>'
      })
    }

    const token = authHeader.substring(7)

    // Estrategia 1: Validar localmente (más rápido)
    try {
      const decoded = jwt.verify(token, SECRET_KEY) as any
      
      req.user = {
        sub: decoded.sub,
        usuario_id: decoded.sub,
        usuario: decoded.usuario,
        cliente_id: decoded.cliente_id,
        perfil_id: decoded.perfil_id,
      }

      return next()
    } catch (jwtError) {
      // Si falla la validación local, intentar contra el servicio
      console.log('Validación local falló, intentando con servicio Auth...')
    }

    // Estrategia 2: Validar contra microservicio Auth (más seguro)
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      })

      req.user = {
        sub: response.data.usuario_id,
        usuario_id: response.data.usuario_id,
        usuario: response.data.usuario || 'unknown',
        cliente_id: response.data.cliente_id,
        perfil_id: response.data.perfil_id,
      }

      return next()
    } catch (authServiceError: any) {
      console.error('Error validando con Auth service:', authServiceError.message)
      
      return res.status(401).json({
        error: 'Token inválido o expirado',
        message: 'No se pudo validar el token de autenticación'
      })
    }

  } catch (error: any) {
    console.error('Error en middleware de autenticación:', error)
    
    return res.status(500).json({
      error: 'Error interno de autenticación',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}

/**
 * Middleware opcional para rutas que aceptan auth pero no la requieren
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  try {
    await authMiddleware(req, res, next)
  } catch (error) {
    // Ignorar errores y continuar sin autenticación
    next()
  }
}
