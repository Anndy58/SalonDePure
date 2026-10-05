import axios from 'axios';
import http from 'http';
import https from 'https';
import { LRUCache } from 'lru-cache';
import pLimit from 'p-limit';
import * as cheerio from 'cheerio';

const NYAA_BASE_URL = 'https://nyaa.si';

// High-performance LRU cache (500 items max, TTL 15 minutes)
const cache = new LRUCache({
  max: 500,
  ttl: 15 * 60 * 1000
});

export const MAX_CONCURRENT_REQUESTS = 3;
const limit = pLimit(MAX_CONCURRENT_REQUESTS);

// User-Agent pool for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// Proxy pool configuration from PROXIES environment variable (comma-separated list)
const proxyList = (process.env.PROXIES || '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean);

let proxyIndex = 0;

function getNextProxyConfig() {
  if (proxyList.length === 0) return null;
  const proxyUrlStr = proxyList[proxyIndex % proxyList.length];
  proxyIndex++;
  try {
    const parsed = new URL(proxyUrlStr);
    return {
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || (parsed.protocol === 'https:' ? 443 : 80),
      auth: parsed.username ? { username: parsed.username, password: parsed.password } : undefined
    };
  } catch {
    return null;
  }
}

// Persistent HTTP/HTTPS agent for connection reuse (Keep-Alive)
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 15 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 15 });

const axiosInstance = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 10000
});

/**
 * Helper to emit real-time log events
 */
function emitLog(onLog, level, message, details = null) {
  if (typeof onLog === 'function') {
    onLog({
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    });
  }
}

export function getRetryAfterMs(retryAfter, fallbackMs, now = Date.now()) {
  const value = String(retryAfter ?? '').trim();
  if (!value) return fallbackMs;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const retryAt = Date.parse(value);
  return Number.isNaN(retryAt) ? fallbackMs : Math.max(0, retryAt - now);
}

/**
 * HTTP GET wrapper with LRU caching, user-agent rotation, optional proxy rotation and Exponential Backoff for 429 handling
 */
async function fetchHtml(url, useCache = true, retries = 2, delay = 500, onLog = null) {
  if (useCache && cache.has(url)) {
    emitLog(onLog, 'CACHE', `⚡ [Caché Hit] Recuperado desde memoria LRU: ${url}`);
    return cache.get(url);
  }

  emitLog(onLog, 'SCRAPE', `🌐 [HTTP GET] Solicitando HTML a Nyaa.si: ${url}`);

  const headers = {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br'
  };

  const proxyConfig = getNextProxyConfig();
  const requestOptions = { headers };
  if (proxyConfig) {
    requestOptions.proxy = proxyConfig;
  }

  try {
    const response = await limit(() => axiosInstance.get(url, requestOptions));

    if (useCache) {
      cache.set(url, response.data);
    }

    return response.data;
  } catch (error) {
    const status = error.response ? error.response.status : null;

    if ((status === 429 || status === 503 || status === 502 || error.code === 'ECONNRESET') && retries > 0) {
      const retryAfter = error.response?.headers?.['retry-after'];
      const waitTime = getRetryAfterMs(retryAfter, delay);
      const jitter = Math.floor(Math.random() * 250);

      emitLog(onLog, 'WARN', `⚠️ [HTTP ${status || error.code}] Rate limit en Nyaa. Reintentando en ${waitTime + jitter}ms (${retries} intentos restantes)...`);

      await new Promise(resolve => setTimeout(resolve, waitTime + jitter));
      return fetchHtml(url, useCache, retries - 1, delay * 1.5, onLog);
    }

    emitLog(onLog, 'ERROR', `❌ Error solicitando ${url}: ${error.message}`);
    throw error;
  }
}

/**
 * Clean markdown, HTML tags, BBCode, links, markdown symbols (*, #, `, >, _, etc.), and promo noise from description text
 * @param {string} text
 * @returns {string} Cleaned plain text with proper line structure
 */
