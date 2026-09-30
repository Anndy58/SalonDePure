import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import https from 'https';
import http from 'http';
import WebSocket from 'ws';
import 'dotenv/config';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import PQueue from 'p-queue';
import randomUseragent from 'random-useragent';
import anitomy from 'anitomy-js';

const parser = new Parser();
const app = express();
app.use(cors());
app.use(express.json());

// ============================================================================
// ⚙️ CONFIGURACIÓN (SISTEMA DINÁMICO)
// ============================================================================
const CONFIG_FILE = path.join(process.cwd(), 'data', 'config.json');

// Valores por defecto
let appConfig = {
  SONARR_URL: 'http://localhost:8989',
  SONARR_API_KEY: '',
  PROWLARR_URL: 'http://localhost:9696',
  PROWLARR_API_KEY: '',
  SHOKO_URL: 'http://localhost:8111',
  SHOKO_API_KEY: '',
  CARPETA_D: 'D:\\Videos\\anime',
  QBITTORRENT_URL: 'http://localhost:8080'
};

// Cargar configuración al iniciar
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    appConfig = { ...appConfig, ...JSON.parse(data) };
  } else {
    // Si no existe, crear la carpeta (si no existe) y el archivo con los defaults
    if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
      fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(appConfig, null, 2));
  }
} catch (e) {
  console.error('Error cargando config.json, usando valores por defecto:', e.message);
}

// Getters dinámicos para reemplazar las constantes fijas
const getConfig = (key) => appConfig[key];

// Rutas de API para gestionar la Configuración
app.get('/api/config', (req, res) => {
  res.json(appConfig);
});

app.post('/api/config', (req, res) => {
  try {
    appConfig = { ...appConfig, ...req.body };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(appConfig, null, 2));
    res.json({ success: true, message: 'Configuración guardada exitosamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error guardando la configuración.' });
  }
});

