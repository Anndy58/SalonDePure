import assert from 'node:assert';
import test, { describe, it } from 'node:test';
import { getTorznabCapabilitiesXml, generateTorznabXml } from '../src/services/torznabService.js';
import app from '../src/app.js';

describe('Torznab Service & Feed Generator', () => {
  it('returns valid Torznab capabilities XML containing category 5070', () => {
    const xml = getTorznabCapabilitiesXml();
    assert.ok(xml.includes('<caps>'));
    assert.ok(xml.includes('id="5070" name="TV/Anime"'));
  });

  it('generates RSS/Torznab XML for torrent items', () => {
    const mockItems = [
      {
        id: '12345',
        title: '[SubsPlease] Solo Leveling - 01 (1080p)',
        viewUrl: 'https://nyaa.si/view/12345',
        downloadUrl: 'https://nyaa.si/download/12345.torrent',
        magnetUrl: 'magnet:?xt=urn:btih:hash123',
        size: '1.4 GiB',
        date: '2024-01-01',
        seeders: 100,
        leechers: 5,
        metadata: {
          infoHash: 'hash123',
          resolution: '1080p'
        }
      }
    ];

    const xml = generateTorznabXml(mockItems, 'http://localhost:3000');
    assert.ok(xml.includes('<rss version="2.0"'));
    assert.ok(xml.includes('<title>[SubsPlease] Solo Leveling - 01 (1080p)</title>'));
    assert.ok(xml.includes('name="seeders" value="100"'));
    assert.ok(xml.includes('name="infohash" value="hash123"'));
    assert.ok(xml.includes('url="https://nyaa.si/download/12345.torrent"'));
  });
});

describe('Torznab API Endpoints', () => {
  it('GET /api/torznab?t=caps returns XML caps', async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/torznab?t=caps`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('xml'));
      const xml = await res.text();
      assert.ok(xml.includes('<caps>'));
    } finally {
      server.close();
    }
  });

  it('GET /api/torznab/rss returns RSS feed XML', async () => {
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;

    try {
      const res = await fetch(`http://localhost:${port}/api/torznab/rss?limit=2`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('xml'));
      const xml = await res.text();
      assert.ok(xml.includes('<rss version="2.0"'));
    } finally {
      server.close();
    }
  });
});
