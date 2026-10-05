import express from 'express';
import { scrapeListings, scrapeSearchWithDetails } from '../services/nyaaScraper.js';
import { getTorznabCapabilitiesXml, generateTorznabErrorXml, generateTorznabXml } from '../services/torznabService.js';

const router = express.Router();

export function parseBoundedLimit(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), maximum);
}

/**
 * GET /api/torznab
 * Standard Torznab / Newznab API endpoint for Prowlarr / Jackett / Sonarr / Radarr
 */
router.get('/', async (req, res) => {
  try {
    const { t = 'search', q = '', deep = 'true', limit = '20', c = '1_2' } = req.query;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Capabilities check
    if (t === 'caps') {
      res.set('Content-Type', 'application/xml');
      return res.send(getTorznabCapabilitiesXml());
    }

    // Search query handling
    const parsedLimit = parseBoundedLimit(limit, 20, 30);
    const isDeep = deep === 'true' || deep === '1';

    let items = [];
    if (isDeep) {
      items = await scrapeSearchWithDetails({ query: q, category: c, limit: parsedLimit });
    } else {
      const listings = await scrapeListings({ query: q, category: c });
      items = listings.slice(0, parsedLimit);
    }

    const xml = generateTorznabXml(items, baseUrl);
    res.set('Content-Type', 'application/xml');
    return res.send(xml);
  } catch (error) {
    console.error('Error in Torznab API route:', error.message);
    res.set('Content-Type', 'application/xml');
    return res.send(generateTorznabErrorXml());
  }
});

/**
 * GET /api/torznab/rss
 * Direct RSS feed endpoint
 */
router.get('/rss', async (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  try {
    const { q = '', c = '1_2', limit = '20' } = req.query;

    const listings = await scrapeListings({ query: q, category: c });
    const trimmed = listings.slice(0, parseBoundedLimit(limit, 20, 50));

    const xml = generateTorznabXml(trimmed, baseUrl);
    res.set('Content-Type', 'application/xml');
    return res.send(xml);
  } catch (error) {
    console.error('Error in RSS route:', error.message);
    res.set('Content-Type', 'application/xml');
    return res.send(generateTorznabErrorXml());
  }
});

export default router;
