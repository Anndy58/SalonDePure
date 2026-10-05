# Documentación de ScraperNyaa

## 1. Propósito general

ScraperNyaa es un servicio backend encargado de extraer información de torrents de Nyaa.si y exponerla mediante una API REST compatible con herramientas de indexación como Prowlarr, Sonarr y Radarr.

Su función principal es automatizar la búsqueda y extracción de resultados de anime desde Nyaa, analizar la metadata del título, filtrar por idioma/resolución/seeders y devolver resultados estructurados o en formato XML compatible con Torznab.

## 2. Stack tecnológico

- Node.js
- Express
- ESM modules (`type": "module"`)
- Axios para peticiones HTTP
- Cheerio para parseo HTML
- LRU Cache para almacenamiento temporal
- p-limit para limitar concurrencia
- Test framework nativo de Node (`node:test`)

## 3. Estructura del proyecto

```text
ScraperNyaa/
├── public/                  # frontend estático opcional
├── scripts/
│   ├── benchmarkScraper.js  # pruebas de rendimiento
│   ├── buildExe.js          # empaquetado ejecutable
│   ├── testScraper.js      # pruebas manuales CLI
│   └── ...
├── src/
│   ├── app.js               # arranque del servidor
│   ├── routes/
│   │   ├── nyaaRoutes.js     # endpoints de Nyaa
│   │   └── torznabRoutes.js  # endpoints Torznab/RSS
│   └── services/
│       ├── nyaaScraper.js    # scraper principal
│       └── torznabService.js # generación de XML
├── tests/
│   ├── app.test.js
│   ├── scraper.test.js
│   └── torznab.test.js
├── package.json             # scripts y dependencias
├── DOCUMENTACION.md          # esta documentación
└── ...
```

## 4. Arquitectura funcional

### 4.1 `src/app.js`

Es el punto de entrada y arranque del servidor Express. Aquí se configuran:

- middleware JSON
- CORS
- rutas principales
- health check (`/health`)
- montar la API de Nyaa (`/api/nyaa`)
- montar el endpoint Torznab (`/api/torznab` y alias `/api`)

Además, al arrancar en producción, inicia un `background prewarmer` para preparar resultados o caché inicial.

### 4.2 `src/routes/nyaaRoutes.js`

Define la API de búsqueda y consulta para Nyaa. Tiene rutas como:

- `GET /api/nyaa/search`
- `GET /api/nyaa/view/:id`
- `POST /api/nyaa/batch-export`
- `GET /api/nyaa/stream-logs`
- `GET /api/nyaa/benchmark`

Estas rutas permiten:

- buscar torrents por texto, categoría y filtros
- recuperar información detallada de un torrent concreto
- exportar magnet links o listas formateadas
- visualizar logs en tiempo real por stream SSE

### 4.3 `src/routes/torznabRoutes.js`

Expone endpoints compatibles con Torznab/Newznab para integración con indexers y clientes automáticos.

- `GET /api/torznab`
- `GET /api/torznab/rss`
- `GET /api` (alias para compatibilidad)

También devuelve XML con `caps` cuando se usa `t=caps`.

### 4.4 `src/services/nyaaScraper.js`

Es el componente principal del proyecto. Aquí se implementa:

- petición HTML a Nyaa.si con caché
- rotación de User-Agent
- soporte opcional de proxies
- manejo de rate limiting con reintentos y backoff
- extracción de listado de resultados
- análisis de descripciones y metadatos
- filtrado por idioma, seeders y categoría

Funciones clave:

- `cleanDescriptionText(text)`
- `extractSubtitleInfo(title, descriptionText)`
- `extractMetadataFromTitle(title)`
- `scrapeListings({ query, category })`
- `scrapeSearchWithDetails({ ... })`

### 4.5 `src/services/torznabService.js`

Genera los feeds XML que consumen clientes compatibles con Torznab. Añade atributos como:

- seeders
- leechers
- resolution
- language
- category
- magnet URL

También incluye la generación del XML de capacidades (`caps.xml`-like).

## 5. Funcionalidades clave

### Búsqueda avanzada

La API soporta filtros como:

- `q`: texto de búsqueda
- `c`: categoría (por ejemplo `1_2` = Anime - English-translated)
- `deep`: si se desea extraer texto detallado de la descripción
- `limit`: número máximo de resultados
- `mode`: `shallow` o `full`
- `spanishOnly`: limitar a contenido en español
- `minSeeders`: mínimo de seeders
- `useCache`: activar o desactivar caché

El scraping profundo procesa como máximo 3 solicitudes simultáneas; este límite es fijo.

### Detección de metadata

El scraper identifica automáticamente:

- resolución (`1080p`, `720p`, `2160p`, etc.)
- episodio (`E01`, `EP08`, etc.)
- fansub o grupo
- idioma español / inglés / multi-audio

### Cache y performance

Se usa `LRUCache` con:

- límite de 500 elementos
- TTL de 15 minutos

Esto evita consultar repetidamente el mismo contenido y mejora mucho la velocidad de respuesta.

### Manejo de rate limits

La aplicación tiene mecanismos para detectar:

- `429`
- `503`
- `502`
- conexiones reiniciadas

y reintentar con backoff para no romper la extracción cuando Nyaa responde con throttling.

## 6. Endpoints principales

### Health check

```http
GET /health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "la-taberna-nyaa-extractor",
  "timestamp": "..."
}
```

### Búsqueda

```http
GET /api/nyaa/search?q=one%20piece&limit=10&deep=true&c=1_2
```

### Ver detalle de un item

```http
GET /api/nyaa/view/123456
```

### Feed Torznab

```http
GET /api/torznab?t=caps
GET /api/torznab?q=one%20piece&deep=true&limit=20
GET /api/torznab/rss?q=one%20piece
```

## 7. Cómo iniciar el proyecto

Requisitos:

- Node.js
- acceso a internet para consultar Nyaa.si

Desde la carpeta `ScraperNyaa`:

```bash
npm install
npm start
```

Por defecto, el servidor queda disponible en `http://localhost:6767`. Puedes cambiar el puerto definiendo la variable de entorno `PORT`.

También puede ejecutarse una prueba rápida:

```bash
npm test
```

Comandos útiles adicionales:

```bash
npm run test:cli
npm run test:benchmark
npm run build:exe
```

## 8. Pruebas

El proyecto incluye tests en `tests/` para validar:

- comportamiento de la app base
- extractor de torrents
- respuestas Torznab

Estos tests están construidos con `node:test` y permiten validar la lógica principal sin depender del scraping en vivo.

## 9. Recomendaciones de mantenimiento

- Evitar consultas excesivas a Nyaa sin caché para no recibir bloqueo.
- Revisar periodicamente los patrones de detección de idioma/resolución para mantener compatibilidad con nuevos títulos.
- Si se usa con servicios como Prowlarr/Sonarr, conviene mantener la salida XML compatible con los atributos esperados.
- Cuando se despliegue en entornos reales, revisar el uso de proxies y límites de concurrencia.

## 10. Resumen

ScraperNyaa es un extractor de torrents orientado a anime, preparado para integrarse con ecosistemas de descarga y indexación. Su parte más importante es el scraper de Nyaa.si, que combina cache, filtros, análisis de títulos y compatibilidad Torznab para ofrecer resultados útiles a un cliente o frontend externo.