// Rutas para Testear APIs desde el SetupScreen
app.post('/api/test/sonarr', async (req, res) => {
  const { url, apiKey } = req.body;
  try {
    const response = await axios.get(`${url}/api/v3/system/status`, {
      headers: { 'X-Api-Key': apiKey },
      timeout: 3000
    });
    if (response.status === 200) res.json({ success: true, version: response.data.version });
    else res.json({ success: false });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/test/prowlarr', async (req, res) => {
  const { url, apiKey } = req.body;
  try {
    const response = await axios.get(`${url}/api/v1/system/status`, {
      headers: { 'X-Api-Key': apiKey },
      timeout: 3000
    });
    if (response.status === 200) res.json({ success: true, version: response.data.version });
    else res.json({ success: false });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/test/shoko', async (req, res) => {
  const { url, apiKey } = req.body;
  try {
    const response = await axios.get(`${url}/api/v3/Init/Version`, {
      headers: { 'apikey': apiKey },
      timeout: 3000
    });
    if (response.status === 200) res.json({ success: true });
    else res.json({ success: false });
  } catch (err) {
    // If the endpoint is not found, it might be an older Shoko version, let's try another one.
    if (err.response && err.response.status === 404) {
      try {
        const fallbackResponse = await axios.get(`${url}/api/v3/Server`, {
          headers: { 'apikey': apiKey },
          timeout: 3000
        });
        if (fallbackResponse.status === 200) return res.json({ success: true });
      } catch (fallbackErr) {
        return res.json({ success: false, error: fallbackErr.message });
      }
    }
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/test/folder', async (req, res) => {
  const { folderPath } = req.body;
  try {
    await fs.promises.access(folderPath, fs.constants.R_OK | fs.constants.W_OK);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: 'Carpeta inaccesible o no existe.' });
  }
});

app.post('/api/test/qbittorrent', async (req, res) => {
  const { url } = req.body;
  try {
    const response = await axios.get(`${url}/api/v2/app/version`, { timeout: 3000 });
    if (response.status === 200) res.json({ success: true, version: response.data });
    else res.json({ success: false });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ============================================================================
// 📝 SISTEMA DE LOGS
// ============================================================================
const LOG_FILE = path.join(process.cwd(), 'logs', 'taberna.log');

const writeLog = (level, msg, err = '') => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${msg} ${err}\n`;
  try {
    fs.appendFileSync(LOG_FILE, logLine);
  } catch (e) {
    console.error('Error escribiendo log físico:', e.message);
  }
};

const log = {
  info: (msg) => { console.log(`\x1b[36mℹ️  [INFO]\x1b[0m ${msg}`); writeLog('INFO', msg); },
  success: (msg) => { console.log(`\x1b[32m🟢 [OK]\x1b[0m   ${msg}`); writeLog('SUCCESS', msg); },
  warn: (msg) => { console.log(`\x1b[33m⚠️  [WARN]\x1b[0m ${msg}`); writeLog('WARN', msg); },
  error: (msg, err = '') => { console.error(`\x1b[31m🔴 [FAIL]\x1b[0m ${msg}`, err); writeLog('ERROR', msg, err); },
  perf: (route, ms) => { console.log(`\x1b[35m⚡ [PERF]\x1b[0m ${route} respondió en \x1b[1m${ms.toFixed(1)}ms\x1b[0m`); writeLog('PERF', `${route} en ${ms.toFixed(1)}ms`); }
};

app.get('/api/logs/view', async (req, res) => {
  try {
    if (!fs.existsSync(LOG_FILE)) return res.json({ logs: ["Aún no hay registros en la terminal."] });
    const data = await fs.promises.readFile(LOG_FILE, 'utf-8');
    const lines = data.trim().split('\n').slice(-100);
    res.json({ logs: lines });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo leer el archivo de logs.' });
  }
});

app.post('/api/logs', (req, res) => {
  try {
    const { level, component, message } = req.body;
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] [${component}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logLine);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error escribiendo log' });
  }
});

// ============================================================================
// 💾 CACHÉ
// ============================================================================
class SimpleCache {
  constructor(defaultTtl = 60000) {
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
  set(key, value, ttl = this.defaultTtl) {
    this.cache.set(key, { value, expiry: Date.now() + ttl });
  }
  delete(key) {
    this.cache.delete(key);
  }
}

const searchCache = new SimpleCache(5 * 60 * 1000);
const catalogCache = new SimpleCache(10 * 60 * 1000);
const scheduleCache = new SimpleCache(4 * 60 * 60 * 1000);
const translateCache = new SimpleCache(24 * 60 * 60 * 1000);
const shokoSeriesCache = new SimpleCache(30 * 60 * 1000);
const sonarrSeriesCache = new SimpleCache(10 * 60 * 1000);
const enrichCache = new SimpleCache(30 * 24 * 60 * 60 * 1000); // 30 días TTL
const tmdbCache = new SimpleCache(14 * 24 * 60 * 60 * 1000); // 14 días TTL

// Cola de ejecución asíncrona secuencial con intervalo
class SimpleQueue {
  constructor(concurrency = 1, intervalMs = 1500) {
    this.concurrency = concurrency;
    this.intervalMs = intervalMs;
    this.queue = [];
    this.active = 0;
  }
  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }
  async process() {
    if (this.active >= this.concurrency || this.queue.length === 0) return;
    this.active++;
    const { fn, resolve, reject } = this.queue.shift();
    try {
      const res = await fn();
      resolve(res);
    } catch (err) {
      reject(err);
    } finally {
      setTimeout(() => {
        this.active--;
        this.process();
      }, this.intervalMs);
    }
  }
}

// Base de datos local de offsets de publicación de torrents
const TORRENT_OFFSETS_FILE = path.join(process.cwd(), 'data', 'torrent_offsets.json');

// ============================================================================
// 📡 SERVICIO RSS EN SEGUNDO PLANO (Sincronización cada 15 minutos)
// ============================================================================
async function pollBackgroundTorrentRSS() {
  console.log(`┌────────────────────────────────────────────────────────┐`);
  console.log(`│ [RSS DAEMON] 📡 Sincronizando feed en segundo plano...  │`);
  console.log(`└────────────────────────────────────────────────────────┘`);
  try {
    const parser = new Parser({
      customFields: { item: ['nyaa:infoHash', 'enclosure'] }
    });
    const feed = await parser.parseURL('https://feed.animetosho.org/rss2');
    if (!feed || !Array.isArray(feed.items) || feed.items.length === 0) return;

    const rssItems = feed.items.map(item => ({
      title: item.title,
      rawDate: item.pubDate || item.isoDate,
      dateSecs: item.pubDate ? Math.floor(new Date(item.pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000)
    }));

    // Agrupar items de RSS por título parseado de anime usando Anitomy
    const torrentsByAnime = new Map();

    rssItems.forEach(item => {
      let parsed = null;
      try {
        parsed = anitomy.parseSync(item.title);
      } catch (e) {}

      const animeTitle = parsed?.anime_title || item.title;
      if (!animeTitle) return;

      const cleanKey = animeTitle.toLowerCase().trim();
      if (!torrentsByAnime.has(cleanKey)) {
        torrentsByAnime.set(cleanKey, { title: animeTitle, items: [] });
      }
      torrentsByAnime.get(cleanKey).items.push(item);
    });

    let updatedCount = 0;
    const offsets = getTorrentOffsets();

    for (const [cleanKey, group] of torrentsByAnime.entries()) {
      const existingKey = Object.keys(offsets).find(k => k === cleanKey || k.includes(cleanKey) || cleanKey.includes(k));

      if (existingKey && offsets[existingKey]?.baseAiringAt) {
        const dummyAnime = {
          id: existingKey,
          title: group.title,
          baseAiringAt: offsets[existingKey].baseAiringAt
        };
        const resCalc = calculateTorrentOffsetForAnime(dummyAnime, group.items);
        if (resCalc.updated) updatedCount++;
      }
    }

    if (updatedCount > 0) {
      scheduleCache.delete("current_season");
      console.log(`│ [RSS DAEMON] ✅ Sincronizados ${updatedCount} offsets de anime.`);
    }
  } catch (err) {
    console.error(`│ [RSS DAEMON] ⚠️ Error en sincronización RSS:`, err.message);
  }
}

// Iniciar consulta periódica cada 15 minutos (15 * 60 * 1000 ms)
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
setInterval(pollBackgroundTorrentRSS, FIFTEEN_MINUTES_MS);
// Ejecutar una primera sincronización 10 segundos después del arranque del servidor
setTimeout(pollBackgroundTorrentRSS, 10000);

const getTorrentOffsets = () => {
  try {
    if (fs.existsSync(TORRENT_OFFSETS_FILE)) {
      return JSON.parse(fs.readFileSync(TORRENT_OFFSETS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
};

const saveTorrentOffset = (animeIdOrTitle, offsetSeconds) => {
  try {
    if (typeof offsetSeconds !== 'number' || isNaN(offsetSeconds)) return false;

    // Tolerancia máxima de ±6.5 días para soportar retrasos de publicación casi semanales
    const MAX_TOLERANCE_SECONDS = 6.5 * 24 * 3600;
    const clampedOffset = Math.max(-MAX_TOLERANCE_SECONDS, Math.min(MAX_TOLERANCE_SECONDS, Math.round(offsetSeconds)));

    const offsets = getTorrentOffsets();
    const key = String(animeIdOrTitle).toLowerCase().trim();

    // Histeresis: Si el offset existente no varía por más de 30 minutos (1800s), mantenerlo inalterado
    const existing = offsets[key];
    if (existing && typeof existing.offsetSeconds === 'number') {
      if (Math.abs(existing.offsetSeconds - clampedOffset) < 1800) {
        return false; // No hubo cambio significativo
      }
    }

    offsets[key] = {
      offsetSeconds: clampedOffset,
      updatedAt: new Date().toISOString()
    };
    if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
      fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
    }
    fs.writeFileSync(TORRENT_OFFSETS_FILE, JSON.stringify(offsets, null, 2));
    scheduleCache.delete("current_season");
    return true; // Se actualizó
  } catch (e) {
    console.error('Error guardando torrent offset:', e.message);
    return false;
  }
};

/**
 * Lógica Reestructurada de Calibración de Torrents
 * 1. Filtrado de palabras clave de packs/batches/películas/BD.
 * 2. Extracción de número de episodio con anitomy-js o regex.
 * 3. Selección de la fecha del PRIMER torrent publicado para cada episodio individual.
 * 4. Cálculo del Median Shift (mediana de diferencias) de los episodios.
 */
function calculateTorrentOffsetForAnime(anime, rawResults) {
  if (!anime || !Array.isArray(rawResults) || rawResults.length === 0) {
    return { updated: false, offsetSeconds: 0 };
  }

  const nowSecs = Math.floor(Date.now() / 1000);
  const SIX_MONTHS_SECS = 180 * 86400;

  // 1. Filtrar torrents válidos ignorando batches, BD, películas y packs
  const BATCH_REGEX = /\b(batch|complete|collection|01-\d+|1-\d+|bluray|bdrip|movie|film|ova|special|s0\d+e\d+-e?\d+)\b/i;

  const validTorrents = rawResults.filter(r => {
    if (!r.rawDate) return false;
    const d = new Date(r.rawDate).getTime();
    if (isNaN(d)) return false;
    if (BATCH_REGEX.test(r.title)) return false;
    return true;
  }).map(r => ({
    title: r.title,
    dateSecs: Math.floor(new Date(r.rawDate).getTime() / 1000)
  }));

  // Restringir a publicaciones recientes (últimas 3 semanas / 21 días) para animes en emisión activa
  const THREE_WEEKS_SECS = 21 * 86400;
  let recentTorrents = validTorrents.filter(r => (nowSecs - r.dateSecs) <= THREE_WEEKS_SECS);
  if (recentTorrents.length === 0) {
    // Si no hay torrents en las últimas 3 semanas, ordenar por fecha descendente y tomar los 10 más recientes
    recentTorrents = [...validTorrents].sort((a, b) => b.dateSecs - a.dateSecs).slice(0, 10);
  }
  if (recentTorrents.length === 0) return { updated: false, offsetSeconds: 0 };

  // 2. Extraer episodios y agrupar por número de episodio para tomar el PRIMER lanzamiento
  const episodeMap = new Map(); // epNum -> fecha_publicacion_mas_antigua

  recentTorrents.forEach(t => {
    let epNum = null;
    try {
      const parsed = anitomy.parseSync(t.title);
      if (parsed && parsed.episode_number) {
        epNum = parseInt(parsed.episode_number, 10);
      }
    } catch (e) {}

    if (!epNum || isNaN(epNum)) {
      const match = t.title.match(/(?:-\s*|EP?|E|Cap[íi]tulo\s*)(\d{1,3})(?!\d)/i);
      if (match) epNum = parseInt(match[1], 10);
    }

    if (epNum && !isNaN(epNum)) {
      const currentMin = episodeMap.get(epNum);
      if (currentMin === undefined || t.dateSecs < currentMin) {
        episodeMap.set(epNum, t.dateSecs);
      }
    }
  });

  let episodeReleaseTimes = Array.from(episodeMap.values());
  if (episodeReleaseTimes.length === 0) {
    // Tomar los lanzamientos más recientes
    episodeReleaseTimes = recentTorrents.map(t => t.dateSecs);
  }

  // 3. Calcular la diferencia deduciendo la fecha histórica por episodio (sin módulo)
  const baseAiringSecs = anime.baseAiringAt || anime.nextAiringAt;
  if (!baseAiringSecs) return { updated: false, offsetSeconds: 0 };

  const ONE_WEEK_SECS = 7 * 86400;
  const rawNextEp = anime.nextAiringEpisodeNumber || anime.nextAiringEpisode?.episode;
  const nextAiringEpNum = typeof rawNextEp === 'number' ? rawNextEp : parseInt(rawNextEp, 10);

  let offsets = [];

  if (episodeMap.size > 0 && !isNaN(nextAiringEpNum)) {
    // Deducción exacta de fecha histórica por número de episodio
    for (const [epNum, torrentSecs] of episodeMap.entries()) {
      const historicalAiringSecs = baseAiringSecs - ((nextAiringEpNum - epNum) * ONE_WEEK_SECS);
      const diffSecs = torrentSecs - historicalAiringSecs;
      offsets.push(diffSecs);
    }
  } else {
    // Fallback si no se detectaron números de episodios
    offsets = episodeReleaseTimes.map(torrentSecs => torrentSecs - baseAiringSecs);
  }

  offsets.sort((a, b) => a - b);

  // MEDIANA
  const mid = Math.floor(offsets.length / 2);
  const medianOffset = offsets.length % 2 !== 0
    ? offsets[mid]
    : (offsets[mid - 1] + offsets[mid]) / 2;

  // 4. Guardar con histeresis
  const updatedId = saveTorrentOffset(anime.id, medianOffset);
  let updatedTitle = false;
  if (anime.title) {
    updatedTitle = saveTorrentOffset(anime.title, medianOffset);
  }

  return {
    updated: updatedId || updatedTitle,
    offsetSeconds: medianOffset
  };
}

// Máximo 1 petición simultánea a Nyaa, dejando 1.5s entre peticiones para prevenir baneos de IP
const nyaaQueue = new SimpleQueue(1, 1500);

// ============================================================================
// 🔍 1. BUSCADOR ANILIST
// ============================================================================
app.get('/api/anime/search', async (req, res) => {
  const { q } = req.query;
  try {
    if (!q || q.trim().length < 2) return res.json([]);
    const cacheKey = q.trim().toLowerCase();
    const cachedData = searchCache.get(cacheKey);
    if (cachedData) return res.json(cachedData);

    const query = `
      query ($search: String) {
        Page(page: 1, perPage: 40) {
          media(search: $search, type: ANIME, format_in: [TV, TV_SHORT, ONA, MOVIE], isAdult: false, sort: POPULARITY_DESC) {
            id
            title { romaji english }
            coverImage { extraLarge }
            description
            episodes
            averageScore
            startDate { year month day }
            genres
            status
            isAdult
            nextAiringEpisode { airingAt }
          }
        }
      }
    `;
    const response = await axios.post('https://graphql.anilist.co', { query, variables: { search: q } }, { timeout: 4000 });
    
    let results = (response.data.data.Page.media || []).map(a => ({
      anilistId: a.id,
      title: a.title.romaji || a.title.english,
      titleEnglish: a.title.english || a.title.romaji,
      image: a.coverImage.extraLarge,
      episodes: a.episodes || "??",
      score: a.averageScore ? (a.averageScore / 10).toFixed(1) : "8.5",
      synopsis: a.description ? a.description.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...' : "Sin sinopsis.",
      genres: a.genres || [],
      startDate: a.startDate && a.startDate.year ? { year: a.startDate.year, month: a.startDate.month, day: a.startDate.day } : null,
      nextAiringAt: a.nextAiringEpisode?.airingAt || null,
    }));

    const searchLower = q.trim().toLowerCase();
    results.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aExact = aTitle === searchLower;
      const bExact = bTitle === searchLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      const aStarts = aTitle.startsWith(searchLower);
      const bStarts = bTitle.startsWith(searchLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
    });

    searchCache.set(cacheKey, results);
    res.json(results);
  } catch (error) {
    log.error('Error en buscador AniList', error.message);
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Demasiadas peticiones a AniList. Espera un momento.' });
    }
    res.status(500).json({ error: 'Error buscador' });
  }
});
// ============================================================================
// 🧭 2. CATÁLOGO GLOBAL ANILIST (CON MANEJO DE 429)
// ============================================================================
app.get('/api/anime/catalog', async (req, res) => {
  try {
    const genre = req.query.genre || '';
    const year = req.query.year || '';
    const season = req.query.season || '';
    const sort = req.query.sort || 'RELEVANCE';
    const page = parseInt(req.query.page, 10) || 1;
    const statusFilter = req.query.status || '';

    const cacheKey = JSON.stringify({ genre, year, season, sort, page, status: statusFilter });
    const cachedData = catalogCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const variables = { page };
    if (genre) variables.genre = genre;
    if (year) variables.year = parseInt(year, 10);
    if (season) variables.season = season;
    if (sort && sort !== 'RELEVANCE') variables.sort = [sort];
    if (statusFilter) variables.status = statusFilter;

    const query = `
      query ($page: Int, $genre: String, $year: Int, $season: MediaSeason, $sort: [MediaSort], $status: MediaStatus) {
        Page(page: $page, perPage: 40) {
          media(
            type: ANIME
            format_in: [TV, TV_SHORT, ONA, MOVIE]
            isAdult: false
            seasonYear: $year
            season: $season
            genre: $genre
            sort: $sort
            status: $status
          ) {
            id
            title { romaji english }
            coverImage { extraLarge }
            description
            episodes
            averageScore
            startDate { year month day }
            genres
            status
            isAdult
            nextAiringEpisode { airingAt }
          }
        }
      }
    `;

    const response = await axios.post('https://graphql.anilist.co', { query, variables }, { timeout: 5000 });

    const mapped = response.data.data.Page.media.map(a => ({
      anilistId: a.id,
      title: a.title.romaji || a.title.english,
      titleEnglish: a.title.english || a.title.romaji,
      image: a.coverImage.extraLarge,
      episodes: a.episodes || "??",
      score: a.averageScore ? (a.averageScore / 10).toFixed(1) : "8.5",
      synopsis: a.description ? a.description.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...' : "Sin sinopsis.",
      genres: a.genres || [],
      startDate: a.startDate && a.startDate.year ? { year: a.startDate.year, month: a.startDate.month, day: a.startDate.day } : null,
      nextAiringAt: a.nextAiringEpisode?.airingAt || null,
    }));

    catalogCache.set(cacheKey, mapped);
    res.json(mapped);
  } catch (error) {
    console.error('[Catálogo] Error:', error.message);
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'Demasiadas peticiones a AniList. Espera un momento.' });
    }
    if (error.response) {
      console.error('[Catálogo] Respuesta de AniList:', error.response.data);
    }
    res.status(500).json({ error: 'Error al obtener el catálogo' });
  }
});

// ============================================================================
// 📁 3. EXPLORADOR LOCAL
// ============================================================================
app.get('/api/local-explorer', async (req, res) => {
  const subpath = req.query.subpath || "";
  try {
    const targetPath = path.resolve(getConfig("CARPETA_D"), subpath);
    if (!targetPath.startsWith(path.resolve(getConfig("CARPETA_D")))) {
      return res.status(403).json({ error: "Acceso denegado." });
    }
    await fs.promises.access(targetPath);
    const items = await fs.promises.readdir(targetPath, { withFileTypes: true });
    const dirs = [], files = [];
    for (const item of items) {
      const fullItemPath = path.join(targetPath, item.name);
      if (item.isDirectory()) {
        dirs.push({ name: item.name, relativePath: path.relative(getConfig("CARPETA_D"), fullItemPath) });
      } else {
        const isVideo = ['.mkv', '.mp4', '.avi', '.m4v'].includes(path.extname(item.name).toLowerCase());
        files.push({ name: item.name, fullPath: fullItemPath, isVideo });
      }
    }
    res.json({
      currentSubpath: subpath,
      parentSubpath: subpath ? (path.dirname(subpath) === "." ? "" : path.dirname(subpath)) : null,
      dirs: dirs.sort((a, b) => a.name.localeCompare(b.name)),
      files: files.sort((a, b) => a.name.localeCompare(b.name))
    });
  } catch (e) {
    res.status(500).json({ error: "Error explorador local." });
  }
});

// ============================================================================
// 📦 4. TRASLADADOR FÍSICO
// ============================================================================
app.post('/api/local-explorer/move', async (req, res) => {
  const { sourcePath, targetSubpath, newFileName } = req.body;
  try {
    await fs.promises.access(sourcePath);
    const targetFolderAbs = path.resolve(getConfig("CARPETA_D"), targetSubpath);
    if (!targetFolderAbs.startsWith(path.resolve(getConfig("CARPETA_D")))) {
      return res.status(403).json({ error: "Escritura bloqueada por seguridad." });
    }
    await fs.promises.mkdir(targetFolderAbs, { recursive: true });
    const finalPathAbs = path.join(targetFolderAbs, newFileName);
    await fs.promises.rename(sourcePath, finalPathAbs);
    log.success(`Mapeado físico exitoso -> ${finalPathAbs}`);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Error moviendo archivo." });
  }
});

// ============================================================================
// 📑 5. SONARR: SERIES LIST
// ============================================================================
app.get('/api/sonarr/series-list', async (req, res) => {
  try {
    const cached = sonarrSeriesCache.get("series_list");
    if (cached) return res.json(cached);
    const response = await axios.get(`${getConfig("SONARR_URL")}/api/v3/series`, {
      headers: { 'X-Api-Key': getConfig("SONARR_API_KEY") },
      timeout: 3000
    });
    const list = response.data.map(s => ({ id: s.id, title: s.title })).sort((a, b) => a.title.localeCompare(b.title));
    sonarrSeriesCache.set("series_list", list);
    res.json(list);
  } catch (error) {
    log.error('No se pudo conectar a Sonarr para series-list', error.message);
    res.json([]);
  }
});

// ============================================================================
// 📥 6. SONARR: MANUAL IMPORT
// ============================================================================
app.post('/api/sonarr/manual-import', async (req, res) => {
  const { folder, seriesId, episodeNumber, downloadId } = req.body;
  try {
    const filesResponse = await axios.get(`${getConfig("SONARR_URL")}/api/v3/manualimport`, {
      params: { folder, filterExistingFiles: true },
      headers: { 'X-Api-Key': getConfig("SONARR_API_KEY") },
      timeout: 4000
    });
    if (!filesResponse.data || filesResponse.data.length === 0) {
      return res.status(400).json({ error: "Sin archivos en la carpeta." });
    }
    const episodesResponse = await axios.get(`${getConfig("SONARR_URL")}/api/v3/episode`, {
      params: { seriesId },
      headers: { 'X-Api-Key': getConfig("SONARR_API_KEY") },
      timeout: 4000
    });
    const targetNumber = parseInt(episodeNumber, 10);
    const matchedEpisode = episodesResponse.data.find(ep => ep.absoluteEpisodeNumber === targetNumber || ep.episodeNumber === targetNumber);
    if (!matchedEpisode) {
      return res.status(404).json({ error: `El capítulo ${targetNumber} no está en la base de datos de Sonarr.` });
    }
    const payload = filesResponse.data.map(file => ({
      ...file,
      seriesId: parseInt(seriesId, 10),
      episodeIds: [matchedEpisode.id],
      downloadId: downloadId || null,
      importApproved: true
    }));
    await axios.post(`${getConfig("SONARR_URL")}/api/v3/manualimport`, payload, {
      headers: { 'X-Api-Key': getConfig("SONARR_API_KEY") },
      timeout: 5000
    });
    log.success(`Importación forzada exitosa para Series ID: ${seriesId}, Episodio: ${targetNumber}`);
    res.json({ success: true });
  } catch (error) {
    log.error('Fallo al forzar la importación manual de Sonarr', error.message);
    res.status(500).json({ error: "Error forzando importación." });
  }
});

// ============================================================================
// 📡 7. RASTREADOR TORRENTS (Prowlarr & Deep Scraping)
// ============================================================================
function cleanAndExtractImageUrls(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return [];
  const urls = [];
  const regex = /(?:https?:)?\/\/[^\s"'<>\)\(\]\[\n\r\t&]+?\.(?:png|jpg|jpeg|webp)(?:\?[^\s"'<>\)\(\]\[\n\r\t&]*)?/gi;
  let match;
  while ((match = regex.exec(rawInput)) !== null) {
    let url = match[0].trim();
    if (url.startsWith('//')) url = 'https:' + url;
    if (url.startsWith('/')) url = 'https://nyaa.si' + url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;

    const lower = url.toLowerCase();
    if (
      lower.includes('avatar') ||
      lower.includes('logo') ||
      lower.includes('banner') ||
      lower.includes('icon') ||
      lower.includes('button') ||
      lower.includes('flag') ||
      lower.includes('emoticon') ||
      lower.includes('smiley') ||
      lower.includes('nyaa.si/user') ||
      lower.endsWith('.gif')
    ) {
      continue;
    }

    if (!urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

async function getNyaaPageDetails(targetUrl) {
  if (!targetUrl) return { screenshots: [], descriptionText: '' };
  try {
    const pageRes = await axios.get(targetUrl, {
      timeout: 4000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    const html = pageRes.data || "";
    const $ = cheerio.load(html);
    const foundUrls = [];

    $('#torrent-description img, .panel-body img, #torrent-description a[href]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('href');
      if (src) {
        const extracted = cleanAndExtractImageUrls(src);
        extracted.forEach((u) => { if (!foundUrls.includes(u)) foundUrls.push(u); });
      }
    });

    if (foundUrls.length === 0) {
      const extracted = cleanAndExtractImageUrls(html);
      extracted.forEach((u) => { if (!foundUrls.includes(u)) foundUrls.push(u); });
    }

    const title = $('.panel-title').first().text().trim();
    const descriptionText = $('#torrent-description').text() || '';

    return { title, descriptionText, screenshots: foundUrls.slice(0, 10) };
  } catch (err) {
    console.error(`[getNyaaPageDetails] Error cargando ${targetUrl}:`, err.message);
    return { screenshots: [], descriptionText: '' };
  }
}

// ============================================================================
// 🎬 SERVICIO AVANZADO DE STILLS DE TMDB + LIMPIEZA Y MAPEO INTELIGENTE
// ============================================================================

/**
 * Limpia sufijos de temporada y etiquetas molestas para búsquedas exactas en TMDB
 */
function cleanAnimeTitleForSearch(title) {
  if (!title || typeof title !== 'string') return '';
  let cleaned = title
    .replace(/\b(2nd|3rd|4th|5th|6th)\s+season\b/gi, '')
    .replace(/\bseason\s+\d+\b/gi, '')
    .replace(/\bs\d+\b/gi, '')
    .replace(/\b(part|cour)\s+\d+\b/gi, '')
    .replace(/\b(I{2,4}|VI{0,3}|IV|V)\b/g, '') // Numerales romanos como II, III, IV
    .replace(/\b(tv|ona|ova|movie)\b/gi, '')
    .replace(/[:\-_–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || title;
}

/**
 * Consulta la API de TMDB para obtener capturas con limpieza, fallbacks y mapeo de temporadas
 */
async function getTMDBEpisodeStills(animeTitle, episodeNum, animeSeason = 1, alternateTitles = []) {
  if (!animeTitle || !episodeNum) return [];

  const tmdbKey = process.env.TMDB_API_KEY || getConfig('TMDB_API_KEY');
  if (!tmdbKey) {
    console.log(`┌────────────────────────────────────────────────────────┐`);
    console.log(`│ [TMDB] ❌ Clave TMDB_API_KEY no configurada.          │`);
    console.log(`└────────────────────────────────────────────────────────┘`);
    return [];
  }

  const cacheKey = `tmdb_stills_${animeTitle.toLowerCase().trim()}_s${animeSeason}_e${episodeNum}`;
  const cached = tmdbCache.get(cacheKey);
  if (cached !== null && Array.isArray(cached)) {
    console.log(`┌────────────────────────────────────────────────────────┐`);
    console.log(`│ [TMDB] ⚡ Reutilizando ${cached.length} capturas desde caché           │`);
    console.log(`│   Anime: "${animeTitle}" | S${animeSeason}E${episodeNum}                      │`);
    console.log(`└────────────────────────────────────────────────────────┘`);
    return cached;
  }

  // 1. Preparar lista de candidatos de búsqueda con fallbacks
  const titleCandidates = [];
  const cleanedTitle = cleanAnimeTitleForSearch(animeTitle);
  if (cleanedTitle) titleCandidates.push(cleanedTitle);
  if (animeTitle && animeTitle !== cleanedTitle) titleCandidates.push(animeTitle);

  alternateTitles.forEach((alt) => {
    if (alt && typeof alt === 'string') {
      const cleanAlt = cleanAnimeTitleForSearch(alt);
      if (cleanAlt && !titleCandidates.includes(cleanAlt)) titleCandidates.push(cleanAlt);
      if (!titleCandidates.includes(alt)) titleCandidates.push(alt);
    }
  });

  let foundShow = null;
  let matchedSearchTitle = '';

  // 2. Probar candidatos en orden secuencial
  for (const candidate of titleCandidates) {
    try {
      const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbKey}&query=${encodeURIComponent(candidate)}&language=es-MX`;
      const searchRes = await axios.get(searchUrl, { timeout: 4000 });
      const results = searchRes.data?.results || [];
      if (results.length > 0) {
        foundShow = results[0];
        matchedSearchTitle = candidate;
        break;
      }
    } catch (err) {
      // Ignorar fallos puntuales y continuar al siguiente candidato
    }
  }

  if (!foundShow) {
    console.log(`┌────────────────────────────────────────────────────────┐`);
    console.log(`│ [TMDB] ❌ No se encontró el anime en TMDB               │`);
    console.log(`│   Buscado: "${animeTitle}"                             │`);
    console.log(`│   Candidatos probados: ${titleCandidates.map(c => `"${c}"`).join(', ')} │`);
    console.log(`└────────────────────────────────────────────────────────┘`);
    tmdbCache.set(cacheKey, [], 24 * 60 * 60 * 1000);
    return [];
  }

  let targetSeason = parseInt(animeSeason, 10) || 1;
  let rawEpisodeNum = parseInt(episodeNum, 10);
  let targetEpisode = rawEpisodeNum;

  // 3. Mapeador inteligente de temporadas para episodios absolutos o fuera de rango
  try {
    const showDetailUrl = `https://api.themoviedb.org/3/tv/${foundShow.id}?api_key=${tmdbKey}&language=es-MX`;
    const showDetailRes = await axios.get(showDetailUrl, { timeout: 4000 });
    const tmdbSeasons = (showDetailRes.data?.seasons || []).filter(s => s.season_number > 0);

    const requestedSeasonObj = tmdbSeasons.find(s => s.season_number === targetSeason);
    const maxEpInRequestedSeason = requestedSeasonObj ? requestedSeasonObj.episode_count : 0;

    if (tmdbSeasons.length > 0 && (targetEpisode > maxEpInRequestedSeason || targetSeason === 1 && targetEpisode > 50)) {
      let accumulatedEps = 0;
      let mapped = false;

      for (const season of tmdbSeasons) {
        if (targetEpisode <= accumulatedEps + season.episode_count) {
          targetSeason = season.season_number;
          targetEpisode = targetEpisode - accumulatedEps;
          mapped = true;
          break;
        }
        accumulatedEps += season.episode_count;
      }

      if (!mapped && tmdbSeasons.length > 0) {
        const lastSeason = tmdbSeasons[tmdbSeasons.length - 1];
        targetSeason = lastSeason.season_number;
      }
    }
  } catch (err) {
    // Continuar con valores originales si falla la consulta
  }

  // 4. Estrategia de búsqueda con reintentos para capturas/stills
  let imageUrls = [];
  const attempts = [
    { season: targetSeason, episode: rawEpisodeNum, desc: `Número Absoluto (S${targetSeason}E${rawEpisodeNum})` },
    { season: targetSeason, episode: targetEpisode, desc: `Número Relativo Mapeado (S${targetSeason}E${targetEpisode})` },
    { season: 1, episode: rawEpisodeNum, desc: `Temporada 1 Absoluto (S1E${rawEpisodeNum})` }
  ];

  for (const attempt of attempts) {
    if (imageUrls.length > 0) break;
    try {
      const imagesUrl = `https://api.themoviedb.org/3/tv/${foundShow.id}/season/${attempt.season}/episode/${attempt.episode}/images?api_key=${tmdbKey}`;
      const imagesRes = await axios.get(imagesUrl, { timeout: 3000 });
      const stills = imagesRes.data?.stills || [];

      const fetched = stills
        .filter((img) => img && img.file_path)
        .map((img) => `https://image.tmdb.org/t/p/w780${img.file_path}`);

      if (fetched.length > 0) {
        imageUrls = fetched;
        targetSeason = attempt.season;
        targetEpisode = attempt.episode;
        break;
      }

      // Fallback al objeto general de episodio
      const epUrl = `https://api.themoviedb.org/3/tv/${foundShow.id}/season/${attempt.season}/episode/${attempt.episode}?api_key=${tmdbKey}&language=es-MX`;
      const epRes = await axios.get(epUrl, { timeout: 3000 });
      if (epRes.data?.still_path) {
        imageUrls.push(`https://image.tmdb.org/t/p/w780${epRes.data.still_path}`);
        targetSeason = attempt.season;
        targetEpisode = attempt.episode;
        break;
      }
    } catch (err) {
      // Continuar al siguiente intento
    }
  }

  console.log(`┌────────────────────────────────────────────────────────┐`);
  console.log(`│ [TMDB] 🎬 PROCESO COMPLETO DE BÚSQUEDA DE IMÁGENES    │`);
  console.log(`├────────────────────────────────────────────────────────┤`);
  console.log(`│  • Entrada: "${animeTitle}" (Cap ${episodeNum}, Temp ${animeSeason})`);
  console.log(`│  • Candidato Exitoso: "${matchedSearchTitle}"`);
  console.log(`│  • Show TMDB: "${foundShow.name}" (ID: ${foundShow.id})`);
  console.log(`│  • Mapeo Final TMDB: Temporada ${targetSeason}, Capítulo ${targetEpisode}`);
  console.log(`│  • Capturas Obtención: ${imageUrls.length > 0 ? `✅ ${imageUrls.length} imágenes` : '❌ 0 imágenes'}`);
  console.log(`└────────────────────────────────────────────────────────┘`);

  tmdbCache.set(cacheKey, imageUrls, 14 * 24 * 60 * 60 * 1000);
  return imageUrls;
}

app.get('/api/tmdb/episode-stills', async (req, res) => {
  const { title, episode, season } = req.query;
  if (!title || !episode) return res.status(400).json({ error: "Faltan parámetros 'title' o 'episode'" });
  const stills = await getTMDBEpisodeStills(title, episode, season || 1);
  res.json({ success: stills.length > 0, stills });
});

app.get('/api/enrich', async (req, res) => {
  const torrentTitle = req.query.title ? decodeURIComponent(req.query.title) : '';
  const guidRaw = req.query.guid ? decodeURIComponent(req.query.guid) : '';
  const animeTitleParam = req.query.animeTitle ? decodeURIComponent(req.query.animeTitle) : '';

  if (!torrentTitle && !guidRaw && !animeTitleParam) return res.status(400).json({ error: "Falta identificador 'title' o 'guid'" });

  // Parsear el título usando Anitomy
  const parsedByAnitomy = torrentTitle ? anitomy.parseSync(torrentTitle) : null;
  const animeTitle = animeTitleParam || parsedByAnitomy?.anime_title || torrentTitle;
  const episodeNum = parsedByAnitomy?.episode_number ? parseInt(parsedByAnitomy.episode_number, 10) : null;
  const seasonNum = parsedByAnitomy?.anime_season ? parseInt(parsedByAnitomy.anime_season, 10) : 1;

  // Clave de caché indexada por episodio para reutilizar imágenes entre torrents del mismo capítulo
  const episodeCacheKey = episodeNum && animeTitle
    ? `ep_enrich_${animeTitle.toLowerCase().trim()}_s${seasonNum}_e${episodeNum}`
    : `enrich_${torrentTitle || guidRaw}`;

  const cached = enrichCache.get(episodeCacheKey);
  if (cached) {
    return res.json(cached);
  }

  // Obtener todas las capturas de TMDB para este episodio pasando títulos alternativos de Anitomy
  let tmdbStills = [];
  if (animeTitle && episodeNum && !isNaN(episodeNum)) {
    const alternateTitles = [parsedByAnitomy?.anime_title].filter(Boolean);
    tmdbStills = await getTMDBEpisodeStills(animeTitle, episodeNum, seasonNum, alternateTitles);
  }

  // Detección limpia de idioma, fansubs y calidad usando el título del torrent
  const fullText = (torrentTitle + ' ' + (parsedByAnitomy?.subtitles || '') + ' ' + (parsedByAnitomy?.release_group || '')).toLowerCase();

  const isLatino = /(?:audio\s+)?latino|español\s+latino|lat-spa|spanish[\s_]*\(latin\)|es-la|latam|\[lat\]|\blat\b/i.test(fullText);
  const isMulti = /multi[\s_-]?sub|multisub|multiple\s+subtitle|\[multi\]/i.test(fullText) ||
                  (/erai-raws|puyasubs|subsplease/i.test(torrentTitle) && /\[spa\]|\[lat\]/i.test(fullText));
  const isSubEsp = /spanish[\s_]*\(european\)|spanish[\s_]*\(spain\)|castellano|sub_es|sub\s+esp|sub.*spanish|sub.*español|\[spa\]|\[esp\]/i.test(fullText) || (!isLatino && !isMulti && /puya|puyasubs|erai-raws|subsplease/i.test(fullText));

  // Extracción de Fansub
  let fansub = parsedByAnitomy?.release_group || '';
  if (!fansub) {
    const fansubMatch = torrentTitle.match(/\[([^\]]+)\]/);
    if (fansubMatch) fansub = fansubMatch[1];
  }

  // Extracción de Calidad/Resolución
  let quality = parsedByAnitomy?.video_resolution || '';
  if (!quality) {
    const resMatch = torrentTitle.match(/\b(2160p|1080p|720p|480p|4k)\b/i);
    if (resMatch) quality = resMatch[1].toUpperCase();
  }

  const responsePayload = {
    success: true,
    images: tmdbStills,
    parsedAnitomy: parsedByAnitomy,
    isLatino,
    isMulti,
    isSubEsp,
    fansub: fansub || 'Desconocido',
    quality: quality || '1080P'
  };

  enrichCache.set(episodeCacheKey, responsePayload);
  return res.json(responsePayload);
});

app.get('/api/torrents/details', async (req, res) => {
  const targetUrl = req.query.url || req.query.guid;
  if (!targetUrl) return res.status(400).json({ error: "Falta parámetro 'url' o 'guid'" });

  try {
    const details = await getNyaaPageDetails(targetUrl);
    res.json({ success: true, url: targetUrl, images: details.screenshots, title: details.title });
  } catch (err) {
    console.error("Error en deep scraping de torrent:", err.message);
    res.status(500).json({ error: "No se pudieron extraer capturas del tracker." });
  }
});

app.get('/api/torrents/:query', async (req, res) => {
  const query = decodeURIComponent(req.params.query);
  try {
    const response = await axios.get(`${getConfig("PROWLARR_URL")}/api/v1/search`, {
      params: { apikey: getConfig("PROWLARR_API_KEY"), query, limit: 1000 },
      timeout: 25000
    });

    const parseTorrentData = (title, description = "") => {
      let group = "Desconocido";
      const groupMatch = title.match(/^\[(.*?)\]/);
      if (groupMatch) group = groupMatch[1];

      let resolution = "SD";
      if (title.match(/1080p/i)) resolution = "1080p";
      else if (title.match(/720p/i)) resolution = "720p";
      else if (title.match(/2160p|4k/i)) resolution = "4K";
      else if (title.match(/480p/i)) resolution = "480p";

      let codec = "";
      if (title.match(/hevc|x265|h\.?265/i)) codec = "HEVC";
      else if (title.match(/avc|x264|h\.?264/i)) codec = "H.264";

      // Combinamos título y descripción para analizar idioma y subtítulos completos
      const fullText = (title + " " + description).toLowerCase();

      let lang = { label: '❓ Desconocido', color: '#ffa502' };

      // Patrones de Fansubs conocidos en español/latino
      const isSpanishFansubGroup = /erai-raws|puyasubs|subsplease|tokyo-tosho|anime-raws|fansub/i.test(title);

      if (fullText.match(/(?:audio\s+)?latino|español\s+latino|lat-spa|spanish[\s_]*\(latin\)|es-la|latam|\[lat\]|\blat\b/i)) {
        lang = { label: 'Lat', color: '#e1b12c' };
      } else if (fullText.match(/multi[\s_-]?sub|multisub|multiple\s+subtitle|\[multi\]/i) || (isSpanishFansubGroup && fullText.match(/\[spa\]|\[lat\]/i))) {
        lang = { label: 'Multi Sub', color: '#2ed573' };
      } else if (fullText.match(/spanish[\s_]*\(european\)|spanish[\s_]*\(spain\)|castellano|sub_es|sub\s+esp|sub.*spanish|sub.*español|\[spa\]|\[esp\]|vostfr/i)) {
        lang = { label: 'Sub ESP', color: '#2ed573' };
      } else if (fullText.match(/english|\[en\]|eng|sub.*english/i)) {
        lang = { label: '🇬🇧 Inglés', color: '#ffa502' };
      } else if (fullText.match(/japanese|\[ja\]|jap/i)) {
        lang = { label: '🇯🇵 Japonés', color: '#ff6b81' };
      } else if (fullText.match(/french|\[fr\]|francais/i)) {
        lang = { label: '🇫🇷 Francés', color: '#4a86e8' };
      }

      let features = [];
      if (fullText.match(/dual[\s-]?audio/i)) features.push("Dual Audio");
      if (fullText.match(/10bit/i)) features.push("10-bit");
      if (fullText.match(/hi10p/i)) features.push("Hi10P");
      if (fullText.match(/batch/i)) features.push("Batch");

      return { group, resolution, codec, lang, features };
    };

    const extractImagesFromDescription = (description = "") => {
      if (!description) return [];
      const images = [];

      // Regex para markdown: ![](url) o [![...](img_url)](link)
      const mdRegex = /!\[.*?\]\((https?:\/\/[^\s\)\"]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s\)\"]*)?)\)/gi;
      let match;
      while ((match = mdRegex.exec(description)) !== null) {
        if (match[1] && !images.includes(match[1])) images.push(match[1]);
      }

      // Regex para tag html <img src="url">
      const htmlRegex = /<img[^>]+src=["'](https?:\/\/[^"'\s]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^"'\s]*)?)["']/gi;
      while ((match = htmlRegex.exec(description)) !== null) {
        if (match[1] && !images.includes(match[1])) images.push(match[1]);
      }

      // Regex para URLs directas de imagen si no vinieron en tag
      if (images.length === 0) {
        const directRegex = /(https?:\/\/[^\s"'<>\)]+\.(?:png|jpg|jpeg|webp)(?:\?[^\s"'<>\)]*)?)/gi;
        while ((match = directRegex.exec(description)) !== null) {
          if (match[1] && !images.includes(match[1])) images.push(match[1]);
        }
      }

      return images;
    };

    let rawResults = response.data.map(i => {
      let dateStr = "N/A";
      if (i.publishDate) {
        const publishDate = new Date(i.publishDate);
        if (!isNaN(publishDate)) {
           const year = publishDate.getFullYear();
           const month = String(publishDate.getMonth() + 1).padStart(2, '0');
           const day = String(publishDate.getDate()).padStart(2, '0');
           const hours = String(publishDate.getHours()).padStart(2, '0');
           const minutes = String(publishDate.getMinutes()).padStart(2, '0');
           dateStr = `${year}-${month}-${day} ${hours}:${minutes}`;
        }
      }

      const desc = i.description || i.comments || "";
      const images = extractImagesFromDescription(desc);

      return {
        title: i.title,
        magnet: i.magnetUrl || i.downloadUrl,
        size: (i.size / 1e9).toFixed(2) + ' GB',
        rawSize: i.size,
        seeders: i.seeders || 0,
        leechers: i.leechers || 0,
        images: images,
        parsed: parseTorrentData(i.title, desc),
        infoUrl: i.infoUrl || i.guid || null,
        indexer: i.indexer || 'Tracker',
        date: dateStr,
        rawDate: i.publishDate
      };
    });

    rawResults.sort((a, b) => b.seeders - a.seeders);

    // Calibración reestructurada basada en episodios individuales + Median Shift
    let meta = { scheduleUpdated: false, newDay: null, previousDay: null };
    if (rawResults.length > 0 && query) {
      try {
        const DIAS_SEMANA_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const cleanQuery = query.toLowerCase().trim();

        const currentSchedule = scheduleCache.get("current_season");
        let foundAnime = null;

        if (currentSchedule && typeof currentSchedule === 'object') {
          for (const [dayName, dayList] of Object.entries(currentSchedule)) {
            if (Array.isArray(dayList)) {
              const match = dayList.find(item =>
                item.title?.toLowerCase().trim() === cleanQuery ||
                item.titleEnglish?.toLowerCase().trim() === cleanQuery ||
                cleanQuery.includes(item.title?.toLowerCase().trim()) ||
                (item.title && item.title.toLowerCase().trim().includes(cleanQuery))
              );
              if (match) {
                foundAnime = { ...match, scheduleDay: dayName };
                break;
              }
            }
          }
        }

        if (foundAnime) {
          const resCalc = calculateTorrentOffsetForAnime(foundAnime, rawResults);
          const baseAiringSecs = foundAnime.baseAiringAt || foundAnime.nextAiringAt;

          if (baseAiringSecs && typeof resCalc.offsetSeconds === 'number') {
            // Leer el offset recortado oficial guardado para garantizar congruencia absoluta
            const savedOffsets = getTorrentOffsets();
            const key = String(foundAnime.id).toLowerCase().trim();
            const savedRecord = savedOffsets[key] || savedOffsets[foundAnime.title?.toLowerCase()?.trim()];
            const finalOffsetSeconds = (savedRecord && typeof savedRecord.offsetSeconds === 'number')
              ? savedRecord.offsetSeconds
              : resCalc.offsetSeconds;

            const prevLocalDate = new Date(baseAiringSecs * 1000);
            const previousDay = DIAS_SEMANA_ES[prevLocalDate.getDay()];

            const updatedDate = new Date((baseAiringSecs + finalOffsetSeconds) * 1000);
            const updatedDay = DIAS_SEMANA_ES[updatedDate.getDay()];

            meta.scheduleUpdated = resCalc.updated;
            meta.newDay = updatedDay;
            meta.previousDay = previousDay;

            if (resCalc.updated) {
              scheduleCache.delete("current_season");
            }
          }
        }
      } catch (errOffset) {
        // Ignorar errores secundarios en calibración
      }
    }

    res.json({
      results: rawResults,
      scheduleUpdated: meta.scheduleUpdated,
      newDay: meta.newDay,
      previousDay: meta.previousDay
    });
  } catch (error) {
    console.error('Error en torrents:', error.message);
    res.status(500).json({ error: 'Error torrents' });
  }
});

// ============================================================================
// ⚡ CALIBRACIÓN MASIVA POR TANDAS
// ============================================================================
let calibrationStatus = {
  running: false,
  total: 0,
  current: 0,
  currentAnime: '',
  updatedCount: 0,
  finished: false
};

const calibrationQueue = new SimpleQueue(1, 2000);

app.get('/api/schedule/calibration-status', (req, res) => {
  res.json(calibrationStatus);
});

app.post('/api/schedule/calibrate-all', async (req, res) => {
  if (calibrationStatus.running) {
    return res.json({ success: false, message: "La calibración ya está en curso.", status: calibrationStatus });
  }

  const currentSchedule = scheduleCache.get("current_season");
  let animeList = [];

  if (currentSchedule && typeof currentSchedule === 'object') {
    Object.values(currentSchedule).forEach(dayList => {
      if (Array.isArray(dayList)) {
        dayList.forEach(item => {
          if (item && item.title && !item.isFinishedRecently) {
            animeList.push(item);
          }
        });
      }
    });
  }

  const uniqueAnimes = Array.from(new Map(animeList.map(a => [a.id || a.title, a])).values());

  if (uniqueAnimes.length === 0) {
    return res.json({ success: false, message: "No hay animes en emisión para calibrar." });
  }

  calibrationStatus = {
    running: true,
    total: uniqueAnimes.length,
    current: 0,
    currentAnime: '',
    updatedCount: 0,
    finished: false
  };

  res.json({ success: true, total: uniqueAnimes.length, message: "Calibración masiva iniciada en segundo plano por tandas." });

  (async () => {
    for (let i = 0; i < uniqueAnimes.length; i++) {
      const anime = uniqueAnimes[i];
      calibrationStatus.current = i + 1;
      calibrationStatus.currentAnime = anime.title || anime.titleEnglish || "Anime";

      await calibrationQueue.add(async () => {
        try {
          const query = anime.title || anime.titleEnglish;
          if (!query) return;

          const response = await axios.get(`${getConfig("PROWLARR_URL")}/api/v1/search`, {
            params: { apikey: getConfig("PROWLARR_API_KEY"), query, limit: 100 },
            timeout: 8000
          });

          if (Array.isArray(response.data) && response.data.length > 0) {
            const rawResults = response.data.map(item => ({
              title: item.title,
              rawDate: item.publishDate
            }));

            const resCalc = calculateTorrentOffsetForAnime(anime, rawResults);
            if (resCalc.updated) {
              calibrationStatus.updatedCount++;
            }
          }
        } catch (errBatch) {
          // Ignorar errores puntuales
        }
      });
    }

    scheduleCache.delete("current_season");
    calibrationStatus.running = false;
    calibrationStatus.finished = true;
    calibrationStatus.currentAnime = '';
  })();
});

// ============================================================================
// 📅 8. CALENDARIO DE EMISIÓN
// ============================================================================
app.get('/api/schedule', async (req, res) => {
  try {
    const cached = scheduleCache.get("current_season");
    if (cached) return res.json(cached);

    const nowSecs = Math.floor(Date.now() / 1000);
    const startOfWeek = nowSecs - (7 * 24 * 3600); // 7 días atrás
    const endOfWeek = nowSecs + (10 * 24 * 3600);  // 10 días adelante

    const query = `query ($airingStart: Int, $airingEnd: Int) {
      airingSchedulePage: Page(page: 1, perPage: 100) {
        airingSchedules(airingAt_greater: $airingStart, airingAt_lesser: $airingEnd, sort: TIME_DESC) {
          airingAt
          episode
          media {
            id, title { romaji english }, countryOfOrigin, format, coverImage { extraLarge }, description, episodes, averageScore, startDate { year month day }, genres, status, isAdult
          }
        }
      }
      releasingPage: Page(page: 1, perPage: 150) {
        media(status: RELEASING, type: ANIME, format_in: [TV, TV_SHORT, ONA], isAdult: false, sort: POPULARITY_DESC) {
          id, title { romaji english }, countryOfOrigin, format, coverImage { extraLarge }, description, episodes, averageScore, nextAiringEpisode { airingAt, episode }, startDate { year month day }, genres, status, isAdult
        }
      }
      finishedPage: Page(page: 1, perPage: 50) {
        media(status: FINISHED, type: ANIME, format_in: [TV, TV_SHORT, ONA], isAdult: false, sort: END_DATE_DESC) {
          id, title { romaji english }, countryOfOrigin, format, coverImage { extraLarge }, description, episodes, averageScore, endDate { year month day }, startDate { year month day }, genres, status, isAdult
        }
      }
    }`;

    const response = await axios.post('https://graphql.anilist.co', {
      query,
      variables: { airingStart: startOfWeek, airingEnd: endOfWeek }
    }, { timeout: 8000 });

    const isAdultMedia = (m) => {
      if (!m) return true;
      if (m.isAdult) return true;
      if (Array.isArray(m.genres) && (m.genres.includes('Hentai') || m.genres.includes('Erotica'))) return true;
      return false;
    };

    const allMediaMap = new Map();
    const data = response.data?.data;

    // 1. Procesar itinerarios reales de emisión (AiringSchedules)
    if (data?.airingSchedulePage?.airingSchedules) {
      data.airingSchedulePage.airingSchedules.forEach(item => {
        if (item.media && !isAdultMedia(item.media) && !allMediaMap.has(item.media.id)) {
          allMediaMap.set(item.media.id, {
            ...item.media,
            nextAiringEpisode: { airingAt: item.airingAt, episode: item.episode }
          });
        }
      });
    }

    // 2. Procesar animes en emisión (RELEASING) que tengan un próximo episodio agendado
    if (data?.releasingPage?.media) {
      data.releasingPage.media.forEach(anime => {
        if (!isAdultMedia(anime) && !allMediaMap.has(anime.id)) {
          // Solo incluir si tiene un nextAiringEpisode explícito
          if (anime.nextAiringEpisode?.airingAt) {
            allMediaMap.set(anime.id, {
              ...anime,
              nextAiringEpisode: {
                airingAt: anime.nextAiringEpisode.airingAt,
                episode: anime.nextAiringEpisode.episode || anime.episodes || "??"
              }
            });
          }
        }
      });
    }

    // 3. Procesar animes recién finalizados (FINISHED) estrictamente recortados a 14 días (2 semanas)
    const catorceDiasAtras = new Date();
    catorceDiasAtras.setDate(catorceDiasAtras.getDate() - 14);

    if (data?.finishedPage?.media) {
      data.finishedPage.media.forEach(anime => {
        if (!isAdultMedia(anime) && !allMediaMap.has(anime.id) && anime.endDate && anime.endDate.year && anime.endDate.month && anime.endDate.day) {
          const endDate = new Date(anime.endDate.year, anime.endDate.month - 1, anime.endDate.day);
          if (endDate >= catorceDiasAtras) {
            const airingAt = Math.floor(Date.UTC(anime.endDate.year, anime.endDate.month - 1, anime.endDate.day) / 1000);
            allMediaMap.set(anime.id, {
              ...anime,
              nextAiringEpisode: { airingAt, episode: anime.episodes || "??" },
              isFinishedRecently: true
            });
          }
        }
      });
    }

    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const grouped = { "Lunes": [], "Martes": [], "Miércoles": [], "Jueves": [], "Viernes": [], "Sábado": [], "Domingo": [], "Donghuas": [] };

    const torrentOffsets = getTorrentOffsets();

    Array.from(allMediaMap.values()).forEach(a => {
      let airingTimestamp = a.nextAiringEpisode?.airingAt;

      // Si no hay nextAiringEpisode pero tiene startDate en el rango del calendario
      if (!airingTimestamp && a.startDate?.year && a.startDate?.month && a.startDate?.day) {
        const startSecs = Math.floor(Date.UTC(a.startDate.year, a.startDate.month - 1, a.startDate.day) / 1000);
        if (startSecs >= startOfWeek - (7 * 86400) && startSecs <= endOfWeek + (7 * 86400)) {
          airingTimestamp = startSecs;
        }
      }

      // Si aún no hay un timestamp de emisión válido dentro del rango de la semana, no lo incluimos en el calendario
      if (!airingTimestamp) return;

      // Aplicar el ajuste de offset si existe registrado para este anime (por ID o título)
      const offsetData = torrentOffsets[String(a.id)] ||
                         torrentOffsets[a.title?.romaji?.toLowerCase()?.trim()] ||
                         torrentOffsets[a.title?.english?.toLowerCase()?.trim()];
      if (offsetData && typeof offsetData.offsetSeconds === 'number' && !isNaN(offsetData.offsetSeconds)) {
        // Garantizar tolerancia de ±6.5 días máximo en el cálculo del schedule
        const MAX_OFFSET = 6.5 * 24 * 3600;
        const safeOffset = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, offsetData.offsetSeconds));
        airingTimestamp += safeOffset;
      }

      const date = new Date(airingTimestamp * 1000);

      // Obtener el día de la semana exactamente según la fecha local del cliente
      const dayName = dias[date.getDay()];
      const isDonghua = a.countryOfOrigin === 'CN';
      const targetList = isDonghua ? "Donghuas" : dayName;

      if (!grouped[targetList]) grouped[targetList] = [];

      // Hora Estimada de Emisión por Ventana Móvil
      const dayNames = ["Domingos", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábados"];
      const projectedDay = dayNames[date.getDay()];
      const hoursStr = String(date.getHours()).padStart(2, '0');
      const minsStr = String(date.getMinutes()).padStart(2, '0');
      const estimatedAiringTime = `${projectedDay} ~ ${hoursStr}:${minsStr} hs`;

      // Calcular diferencia en días hasta la emisión
      const diffSecs = airingTimestamp - nowSecs;
      const diffDays = Math.ceil(diffSecs / 86400);

      let statusBadge = "Emisión";
      let isUpcoming = false;
      let isUnavailable = false;

      const epNum = a.nextAiringEpisode?.episode;
      const isNotYetReleased = a.status === 'NOT_YET_RELEASED' || epNum === 1;

      // Detección de anime sin próximo episodio agendado o en pausa prolongada
      const hasNoScheduledNextEp = a.status === 'RELEASING' && (!a.nextAiringEpisode || !a.nextAiringEpisode.airingAt);

      if (a.isFinishedRecently) {
        statusBadge = "Finalizado";
      } else if (hasNoScheduledNextEp) {
        isUnavailable = true;
        statusBadge = "Indisponible";
      } else if (isNotYetReleased && diffDays > 0) {
        isUpcoming = true;
        statusBadge = `Por estrenarse: ${diffDays} días`;
      } else if (epNum && epNum > 1) {
        statusBadge = `EP ${epNum}`;
      } else if (diffDays <= 0 && Math.abs(diffDays) <= 7) {
        statusBadge = "Estreno";
      }

      const originalAiringTimestamp = a.nextAiringEpisode?.airingAt || airingTimestamp;

      grouped[targetList].push({
        id: a.id,
        title: a.title?.romaji || a.title?.english || "Anime",
        titleEnglish: a.title?.english || a.title?.romaji || "Anime",
        image: a.coverImage?.extraLarge || "",
        synopsis: a.description?.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...',
        score: a.averageScore ? (a.averageScore / 10).toFixed(1) : "N/A",
        episodes: a.episodes || "??",
        genres: a.genres || [],
        startDate: a.startDate?.year ? `${a.startDate.day}/${a.startDate.month}/${a.startDate.year}` : "???",
        baseAiringAt: originalAiringTimestamp,
        nextAiringAt: airingTimestamp,
        nextAiringEpisodeNumber: a.nextAiringEpisode?.episode || a.episodes || "??",
        statusBadge,
        isUpcoming,
        isUnavailable,
        estimatedAiringTime,
        isFinishedRecently: a.isFinishedRecently || false
      });
    });

    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.title.localeCompare(b.title));
    });

    scheduleCache.set("current_season", grouped, 15 * 60 * 1000); // 15 min TTL
    res.json(grouped);
  } catch (error) {
    console.error("Error en /api/schedule:", error.message);
    res.status(500).json({ error: 'Error calendario' });
  }
});

// ============================================================================
// 🔑 9. TRADUCTOR
// ============================================================================
app.post('/api/translate', async (req, res) => {
  const originalText = req.body.text;
  try {
    if (!originalText) return res.json({ text: "" });
    const cacheKey = originalText.trim().substring(0, 150).toLowerCase();
    const cached = translateCache.get(cacheKey);
    if (cached) return res.json({ text: cached });
    const r = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(originalText)}`, { timeout: 3000 });
    const translatedText = r.data[0].map(i => i[0]).join('');
    translateCache.set(cacheKey, translatedText);
    res.json({ text: translatedText });
  } catch (e) {
    res.json({ text: originalText });
  }
});

// ============================================================================
// 🔌 10. SHOKO: EPISODIOS
// ============================================================================
app.get('/api/episodes/search', async (req, res) => {
  const { t1, t2 } = req.query;
  try {
    if (!getConfig("SHOKO_API_KEY")) return res.status(500).json({ error: "Falta API Key Shoko." });
    const cleanTitleForShoko = (title) => {
      if (!title) return "";
      return title.replace(/(Season\s*\d+|Part\s*\d+|Cour\s*\d+|S\d+|\d+nd Season|\d+rd Season|\d+th Season)/ig, '').replace(/:|-/g, ' ').replace(/\s\s+/g, ' ').trim();
    };
    const searchQueries = [...new Set([t1, t2, cleanTitleForShoko(t1), cleanTitleForShoko(t2)])].filter(Boolean);
    const cacheKey = `shoko_id_${searchQueries[0].toLowerCase()}`;
    let seriesId = shokoSeriesCache.get(cacheKey);
    if (!seriesId) {
      for (const query of searchQueries) {
        if (seriesId) break;
        const searchRes = await axios.get(`${getConfig("SHOKO_URL")}/api/v3/Series/Search`, {
          params: { query, fuzzy: true },
          headers: { 'apikey': getConfig("SHOKO_API_KEY") },
          timeout: 4000
        });
        if (searchRes.data && searchRes.data.length > 0) {
          seriesId = searchRes.data[0].IDs.ID;
          shokoSeriesCache.set(cacheKey, seriesId);
        }
      }
    }
    if (!seriesId) return res.status(404).json({ error: "Shoko no reconoce este anime." });
    const epRes = await axios.get(`${getConfig("SHOKO_URL")}/api/v3/Series/${seriesId}/Episode?includeFiles=true&includeDataFrom=AniDB`, {
      headers: { 'apikey': getConfig("SHOKO_API_KEY") },
      timeout: 6000
    });
    const episodesArray = Array.isArray(epRes.data) ? epRes.data : (epRes.data.List || []);
    const videoFiles = [];
    for (const ep of episodesArray) {
      const epType = ep.AniDB?.Type || 'Episode';
      if (epType !== 'Episode' && epType !== 'Special') continue;
      const epNumber = ep.AniDB?.EpisodeNumber || "?";
      const epName = ep.Name || "Episodio Desconocido";
      if (ep.Files && ep.Files.length > 0) {
        for (const file of ep.Files) {
          if (file.Locations && file.Locations.length > 0) {
            const loc = file.Locations[0];
            let filePath = loc.AbsolutePath || loc.Path;
            if (!filePath && loc.RelativePath) filePath = path.join(getConfig("CARPETA_D"), loc.RelativePath);
            if (typeof filePath === 'string') {
              videoFiles.push({
                epNumber: parseInt(epNumber) || 999,
                epString: epType === 'Special' ? `OVA ${epNumber}` : `EP ${epNumber}`,
                title: epName,
                fileName: path.basename(filePath),
                path: filePath
              });
            }
          }
        }
      }
    }
    const uniqueFiles = videoFiles.filter((v, i, a) => a.findIndex(t => (t.path === v.path)) === i).sort((a, b) => a.epNumber - b.epNumber);
    res.json(uniqueFiles);
  } catch (e) {
    console.error('[Shoko] Error en /api/episodes/search:', e.message);
    res.status(500).json({ error: "Error Shoko API." });
  }
});

// ============================================================================
// 🔄 SHOKO: FORZAR ESCANEO
// ============================================================================
app.post('/api/shoko/scan', async (req, res) => {
  try {
    if (!getConfig("SHOKO_API_KEY")) return res.status(500).json({ error: "Falta API Key de Shoko." });
    await axios.get(`${getConfig("SHOKO_URL")}/api/v3/Action/RunImport`, {
      headers: { 'apikey': getConfig("SHOKO_API_KEY") },
      timeout: 5000
    });
    log.success(`Comando 'RunImport' enviado exitosamente a Shoko Server.`);
    res.json({ success: true, message: "Importación iniciada en Shoko." });
  } catch (error) {
    log.error('Fallo al despertar a Shoko Server', error.message);
    res.status(500).json({ error: "No se pudo iniciar el escaneo en Shoko." });
  }
});

// ============================================================================
// 🔍 SHOKO: ARCHIVOS HUÉRFANOS
// ============================================================================
app.get('/api/shoko/unrecognized', async (req, res) => {
  try {
    if (!getConfig("SHOKO_API_KEY")) return res.json([]);
    const response = await axios.get(`${getConfig("SHOKO_URL")}/api/v3/File?includeUnrecognized=only&pageSize=50`, {
      headers: { 'apikey': getConfig("SHOKO_API_KEY") },
      timeout: 5000
    });
    const unrecognized = response.data.List || response.data || [];
    const files = unrecognized.map(f => {
      const loc = f.Locations?.[0] || {};
      return {
        id: f.ID,
        name: loc.RelativePath ? path.basename(loc.RelativePath) : "Archivo_Desconocido.mkv",
        size: (f.Size / 1e9).toFixed(2) + ' GB'
      };
    });
    res.json(files);
  } catch (error) {
    console.error('[Shoko] Error en unrecognized:', error.message);
    res.json([]);
  }
});

// ============================================================================
// 🔗 SHOKO: VINCULACIÓN MANUAL
// ============================================================================
app.post('/api/shoko/manual-link', async (req, res) => {
  const { fileId, animeTitle, episodeNumber } = req.body;
  console.log(`[Shoko] 📥 Vinculando: fileId=${fileId}, anime="${animeTitle}", ep=${episodeNumber}`);

  if (!fileId || !animeTitle || !episodeNumber) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  let shokoAlive = false;
  try {
    await axios.get(`${getConfig("SHOKO_URL")}/api/v3/Series?pageSize=1`, {
      headers: { 'apikey': getConfig("SHOKO_API_KEY") },
      timeout: 3000
    });
    shokoAlive = true;
  } catch (err) {
    console.error(`[Shoko] ❌ No se puede conectar con Shoko:`, err.message);
  }

  if (!shokoAlive) {
    return res.status(503).json({ error: 'No se puede conectar con Shoko. Asegúrate de que esté corriendo y el puerto es 8111.' });
  }

  try {
    try {
      await axios.get(`${getConfig("SHOKO_URL")}/api/v3/File/${fileId}`, {
        headers: { 'apikey': getConfig("SHOKO_API_KEY") },
        timeout: 3000
      });
    } catch (err) {
      if (err.response && err.response.status === 404) {
        return res.status(404).json({ error: `El archivo ${fileId} no existe en Shoko.` });
      }
      throw err;
    }

    const searchRes = await axios.get(`${getConfig("SHOKO_URL")}/api/v3/Series/Search`, {
      params: { query: animeTitle, fuzzy: true },
      headers: { 'apikey': getConfig("SHOKO_API_KEY") },
      timeout: 5000
    });

    if (!searchRes.data || searchRes.data.length === 0) {
      return res.status(404).json({ error: `No se encontró la serie "${animeTitle}" en Shoko.` });
    }

    const series = searchRes.data[0];
    const seriesId = series.IDs.ID;
    console.log(`[Shoko] ✅ Serie encontrada: "${series.Name}" (ID: ${seriesId})`);

    const epRes = await axios.get(`${getConfig("SHOKO_URL")}/api/v3/Series/${seriesId}/Episode?includeDataFrom=AniDB`, {
      headers: { 'apikey': getConfig("SHOKO_API_KEY") },
      timeout: 5000
    });
    const episodes = Array.isArray(epRes.data) ? epRes.data : (epRes.data.List || []);
    const targetEp = parseInt(episodeNumber, 10);
    const episode = episodes.find(ep => {
      const epNum = ep.AniDB?.EpisodeNumber;
      return epNum && parseInt(epNum, 10) === targetEp && (ep.AniDB?.Type === 'Episode' || ep.AniDB?.Type === 'Special');
    });

    if (!episode) {
      return res.status(404).json({ error: `Episodio ${targetEp} no encontrado en AniDB para esta serie.` });
    }

    const episodeID = episode.IDs.ID;
    console.log(`[Shoko] ✅ Episodio encontrado: "${episode.Name}" (ID: ${episodeID})`);

    try {
      await axios.put(`${getConfig("SHOKO_URL")}/api/v3/File/${fileId}/Link`,
        { episodeID },
        { headers: { 'apikey': getConfig("SHOKO_API_KEY") }, timeout: 5000 }
      );
      console.log(`[Shoko] ✅ Vinculación exitosa (PUT).`);
      return res.json({ success: true, message: `Vinculado al episodio ${targetEp} (PUT).` });
    } catch (err) {
      console.warn(`[Shoko] ⚠️ Falló PUT, intentando POST a Episode...`);
      try {
        await axios.post(`${getConfig("SHOKO_URL")}/api/v3/Episode/${episodeID}/File`,
          { FileID: fileId },
          { headers: { 'apikey': getConfig("SHOKO_API_KEY") }, timeout: 5000 }
        );
        console.log(`[Shoko] ✅ Vinculación exitosa (POST a Episode).`);
        return res.json({ success: true, message: `Vinculado al episodio ${targetEp} (POST).` });
      } catch (err2) {
        console.error(`[Shoko] ❌ Error en ambos métodos:`, err2.response?.data || err2.message);
        return res.status(500).json({ error: `No se pudo vincular el archivo.` });
      }
    }
  } catch (error) {
    console.error(`[Shoko] ❌ Error general:`, error.message);
    if (error.response) {
      return res.status(error.response.status || 500).json({ error: `Shoko: ${error.response.data?.message || error.response.statusText}` });
    }
    res.status(500).json({ error: `Error de conexión: ${error.message}` });
  }
});

// ============================================================================
// 🗑️ SHOKO: ELIMINAR ARCHIVO
// ============================================================================
app.delete('/api/shoko/file/:fileId', async (req, res) => {
  const { fileId } = req.params;
  try {
    await axios.delete(`${getConfig("SHOKO_URL")}/api/v3/File/${fileId}`, {
      headers: { 'apikey': getConfig("SHOKO_API_KEY") },
      timeout: 5000
    });
    console.log(`[Shoko] ✅ Archivo ${fileId} eliminado.`);
    res.json({ success: true, message: `Archivo ${fileId} eliminado.` });
  } catch (error) {
    console.error(`[Shoko] ❌ Error eliminando ${fileId}:`, error.message);
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ error: `El archivo ${fileId} no existe.` });
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 🧪 RUTA DE PRUEBA PARA SHOKO
// ============================================================================
app.get('/api/shoko/test', async (req, res) => {
  try {
    const seriesRes = await axios.get(`${getConfig("SHOKO_URL")}/api/v3/Series?pageSize=5`, {
      headers: { 'apikey': getConfig("SHOKO_API_KEY") },
      timeout: 3000
    });
    if (seriesRes.status === 200) {
      const seriesCount = seriesRes.data?.length || 0;
      const sampleSeries = seriesRes.data?.slice(0, 3).map(s => s.Name) || [];
      res.json({
        success: true,
        version: 'v3 (Series)',
        seriesCount,
        sampleSeries,
        shokoUrl: getConfig("SHOKO_URL"),
        apiKey: getConfig("SHOKO_API_KEY") ? '✅ presente' : '❌ faltante'
      });
    }
  } catch (error) {
    console.error('Error en test Shoko:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data || 'Sin detalles',
      shokoUrl: getConfig("SHOKO_URL")
    });
  }
});

// ============================================================================
// 📻 RADIO (Streaming)
// ============================================================================
const agenteHTTP = new http.Agent({ keepAlive: true });
const agenteHTTPS = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

const getRadioAudioStream = (targetUrl, maxRedirects = 5) => {
  return new Promise((resolve, reject) => {
    const requestTarget = (currentUrl, redirectCount) => {
      if (redirectCount > maxRedirects) {
        return reject(new Error('Demasiados redireccionamientos de la emisora.'));
      }
      const parsedUrl = new URL(currentUrl);
      const isHttps = parsedUrl.protocol === 'https:';
      const library = isHttps ? https : http;
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Icy-Metadata': '0'
        },
        agent: isHttps ? agenteHTTPS : agenteHTTP,
        timeout: 10000
      };
      const req = library.request(options, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          const redirectLocation = res.headers.location;
          if (redirectLocation) {
            const absoluteRedirectUrl = new URL(redirectLocation, currentUrl).toString();
            return requestTarget(absoluteRedirectUrl, redirectCount + 1);
          }
        }
        if (res.statusCode >= 400) {
          return reject(new Error(`La emisora respondió con estado HTTP ${res.statusCode}`));
        }
        resolve(res);
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout de conexión con la emisora.'));
      });
      req.end();
    };
    requestTarget(targetUrl, 0);
  });
};


// ============================================================================
// 📻 RADIO LOCAL Y NOTAS DE BODEGA
// ============================================================================
app.get('/api/radio/local', async (req, res) => {
  try {
    const musicDir = getConfig("CARPETA_D");
    if (!fs.existsSync(musicDir)) {
      return res.status(404).json({ error: 'Directorio de música local no encontrado' });
    }
    const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
    if (files.length === 0) return res.status(404).json({ error: 'No hay archivos de música' });
    
    // Pick random song
    const randomFile = files[Math.floor(Math.random() * files.length)];
    const filePath = path.join(musicDir, randomFile);
    
    const stat = fs.statSync(filePath);
    res.writeHead(200, {
      'Content-Type': 'audio/mpeg',
      'Content-Length': stat.size,
      'Access-Control-Allow-Origin': '*'
    });
    
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (error) {
    res.status(500).json({ error: 'Error leyendo directorio de música' });
  }
});

app.get('/api/notes', (req, res) => {
  try {
    if (!fs.existsSync('data/notas.json')) return res.json({ notas: '' });
    const data = fs.readFileSync('notas.json', 'utf8');
    const parsed = JSON.parse(data);
    res.json({ notas: parsed.notas || '' });
  } catch(e) {
    res.json({ notas: '' });
  }
});

app.post('/api/notes', (req, res) => {
  try {
    const { notas } = req.body;
    fs.writeFileSync('data/notas.json', JSON.stringify({ notas }));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'No se pudo guardar la nota' });
  }
});

app.get('/api/radio', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const estacionSeleccionada = req.query.station || 'anime';
  const emisoras = {
    anime: 'https://listen.moe/fallback',
    kpop: 'https://listen.moe/kpop/fallback',
    vocaloid: 'https://vocaloid.radioca.st/stream',
    citypop: 'https://kathy.torontocast.com:3060/stream', // J-Idols Project Radio / CityPop
    jpop: 'https://c20.radioboss.fm:8214/stream', // J-Pop Powerplay
    vgm: 'http://allstream.rainwave.cc:8000/all.mp3',
    sega: 'https://icecast.radiosega.net/rs-mpeg.mp3',
    chiptune: 'http://allstream.rainwave.cc:8000/chiptune.mp3',
    nintendo: 'https://radio.ninten.do/stream', // Ninten.do Radio
    rpg: 'https://rpgamers.net:8000/rpgn', // RPGamers Network
    jazz: 'http://stream.srg-ssr.ch/m/rsj/mp3_128',
    clasica: 'http://stream.srg-ssr.ch/m/rsc_de/mp3_128',
    drone: 'https://stream.nightride.fm/chillsynth.mp3',
    lofi: 'https://streaming.hotmixradio.com/hotmix-lofi-en-mp3',
    ambient: 'https://stream.radioparadise.com/mellow-128',
    rock_es: 'https://stream.radioparadise.com/rock-128',
    house: 'http://62.138.2.128:8009/stream',
    dubstep: 'https://bassdrive.radioca.st/stream',
    synth: 'https://stream.nightride.fm/nightride.mp3',
    phonk: 'https://stream.nightride.fm/nightride.mp3', // Keeping this as there are very few stable direct phonk icecasts
    salsa: 'https://streaming.hotmixradio.com/hotmix-salsa-en-mp3',
    cumbia: 'https://mdstrm.com/audio/6839e1f153fcf56d988d5943/icecast.audio',
    reggae: 'https://streaming.hotmixradio.com/hotmix-reggae-en-mp3',
    bossa: 'https://strm112.1.fm/bossanova_mobile_mp3',
    afro: 'https://streaming.hotmixradio.com/hotmix-reggae-en-mp3' // Kept fallback
  };

  const targetUrl = emisoras[estacionSeleccionada] || emisoras.anime;
  let streamActual = null;
  let clienteDesconectado = false;

  req.on('close', () => {
    clienteDesconectado = true;
    if (streamActual) {
      streamActual.destroy();
    }
    res.end();
    if (req.socket) req.socket.destroy();
  });

  try {
    const radioStream = await getRadioAudioStream(targetUrl);
    streamActual = radioStream;
    if (clienteDesconectado) {
      streamActual.destroy();
      return;
    }
    const contentType = radioStream.headers['content-type'] || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    streamActual.pipe(res);
  } catch (error) {
    log.error(`[RADIO] Fallo al conectar con la emisora "${estacionSeleccionada}":`, error.message);
    if (!res.headersSent) {
      res.status(502).end();
    } else {
      res.end();
    }
  }
});

// ============================================================================
// 🎬 ESCANEAR ARCHIVOS DE ANIME CON PROWLARR + ANILIST
// ============================================================================
app.get('/api/scan-anime-files', async (req, res) => {
    function limpiarTexto(texto) {
        if (!texto) return '';
        return texto
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function extraerTituloDeArchivo(nombreArchivo) {
        let nombre = nombreArchivo.replace(/\.[^.]+$/, '');
        nombre = nombre.replace(/\[[^\]]*\]/g, '');
        nombre = nombre.replace(/\([^)]*\)/g, '');
        nombre = nombre.replace(/(?:-|–)\s*(?:EP?|E|Episode|Capítulo|Cap\.?)?\s*\d+(?:\s*v\d+)?/gi, '');
        nombre = nombre.replace(/\d+[vV]\d+/g, '');
        nombre = nombre.replace(/\d{3,4}p/g, '');
        nombre = nombre.replace(/\s+/g, ' ').trim();
        return nombre;
    }

    function extraerNumeroEpisodio(nombreArchivo) {
        const patterns = [
            /S\d+E(\d+)/i,
            /(?:-\s*|EP|E)(\d{2,3})/i,
            /Episode\s*(\d+)/i,
            /Capítulo\s*(\d+)/i
        ];
        for (const pattern of patterns) {
            const match = nombreArchivo.match(pattern);
            if (match && match[1]) {
                return parseInt(match[1], 10);
            }
        }
        return null;
    }

    function levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                const cost = a[j - 1] === b[i - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        return matrix[b.length][a.length];
    }

    function similarityScore(a, b) {
        if (a.length === 0 && b.length === 0) return 1;
        const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
        const maxLen = Math.max(a.length, b.length);
        return 1 - (distance / maxLen);
    }

    const { title } = req.query;
    if (!title) {
        return res.status(400).json({ error: 'Falta el título del anime.' });
    }

    try {
        let variants = [title];
        try {
            const searchRes = await axios.get(`${getConfig("PROWLARR_URL")}/api/v1/search`, {
                params: { apikey: getConfig("PROWLARR_API_KEY"), query: title },
                timeout: 5000
            });
            if (searchRes.data && searchRes.data.length > 0) {
                const torrentTitles = searchRes.data.map(t => t.title);
                torrentTitles.forEach(t => {
                    let clean = t.replace(/\[[^\]]*\]/g, '')
                                 .replace(/\([^)]*\)/g, '')
                                 .replace(/(?:-\s*|EP|E)\d+/gi, '')
                                 .replace(/\d{3,4}p/g, '')
                                 .replace(/VOSTFR|MULTI|DUAL|SUB/i, '')
                                 .replace(/\s+/g, ' ')
                                 .trim();
                    if (clean.length > 10) variants.push(clean);
                    const words = clean.split(' ').filter(w => w.length > 4);
                    if (words.length > 0) {
                        const keyPhrase = words.slice(0, 3).join(' ');
                        if (keyPhrase.length > 5) variants.push(keyPhrase);
                    }
                });
            }
        } catch (e) {
            // Ignorar fallos de Prowlarr
        }

        try {
            const anilistQuery = `
            query ($search: String) {
              Page(page: 1, perPage: 1) {
                media(search: $search, type: ANIME) {
                  title {
                    romaji
                    english
                    native
                  }
                }
              }
            }`;
            const anilistResponse = await axios.post('https://graphql.anilist.co', {
                query: anilistQuery,
                variables: { search: title }
            });
            const media = anilistResponse.data?.data?.Page?.media?.[0];
            if (media) {
                if (media.title.romaji) variants.push(media.title.romaji);
                if (media.title.english) variants.push(media.title.english);
                if (media.title.native) variants.push(media.title.native);
            }
        } catch (e) {
            // Ignorar fallos de AniList
        }

        const cleanVariants = [...new Set(variants.map(v => limpiarTexto(v)).filter(v => v.length > 0))];

        const videoExtensions = ['.mkv', '.mp4', '.avi', '.m4v', '.mov', '.webm', '.ts'];
        const results = [];

        const scanDirectory = async (dir, depth = 0) => {
            if (depth > 3) return;
            try {
                const entries = await fs.promises.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (entry.isDirectory()) {
                        await scanDirectory(fullPath, depth + 1);
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name).toLowerCase();
                        if (!videoExtensions.includes(ext)) continue;

                        const tituloExtraido = extraerTituloDeArchivo(entry.name);
                        const tituloExtraidoLimpio = limpiarTexto(tituloExtraido);

                        let bestScore = 0;
                        let bestVariant = '';
                        for (const variant of cleanVariants) {
                            const score = similarityScore(tituloExtraidoLimpio, variant);
                            if (score > bestScore) {
                                bestScore = score;
                                bestVariant = variant;
                            }
                        }

                        const titleLower = limpiarTexto(title);
                        const containsTitle = tituloExtraidoLimpio.includes(titleLower) || titleLower.includes(tituloExtraidoLimpio);
                        if (!containsTitle && bestScore < 0.35) continue;
                        if (containsTitle && bestScore < 0.2) bestScore = 0.3;

                        if (bestScore >= 0.3) {
                            const stats = await fs.promises.stat(fullPath);
                            results.push({
                                name: entry.name,
                                path: fullPath,
                                size: stats.size,
                                ext: ext,
                                score: Math.round(bestScore * 100),
                                matchedVariant: bestVariant || 'desconocido',
                                episodeNumber: extraerNumeroEpisodio(entry.name)
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn(`[Scanner] Error escaneando ${dir}:`, err.message);
            }
        };

        await scanDirectory(getConfig("CARPETA_D"));
        results.sort((a, b) => b.score - a.score || b.size - a.size);

        console.log(`┌────────────────────────────────────────────────────────┐`);
        console.log(`│ [SCANNER] 📂 ESCANEO DE ARCHIVOS LOCALES               │`);
        console.log(`├────────────────────────────────────────────────────────┤`);
        console.log(`│  • Anime: "${title}"`);
        console.log(`│  • Archivos Encontrados: ${results.length}`);
        console.log(`└────────────────────────────────────────────────────────┘`);
        res.json({ files: results.slice(0, 50) });

    } catch (error) {
        console.error(`[Scanner] ❌ Error:`, error.message);
        res.status(500).json({ error: 'Error al escanear la carpeta de animes: ' + error.message });
    }
});

// ============================================================================
// 📺 REPRODUCTOR WEB
// ============================================================================
app.get('/api/play', async (req, res) => {
  const p = req.query.path;
  if (!p) return res.status(404).send("Ruta no definida");

  try {
    const stat = await fs.promises.stat(p);
    const range = req.headers.range;
    const ext = path.extname(p).toLowerCase();
    
    let contentType = 'video/mp4';
    if (ext === '.mkv') contentType = 'video/x-matroska';
    else if (ext === '.ts') contentType = 'video/MP2T';
    else if (ext === '.webm') contentType = 'video/webm';
    else if (ext === '.avi') contentType = 'video/x-msvideo';
    else if (ext === '.mov') contentType = 'video/quicktime';
    else if (ext === '.m4v') contentType = 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start) + 1,
        'Content-Type': contentType
      });
      fs.createReadStream(p, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Length': stat.size, 'Content-Type': contentType });
      fs.createReadStream(p).pipe(res);
    }
  } catch (err) {
    res.status(404).send("No encontrado");
  }
});

// ============================================================================
// 🎬 INVOCADOR DE VLC
// ============================================================================
app.get('/api/open-local', async (req, res) => {
  const p = req.query.path;
  try {
    await fs.promises.access(p);
    if (process.platform === 'win32') {
      const vlc64 = `"C:\\Program Files\\VideoLAN\\VLC\\vlc.exe"`;
      const vlc32 = `"C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe"`;
      const cmd = `${vlc64} "${p}" || ${vlc32} "${p}" || start "" "${p}"`;
      exec(cmd);
    } else if (process.platform === 'darwin') {
      exec(`open -a "VLC" "${p}" || open "${p}"`);
    } else {
      exec(`vlc "${p}" || xdg-open "${p}"`);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(404).json({ error: "No encontrado o error al ejecutar" });
  }
});

// ============================================================================
// 📥 SINC DE DESCARGAS
// ============================================================================
app.get('/api/downloads/queue', async (req, res) => {
  let activeDownloads = [];
  let stuckCount = 0;
  let stuckItemsList = [];

  const [qbRes, sonarrRes] = await Promise.allSettled([
    axios.get(`${getConfig("QBITTORRENT_URL")}/api/v2/torrents/info`, { timeout: 1500 }),
    axios.get(`${getConfig("SONARR_URL")}/api/v3/queue`, { params: { pageSize: 1000 }, headers: { 'X-Api-Key': getConfig("SONARR_API_KEY") }, timeout: 1500 })
  ]);

  if (qbRes.status === 'fulfilled') {
    activeDownloads = qbRes.value.data.map(item => ({
      hash: item.hash,
      title: item.name,
      size: (item.size / 1e9).toFixed(2) + ' GB',
      progress: (item.progress * 100).toFixed(0),
      status: item.state === 'downloading' ? 'Descargando' : item.state === 'stalledDL' ? 'Buscando semillas' : item.state
    }));
  } else {
    log.warn(`qBittorrent offline o inaccesible.`);
  }

  if (sonarrRes.status === 'fulfilled') {
    const stuckRecords = (sonarrRes.value.data.records || []).filter(item =>
      item.trackedDownloadStatus === 'warning' ||
      item.trackedDownloadStatus === 'error' ||
      (item.statusMessages && item.statusMessages.length > 0)
    );
    
    stuckItemsList = stuckRecords.map(item => {
      let errMsg = "Mismatch de archivo o directorio";
      try {
        if (item.statusMessages && item.statusMessages.length > 0) {
          errMsg = Array.isArray(item.statusMessages[0].messages)
            ? item.statusMessages[0].messages.join(", ")
            : String(item.statusMessages[0].messages);
        }
      } catch (e) {}
      return {
        id: item.id,
        title: item.title,
        status: item.status,
        outputPath: item.outputPath,
        downloadId: item.downloadId,
        errorMessage: errMsg
      };
    });
    stuckCount = stuckItemsList.length;
  } else {
    log.warn(`Sonarr offline. No se pueden verificar conflictos de importación.`);
  }

  res.json({ active: activeDownloads, stuckCount, stuckItems: stuckItemsList });
});

// ============================================================================
// 🚀 INYECTOR REMOTO
// ============================================================================
app.post('/api/downloads/add', async (req, res) => {
  try {
    const { magnet } = req.body;
    if (!magnet) return res.status(400).json({ error: "No se envió magnet." });

    const data = new URLSearchParams();
    data.append('urls', magnet);
    data.append('savepath', getConfig("CARPETA_D"));

    await axios.post(`${getConfig("QBITTORRENT_URL")}/api/v2/torrents/add`, data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    log.success(`Magnet enviado exitosamente a qBittorrent desde el celular.`);
    res.json({ success: true, message: "Añadido a qBittorrent" });
  } catch (error) {
    log.error(`Fallo al enviar a qBittorrent`, error.message);
    res.status(500).json({ error: "Fallo al enviar a qBittorrent" });
  }
});

// ============================================================================
// 🛑 CANCELAR DESCARGA
// ============================================================================
app.post('/api/downloads/cancel', async (req, res) => {
  try {
    const { hash } = req.body;
    if (!hash) return res.status(400).json({ error: "Falta el identificador del torrent." });

    const data = new URLSearchParams();
    data.append('hashes', hash);
    data.append('deleteFiles', 'true');

    await axios.post(`${getConfig("QBITTORRENT_URL")}/api/v2/torrents/delete`, data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    res.json({ success: true, message: "Exterminado." });
  } catch (error) {
    res.status(500).json({ error: "Error al intentar cancelar en qBittorrent." });
  }
});

// ============================================================================
// 💾 BASE DE DATOS CENTRALIZADA
// ============================================================================
const DB_LIBRARY = path.join(process.cwd(), 'data', 'biblioteca.json');
const DB_WATCHED = path.join(process.cwd(), 'data', 'vistos.json');

const leerBD = async (ruta) => {
  try {
    const data = await fs.promises.readFile(ruta, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
};

app.get('/api/library', async (req, res) => res.json(await leerBD(DB_LIBRARY)));
app.get('/api/watched', async (req, res) => res.json(await leerBD(DB_WATCHED)));

app.post('/api/library', async (req, res) => {
  try {
    await fs.promises.writeFile(DB_LIBRARY, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando' });
  }
});

app.post('/api/watched', async (req, res) => {
  try {
    await fs.promises.writeFile(DB_WATCHED, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Error guardando' });
  }
});

// ============================================================================
// 📻 METADATOS DE RADIO
// ============================================================================
app.get('/api/radio/metadata', async (req, res) => {
  const { station } = req.query;
  try {
    if (station === 'anime' || station === 'kpop') {
      return res.json({ title: cancionesEnVivo[station] || "La Taberna Radio - En Vivo" });
    }
    const playlists = {
      vocaloid: ["Hatsune Miku - World is Mine", "Miku & Luka - Magnet", "Kikuo - Aishite", "Hatsune Miku - Senbonzakura"],
      citypop: ["Mariya Takeuchi - Plastic Love", "Miki Matsubara - Stay With Me", "Anri - Remember Summer Days", "Tatsuro Yamashita - Ride on Time"],
      jpop: ["YOASOBI - Idol", "Kenshi Yonezu - Kick Back", "Ado - Usseewa", "Hikaru Utada - One Last Kiss"],
      vgm: ["Koji Kondo - Super Mario Bros Overworld", "Nobuo Uematsu - One-Winged Angel", "Yasunori Mitsuda - Chrono Trigger Theme"],
      sega: ["SEGA Sound Team - Green Hill Zone", "Hideki Naganuma - Concept of Love", "SEGA - Daytona USA Let's Go Away"],
      chiptune: ["Disasterpeace - FEZ", "Anamanaguchi - Endless Fantasy", "Savant - Melody", "C418 - Sweden (8-bit)"],
      nintendo: ["Koji Kondo - Zelda Main Theme", "Hirokazu Tanaka - Metroid Theme", "Junichi Masuda - Pokémon Center"],
      rpg: ["Jeremy Soule - Dragonborn", "Motoi Sakuraba - Dark Souls Theme", "Shoji Meguro - Last Surprise"],
      jazz: ["Miles Davis - So What", "John Coltrane - Blue Train", "Dave Brubeck - Take Five", "Bill Evans - Waltz for Debby"],
      clasica: ["Beethoven - Symphony No. 9", "Mozart - Requiem", "Chopin - Nocturne Op. 9 No. 2", "Vivaldi - Las Cuatro Estaciones"],
      drone: ["Nightride FM - Chillsynth", "A.L.I.S.O.N - Space Echoes", "Hotel Pools - Eclipse", "Unfound - Wake"],
      lofi: ["L.Dre - Cozy Coffee Beats", "Chillhop Music - Winter Lounge Cafe", "Lofi Girl - Midnight Homework", "Saib - Spike Spiegel Jazz"],
      ambient: ["Brian Eno - 1/1", "Aphex Twin - #3", "Boards of Canada - Dayvan Cowboy", "Tangerine Dream - Love on a Real Train"],
      rock_es: ["Mägo de Oz - Fiesta Pagana", "Rata Blanca - Mujer Amante", "AC/DC - Back In Black", "Queen - Bohemian Rhapsody"],
      house: ["Daft Punk - One More Time", "Modjo - Lady (Hear Me Tonight)", "Stardust - Music Sounds Better With You"],
      dubstep: ["Bassdrive - Worldwide Drum & Bass", "Pendulum - Blood Sugar", "Netsky - Irony", "Noisia - DJ Set"],
      synth: ["Lazerhawk - King of The Streets", "Kavinsky - Nightcall", "The Midnight - Sunset", "Carpenter Brut - Turbo Killer"],
      phonk: ["Kordhell - Murder In My Mind", "PlayaPhonk - Phonky Town", "Ghostface Playa - Why Not"],
      salsa: ["Cadena 100 Salsa", "Héctor Lavoe - Periódico de Ayer", "Willie Colón - El Juicio", "Oscar D'León - Llorarás", "El Gran Combo - Me Liberé"],
      cumbia: ["Cumbia Boom", "Los Ángeles Azules - 17 Años", "La Sonora Dinamita - Escalera", "Pastor López - Traicionera", "Celso Piña - Cumbia Sobre el Río"],
      reggae: ["FIP Reggae France", "Bob Marley - Three Little Birds", "Jimmy Cliff - Many Rivers to Cross", "Burning Spear - Marcus Garvey", "Sister Nancy - Bam Bam"],
      bossa: ["FIP Bossa Nova", "João Gilberto - Chega de Saudade", "Stan Getz & Astrud Gilberto - The Girl From Ipanema", "Tom Jobim - Wave", "Sergio Mendes - Mas Que Nada"],
      afro: ["Fela Kuti - Zombie", "Burna Boy - Ye", "Wizkid - Essence", "Rema - Calm Down"]
    };
    const lista = playlists[station] || ["La Taberna Radio - Transmitiendo..."];
    const index = Math.floor(Math.random() * lista.length);
    res.json({ title: lista[index] });
  } catch (e) {
    res.json({ title: "La Taberna Radio - Transmitiendo..." });
  }
});

// ============================================================================
// 📡 WEBSOCKET PARA LISTEN.MOE
// ============================================================================
let cancionesEnVivo = {
  anime: "Listen.moe J-Pop - En Vivo",
  kpop: "Listen.moe K-Pop - En Vivo"
};

function conectarSatéliteListenMoe() {
  const sintonizar = (tipo, url) => {
    const ws = new WebSocket(url);
    ws.on('message', (data) => {
      try {
        const payload = JSON.parse(data);
        if (payload.op === 1 && payload.d && payload.d.song) {
          const song = payload.d.song;
          const artistas = song.artists.map(a => a.name).join(', ');
          cancionesEnVivo[tipo] = `${artistas} - ${song.title}`;
        }
      } catch (e) {}
    });
    ws.on('close', () => setTimeout(() => sintonizar(tipo, url), 5000));
    ws.on('error', () => ws.close());
  };
  sintonizar('anime', 'wss://listen.moe/gateway_v2');
  sintonizar('kpop', 'wss://listen.moe/kpop/gateway_v2');
}
conectarSatéliteListenMoe();

// ============================================================================
// 🔑 ANILIST API HELPERS
// ============================================================================
// Ahora usamos las constantes desde config.json para AniList
const getAnilistId = () => getConfig('ANILIST_CLIENT_ID');
const getAnilistSecret = () => getConfig('ANILIST_CLIENT_SECRET');
const ANILIST_REDIRECT_URI = 'http://localhost:3000/api/anilist/callback';

const ANILIST_TOKEN_FILE = path.join(process.cwd(), 'data', 'anilist_token.json');

function saveAnilistToken(tokenData) {
  fs.writeFileSync(ANILIST_TOKEN_FILE, JSON.stringify(tokenData, null, 2));
}
function readAnilistToken() {
  try {
    return JSON.parse(fs.readFileSync(ANILIST_TOKEN_FILE, 'utf-8'));
  } catch { return null; }
}

async function anilistGraphQL(query, variables, token) {
  const response = await axios.post('https://graphql.anilist.co', { query, variables }, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 5000
  });
  return response.data;
}

async function refreshAnilistToken(refreshToken) {
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  params.append('client_id', getAnilistId());
  params.append('client_secret', getAnilistSecret());
  const response = await axios.post('https://anilist.co/api/v2/oauth/token', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return response.data;
}

async function getValidAnilistToken() {
  const tokenData = readAnilistToken();
  if (!tokenData) return null;
  const now = Date.now() / 1000;
  if (tokenData.expires_at && tokenData.expires_at < now) {
    try {
      const newToken = await refreshAnilistToken(tokenData.refresh_token);
      newToken.expires_at = Math.floor(Date.now() / 1000) + newToken.expires_in;
      saveAnilistToken(newToken);
      return newToken.access_token;
    } catch (e) {
      console.error('Error refreshing AniList token:', e.message);
      return null;
    }
  }
  return tokenData.access_token;
}

const STATUS_MAP = {
  quiero_ver: 'PLANNING',
  viendo: 'CURRENT',
  completado: 'COMPLETED',
  en_pausa: 'PAUSED',
  abandonado: 'DROPPED'
};
const STATUS_REVERSE = {
  PLANNING: 'quiero_ver',
  CURRENT: 'viendo',
  COMPLETED: 'completado',
  PAUSED: 'en_pausa',
  DROPPED: 'abandonado'
};

// ============================================================================
// 🚪 RUTAS DE AUTENTICACIÓN ANILIST
// ============================================================================
// Redirección a OAuth2 de AniList
app.get('/api/anilist/auth', (req, res) => {
  const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${getAnilistId()}&redirect_uri=${encodeURIComponent(ANILIST_REDIRECT_URI)}&response_type=code`;
  res.redirect(authUrl);
});

// Callback de OAuth2, intercambia el código por el token de acceso
app.get('/api/anilist/callback', async (req, res) => {
  console.log('📥 Callback recibido con query:', req.query);
  const { code } = req.query;
  if (!code) {
    console.error('❌ No se recibió código');
    return res.status(400).send('Falta el código de autorización.');
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', getAnilistId());
    params.append('client_secret', getAnilistSecret());
    params.append('redirect_uri', ANILIST_REDIRECT_URI);
    params.append('code', code);
    const response = await axios.post('https://anilist.co/api/v2/oauth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const tokenData = response.data;
    tokenData.expires_at = Math.floor(Date.now() / 1000) + tokenData.expires_in;
    saveAnilistToken(tokenData);
    res.redirect('http://localhost:5173/?anilist=connected');
  } catch (error) {
    console.error('Error en callback AniList:', error.message);
    res.status(500).send('Error al intercambiar el código.');
  }
});

// ============================================================================
// 👤 PERFIL Y SINCRONIZACIÓN
// ============================================================================
app.get('/api/anilist/me', async (req, res) => {
  const token = await getValidAnilistToken();
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const query = `query { Viewer { id name avatar { large } siteUrl } }`;
    const data = await anilistGraphQL(query, {}, token);
    res.json(data.data.Viewer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/anilist/logout', (req, res) => {
  try {
    if (fs.existsSync(ANILIST_TOKEN_FILE)) {
      fs.unlinkSync(ANILIST_TOKEN_FILE);
    }
    res.json({ success: true, message: 'Sesión de AniList cerrada' });
  } catch (error) {
    console.error('Error al cerrar sesión de AniList:', error.message);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
});

app.post('/api/anilist/sync', async (req, res) => {
  const token = await getValidAnilistToken();
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Se requiere array de items' });

  const results = [];
  for (const item of items) {
    try {
      const mutation = `
        mutation ($mediaId: Int, $status: MediaListStatus, $score: Float, $progress: Int) {
          SaveMediaListEntry(mediaId: $mediaId, status: $status, score: $score, progress: $progress) {
            id
            status
            score
            progress
          }
        }
      `;
      const variables = {
        mediaId: item.mediaId,
        status: item.status ? STATUS_MAP[item.status] : undefined,
        score: item.score ? parseFloat(item.score) : undefined,
        progress: item.progress || 0
      };
      const data = await anilistGraphQL(mutation, variables, token);
      results.push({ mediaId: item.mediaId, success: true, data: data.data.SaveMediaListEntry });
    } catch (error) {
      results.push({ mediaId: item.mediaId, success: false, error: error.message });
    }
  }
  res.json({ results });
});

app.get('/api/anilist/library', async (req, res) => {
  const token = await getValidAnilistToken();
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const viewerQuery = `query { Viewer { id } }`;
    const viewerData = await anilistGraphQL(viewerQuery, {}, token);
    const userId = viewerData.data.Viewer.id;

    const query = `
      query ($userId: Int) {
        MediaListCollection(userId: $userId, type: ANIME) {
          lists {
            entries {
              mediaId
              status
              score
              progress
              media {
                id
                title { romaji english }
                coverImage { extraLarge }
                episodes
                averageScore
                description
                genres
                startDate { year month day }
                nextAiringEpisode { airingAt }
              }
            }
          }
        }
      }
    `;
    const data = await anilistGraphQL(query, { userId }, token);
    const entries = [];
    data.data.MediaListCollection.lists.forEach(list => {
      list.entries.forEach(entry => {
        const media = entry.media;
        entries.push({
          anilistId: entry.mediaId,
          title: media.title.romaji || media.title.english,
          titleEnglish: media.title.english || media.title.romaji,
          image: media.coverImage.extraLarge,
          episodes: media.episodes || '??',
          score: media.averageScore ? (media.averageScore / 10).toFixed(1) : null,
          synopsis: media.description ? media.description.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...' : "Sin sinopsis.",
          genres: media.genres || [],
          startDate: media.startDate.year ? `${media.startDate.day}/${media.startDate.month}/${media.startDate.year}` : "???",
          nextAiringAt: media.nextAiringEpisode?.airingAt || null,
          status: STATUS_REVERSE[entry.status] || 'quiero_ver',
          userScore: entry.score || null,
          progress: entry.progress || 0,
        });
      });
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 📚 RECOMENDACIONES
// ============================================================================
app.get('/api/anilist/recommendations', async (req, res) => {
  const token = await getValidAnilistToken();
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  try {
    const viewerQuery = `query { Viewer { id } }`;
    const viewerData = await anilistGraphQL(viewerQuery, {}, token);
    const userId = viewerData.data.Viewer.id;

    const listQuery = `
      query ($userId: Int) {
        MediaListCollection(userId: $userId, type: ANIME) {
          lists {
            entries {
              mediaId
              score
            }
          }
        }
      }
    `;
    const listData = await anilistGraphQL(listQuery, { userId }, token);
    let bestMediaId = null;
    let bestScore = 0;
    listData.data.MediaListCollection.lists.forEach(list => {
      list.entries.forEach(entry => {
        if (entry.score && entry.score > bestScore) {
          bestScore = entry.score;
          bestMediaId = entry.mediaId;
        }
      });
    });
    if (!bestMediaId) return res.json([]);

    const recQuery = `
      query ($mediaId: Int) {
        Page(page: 1, perPage: 10) {
          recommendations(mediaId: $mediaId, sort: RATING_DESC) {
            mediaRecommendation {
              id
              title { romaji english }
              coverImage { extraLarge }
              averageScore
              episodes
              genres
            }
          }
        }
      }
    `;
    const recData = await anilistGraphQL(recQuery, { mediaId: bestMediaId }, token);
    const recommendations = recData.data.Page.recommendations.map(r => ({
      title: r.mediaRecommendation.title.romaji || r.mediaRecommendation.title.english,
      titleEnglish: r.mediaRecommendation.title.english,
      image: r.mediaRecommendation.coverImage.extraLarge,
      score: r.mediaRecommendation.averageScore ? (r.mediaRecommendation.averageScore / 10).toFixed(1) : null,
      episodes: r.mediaRecommendation.episodes || '??',
      genres: r.mediaRecommendation.genres || [],
    }));
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// 🗑️ ELIMINAR ENTRADA DE ANILIST
// ============================================================================
app.post('/api/anilist/delete', async (req, res) => {
  const token = await getValidAnilistToken();
  if (!token) return res.status(401).json({ error: 'No autenticado' });
  const { mediaId } = req.body;
  if (!mediaId) return res.status(400).json({ error: 'Se requiere mediaId' });

  try {
    const viewerQuery = `query { Viewer { id } }`;
    const viewerData = await anilistGraphQL(viewerQuery, {}, token);
    const userId = viewerData.data.Viewer.id;

    const listQuery = `
      query ($userId: Int, $mediaId: Int) {
        MediaList(userId: $userId, mediaId: $mediaId) {
          id
        }
      }
    `;
    const listData = await anilistGraphQL(listQuery, { userId, mediaId }, token);
    const entryId = listData.data.MediaList?.id;

    if (!entryId) {
      return res.status(404).json({ error: 'No se encontró la entrada en tu lista de AniList' });
    }

    const mutation = `
      mutation ($id: Int) {
        DeleteMediaListEntry(id: $id) {
          deleted
        }
      }
    `;
    const variables = { id: entryId };
    const data = await anilistGraphQL(mutation, variables, token);
    res.json({ success: true, data: data.data.DeleteMediaListEntry });
  } catch (error) {
    console.error('Error eliminando entrada de AniList:', error.message);
    if (error.response) {
      console.error('Respuesta de AniList:', error.response.data);
    }
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// KUDASAI
// ============================================================================

app.get('/api/news', async (req, res) => {
  const { category } = req.query; // 'anime', 'cultura', 'japon'

  // Mapeo de categorías a URLs de SomosKudasai
  const categoryUrls = {
    anime: 'https://somoskudasai.com/noticias/anime/',
    cultura: 'https://somoskudasai.com/noticias/cultura-otaku/',
    japon: 'https://somoskudasai.com/noticias/japon/',
  };

  const targetUrl = category && categoryUrls[category] 
    ? categoryUrls[category] 
    : 'https://somoskudasai.com/';

  console.log(`[Puppeteer] Scrapeando categoría: ${category || 'todas'} en ${targetUrl}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    await page.goto(targetUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    await page.waitForSelector('article, .post, .td_module_wrap, .td-block-row', { timeout: 10000 }).catch(() => {
      console.log('[Puppeteer] No se encontraron artículos con los selectores principales');
    });

    const articles = await page.evaluate((category) => {
      const items = [];
      const seenUrls = new Set();

      const selectors = [
        'article', '.post', '.entry', '.td_module_wrap', '.td-block-row',
        '.td_module_16', '.td_module_9', '.td_module_10', '.td_module_mx2',
        '.td_module_mx3', '.td_module_loop', '.td_module_1', '.td_module_2',
        '.td_module_3', '.td_module_4', '.td_module_5', '.td_module_6',
        '.td_module_7', '.td_module_8', '.td_module_11', '.td_module_12',
        '.td_module_13', '.td_module_14', '.td_module_15', '.td_module_17',
        '.td_module_18', '.td_module_19', '.td_module_20', '.td_module_21',
        '.td_module_22', '.td_module_23', '.td_module_24', '.td_module_25',
        '.td_module_26', '.td_module_27', '.td_module_28', '.td_module_29',
        '.td_module_30', '.td_module_31', '.td_module_32', '.td_module_33',
        '.td_module_34', '.td_module_35',
      ];

      const elements = document.querySelectorAll(selectors.join(', '));
      console.log(`[Puppeteer] Encontrados ${elements.length} elementos potenciales`);

      // Función mejorada para parsear fechas
      function parseDate(dateText) {
        if (!dateText) return null;
        
        dateText = dateText.trim();
        
        // 1. Intentar con atributos datetime
        if (dateText.match(/^\d{4}-\d{2}-\d{2}/)) {
          const d = new Date(dateText);
          if (!isNaN(d)) return d;
        }
        
        // 2. Limpiar "hace X tiempo"
        const haceMatch = dateText.match(/hace\s+(\d+)\s+(hora|horas|día|días|minuto|minutos|segundo|segundos)/i);
        if (haceMatch) {
          const num = parseInt(haceMatch[1], 10);
          const unit = haceMatch[2].toLowerCase();
          const now = new Date();
          if (unit.includes('hora')) now.setHours(now.getHours() - num);
          else if (unit.includes('día')) now.setDate(now.getDate() - num);
          else if (unit.includes('minuto')) now.setMinutes(now.getMinutes() - num);
          else if (unit.includes('segundo')) now.setSeconds(now.getSeconds() - num);
          return now;
        }
        
        // 3. Fechas en español: "30 julio, 2026" o "30 de julio de 2026"
        const meses = {
          'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
          'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
          'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
        };
        
        // Patrón: día mes año
        let match = dateText.match(/(\d{1,2})\s+de?\s+([a-záéíóúñ]+)\s+de?\s+(\d{4})/i);
        if (match) {
          const day = parseInt(match[1], 10);
          const month = meses[match[2].toLowerCase()];
          const year = parseInt(match[3], 10);
          if (month !== undefined && !isNaN(day) && !isNaN(year)) {
            const d = new Date(year, month, day);
            if (!isNaN(d)) return d;
          }
        }
        
        // Patrón: día mes, año
        match = dateText.match(/(\d{1,2})\s+([a-záéíóúñ]+)[,\s]+(\d{4})/i);
        if (match) {
          const day = parseInt(match[1], 10);
          const month = meses[match[2].toLowerCase()];
          const year = parseInt(match[3], 10);
          if (month !== undefined && !isNaN(day) && !isNaN(year)) {
            const d = new Date(year, month, day);
            if (!isNaN(d)) return d;
          }
        }
        
        // 4. Intentar con Date.parse directamente
        try {
          const d = new Date(dateText);
          if (!isNaN(d)) return d;
        } catch (e) {}
        
        return null;
      }

      // Función para extraer fecha de un elemento
      function extractDate(el) {
        // Buscar en múltiples selectores
        const dateSelectors = [
          '.td-post-date',
          '.entry-date', 
          'time',
          '.date',
          '.td-module-date',
          '.td-post-date time',
          '.td-post-date .entry-date',
          '.td-block-date',
          '.td-post-date .td-post-date'
        ];
        
        for (const selector of dateSelectors) {
          const dateEl = el.querySelector(selector);
          if (dateEl) {
            // Intentar con datetime
            let dateAttr = dateEl.getAttribute('datetime') || 
                          dateEl.getAttribute('pubdate') ||
                          dateEl.getAttribute('data-timestamp');
            
            if (dateAttr) {
              const parsed = parseDate(dateAttr);
              if (parsed) return parsed;
            }
            
            // Intentar con el texto
            const text = dateEl.textContent.trim();
            if (text) {
              const parsed = parseDate(text);
              if (parsed) return parsed;
            }
          }
        }
        
        // Buscar en todo el elemento padre
        const allText = el.textContent;
        const datePatterns = [
          /(\d{1,2})\s+de?\s+([a-záéíóúñ]+)\s+de?\s+(\d{4})/i,
          /(\d{1,2})\s+([a-záéíóúñ]+)[,\s]+(\d{4})/i,
          /hace\s+(\d+)\s+(hora|horas|día|días|minuto|minutos)/i
        ];
        
        for (const pattern of datePatterns) {
          const match = allText.match(pattern);
          if (match) {
            const parsed = parseDate(match[0]);
            if (parsed) return parsed;
          }
        }
        
        return null;
      }

      elements.forEach((el) => {
        if (items.length >= 25) return;

        // ─── TÍTULO Y ENLACE ────────────────────────────────────────────
        const titleEl = el.querySelector('h2 a, h3 a, .entry-title a, .post-title a, .td-module-title a');
        let title = titleEl ? titleEl.textContent.trim() : '';
        let link = titleEl ? titleEl.getAttribute('href') : null;

        if (!title) {
          const firstLink = el.querySelector('a');
          if (firstLink) {
            link = firstLink.getAttribute('href');
            title = firstLink.textContent.trim();
          }
        }

        if (!title || !link || seenUrls.has(link)) return;
        seenUrls.add(link);

        // ─── CATEGORÍA ──────────────────────────────────────────────────
        let detectedCategory = category || 'anime';
        if (!category) {
          const linkLower = link.toLowerCase();
          if (linkLower.includes('/cultura-otaku')) detectedCategory = 'cultura';
          else if (linkLower.includes('/japon') || linkLower.includes('japón')) detectedCategory = 'japon';
          else if (linkLower.includes('/anime')) detectedCategory = 'anime';
          else {
            const titleLower = title.toLowerCase();
            if (titleLower.includes('cultura') || titleLower.includes('otaku')) detectedCategory = 'cultura';
            else if (titleLower.includes('japón') || titleLower.includes('japon')) detectedCategory = 'japon';
          }
        }

        // ─── IMAGEN ──────────────────────────────────────────────────────
        let image = null;
        const imgEl = el.querySelector('img');
        if (imgEl) {
          image = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy-src');
          if (image && image.startsWith('//')) image = 'https:' + image;
          if (image && image.startsWith('/')) image = 'https://somoskudasai.com' + image;
        }

        // ─── DESCRIPCIÓN ─────────────────────────────────────────────────
        let description = '';
        const descSelectors = [
          '.td-excerpt',
          '.entry-summary', 
          '.excerpt',
          '.td-post-content p',
          '.td-module-excerpt',
          '.td-block-description'
        ];
        
        for (const sel of descSelectors) {
          const descEl = el.querySelector(sel);
          if (descEl) {
            const text = descEl.textContent.trim();
            if (text.length > 10) {
              description = text;
              break;
            }
          }
        }

        if (!description || description.length < 10) {
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            const metaContent = metaDesc.getAttribute('content');
            if (metaContent && metaContent.length > 20) {
              description = metaContent;
            }
          }
        }

        if (!description || description.length < 10) {
          const imgAlt = imgEl ? imgEl.getAttribute('alt') : '';
          if (imgAlt && imgAlt.length > 10) {
            description = imgAlt;
          }
        }

        if (!description || description.length < 5) {
          description = title;
        }

        // ─── FECHA (MEJORADA CON LOGGING) ──────────────────────────────
        let pubDate = new Date().toISOString();
        const parsedDate = extractDate(el);
        
        if (parsedDate) {
          pubDate = parsedDate.toISOString();
          // Log para depuración (se verá en la consola de Node)
          console.log(`[Fecha] Título: "${title.substring(0, 30)}..." -> Fecha: ${pubDate}`);
        } else {
          // Log de advertencia
          console.log(`[Fecha] ⚠️ No se pudo extraer fecha para: "${title.substring(0, 30)}..."`);
          
          // Intentar obtener la fecha del enlace o de la URL
          try {
            // Algunas URLs contienen la fecha: /2026/07/30/titulo/
            const urlMatch = link.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
            if (urlMatch) {
              const year = parseInt(urlMatch[1], 10);
              const month = parseInt(urlMatch[2], 10) - 1;
              const day = parseInt(urlMatch[3], 10);
              const d = new Date(year, month, day);
              if (!isNaN(d)) {
                pubDate = d.toISOString();
                console.log(`[Fecha] ✅ Extraída de URL: ${pubDate}`);
              }
            }
          } catch (e) {}
        }

        // ─── GUARDAR ─────────────────────────────────────────────────────
        items.push({
          id: link,
          title: title,
          description: description.substring(0, 300) + (description.length > 300 ? '...' : ''),
          pubDate: pubDate,
          link: link,
          image: image,
          category: detectedCategory,
        });
      });

      return items;
    }, category);

    console.log(`[Puppeteer] ✅ ${articles.length} noticias extraídas`);

    if (articles.length === 0) {
      console.log('[Puppeteer] No se encontraron artículos');
      return res.json([]);
    }

    res.json(articles);

  } catch (error) {
    console.error('[Puppeteer] Error:', error.message);
    res.status(500).json({ error: 'Error al obtener noticias' });
  } finally {
    if (browser) {
      await browser.close();
      console.log('[Puppeteer] Navegador cerrado');
    }
  }
});

// ============================================================================
// 🚀 INICIALIZACIÓN
// ============================================================================
app.listen(3000, () => {
  console.log("\n=======================================================");
  console.log(" 🚀 LA TABERNA DE LAS UVAS - BACKEND OPTIMIZADO (3000)");
  console.log("=======================================================\n");
  
  console.log('📰 Endpoint de noticias: /api/news/somos-kudasai');
  console.log('📡 Endpoint de catálogo: /api/anime/catalog\n');
});