export function cleanDescriptionText(text = '') {
  if (!text) return '';

  return text
    // Remove Telegram, Discord, Patreon, Twitter, and promo banners/links lines
    .replace(/^.*(?:t\.me|discord\.gg|telegram|patreon|twitter\.com|x\.com|brought to you by|report them to us).*$/gim, '')
    // Strip Markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Strip raw URLs
    .replace(/https?:\/\/[^\s)]+/gi, '')
    // Remove Markdown formatting symbols (*, _, `, #, >, ~, =)
    .replace(/[*_`#>~=]/g, '')
    // Replace horizontal rule dividers (e.g. --- or ___ or ***)
    .replace(/^[-_\s*]{3,}$/gm, '')
    // Clean bullet points
    .replace(/^\s*[-+]\s+/gm, '• ')
    // Fix multiple blank lines / extra spaces per line
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

/**
 * Detect language flags/subtitles from title and description text
 * @param {string} title 
 * @param {string} descriptionText 
 * @returns {object} { languages: string[], hasSpanish: boolean, hasEnglish: boolean, isMulti: boolean, isRaw: boolean }
 */
export function extractSubtitleInfo(title = '', descriptionText = '') {
  const cleanedTitle = cleanDescriptionText(title);
  const cleanedDesc = cleanDescriptionText(descriptionText);
  const combined = `${cleanedTitle}\n${cleanedDesc}`.toLowerCase();

  const languages = [];

  // Parse explicit "Subtitles: ..." line if available in cleanedDesc or descriptionText
  const subtitlesLineMatch = cleanedDesc.match(/(?:subtitles?|subtítulos?|subs?)\s*:\s*([^\n\r]+)/i) ||
                             descriptionText.match(/(?:subtitles?|subtítulos?|subs?)\s*:\s*([^\n\r]+)/i);
  let explicitSubtitlesText = '';
  if (subtitlesLineMatch) {
    explicitSubtitlesText = subtitlesLineMatch[1].toLowerCase().replace(/[*_`#]/g, '').trim();
  }

  // Spanish detection patterns (Latin America & Castilian)
  const spanishRegex = /\b(esp|espanol|español|castellano|latino|spa|spanish|sub\s*esp|sub-esp|subesp)\b/i;
  // Bracket tag check in title like [ESP], [ES], [Español], [Spanish], [LAT], [LATINO]
  const titleSpanishBracket = /\[(esp|espanol|español|es|spa|spanish|lat|latino|castellano)\]/i.test(title);

  // Check if Spanish is in title, explicit subtitles line, or general text
  const hasExplicitSpanishInSubLine = explicitSubtitlesText ? spanishRegex.test(explicitSubtitlesText) : false;
  const hasSpanishMatch = titleSpanishBracket || spanishRegex.test(cleanedTitle) || hasExplicitSpanishInSubLine || (!explicitSubtitlesText && spanishRegex.test(cleanedDesc));

  if (hasSpanishMatch) {
    languages.push('ESP');
  }

  // English detection patterns
  const englishRegex = /\b(eng|english|sub\s*eng|sub-eng|subeng)\b/i;
  const titleEnglishBracket = /\[(eng|english|en)\]/i.test(title);
  const hasExplicitEnglishInSubLine = explicitSubtitlesText ? englishRegex.test(explicitSubtitlesText) : false;
  const hasEnglishMatch = titleEnglishBracket || englishRegex.test(cleanedTitle) || hasExplicitEnglishInSubLine || (!explicitSubtitlesText && englishRegex.test(cleanedDesc));

  if (hasEnglishMatch) {
    languages.push('ENG');
  }

  // Multi detection patterns
  const multiRegex = /\b(multi|multi-sub|multisub|multi-subs|dual\s*audio|multi-audio|multiaudio)\b/i;
  if (multiRegex.test(cleanedTitle) || multiRegex.test(cleanedDesc)) {
    languages.push('MULTI');
  }

  // Raw detection patterns
  const rawRegex = /\b(raw|raws|japanese)\b/i;
  const isRaw = rawRegex.test(combined) && languages.length === 0;

  const isMulti = languages.includes('MULTI') || (languages.includes('ESP') && languages.includes('ENG'));

  return {
    languages: Array.from(new Set(languages)),
    hasSpanish: languages.includes('ESP'),
    hasEnglish: languages.includes('ENG'),
    isMulti,
    isRaw
  };
}

