# Documentación de MiAnimeNyaa1

## 1. Propósito general

MiAnimeNyaa1 es una aplicación de gestión personal para anime que centraliza varias tareas del flujo de trabajo de un fan: catalogación, seguimiento de episodios vistos, sincronización con AniList, lectura de series desde un directorio local, descarga y monitorización de torrents, y visualización de calendario/actualidad.

La carpeta combina un frontend React con un backend Express y varios servicios de terceros (AniList, Shoko Server, Sonarr, Prowlarr, qBittorrent, Nyaa). La idea es que todo quede integrado en una misma interfaz.

## 2. Stack tecnológico

- Frontend: React + Vite + JavaScript
- Estilos: CSS y estilos globales personalizados
- Estado: Zustand
- Backend: Node.js + Express
- Cliente HTTP: Axios
- Reproductor/visualización: integración con navegador + lógica de vídeo local
- Integraciones externas:
  - AniList (OAuth + GraphQL)
  - Shoko Server
  - Sonarr
  - Prowlarr
  - qBittorrent
  - Scraper de noticias y torrents Nyaa
- Empaquetado: Electron

## 3. Estructura principal

```text
MiAnimeNyaa1/
├── data/                     # almacenamiento local (JSON y configuración)
├── docs/                     # documentación extra / archivos de referencia
├── logs/                     # logs de aplicación
├── public/                   # assets estáticos
├── scripts/                  # scripts de parche/arranque de la app y integrations
├── server/
│   └── server.js             # backend principal Express
├── src/
│   ├── App.jsx               # componente raíz y router principal
│   ├── main.jsx              # entrada React
│   ├── logger.js             # utilidades de logging
│   ├── components/           # vistas y widgets de UI
│   ├── hooks/                # lógica de datos y sincronización
│   ├── lib/                 # bibliotecas internas y audio
│   ├── store/               # estado global con Zustand
│   ├── styles/              # styles globales
│   └── utils/               # utilidades generales
├── package.json              # configuración de scripts y dependencias
├── README.md                 # resumen original del proyecto
├── biblioteca.json           # estado local de biblioteca general
├── vistos.json               # historia de episodios vistos
├── anilist_token.json        # token de AniList
├── vite.config.js            # configuración de Vite
└── DOCUMENTACION.md          # esta documentación
```

## 4. Componentes relevantes

### 4.1 Backend principal

El archivo `server/server.js` es el núcleo del lado servidor. Aquí se define:

- configuración dinámica de la app (`data/config.json`)
- endpoints para consultar o guardar la configuración
- pruebas de conexión a Sonarr, Prowlarr, Shoko y qBittorrent
- sistema de logs de la aplicación
- caché en memoria para respuestas frecuentes
- gestión de colas de trabajo async

Es el punto donde se conectan servicios externos y se centraliza la operación de la aplicación.

### 4.2 Frontend principal

`src/App.jsx` es el componente raíz. En él se maneja:

- navegación por pestañas y rutas
- carga de vistas con lazy loading
- sincronización de datos con AniList
- estado del usuario, biblioteca, episodios vistos y descargas activas
- personalización visual y apariencia del entorno
- integración del modal de terminal en vivo, QR y info general

### 4.3 Estado global

El store está en `src/store/useStore.js` y concentra información clave de la app:

- biblioteca del usuario
- episodios vistos
- anime abierto
- usuario de AniList
- recomendaciones
- descarga activa
- series sincronizadas desde Sonarr
- elementos de bloqueo o filtros

Esto permite que varias vistas compartan el mismo estado sin duplicar lógica.

### 4.4 Hooks críticos

Los hooks de `src/hooks/` encapsulan la mayor parte de la lógica de negocio:

- `useAnilist.js`: autenticación y sincronización con AniList
- `useAppData.js`: persistencia de datos en disco / JSON
- `useAppLogic.js`: lógica para buscar y abrir anime
- `useLibraryActions.js`: inserción, edición y eliminación de elementos en la biblioteca
- `useAudioEngine.js`: reproducción y manejo del audio
- `useIsMobile.js`: detección de móvil/tablet

### 4.5 Vistas principales

En `src/components/` están las pantallas de la aplicación:

- `AnimeCatalogView.jsx`: catálogo general de anime
- `AnimeDetailScreen.jsx`: detalle de un anime concreto
- `MyLibraryView.jsx`: biblioteca personal
- `GlobalCalendarView.jsx`: calendario de emisión
- `UpcomingView.jsx`: próximos lanzamientos
- `DownloadsView.jsx`: cola de descargas y estado
- `BodegaView.jsx`: vista local de repositorio multimedia
- `TorrentRadar.jsx`: exploración de torrents
- `LoFiRadio.jsx`: radio integrada
- `ControlPanel.jsx`: panel principal de configuración
- `AboutModal.jsx` / `AboutView.jsx`: información del proyecto

## 5. Flujo de datos

El flujo general es:

1. El usuario configura los servicios desde la interfaz (`config.json`).
2. La app consulta y obtiene los datos locales de biblioteca y vistos desde JSON.
3. La sincronización con AniList actualiza el estado del usuario y las listas.
4. Las vistas consultan el estado global y muestran catálogo, calendario y biblioteca.
5. Cuando se detectan torrents o descargas, la app interactúa con Sonarr, Prowlarr, qBittorrent y/o Shoko.
6. Los datos persistentes quedan en `data/` o en archivos JSON de raíz.

## 6. Archivos de datos importantes

Los archivos dentro de `data/` cumplen funciones clave:

- `config.json`: configuración central del proyecto
- `anilist_token.json`: token de acceso de AniList
- `biblioteca.json`: datos de la biblioteca principal
- `vistos.json`: lista de episodios marcados como vistos
- `notas.json`: notas y registros del usuario
- `torrent_offsets.json`: offsets / metadatos para torrents

## 7. Scripts y utilidades

La carpeta `scripts/` contiene parches y tareas auxiliares para integrar funcionalidades extra en la app, por ejemplo:

- `main.cjs` y scripts de patch de audio, catálogo, portada, radio y servidor
- ajustes de compatibilidad entre módulos y entorno

Son utilidades internas que permiten adaptar la app sin reescribir todo el frontend.

## 8. Cómo arrancar el proyecto

Requisitos:

- Node.js 18 o superior
- acceso a servicios externos (AniList, Sonarr, Prowlarr, Shoko, qBittorrent)

Desde la carpeta `MiAnimeNyaa1`:

```bash
npm install
npm run dev
```

Esto inicia en paralelo:

- Vite para el frontend
- servidor Express de la app
- Electron para la versión desktop

El puerto principal del navegador suele ser:

```text
http://localhost:5173
```

## 9. Observaciones de mantenimiento

- La app depende de rutas y archivos locales, especialmente en Windows.
- La configuración puede variar por máquina; es recomendable verificar `data/config.json` antes de iniciar.
- El backend usa cachés y logs para performance, pero también requiere que los servicios externos estén activos.
- Muchos aspectos del comportamiento están personalizados a un flujo de trabajo específico, por lo que es buena idea revisar la configuración antes de despliegue o reutilización.

## 10. Resumen

MiAnimeNyaa1 es un centro de control personal para anime, pensado como dashboard multimedia con integración con APIs y servicios del ecosistema de descarga y seguimiento. Su fortaleza principal es la combinación de catálogo, gestión de biblioteca, sincronización y automatización dentro de una sola interfaz.
