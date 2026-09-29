# 🍇 La Taberna (App de Gestión de Anime)

¡Bienvenido a **La Taberna**! 🍻
Tu refugio personal y local para catalogar, organizar y reproducir todos tus animes favoritos.

Esta no es una biblioteca común y corriente; está conectada a servicios externos potentes que hacen todo el trabajo sucio por ti, desde buscar carátulas hasta sincronizar los capítulos que has visto.

## 🚀 ¿Qué hace especial a La Taberna?

Esta aplicación une múltiples herramientas de gestión de media en una sola interfaz hermosa (y con radio LoFi integrada para relajarte 📻).

*   **Autenticación y Sincronización con AniList:** ¡El login ya está aquí! Entra con tu cuenta de AniList y la app sincronizará mágicamente tus listas (Viendo, Completado, En Pausa). Si ves un capítulo aquí, se marca allá.
*   **Catálogo en tiempo real:** Navega por los animes más populares gracias a la integración nativa con la API GraphQL de AniList.
*   **Conexión directa con Shoko Server:** Escanea automáticamente tu carpeta local de animes (`D:\Videos\anime`), empareja capítulos y sincroniza los metadatos más exactos de AniDB.
*   **Integración con Sonarr & qBittorrent:** ¡Busca, añade descargas y supervisa tu cola de torrents sin salir de la app!
*   **Rastreador de Torrents vía Prowlarr:** Encuentra los capítulos en español, inglés, 1080p o 4k con una potente función de búsqueda integrada.
*   **Reproductor Web Integrado:** ¡Dale play y mira tus archivos .mkv o .mp4 desde el propio navegador, o lánzalos directamente a VLC con un clic!
*   **Noticias Otaku:** Entérate de la actualidad directamente desde _Somos Kudasai_ gracias a un scraper ninja.

## 🛠️ Tecnologías y Pila de Desarrollo

*   **Frontend:** React (Vite) + TailwindCSS + Zustand (Estado) + Framer Motion (Animaciones hermosas).
*   **Backend:** Node.js + Express.
*   **Base de datos local:** Simple y rápida (JSON) y cacheo en memoria.
*   **Empaquetado:** ¡Listo para exportarse como App Nativa de escritorio usando Electron!

## 📦 Instalación y Configuración (Para Taberneros)

Para abrir tu propia sucursal de La Taberna, sigue estos pasos:

1.  Asegúrate de tener Node.js instalado (v18 o superior). Verifica con `node -v`.
2.  Abre una terminal y entra en esta carpeta.
3.  Instala todas las cervezas... digo, dependencias:
    ```bash
    npm install
    ```
4.  Levanta el servidor local, ¡que empiece la fiesta!:
    ```bash
    npm run dev
    ```
5.  Abre tu navegador en `http://localhost:5173`.
6.  ¡Verás la pantalla de **Configuración Inicial (SetupScreen)**! Llena tus claves de API de Sonarr, Prowlarr, Shoko y AniList desde la interfaz gráfica. Todo se guardará de forma segura y automática en `data/config.json`.

## 🗝️ ¿Cómo funciona el Login / API en el Proyecto?

El login está totalmente funcional y centralizado. Funciona a través del flujo **OAuth2** de AniList:
1. Haces clic en conectar en el panel de control.
2. React te envía a `/api/anilist/auth` (El backend Express).
3. Express te redirige a AniList para que autorices.
4. AniList nos devuelve el código a `/api/anilist/callback`.
5. ¡El backend se lo guarda localmente en `data/anilist_token.json` y el Frontend lo consume de maravilla actualizando tu usuario (`/api/anilist/me`)!

---
_Hecho con ❤️, algo de magia y mucha paciencia para compilar y catalogar animes._