/**
 * Extract episode number, resolution and fansub group from torrent title
 * @param {string} title 
 * @returns {object} { resolution: string|null, episode: string|null, fansub: string|null }
 */
export function extractMetadataFromTitle(title = '') {
  // Resolution extraction
  const resMatch = title.match(/\b(1080p|720p|2160p|4k|480p|360p)\b/i);
  const resolution = resMatch ? resMatch[1].toLowerCase() : null;

  // Episode extraction patterns
  // E.g., - 01, E01, EP01, [01], Vol.1, #01
  const epMatch = 
    title.match(/(?:[_\s-]|\b)(?:e|ep|episode|cap|capitulo)\.?\s*(\d{1,4}(?:\.\d)?)\b/i) ||
    title.match(/\s+-\s+(\d{1,4}(?:\.\d)?)\b/) ||
    title.match(/\[(\d{1,4}(?:\.\d)?)\]/);

  const episode = epMatch ? epMatch[1] : null;

  // Fansub extraction: first bracket content if present, e.g. [Erai-raws], [PuyaSubs], [SubsPlease]
  const fansubMatch = title.match(/^\[([^\]]+)\]/);
  let fansub = fansubMatch ? fansubMatch[1].trim() : null;
  // Ignore if fansub bracket is just a resolution or language tag
  if (fansub && /^(1080p|720p|480p|esp|eng|multi|raw)$/i.test(fansub)) {
    fansub = null;
  }

  return {
    resolution,
    episode,
    fansub
  };
}

/**
 * Helper function to parse HTML listings string
 */
export function parseListingsHtml(html) {
  const $ = cheerio.load(html);
  const results = [];

  $('table.torrent-list tbody tr').each((_, element) => {
    const $row = $(element);

    // Category
    const categoryLink = $row.find('td:nth-child(1) a').attr('href') || '';
    const categoryName = $row.find('td:nth-child(1) a').attr('title') || '';

    // Title & ID
    const titleAnchor = $row.find('td:nth-child(2) a:not(.comments)');
    const title = titleAnchor.text().trim();
    const viewUrl = titleAnchor.attr('href') || '';
    const idMatch = viewUrl.match(/\/view\/(\d+)/);
    const id = idMatch ? idMatch[1] : null;

    // Download & Magnet links
    const downloadUrl = $row.find('td:nth-child(3) a[href*="/download/"]').attr('href') || '';
    const magnetUrl = $row.find('td:nth-child(3) a[href^="magnet:"]').attr('href') || '';

    // Size, Timestamp, Seeders, Leechers, Completed
    const size = $row.find('td:nth-child(4)').text().trim();
    const date = $row.find('td:nth-child(5)').text().trim();
    const seeders = parseInt($row.find('td:nth-child(6)').text().trim(), 10) || 0;
    const leechers = parseInt($row.find('td:nth-child(7)').text().trim(), 10) || 0;
    const completed = parseInt($row.find('td:nth-child(8)').text().trim(), 10) || 0;

    const { resolution, episode, fansub } = extractMetadataFromTitle(title);
    const subtitleInfo = extractSubtitleInfo(title, '');

    if (id) {
      results.push({
        id,
        title,
        viewUrl: `${NYAA_BASE_URL}${viewUrl}`,
        downloadUrl: downloadUrl ? `${NYAA_BASE_URL}${downloadUrl}` : null,
        magnetUrl,
        categoryName,
        categoryLink,
        size,
        date,
        seeders,
        leechers,
        completed,
        metadata: {
          resolution,
          episode,
          fansub,
          ...subtitleInfo
        }
      });
    }
  });

  return results;
}

/**
 * Scrapes listing page from Nyaa
 * @param {object} options { query, category, page, filter }
 * @returns {Promise<Array>} List of torrent summary objects
 */
