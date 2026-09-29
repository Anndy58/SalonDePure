// src/logger.js

let isServerReady = false;
let serverCheckInterval = null;

// Función para verificar si el servidor está disponible
const checkServer = async () => {
  try {
    const host = window.location.hostname || 'localhost';
    const res = await fetch(`http://${host}:3000/api/logs/view`, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Timeout rápido para no bloquear
      signal: AbortSignal.timeout(1000)
    });
    if (res.ok) {
      isServerReady = true;
      if (serverCheckInterval) {
        clearInterval(serverCheckInterval);
        serverCheckInterval = null;
      }
    }
  } catch (e) {
    // Servidor no disponible aún
    isServerReady = false;
  }
};

export const initGlobalLogger = () => {
  const host = window.location.hostname || 'localhost';
  
  // Guardamos las funciones originales
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  // Función para enviar al backend (solo si el servidor está listo)
  const sendToBackend = (level, args) => {
    // Si el servidor no está listo, no intentamos enviar
    if (!isServerReady) return;

    try {
      const message = Array.from(args).map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : arg
      ).join(' ');

      // Usar fetch sin await, capturar error en .catch()
      fetch(`http://${host}:3000/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, component: 'Frontend', message })
      }).catch(() => { /* ignorar fallos */ });
    } catch (e) {
      // Ignorar errores de log
    }
  };

  // 🔥 Verificar si el servidor está disponible (sin bloqueos)
  // Intentamos una vez al inicio y luego cada 5 segundos si falla
  checkServer();
  if (!isServerReady) {
    serverCheckInterval = setInterval(checkServer, 5000);
  }

  // Secuestramos console.log
  console.log = function () {
    originalLog.apply(console, arguments);
    sendToBackend('INFO', arguments);
  };

  // Secuestramos console.warn
  console.warn = function () {
    originalWarn.apply(console, arguments);
    sendToBackend('WARN', arguments);
  };

  // Secuestramos console.error
  console.error = function () {
    originalError.apply(console, arguments);
    sendToBackend('ERROR', arguments);
  };

  // Limpieza al recargar la página
  window.addEventListener('beforeunload', () => {
    if (serverCheckInterval) {
      clearInterval(serverCheckInterval);
      serverCheckInterval = null;
    }
  });

  console.log("📡 Sistema de Logs Globales activado. (Esperando servidor...)");
};