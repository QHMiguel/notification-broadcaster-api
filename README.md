# Broadcaster API - Notificaciones en Tiempo Real

API para gestión de notificaciones en tiempo real mediante **Server-Sent Events (SSE)** y webhooks de **Google Cloud Pub/Sub**.

## 🚀 Características

- ✅ **Conexiones SSE** para notificaciones en tiempo real por usuario
- ✅ **Webhook de Pub/Sub** para recibir y retransmitir mensajes
- ✅ **Gestor de conexiones** con soporte para usuarios y grupos
- ✅ **Persistencia en MongoDB** para seguimiento de notificaciones
- ✅ **Health endpoint** con métricas de conexiones activas
- ✅ **Swagger integrado** para documentación interactiva
- ✅ **Arquitectura NestJS** con adaptador Hapi

## 📋 Requisitos

- Node.js 20+
- MongoDB (Atlas o local)
- npm 10+

## 🔧 Instalación

```bash
# Instalar dependencias
npm install

# Compilar
npm run build
```

## ⚙️ Configuración

Crear archivo `.env` basado en `env.template`:

```bash
# Servidor
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB=pushify
```

## 🏃 Ejecución

```bash
# Modo desarrollo (con watch)
npm run dev

# Modo producción
npm run start:prod
```

## 📡 Endpoints

### SSE Stream
```
GET /api/v1/stream/:userId
```
Establece conexión SSE para recibir notificaciones en tiempo real.

**Eventos emitidos:**
- `connected`: Confirmación de conexión
- `heartbeat`: Ping cada 30s
- `notification`: Nueva notificación

### Webhook Pub/Sub
```
POST /api/v1/subscription/subscription-handler
```
Recibe mensajes de Google Pub/Sub y los retransmite vía SSE.

**Formato del payload (base64 en `message.data`):**
```json
{
  "messageId": "uuid",
  "notification": {
    "type": "info|alert|warning|error|success",
    "priority": "urgent|high|normal|low",
    "title": "Título",
    "content": "Contenido del mensaje",
    "category": "message|alert|system"
  },
  "sender": {
    "id": "sender-id",
    "name": "Nombre del remitente"
  },
  "recipient": {
    "type": "individual|group|broadcast",
    "id": "user-id"
  },
  "status": "pending|delivered|read",
  "createdAt": "2025-10-16T12:00:00Z"
}
```

### Health Check
```
GET /health
```
Devuelve estado del servicio y métricas de conexiones activas.

**Respuesta:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-16T12:00:00Z",
  "activeConnections": {
    "users": 5,
    "groups": 2
  }
}
```

### Swagger
```
GET /api/docs
```
Documentación interactiva de la API (sin autenticación).

## 🧪 Ejemplo de cliente SSE

```javascript
const userId = 'user-123';
const eventSource = new EventSource(`http://localhost:3000/api/v1/stream/${userId}`);

eventSource.addEventListener('connected', (e) => {
  console.log('Conectado:', JSON.parse(e.data));
});

eventSource.addEventListener('notification', (e) => {
  const notification = JSON.parse(e.data);
  console.log('Nueva notificación:', notification);
});

eventSource.addEventListener('heartbeat', () => {
  console.log('Heartbeat recibido');
});

eventSource.onerror = (error) => {
  console.error('Error SSE:', error);
};
```

## 📦 Estructura del Proyecto

```
broadcaster-api/
├── src/
│   ├── controllers/          # Controladores (Stream, Subscription)
│   ├── routes/               # Definición de rutas con decoradores
│   ├── services/             # Servicios (SSE Manager, MongoDB)
│   ├── common/               # Utilidades comunes
│   │   ├── decorators/       # Decoradores personalizados
│   │   ├── interceptors/     # Filtros e interceptores
│   │   ├── logger/           # Logger con tracking
│   │   └── pipes/            # Pipes de validación
│   ├── adapters/             # Adaptador Hapi para NestJS
│   ├── app.injectable.ts     # Módulo principal
│   └── main.ts               # Bootstrap de la aplicación
├── env.template              # Template de variables de entorno
└── package.json
```

## 🛠️ Tecnologías

- **NestJS** - Framework backend
- **Hapi** - Servidor HTTP (via adaptador)
- **MongoDB** - Persistencia de notificaciones
- **SSE** - Server-Sent Events para real-time
- **Swagger** - Documentación OpenAPI
- **TypeScript** - Lenguaje de programación

## 📝 Notas

- El servicio siempre responde con `200 OK` al webhook de Pub/Sub para evitar reintentos
- Las conexiones SSE se limpian automáticamente al cerrar o perder conexión
- El heartbeat mantiene las conexiones vivas cada 30 segundos
- MongoDB se conecta automáticamente al iniciar el módulo

## 🔒 Seguridad

- CORS configurable por variable de entorno
- Tracking ID por request para trazabilidad
- Validación de payload en webhook

## 📄 Licencia

UNLICENSED - Uso interno Interseguro
