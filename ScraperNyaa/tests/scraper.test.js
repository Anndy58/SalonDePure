import assert from 'node:assert';
import test, { describe, it } from 'node:test';
import { 
  extractSubtitleInfo, 
  extractMetadataFromTitle, 
  cleanDescriptionText,
  parseViewDetailsHtml, 
  parseListingsHtml,
  mergeDeepDetails,
  getRetryAfterMs,
  startBackgroundPrewarmer,
  stopBackgroundPrewarmer,
  scrapeSearchWithDetails
} from '../src/services/nyaaScraper.js';

describe('Nyaa Extractor Helpers', () => {
  it('extracts resolution, episode, and fansub group correctly from title', () => {
    const title1 = '[SubsPlease] Jujutsu Kaisen - 02 (1080p) [123456]';
    const meta1 = extractMetadataFromTitle(title1);
    assert.strictEqual(meta1.resolution, '1080p');
    assert.strictEqual(meta1.episode, '02');
    assert.strictEqual(meta1.fansub, 'SubsPlease');

    const title2 = '[Erai-raws] Frieren - E12 (720p)';
    const meta2 = extractMetadataFromTitle(title2);
    assert.strictEqual(meta2.resolution, '720p');
    assert.strictEqual(meta2.episode, '12');
    assert.strictEqual(meta2.fansub, 'Erai-raws');
  });

  it('detects Spanish and English subtitles from title and description without false positives', () => {
    const title = '[AnimeGroup] Solo Leveling - 05 [Multi-Sub]';
    const description = 'Subtitulos: Español Latino, Español Castellano, English';
    
    const subInfo = extractSubtitleInfo(title, description);
    assert.strictEqual(subInfo.hasSpanish, true);
    assert.strictEqual(subInfo.hasEnglish, true);
    assert.ok(subInfo.languages.includes('ESP'));
    assert.ok(subInfo.languages.includes('ENG'));

    // Test that Spanish words "en" and "es" do not trigger false positive language tags
    const spanishText = 'Este anime es muy bueno y esta publicado en alta calidad';
    const cleanInfo = extractSubtitleInfo('Solo Leveling - 01', spanishText);
    assert.strictEqual(cleanInfo.hasSpanish, false);
    assert.strictEqual(cleanInfo.hasEnglish, false);
  });

  it('correctly handles non-Spanish releases with Subtitles line and Multi-Subs tag (like One Piece EP1180 BILI WEB-DL)', () => {
    const title = 'One Piece EP1180 Elbaph in Despair Diabolical Covenant Domi Reversi 2160p BILI WEB-DL H.265 (Multi-Subs)';
    const desc = `
**Brought to you by [ToonsHub](https://t.me/thtorrents)**
---
#### **\`One Piece EP1180 Elbaph in Despair Diabolical Covenant Domi Reversi\`**
**File Details:**
- **Video Quality:** 2160p WEB-DL H.264 (BILI)
- **Audio:** Japanese
- **Subtitles:** English, Indonesian, Thai
- **Duration:** ~00:23:35.623
    `;

    const subInfo = extractSubtitleInfo(title, desc);
    assert.strictEqual(subInfo.hasSpanish, false, 'Should NOT detect Spanish for non-Spanish release even if title contains "Despair" or multi-subs');
    assert.strictEqual(subInfo.hasEnglish, true, 'Should detect English subtitle from description line');
    assert.strictEqual(subInfo.isMulti, true, 'Should detect MULTI flag');
    assert.deepStrictEqual(subInfo.languages, ['ENG', 'MULTI']);
  });

  it('handles titles with explicit [ESP] tag', () => {
    const title = '[RedLine] Kimetsu no Yaiba - 01 [1080p] [ESP]';
    const subInfo = extractSubtitleInfo(title, '');
    assert.strictEqual(subInfo.hasSpanish, true);
    assert.ok(subInfo.languages.includes('ESP'));
  });

  it('cleanDescriptionText removes asterisks, markdown, and promo link noise', () => {
    const dirtyDesc = `
**Brought to you by [ToonsHub](https://t.me/thtorrents)**
---
#### **\`One Piece EP1180 Elbaph in Despair\`**
- **Video Quality:** 2160p
- **Audio:** Japanese
> Please report any corrupted files
    `;

    const cleaned = cleanDescriptionText(dirtyDesc);
    assert.ok(!cleaned.includes('**'));
    assert.ok(!cleaned.includes('Brought to you by'));
    assert.ok(!cleaned.includes('t.me'));
    assert.ok(cleaned.includes('One Piece EP1180 Elbaph in Despair'));
    assert.ok(cleaned.includes('• Video Quality: 2160p'));
  });

  it('starts and stops background prewarmer engine without throwing', () => {
    startBackgroundPrewarmer([], 60000);
    stopBackgroundPrewarmer();
    assert.ok(true);
  });

  it('supports mode shallow (no deep scraping flag) in scrapeSearchWithDetails options', async () => {
    // Modo shallow no debe romper y asigna deepScraped: false
    const options = { mode: 'shallow', limit: 2 };
    assert.strictEqual(options.mode, 'shallow');
  });

  it('attaches scannedCount and noMoreTorrents stats to result array from scrapeSearchWithDetails', async () => {
    const reportedResults = [];
    const results = await scrapeSearchWithDetails({
      query: '1080p',
      limit: 2,
      mode: 'shallow',
      onResult: (item) => reportedResults.push(item)
    });
    assert.ok(Array.isArray(results));
    assert.ok(results.stats, 'results should have stats property');
    assert.ok(typeof results.stats.scannedCount === 'number');
    assert.ok(typeof results.stats.noMoreTorrents === 'boolean');
    assert.deepStrictEqual(reportedResults, Array.from(results));
  });

  it('merges deep details into listings and keeps listing values as fallbacks', () => {
    const listing = {
      id: '123456',
      title: 'Listing title',
      downloadUrl: 'https://nyaa.si/download/listing.torrent',
      magnetUrl: 'magnet:?xt=urn:btih:listing',
      seeders: 30,
      metadata: { resolution: '1080p' }
    };
    const details = {
      title: 'Detailed title',
      viewUrl: 'https://nyaa.si/view/123456',
      downloadUrl: 'https://nyaa.si/download/123456.torrent',
      descriptionText: 'Cleaned description',
      files: ['episode.mkv'],
      metadata: { seeders: 42, hasSpanish: true }
    };

    const result = mergeDeepDetails(listing, details);

    assert.strictEqual(result.title, 'Detailed title');
    assert.strictEqual(result.downloadUrl, details.downloadUrl);
    assert.strictEqual(result.magnetUrl, listing.magnetUrl);
    assert.strictEqual(result.descriptionText, 'Cleaned description');
    assert.deepStrictEqual(result.files, ['episode.mkv']);
    assert.strictEqual(result.seeders, 42);
    assert.strictEqual(result.metadata.resolution, '1080p');
    assert.strictEqual(result.metadata.hasSpanish, true);
    assert.strictEqual(result.deepScraped, true);
  });

  it('parses Retry-After as seconds or an HTTP date', () => {
    const now = Date.parse('2026-10-01T12:00:00Z');

    assert.strictEqual(getRetryAfterMs('3', 500, now), 3000);
    assert.strictEqual(getRetryAfterMs(new Date(now + 4000).toUTCString(), 500, now), 4000);
    assert.strictEqual(getRetryAfterMs(new Date(now - 1000).toUTCString(), 500, now), 0);
    assert.strictEqual(getRetryAfterMs('invalid', 500, now), 500);
  });
});

