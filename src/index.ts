/**
 * Business Gateway - API Gateway para microservicios
 */
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import { createProxyMiddleware } from 'http-proxy-middleware'
import dotenv from 'dotenv'

import { authMiddleware } from './middleware/auth.middleware'
import { requireModule } from './middleware/license.middleware'
import { requestLogger, errorLogger, moduleAccessLogger } from './middleware/logger.middleware'
import { routes } from './config/routes.config'
import { checkAllServices } from './utils/health.util'

// Cargar variables de entorno
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// ==========================================
// MIDDLEWARE GLOBAL
// ==========================================

// Seguridad
app.use(helmet())

// Compresión
app.use(compression())

// CORS
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*']
    
    // Permitir requests sin origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('No permitido por CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
app.use(requestLogger)

// Rate limiting global
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Demasiadas peticiones',
    message: 'Has excedido el límite de peticiones. Intenta más tarde.',
    retryAfter: '15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// ==========================================
// ENDPOINTS ESPECIALES
// ==========================================

// Health check
app.get('/health', async (req, res) => {
  try {
    const services = await checkAllServices()
    const allHealthy = services.every(s => s.status === 'online')

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      gateway: {
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      services
    })
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
})

// Info del gateway
app.get('/info', (req, res) => {
  res.json({
    name: 'Business Gateway',
    version: '1.0.0',
    description: 'API Gateway para Business ERP',
    environment: process.env.NODE_ENV,
    routes: routes.map(r => ({
      path: r.path,
      requireAuth: r.requireAuth,
      requireModule: r.requireModule || null
    }))
  })
})

// ==========================================
// CONFIGURAR RUTAS DINÁMICAMENTE
// ==========================================

console.log('\n🔧 Configurando rutas del Gateway...\n')

routes.forEach(route => {
  const middlewares: any[] = []

  // Agregar autenticación si es requerida
  if (route.requireAuth) {
    middlewares.push(authMiddleware)
  }

  // Agregar validación de módulo si es requerida
  if (route.requireModule) {
    middlewares.push(requireModule(route.requireModule))
    middlewares.push(moduleAccessLogger)
  }

  // Rate limiting específico por ruta (si está configurado)
  if (route.rateLimit) {
    const routeLimiter = rateLimit({
      windowMs: route.rateLimit.windowMs,
      max: route.rateLimit.max,
      message: {
        error: 'Límite de peticiones excedido para esta ruta',
        retryAfter: `${route.rateLimit.windowMs / 1000} segundos`
      }
    })
    middlewares.push(routeLimiter)
  }

  // Crear proxy middleware
  const proxy = createProxyMiddleware({
    target: route.target,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Remover el prefijo del path para el servicio destino
      return path.replace(route.path, '')
    },
    onProxyReq: (proxyReq, req: any) => {
      // Pasar información del usuario al microservicio
      if (req.user) {
        proxyReq.setHeader('X-User-Id', String(req.user.usuario_id))
        proxyReq.setHeader('X-Usuario', req.user.usuario)
        
        if (req.user.cliente_id) {
          proxyReq.setHeader('X-Cliente-Id', String(req.user.cliente_id))
        }
        
        if (req.user.perfil_id) {
          proxyReq.setHeader('X-Perfil-Id', String(req.user.perfil_id))
        }
      }

      // Pasar información de licencia
      if (req.licencia) {
        proxyReq.setHeader('X-Module', req.licencia.moduloCodigo)
      }

      // Log de la petición proxeada
      console.log(`[PROXY] ${req.method} ${route.path} → ${route.target}`)
    },
    onProxyRes: (proxyRes, req, res) => {
      // Log de la respuesta
      const statusColor = proxyRes.statusCode && proxyRes.statusCode < 400 ? '\x1b[32m' : '\x1b[31m'
      console.log(`[PROXY] ${statusColor}${proxyRes.statusCode}\x1b[0m ${req.method} ${req.url}`)
    },
    onError: (err, req, res) => {
      console.error(`[PROXY ERROR] ${route.path}:`, err.message)
      
      const response = res as express.Response
      response.status(502).json({
        error: 'Error de comunicación con el servicio',
        service: route.path,
        message: process.env.NODE_ENV === 'development' ? err.message : 'Servicio no disponible',
        timestamp: new Date().toISOString()
      })
    },
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
  })

  // Registrar la ruta
  app.use(route.path, ...middlewares, proxy)

  // Log de configuración
  const authBadge = route.requireAuth ? '🔒' : '🔓'
  const moduleBadge = route.requireModule ? `📦 ${route.requireModule}` : ''
  console.log(`  ${authBadge} ${route.path.padEnd(30)} → ${route.target} ${moduleBadge}`)
})

console.log('\n✅ Rutas configuradas\n')

// ==========================================
// MANEJO DE ERRORES GLOBAL
// ==========================================

// 404 - Not Found
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
    message: 'La ruta solicitada no existe en este gateway',
    availableRoutes: routes.map(r => r.path)
  })
})

// Logger de errores
app.use(errorLogger)

// Error handler global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const statusCode = err.statusCode || 500
  
  res.status(statusCode).json({
    error: err.message || 'Error interno del servidor',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  })
})

// ==========================================
// INICIAR SERVIDOR
// ==========================================

const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60))
  console.log('🚀 Business Gateway')
  console.log('='.repeat(60))
  console.log(`📍 URL:        http://localhost:${PORT}`)
  console.log(`📚 Health:     http://localhost:${PORT}/health`)
  console.log(`ℹ️  Info:       http://localhost:${PORT}/info`)
  console.log(`🌍 Entorno:    ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔒 CORS:       ${process.env.ALLOWED_ORIGINS || '*'}`)
  console.log('='.repeat(60) + '\n')
})

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('\n⏹️  Cerrando servidor...')
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('\n⏹️  Cerrando servidor...')
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente')
    process.exit(0)
  })
})

export default app
