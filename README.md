# Business Gateway

API Gateway para el ecosistema de microservicios Business ERP. Maneja autenticación, validación de licencias por módulo, rate limiting y proxy a servicios backend.

## 🚀 Características

- ✅ **Autenticación JWT** centralizada
- ✅ **Validación de licencias** por módulo
- ✅ **Rate limiting** global y por ruta
- ✅ **Proxy inteligente** a microservicios
- ✅ **Health checks** de todos los servicios
- ✅ **CORS** configurado
- ✅ **Logging** detallado
- ✅ **TypeScript** con type-safety completo

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Editar .env con tus configuraciones
```

## 🔧 Configuración

Edita el archivo `.env` con las URLs de tus microservicios:

```env
PORT=4000
AUTH_SERVICE_URL=http://localhost:8000
LICENSING_SERVICE_URL=http://localhost:3001
SECRET_KEY=tu-clave-secreta-igual-que-auth
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000
```

## 🚀 Ejecución

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm run build
npm start

# Type checking
npm run type-check
```

## 📍 Rutas Configuradas

### Públicas (sin autenticación)
- `POST /api/auth/login` → Auth Service
- `POST /api/auth/login-form` → Auth Service

### Protegidas (requieren autenticación)
- `GET /api/auth/me` → Auth Service
- `GET /api/usuarios` → Auth Service
- `GET /api/perfiles` → Auth Service
- `GET /api/menu/tree` → Auth Service

### Con validación de módulo
- `GET /api/empleados` → Employees Service (requiere módulo `EMPLEADOS`)
- `GET /api/clientes` → Clients Service (requiere módulo `CLIENTES`)
- `GET /api/ventas` → Sales Service (requiere módulo `VENTAS`)

### Gestión de licencias
- `GET /api/licencias` → Licensing Service (protegido)
- `GET /api/modulos` → Licensing Service (protegido)

## 🔒 Flujo de Autenticación

```
1. Frontend → Gateway: POST /api/auth/login
2. Gateway → Auth Service: Proxy request
3. Auth Service → Gateway: {access_token}
4. Gateway → Frontend: {access_token}

5. Frontend → Gateway: GET /api/empleados (Bearer token)
6. Gateway: Valida JWT
7. Gateway → Licensing: Valida módulo EMPLEADOS
8. Gateway → Employees Service: Proxy request
9. Employees → Gateway: Response
10. Gateway → Frontend: Response
```

## 🏥 Health Check

```bash
# Verificar estado del gateway y servicios
GET http://localhost:4000/health

Response:
{
  "status": "healthy",
  "gateway": {...},
  "services": [
    {
      "name": "Auth Service",
      "status": "online",
      "responseTime": 45
    },
    ...
  ]
}
```

## 📊 Endpoints de Gestión

### Info del Gateway
```bash
GET /info
```

### Health Check
```bash
GET /health
```

## 🔐 Headers Automáticos

El Gateway agrega headers automáticamente a las peticiones proxeadas:

```
X-User-Id: 123
X-Usuario: admin
X-Cliente-Id: 1
X-Perfil-Id: 1
X-Module: EMPLEADOS (si aplica)
```

Los microservicios pueden leer estos headers para obtener contexto del usuario.

## 🛡️ Seguridad

- **Helmet**: Headers de seguridad HTTP
- **CORS**: Configurado con origins permitidos
- **Rate Limiting**: Límite de peticiones por IP
- **JWT**: Validación de tokens
- **Compression**: Respuestas comprimidas

## 📝 Agregar Nuevas Rutas

Edita `src/config/routes.config.ts`:

```typescript
{
  path: '/api/nuevo-servicio',
  target: 'http://localhost:8005',
  requireAuth: true,
  requireModule: 'NUEVO_MODULO', // Opcional
}
```

## 🧪 Testing

```bash
# Probar login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","contrasenia":"admin123"}'

# Probar endpoint protegido
curl http://localhost:4000/api/empleados \
  -H "Authorization: Bearer <token>"
```

## 📚 Tecnologías

- **Express** - Framework web
- **TypeScript** - Type safety
- **http-proxy-middleware** - Proxy a microservicios
- **jsonwebtoken** - Validación JWT
- **axios** - Cliente HTTP
- **helmet** - Seguridad
- **express-rate-limit** - Rate limiting
- **morgan** - Logging HTTP

## 🔄 Arquitectura

```
Frontend (Angular/React)
        ↓
   API Gateway (4000)
        ↓
    ┌───┴───────┬──────────┬──────────┐
    ↓           ↓          ↓          ↓
  Auth      Licensing  Employees  Clients
  (8000)     (3001)     (8002)    (8003)
```

## 📖 Documentación Adicional

- [Agregar Middleware](./docs/middleware.md)
- [Configurar Rate Limiting](./docs/rate-limiting.md)
- [Health Checks](./docs/health-checks.md)

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Proyecto interno de Business ERP