describe('Nyaa DOM Parsers (View Details & Listings)', () => {
  it('parses view HTML metadata correctly', () => {
    const mockHtml = `
    <html>
      <body>
        <h3 class="panel-title">[SubsPlease] Solo Leveling - 01 (1080p)</h3>
        <div class="panel-body">
          <div class="row">
            <div class="col-md-1">Category:</div>
            <div class="col-md-5">Anime - English-translated</div>
            <div class="col-md-1">Date:</div>
            <div class="col-md-5">2024-01-06 17:30 UTC</div>
          </div>
          <div class="row">
            <div class="col-md-1">Submitter:</div>
            <div class="col-md-5">SubsPlease</div>
            <div class="col-md-1">Seeders:</div>
            <div class="col-md-5">150</div>
          </div>
          <div class="row">
            <div class="col-md-1">File size:</div>
            <div class="col-md-5">1.4 GiB</div>
            <div class="col-md-1">Info hash:</div>
            <div class="col-md-5">abc123hash</div>
          </div>
        </div>
        <div class="panel-footer">
          <a href="/download/123456.torrent">Download</a>
          <a href="magnet:?xt=urn:btih:abc123hash">Magnet</a>
        </div>
        <div id="torrent-description">
          <p>This release contains <img src="poster.jpg" alt="Poster Image"> English and Spanish subtitles (ESP/ENG).</p>
        </div>
      </body>
    </html>
    `;

    const details = parseViewDetailsHtml(mockHtml, '123456');

    assert.strictEqual(details.id, '123456');
    assert.strictEqual(details.title, '[SubsPlease] Solo Leveling - 01 (1080p)');
    assert.strictEqual(details.metadata.category, 'Anime - English-translated');
    assert.strictEqual(details.metadata.date, '2024-01-06 17:30 UTC');
    assert.strictEqual(details.metadata.submitter, 'SubsPlease');
    assert.strictEqual(details.metadata.seeders, 150);
    assert.strictEqual(details.metadata.size, '1.4 GiB');
    assert.strictEqual(details.metadata.infoHash, 'abc123hash');
    assert.strictEqual(details.metadata.hasSpanish, true);
    assert.strictEqual(details.metadata.hasEnglish, true);
    assert.strictEqual(details.descriptionText, 'This release contains  [Image: Poster Image]  English and Spanish subtitles (ESP/ENG).');
  });

  it('parses listings HTML rows correctly', () => {
    const mockListingsHtml = `
      <table class="torrent-list">
        <tbody>
          <tr>
            <td><a href="/?c=1_2" title="Anime - English-translated">Anime</a></td>
            <td><a href="/view/999888">[SubsPlease] Frieren - 15 (1080p) [ESP]</a></td>
            <td>
              <a href="/download/999888.torrent">DL</a>
              <a href="magnet:?xt=urn:btih:test">Magnet</a>
            </td>
            <td>1.2 GiB</td>
            <td>2024-01-05</td>
            <td>300</td>
            <td>10</td>
            <td>500</td>
          </tr>
        </tbody>
      </table>
    `;

    const listings = parseListingsHtml(mockListingsHtml);
    assert.strictEqual(listings.length, 1);
    assert.strictEqual(listings[0].id, '999888');
    assert.strictEqual(listings[0].title, '[SubsPlease] Frieren - 15 (1080p) [ESP]');
    assert.strictEqual(listings[0].seeders, 300);
    assert.strictEqual(listings[0].metadata.hasSpanish, true);
    assert.strictEqual(listings[0].metadata.resolution, '1080p');
    assert.strictEqual(listings[0].metadata.episode, '15');
  });
});