export async function scrapeListings({ query = '', category = '1_2', page = 1, filter = 0 } = {}) {
  const params = new URLSearchParams({
    f: filter,
    c: category,
    q: query,
    p: page
  });

  const url = `${NYAA_BASE_URL}/?${params.toString()}`;
  const html = await fetchHtml(url);
  return parseListingsHtml(html);
}

/**
 * Helper function to parse View Details HTML string
 */
export function parseViewDetailsHtml(html, id = '0') {
  const $ = cheerio.load(html);

  const title = $('.panel-title').first().text().trim();

  // Parse Metadata Panel accurately by iterating over pairs of columns
  const metadata = {};
  $('.panel-body .row').each((_, row) => {
    const $row = $(row);
    const children = $row.children();
    
    // Nyaa rows alternate label (.col-md-1 or .col-md-2) and value (.col-md-5 or .col-md-10)
    for (let i = 0; i < children.length; i += 2) {
      const labelEl = children.eq(i);
      const valueEl = children.eq(i + 1);
      if (labelEl.length && valueEl.length) {
        const label = labelEl.text().trim().replace(':', '').toLowerCase();
        const value = valueEl.text().trim();
        if (label) {
          metadata[label] = value;
        }
      }
    }
  });

  // Download & Magnet links
  const downloadUrl = $('.panel-footer a[href*="/download/"]').attr('href');
  const magnetUrl = $('.panel-footer a[href^="magnet:"]').attr('href');

  // Description parsing: extract text only (ignore images/formatting tags)
  const $description = $('#torrent-description');
  
  // Clone element to manipulate without affecting original tree
  const $descClone = $description.clone();
  
  // Remove img tags or convert alt text if necessary
  $descClone.find('img').replaceWith((_, el) => {
    const alt = $(el).attr('alt') || '';
    return alt ? ` [Image: ${alt}] ` : '';
  });

  // Plain text extraction
  const descriptionText = $descClone.text().replace(/\n\s*\n/g, '\n').trim();

  // Clean description text
  const cleanedDescriptionText = cleanDescriptionText(descriptionText);

  // Extract subtitle info from combined title + description text
  const subtitleInfo = extractSubtitleInfo(title, cleanedDescriptionText);
  const { resolution, episode, fansub } = extractMetadataFromTitle(title);

  // File list parsing
  const files = [];
  $('.torrent-file-list li').each((_, el) => {
    const text = $(el).text().trim();
    if (text) files.push(text);
  });

  return {
    id: String(id),
    title,
    viewUrl: `${NYAA_BASE_URL}/view/${id}`,
    downloadUrl: downloadUrl ? `${NYAA_BASE_URL}${downloadUrl}` : null,
    magnetUrl,
    metadata: {
      category: metadata['category'] || null,
      date: metadata['date'] || null,
      submitter: metadata['submitter'] || null,
      seeders: parseInt(metadata['seeders'] || '0', 10),
      leechers: parseInt(metadata['leechers'] || '0', 10),
      completed: parseInt(metadata['completed'] || '0', 10),
      infoHash: metadata['info hash'] || null,
      size: metadata['file size'] || null,
      resolution,
      episode,
      fansub,
      ...subtitleInfo
    },
    descriptionText: cleanedDescriptionText,
    files
  };
}

/**
 * Scrapes detailed information from a single Nyaa torrent view page
 * @param {string|number} id Torrent ID
 * @param {boolean} useCache Whether to use LRU cache
 * @returns {Promise<object>} Torrent detail object
 */
export async function scrapeViewDetails(id, useCache = true) {
  const url = `${NYAA_BASE_URL}/view/${id}`;
  const html = await fetchHtml(url, useCache);
  return parseViewDetailsHtml(html, id);
}

