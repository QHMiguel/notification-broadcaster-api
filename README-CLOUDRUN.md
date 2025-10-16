# Despliegue en Cloud Run

## ⚠️ Limitaciones de Cloud Run para SSE

Cloud Run tiene limitaciones para conexiones SSE (Server-Sent Events):

1. **Timeout máximo**: 3600 segundos (1 hora)
2. **Keep-alive requerido**: Debe enviar datos cada 15-30 segundos
3. **Load Balancer**: Puede cortar conexiones inactivas

## 🚀 Despliegue

### Opción 1: Usar el archivo de configuración

```bash
# Reemplaza PROJECT_ID con tu ID de proyecto
gcloud run services replace cloudrun-service.yaml --region=us-central1
```

### Opción 2: Comando directo

```bash
# Construir y subir la imagen
gcloud builds submit --tag gcr.io/PROJECT_ID/notification-broadcaster-api

# Desplegar con timeout extendido
gcloud run deploy notification-broadcaster-api \
  --image gcr.io/PROJECT_ID/notification-broadcaster-api:latest \
  --platform managed \
  --region us-central1 \
  --timeout 3600 \
  --allow-unauthenticated \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 1 \
  --max-instances 10 \
  --port 8080
```

## 🔧 Configuración de variables de entorno

```bash
gcloud run services update notification-broadcaster-api \
  --set-env-vars="CORS_ORIGIN=https://your-frontend.com" \
  --region us-central1
```

## 📊 Monitoreo

Para ver los logs en tiempo real:

```bash
gcloud run services logs read notification-broadcaster-api --region us-central1 --follow
```

## ⚡ Recomendaciones

1. **Keep-alive agresivo**: El código ya está configurado para enviar heartbeat cada 15 segundos
2. **Mínimo 1 instancia**: Configurar `minScale: 1` para evitar cold starts en conexiones SSE
3. **CPU no throttling**: Desactivar throttling de CPU para mantener conexiones activas
4. **Timeout máximo**: 3600s es el máximo permitido por Cloud Run

## 🔄 Reconexión automática en el cliente

En tu frontend, implementa reconexión automática:

```javascript
let eventSource;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 segundos

function connectSSE(userId) {
  eventSource = new EventSource(`https://your-api.run.app/api/v1/stream/${userId}`);
  
  eventSource.onopen = () => {
    console.log('✅ Conexión SSE establecida');
    reconnectAttempts = 0;
  };
  
  eventSource.onerror = (error) => {
    console.error('❌ Error en SSE:', error);
    eventSource.close();
    
    // Reconectar automáticamente
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`🔄 Reintentando conexión (${reconnectAttempts}/${maxReconnectAttempts})...`);
      setTimeout(() => connectSSE(userId), reconnectDelay * reconnectAttempts);
    }
  };
  
  eventSource.addEventListener('connected', (event) => {
    console.log('Conectado:', JSON.parse(event.data));
  });
  
  eventSource.addEventListener('notification', (event) => {
    const notification = JSON.parse(event.data);
    console.log('Nueva notificación:', notification);
    // Manejar la notificación
  });
}

// Iniciar conexión
connectSSE('user123');

// Limpiar al salir
window.addEventListener('beforeunload', () => {
  if (eventSource) {
    eventSource.close();
  }
});
```

## 🐛 Troubleshooting

### "Truncated response body"

Este error indica que Cloud Run está cortando la conexión. Verifica:

1. ✅ Timeout configurado a 3600s
2. ✅ Heartbeat activo cada 15s
3. ✅ Mínimo 1 instancia activa
4. ✅ CPU throttling desactivado

### Conexiones se cierran después de 5 minutos

El timeout por defecto es 300s. Asegúrate de configurar `--timeout 3600`.

### Cold starts rompen conexiones

Configura `--min-instances 1` para mantener al menos una instancia caliente.

