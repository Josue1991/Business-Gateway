/**
 * Utilidades para health checks
 */
import axios from 'axios'
import { ServiceHealth } from '../types'

/**
 * Verificar salud de un servicio
 */
export async function checkServiceHealth(
  name: string,
  url: string
): Promise<ServiceHealth> {
  const startTime = Date.now()
  
  try {
    const healthUrl = `${url}/health`
    await axios.get(healthUrl, { timeout: 3000 })
    
    return {
      name,
      url,
      status: 'online',
      responseTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      name,
      url,
      status: 'offline',
      responseTime: Date.now() - startTime
    }
  }
}

/**
 * Verificar todos los servicios
 */
export async function checkAllServices(): Promise<ServiceHealth[]> {
  const services = [
    {
      name: 'Auth Service',
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:8000'
    },
    {
      name: 'Licensing Service',
      url: process.env.LICENSING_SERVICE_URL || 'http://localhost:3001'
    },
    {
      name: 'Employees Service',
      url: process.env.EMPLOYEES_SERVICE_URL || 'http://localhost:8002'
    },
    {
      name: 'Clients Service',
      url: process.env.CLIENTS_SERVICE_URL || 'http://localhost:8003'
    },
  ]

  const checks = services.map(service =>
    checkServiceHealth(service.name, service.url)
  )

  return await Promise.all(checks)
}