export function mergeDeepDetails(item, details) {
  const detailMetadata = details.metadata || {};

  return {
    ...item,
    title: details.title || item.title,
    viewUrl: details.viewUrl || item.viewUrl,
    downloadUrl: details.downloadUrl || item.downloadUrl,
    magnetUrl: details.magnetUrl || item.magnetUrl,
    date: detailMetadata.date || item.date,
    size: detailMetadata.size || item.size,
    seeders: detailMetadata.seeders ?? item.seeders,
    leechers: detailMetadata.leechers ?? item.leechers,
    completed: detailMetadata.completed ?? item.completed,
    descriptionText: details.descriptionText || '',
    files: details.files || [],
    deepScraped: true,
    metadata: {
      ...item.metadata,
      ...detailMetadata
    }
  };
}

/**
 * Searches listings across multiple pages if required and deeply scrapes view details for top items concurrently.
 * Supports flexible modes:
 * - 'full': Scrapes listings and then performs deep scraping on each item.
 * - 'shallow': Scrapes listings ONLY without deep scraping (ultra fast ~50ms).
 * - 'details-only': Performs direct deep scraping on provided IDs/URLs without list searching.
 *
 * @param {object} options { query, category, limit, useCache, mode, spanishOnly, minSeeders, ids }
 * @returns {Promise<Array>} Array of torrent objects
 */
