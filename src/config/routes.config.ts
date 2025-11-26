/**
 * Configuración de rutas y microservicios
 */
import { RouteConfig } from '../types'

export const routes: RouteConfig[] = [
  // ==========================================
  // AUTH SERVICE (Público)
  // ==========================================
  {
    path: '/api/auth',
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:8000',
    requireAuth: false,
  },

  // ==========================================
  // LICENSING SERVICE (Protegido)
  // ==========================================
  {
    path: '/api/licencias',
    target: process.env.LICENSING_SERVICE_URL || 'http://localhost:3001',
    requireAuth: true,
  },
  {
    path: '/api/modulos',
    target: process.env.LICENSING_SERVICE_URL || 'http://localhost:3001',
    requireAuth: true,
  },
  {
    path: '/api/clientes-licensing',
    target: process.env.LICENSING_SERVICE_URL || 'http://localhost:3001',
    requireAuth: true,
  },

  // ==========================================
  // EMPLOYEES SERVICE (Requiere módulo EMPLEADOS)
  // ==========================================
  {
    path: '/api/empleados',
    target: process.env.EMPLOYEES_SERVICE_URL || 'http://localhost:8002',
    requireAuth: true,
    requireModule: 'EMPLEADOS',
  },

  // ==========================================
  // CLIENTS SERVICE (Requiere módulo CLIENTES)
  // ==========================================
  {
    path: '/api/clientes',
    target: process.env.CLIENTS_SERVICE_URL || 'http://localhost:8003',
    requireAuth: true,
    requireModule: 'CLIENTES',
  },

  // ==========================================
  // SALES SERVICE (Requiere módulo VENTAS)
  // ==========================================
  {
    path: '/api/ventas',
    target: process.env.SALES_SERVICE_URL || 'http://localhost:8004',
    requireAuth: true,
    requireModule: 'VENTAS',
  },
  {
    path: '/api/cotizaciones',
    target: process.env.SALES_SERVICE_URL || 'http://localhost:8004',
    requireAuth: true,
    requireModule: 'VENTAS',
  },

  // ==========================================
  // USUARIOS Y PERFILES (Auth service)
  // ==========================================
  {
    path: '/api/usuarios',
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:8000',
    requireAuth: true,
  },
  {
    path: '/api/perfiles',
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:8000',
    requireAuth: true,
  },
  {
    path: '/api/menu',
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:8000',
    requireAuth: true,
  },
]
