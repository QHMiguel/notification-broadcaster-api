# 📋 Configuración de Logs

## 🎛️ Niveles de Log Disponibles

NestJS soporta los siguientes niveles de log (de más a menos verboso):

1. **`debug`** - Información muy detallada para debugging (heartbeats, etc.)
2. **`verbose`** - Información detallada de operaciones
3. **`log`** - Información general de operaciones importantes
4. **`warn`** - Advertencias (conexiones perdidas, errores recuperables)
5. **`error`** - Errores críticos

---

## ✅ Configuración Actual (RECOMENDADA)

**Nivel actual:** `['log', 'error', 'warn']`

Esto significa que verás:
- ✅ Logs informativos importantes (conexiones, mensajes procesados)
- ⚠️ Advertencias (conexiones cerradas, errores no críticos)
- ❌ Errores críticos

NO verás:
- ❌ DEBUG: Heartbeats cada 15 segundos (spam)
- ❌ VERBOSE: Información muy detallada

---

## 🔧 Cambiar Nivel de Logs

### Para PRODUCCIÓN (logs limpios):
```typescript
// src/main.ts - línea 30
logger: ['log', 'error', 'warn']
```

**Resultado:**
```
🔌 Nueva conexión SSE: userId=schilona desde IP=35.201.85.45
👥 Total conexiones: 1 usuarios, 0 grupos
✅ Conexión SSE establecida para userId=schilona
📬 [msg-123] Procesando mensaje
✅ [msg-123] Enviados 1/1 eventos SSE
🔌 Cliente schilona cerró conexión
```

---

### Para DESARROLLO (con debugging):
```typescript
// src/main.ts - línea 30
logger: ['debug', 'verbose', 'log', 'error', 'warn']
```

**Resultado:**
```
🔌 Nueva conexión SSE: userId=schilona desde IP=35.201.85.45
👥 Total conexiones: 1 usuarios, 0 grupos
✅ Conexión SSE establecida para userId=schilona
DEBUG: Heartbeat enviado a schilona
DEBUG: Heartbeat enviado a schilona
DEBUG: Heartbeat enviado a schilona
...
```

---

### Solo ERRORES (producción silenciosa):
```typescript
// src/main.ts - línea 30
logger: ['error']
```

**Resultado:**
```
❌ Error en request de schilona: Connection reset
❌ Uncaught Exception: Database connection failed
```

---

## 🎨 Logs por Componente

### StreamController (Conexiones SSE)
- `log`: Nuevas conexiones, desconexiones, totales
- `warn`: Conexiones cerradas inesperadamente
- `error`: Errores críticos en SSE

### SubscriptionController (Webhooks)
- `log`: Requests recibidos, mensajes procesados, envíos exitosos
- `warn`: Sin conexiones activas, payload inválido
- `error`: Errores al procesar mensajes

---

## 📦 Configuración Dinámica con Variables de Entorno

Si quieres controlar los logs mediante `.env`, puedes modificar `main.ts`:

```typescript
const LOG_LEVEL = process.env.LOG_LEVEL || 'production';

const loggerConfig = {
  production: ['log', 'error', 'warn'],
  development: ['debug', 'verbose', 'log', 'error', 'warn'],
  silent: ['error']
};

const app = await NestFactory.create<NestHapiApplication>(
  AppInjectable,
  new HapiAdapter,
  {
    logger: loggerConfig[LOG_LEVEL] || loggerConfig.production,
  }
);
```

Luego en tu `.env`:
```bash
# Opciones: production, development, silent
LOG_LEVEL=production
```

---

## 🐳 Docker / Cloud Run

Para cambiar logs en Cloud Run sin recompilar:

```bash
gcloud run services update notification-broadcaster-api \
  --set-env-vars="LOG_LEVEL=production" \
  --region=europe-west1
```

---

## 📊 Logs Actuales Después del Cambio

Con la configuración actual (`['log', 'error', 'warn']`), verás algo como:

```
[Main] 🚀 Iniciando aplicación...
[Main] ✅ CORS habilitado para orígenes: http://localhost:5173
[Main] Server HAPI Notification Broadcaster API listening at http://0.0.0.0:8080

[StreamController] 🔌 Nueva conexión SSE: userId=schilona desde IP=35.201.85.45
[StreamController] 👥 Total conexiones: 1 usuarios, 0 grupos
[StreamController] ✅ Conexión SSE establecida para userId=schilona

[SubscriptionController] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[SubscriptionController] 🌐 WEBHOOK REQUEST RECIBIDO
[SubscriptionController] 📬 [msg-123] Procesando mensaje
[SubscriptionController] ✅ [msg-123] Enviados 1/1 eventos SSE
[SubscriptionController] ✓ [msg-123] Marcado como entregado en BD

[StreamController] 🔌 Cliente schilona cerró conexión
[StreamController] 👥 Conexiones restantes: 0 usuarios, 0 grupos
```

**Sin spam de heartbeats cada 15 segundos** ✨

---

## 🚀 Aplicar Cambios

1. **Recompilar:**
   ```bash
   npm run build
   ```

2. **Reiniciar el servidor:**
   ```bash
   npm start
   # o
   docker-compose restart
   # o
   gcloud run deploy...
   ```

3. **Verificar logs:**
   ```bash
   # Cloud Run
   gcloud run services logs read notification-broadcaster-api --follow

   # Docker local
   docker logs -f notification-broadcaster-api

   # Local
   npm start
   ```