export async function scrapeSearchWithDetails(options = {}) {
  const {
    limit: itemLimit = 5,
    useCache = true,
    mode = 'full',
    spanishOnly = false,
    minSeeders = 0,
    ids = [],
    onLog = null,
    onResult = null,
    ...searchOptions
  } = options;

  emitLog(onLog, 'INFO', `🚀 Iniciando proceso de extracción en modo [${mode.toUpperCase()}] (Meta: ${itemLimit} torrents, Categoría: ${searchOptions.category || '1_0'}, Caché: ${useCache ? 'SI' : 'NO'}, Solo ESP: ${spanishOnly ? 'SI' : 'NO'})`);

  const customLimit = pLimit(MAX_CONCURRENT_REQUESTS);
  const reportResult = (item) => {
    if (typeof onResult !== 'function') return;
    try {
      onResult(item);
    } catch (error) {
      emitLog(onLog, 'WARN', `No se pudo notificar el resultado progresivo: ${error.message}`);
    }
  };

  // MODO: 'details-only'
  if (mode === 'details-only' || (ids && ids.length > 0)) {
    const torrentIds = ids.map((id) => String(id).replace(/[^0-9]/g, '')).filter(Boolean);
    emitLog(onLog, 'INFO', `📌 Procesando ${torrentIds.length} IDs específicos de torrents...`);

    const detailsPromises = torrentIds.map((id) =>
      customLimit(async () => {
        try {
          emitLog(onLog, 'SCRAPE', `🔍 Extrayendo detalles directos para ID #${id}`);
          const details = await scrapeViewDetails(id, useCache);
          return { id, viewUrl: `${NYAA_BASE_URL}/view/${id}`, ...details, deepScraped: true };
        } catch (err) {
          emitLog(onLog, 'WARN', `⚠️ Error extrayendo ID #${id}: ${err.message}`);
          return { id, viewUrl: `${NYAA_BASE_URL}/view/${id}`, title: `Torrent #${id}`, error: err.message, deepScraped: false };
        }
      })
    );

    let items = await Promise.all(detailsPromises);

    if (minSeeders > 0) {
      items = items.filter((item) => (item.metadata?.seeders || 0) >= minSeeders);
    }
    if (spanishOnly) {
      items = items.filter((item) => item.metadata?.hasSpanish);
    }

    const res = items.slice(0, itemLimit);
    res.forEach(reportResult);
    res.stats = {
      scannedCount: torrentIds.length,
      retried429Count: 0,
      noMoreTorrents: false,
      completedGoal: res.length >= itemLimit
    };
    emitLog(onLog, 'SUCCESS', `✅ Proceso completado: Obtenidos ${res.length} de ${torrentIds.length} IDs solicitados`);
    return res;
  }

  let accumulatedResults = [];
  let totalScanned = 0;
  let retried429Count = 0;
  let page = 1;
  let noMorePagesFound = false;

  const maxPagesToScan = spanishOnly ? 25 : 10;

  while (accumulatedResults.length < itemLimit && page <= maxPagesToScan) {
    emitLog(onLog, 'INFO', `📄 [Página ${page}] Solicitando catálogo de listado en Nyaa.si...`);
    let pageListings = [];
    try {
      const params = new URLSearchParams({
        f: searchOptions.filter || 0,
        c: searchOptions.category || '1_0',
        q: searchOptions.query || '',
        p: page
      });
      const url = `${NYAA_BASE_URL}/?${params.toString()}`;
      const html = await fetchHtml(url, useCache, 2, 500, onLog);
      pageListings = parseListingsHtml(html);
    } catch (err) {
      emitLog(onLog, 'ERROR', `❌ Error obteniendo listado de página ${page}: ${err.message}`);
      break;
    }

    if (!pageListings || pageListings.length === 0) {
      emitLog(onLog, 'WARN', `⚠️ La página ${page} no contiene torrents. Fin del catálogo Nyaa.`);
      noMorePagesFound = true;
      break;
    }

    totalScanned += pageListings.length;
    emitLog(onLog, 'INFO', `🔎 Página ${page} obtenida: ${pageListings.length} torrents escaneados en esta página (Total acumulado escaneado: ${totalScanned})`);

    // Filtrar por minSeeders
    let candidateListings = pageListings;
    if (minSeeders > 0) {
      candidateListings = candidateListings.filter((item) => (item.seeders || 0) >= minSeeders);
      emitLog(onLog, 'INFO', `🌱 Filtrados por minSeeders (>=${minSeeders}): Quedan ${candidateListings.length} candidatos`);
    }

    const neededCount = itemLimit - accumulatedResults.length;

    if (mode === 'shallow') {
      emitLog(onLog, 'INFO', `⚡ [Modo Shallow] Omitiendo deep scraping de fichas para máxima velocidad.`);
      let shallowBatch = candidateListings.map((item) => ({
        ...item,
        deepScraped: false
      }));

      if (spanishOnly) {
        shallowBatch = shallowBatch.filter((item) => item.metadata?.hasSpanish);
      }

      const resultsToAdd = shallowBatch.slice(0, neededCount);
      accumulatedResults = accumulatedResults.concat(resultsToAdd);
      resultsToAdd.forEach(reportResult);
    } else {
      // MODO FULL
      const deferredRetryQueue = [];

      const processItem = async (item, retryAttempt = 0) => {
        try {
          const url = `${NYAA_BASE_URL}/view/${item.id}`;
          const html = await fetchHtml(url, useCache, 2, 500, onLog);
          const details = parseViewDetailsHtml(html, item.id);
          emitLog(onLog, 'SCRAPE', `📄 [Deep Scrape OK] #${item.id} "${item.title.substring(0, 45)}..." -> Descripción, archivos y metadata actualizados.`);
          const result = mergeDeepDetails(item, details);
          if (!spanishOnly || result.metadata?.hasSpanish) reportResult(result);
          return result;
        } catch (err) {
          const is429 = err.response?.status === 429 || err.message?.includes('429');
          if (is429 && retryAttempt < 1) {
            retried429Count++;
            emitLog(onLog, 'WARN', `⏳ [HTTP 429] Rate limit en ID #${item.id}. Añadiendo a la cola de reintento postergado...`);
            deferredRetryQueue.push({ item, retryAttempt: retryAttempt + 1 });
            return null;
          }
          emitLog(onLog, 'WARN', `⚠️ Fallo en deep scrape de ID #${item.id}: ${err.message}. Se usará datos básicos del listado.`);
          const result = { ...item, deepScraped: false };
          if (!spanishOnly || result.metadata?.hasSpanish) reportResult(result);
          return result;
        }
      };

      let itemsToProcess = candidateListings;
      if (!spanishOnly) {
        itemsToProcess = candidateListings.slice(0, neededCount);
        emitLog(onLog, 'INFO', `✂️ Recorte optimizado: Procesando solo ${itemsToProcess.length} fichas necesarias de las ${candidateListings.length} en la página.`);
      }

      let pageResults = [];
      const chunkSize = MAX_CONCURRENT_REQUESTS;

      // Pipeline paralelo por lotes ajustado para máximo paralelismo
      for (let i = 0; i < itemsToProcess.length; i += chunkSize) {
        if (accumulatedResults.length + pageResults.length >= itemLimit) break;

        const chunk = itemsToProcess.slice(i, i + chunkSize);
        emitLog(onLog, 'INFO', `⚡ [Pipeline] Lote [${i + 1}-${i + chunk.length} de ${itemsToProcess.length}] con hasta ${MAX_CONCURRENT_REQUESTS} solicitudes simultáneas.`);

        const chunkPromises = chunk.map((item) => customLimit(() => processItem(item, 0)));
        let chunkResults = (await Promise.all(chunkPromises)).filter(Boolean);

        if (spanishOnly) {
          const matchedEsp = chunkResults.filter((item) => item.metadata?.hasSpanish);
          emitLog(onLog, 'INFO', `📌 De ${chunkResults.length} fichas analizadas, ${matchedEsp.length} contienen subtítulos en Español.`);
          chunkResults = matchedEsp;
        }

        pageResults = pageResults.concat(chunkResults);
      }

      // Reintentar si hubo 429
      if (deferredRetryQueue.length > 0 && accumulatedResults.length + pageResults.length < itemLimit) {
        emitLog(onLog, 'WARN', `🔁 Procesando reintentos postergados para ${deferredRetryQueue.length} torrents que recibieron 429...`);
        await new Promise((r) => setTimeout(r, 600));
        let retryPromises = deferredRetryQueue.map(({ item, retryAttempt }) =>
          customLimit(() => processItem(item, retryAttempt))
        );
        let retriedResults = (await Promise.all(retryPromises)).filter(Boolean);
        if (spanishOnly) {
          retriedResults = retriedResults.filter((item) => item.metadata?.hasSpanish);
        }
        pageResults = pageResults.concat(retriedResults);
      }

      const itemsToAdd = pageResults.slice(0, itemLimit - accumulatedResults.length);
      accumulatedResults = accumulatedResults.concat(itemsToAdd);
      emitLog(onLog, 'INFO', `📊 Acumulados ${accumulatedResults.length} de ${itemLimit} torrents requeridos.`);
    }

    page++;
  }

  const finalResults = accumulatedResults.slice(0, itemLimit);

  finalResults.stats = {
    scannedCount: totalScanned,
    retried429Count,
    noMoreTorrents: noMorePagesFound,
    completedGoal: accumulatedResults.length >= itemLimit
  };

  emitLog(onLog, 'SUCCESS', `🎉 Proceso finalizado: ${finalResults.length} torrents válidos obtenidos (${totalScanned} escaneados en Nyaa, ${retried429Count} reintentos 429 recuperados).`);

  return finalResults;
}

