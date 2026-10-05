import express from 'express';
import { 
  scrapeListings, 
  scrapeViewDetails, 
  scrapeSearchWithDetails,
  MAX_CONCURRENT_REQUESTS
} from '../services/nyaaScraper.js';

const router = express.Router();

/**
 * GET /api/nyaa/search
 * Query parameters:
 *  - q: search query string
 *  - deep: boolean ("true" to fetch description text for results)
 *  - limit: number of results (default: 10, max: 20)
 *  - c: category (default: 1_2 Anime - English-translated)
 */
router.get('/search', async (req, res) => {
  try {
    const {
      q = '',
      deep = 'false',
      limit = '10',
      c = '1_2',
      mode,
      spanishOnly = 'false',
      minSeeders = '0',
      useCache = 'true',
      ids = ''
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 200);
    const isCacheEnabled = useCache !== 'false' && useCache !== '0';
    const parsedSpanishOnly = spanishOnly === 'true' || spanishOnly === '1';
    const parsedMinSeeders = parseInt(minSeeders, 10) || 0;
    const parsedIds = ids ? ids.split(',').map((id) => id.trim()) : [];

    // Determinar modo
    let effectiveMode = mode;
    if (!effectiveMode) {
      effectiveMode = (deep === 'true' || deep === '1') ? 'full' : 'shallow';
    }

    const results = await scrapeSearchWithDetails({
      query: q,
      category: c,
      limit: parsedLimit,
      useCache: isCacheEnabled,
      mode: effectiveMode,
      spanishOnly: parsedSpanishOnly,
      minSeeders: parsedMinSeeders,
      ids: parsedIds
    });

    return res.json({
      success: true,
      count: results.length,
      mode: effectiveMode,
      stats: results.stats || {
        scannedCount: results.length,
        retried429Count: 0,
        noMoreTorrents: false,
        completedGoal: true
      },
      data: results
    });
  } catch (error) {
    console.error('Error in /api/nyaa/search:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/nyaa/view/:id
 * Fetches full view page details for a specific torrent ID
 */
router.get('/view/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, error: 'Invalid torrent ID' });
    }

    const details = await scrapeViewDetails(id);
    return res.json({ success: true, data: details });
  } catch (error) {
    console.error(`Error in /api/nyaa/view/${req.params.id}:`, error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/nyaa/batch-export
 * Accepts array of torrent items and returns concatenated magnet links or formatted plain text list
 */
router.post('/batch-export', (req, res) => {
  try {
    const { items = [], format = 'magnets' } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items provided' });
    }

    if (format === 'magnets') {
      const magnets = items.map(i => i.magnetUrl).filter(Boolean);
      return res.json({ success: true, count: magnets.length, data: magnets.join('\n') });
    }

    if (format === 'titles-magnets') {
      const formatted = items.map(i => `${i.title}\n${i.magnetUrl || 'N/A'}\n`).join('\n---\n\n');
      return res.json({ success: true, count: items.length, data: formatted });
    }

    return res.json({ success: true, data: items });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/nyaa/stream-logs
 * Server-Sent Events (SSE) route to stream real-time internal scraper logs to frontend
 */
router.get('/stream-logs', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event) => {
    if (!res.writableEnded && !res.destroyed) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  };

  const sendLog = (logObj) => sendEvent(logObj);

  const sendResult = (item) => {
    sendEvent({ type: 'RESULT', data: item });
  };

  const {
    q = '1080p',
    limit = '10',
    c = '1_0',
    useCache = 'true',
    mode = 'full',
    spanishOnly = 'false',
    minSeeders = '0'
  } = req.query;

  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 200);
  const isCacheEnabled = useCache !== 'false' && useCache !== '0';
  const parsedSpanishOnly = spanishOnly === 'true' || spanishOnly === '1';
  const parsedMinSeeders = parseInt(minSeeders, 10) || 0;

  try {
    const results = await scrapeSearchWithDetails({
      query: q,
      category: c,
      limit: parsedLimit,
      useCache: isCacheEnabled,
      mode,
      spanishOnly: parsedSpanishOnly,
      minSeeders: parsedMinSeeders,
      onLog: sendLog,
      onResult: sendResult
    });

    sendEvent({ type: 'COMPLETE', data: results, stats: results.stats });
    res.end();
  } catch (error) {
    sendEvent({ type: 'ERROR', error: error.message });
    if (!res.writableEnded) res.end();
  }
});

/**
 * GET /api/nyaa/benchmark
 * Interactive benchmark route for live performance dashboard
 * Query parameters:
 *  - q: search query string (default: "1080p")
 *  - limit: batch size for deep scraping (default: 10, max: 50)
 */
router.get('/benchmark', async (req, res) => {
  try {
    const {
      q = '1080p',
      limit = '10',
      c = '1_2',
      useCache = 'true',
      mode = 'full',
      spanishOnly = 'false',
      minSeeders = '0'
    } = req.query;

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 200);
    const isCacheEnabled = useCache !== 'false' && useCache !== '0';
    const parsedSpanishOnly = spanishOnly === 'true' || spanishOnly === '1';
    const parsedMinSeeders = parseInt(minSeeders, 10) || 0;

    const startTime = Date.now();
    const results = await scrapeSearchWithDetails({
      query: q,
      category: c,
      limit: parsedLimit,
      useCache: isCacheEnabled,
      mode,
      spanishOnly: parsedSpanishOnly,
      minSeeders: parsedMinSeeders
    });
    const durationMs = Date.now() - startTime;

    const spanishCount = results.filter(r => r.metadata?.hasSpanish).length;
    const englishCount = results.filter(r => r.metadata?.hasEnglish).length;
    const multiCount = results.filter(r => r.metadata?.isMulti).length;
    const torrentsPerSec = parseFloat((results.length / (durationMs / 1000 || 1)).toFixed(2));
    const avgMsPerTorrent = parseFloat((durationMs / (results.length || 1)).toFixed(1));

    const statsObj = results.stats || {};

    return res.json({
      success: true,
      benchmark: {
        query: q,
        mode,
        limit: parsedLimit,
        totalItemsProcessed: results.length,
        durationMs,
        torrentsPerSec,
        avgMsPerTorrent,
        debug: {
          useCache: isCacheEnabled,
          concurrency: MAX_CONCURRENT_REQUESTS,
          spanishOnly: parsedSpanishOnly,
          minSeeders: parsedMinSeeders
        },
        stats: {
          spanishCount,
          englishCount,
          multiCount
        }
      },
      data: results
    });
  } catch (error) {
    console.error('Error in /api/nyaa/benchmark:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
