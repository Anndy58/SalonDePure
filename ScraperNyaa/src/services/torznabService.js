import { scrapeListings, scrapeSearchWithDetails } from './nyaaScraper.js';

/**
 * Escapes XML special characters
 */
function escapeXml(unsafe = '') {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates Torznab Capabilities XML
 */
export function getTorznabCapabilitiesXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<caps>
  <server title="La Taberna Nyaa Indexer" version="1.0" />
  <limits max="100" default="50" />
  <registration available="no" open="no" />
  <searching>
    <search available="yes" supportedParams="q" />
    <tv-search available="yes" supportedParams="q,season,ep" />
    <movie-search available="yes" supportedParams="q" />
  </searching>
  <categories>
    <category id="5000" name="TV">
      <subcat id="5070" name="TV/Anime" />
    </category>
    <category id="2000" name="Movies" />
  </categories>
</caps>`;
}

/**
 * Generates Torznab RSS XML Feed for torrent items
 */
export function generateTorznabXml(items = [], baseUrl = '') {
  const channelItems = items.map(item => {
    const pubDate = item.date ? new Date(item.date).toUTCString() : new Date().toUTCString();
    const downloadUrl = item.downloadUrl || `${baseUrl}/api/nyaa/download/${item.id}`;
    const sizeBytes = parseSizeBytes(item.size);

    const attrs = [];
    if (item.seeders !== undefined) {
      attrs.push(`<torznab:attr name="seeders" value="${item.seeders}" />`);
    }
    if (item.leechers !== undefined) {
      attrs.push(`<torznab:attr name="leechers" value="${item.leechers}" />`);
    }
    if (item.metadata?.infoHash) {
      attrs.push(`<torznab:attr name="infohash" value="${escapeXml(item.metadata.infoHash)}" />`);
    }
    if (item.magnetUrl) {
      attrs.push(`<torznab:attr name="magneturl" value="${escapeXml(item.magnetUrl)}" />`);
    }
    if (item.metadata?.resolution) {
      attrs.push(`<torznab:attr name="resolution" value="${escapeXml(item.metadata.resolution)}" />`);
    }

    // Language attributes for Prowlarr / Sonarr / Radarr filtering
    if (item.metadata?.hasSpanish) {
      attrs.push(`<torznab:attr name="language" value="Spanish" />`);
    } else if (item.metadata?.hasEnglish) {
      attrs.push(`<torznab:attr name="language" value="English" />`);
    } else if (item.metadata?.isMulti) {
      attrs.push(`<torznab:attr name="language" value="Multi" />`);
    }

    attrs.push(`<torznab:attr name="category" value="5070" />`);

    // Enhance title with language tags if not already in title string for easy Prowlarr visibility
    let enhancedTitle = item.title;
    if (item.metadata?.hasSpanish && !/\[(?:esp|espanol|español|spa|spanish|lat|latino)\]/i.test(enhancedTitle)) {
      enhancedTitle = `${enhancedTitle} [ESP]`;
    } else if (item.metadata?.isMulti && !/\[(?:multi|multi-subs|multisub)\]/i.test(enhancedTitle)) {
      enhancedTitle = `${enhancedTitle} [MULTI]`;
    }

    const descriptionContent = item.descriptionText || item.title;
    const descriptionTag = `<description>${escapeXml(descriptionContent)}</description>`;

    return `
    <item>
      <title>${escapeXml(enhancedTitle)}</title>
      <guid isPermaLink="false">${escapeXml(item.id || item.viewUrl)}</guid>
      <link>${escapeXml(item.magnetUrl || item.viewUrl)}</link>
      <comments>${escapeXml(item.viewUrl)}</comments>
      ${descriptionTag}
      <pubDate>${pubDate}</pubDate>
      <size>${sizeBytes}</size>
      <enclosure url="${escapeXml(downloadUrl)}" length="${sizeBytes}" type="application/x-bittorrent" />
      ${attrs.join('\n      ')}
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:torznab="http://torznab.com/schemas/2015/feed">
  <channel>
    <title>La Taberna Nyaa Torznab Feed</title>
    <description>Nyaa.si Anime Torznab RSS Feed for Prowlarr / Jackett / Sonarr</description>
    <link>${escapeXml(baseUrl)}</link>
    ${channelItems}
  </channel>
</rss>`;
}

/**
 * Utility to convert human readable size (e.g. 1.2 GiB, 500 MiB) to bytes
 */
function parseSizeBytes(sizeStr = '') {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/([\d.]+)\s*([KMGT]?i?B)/i);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  switch (unit) {
    case 'GB':
    case 'GIB':
      return Math.round(num * 1024 * 1024 * 1024);
    case 'MB':
    case 'MIB':
      return Math.round(num * 1024 * 1024);
    case 'KB':
    case 'KIB':
      return Math.round(num * 1024);
    case 'TB':
    case 'TIB':
      return Math.round(num * 1024 * 1024 * 1024 * 1024);
    default:
      return Math.round(num);
  }
}