let prewarmerInterval = null;

/**
 * Starts a background pre-warming engine to periodically fetch and update listings/details
 * in cache. Keeps cache warm and fresh so API requests respond instantly (< 2ms).
 * @param {Array<string>} queries Initial queries to keep pre-warmed
 * @param {number} intervalMs Refresh interval in milliseconds (default: 5 minutes)
 */
export function startBackgroundPrewarmer(queries = ['', '1080p', 'ESP'], intervalMs = 5 * 60 * 1000) {
  if (prewarmerInterval) {
    clearInterval(prewarmerInterval);
  }

  const prewarmTask = async () => {
    for (const q of queries) {
      try {
        await scrapeSearchWithDetails({ query: q, limit: 5 });
      } catch (err) {
        // Silently capture background pre-warming errors
      }
      // Small pause between pre-warming queries to avoid burst
      await new Promise(r => setTimeout(r, 1000));
    }
  };

  // Run initial pre-warm task asynchronously
  prewarmTask();

  // Schedule periodic pre-warm
  prewarmerInterval = setInterval(prewarmTask, intervalMs);
}

export function stopBackgroundPrewarmer() {
  if (prewarmerInterval) {
    clearInterval(prewarmerInterval);
    prewarmerInterval = null;
  }
}

export function clearCache() {
  cache.clear();
}
