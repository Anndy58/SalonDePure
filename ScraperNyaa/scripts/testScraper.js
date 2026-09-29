import { scrapeListings, scrapeViewDetails, scrapeSearchWithDetails, extractSubtitleInfo, extractMetadataFromTitle } from '../src/services/nyaaScraper.js';

async function main() {
  const query = process.argv[2] || 'SubsPlease';
  console.log(`====================================================`);
  console.log(`Testing Nyaa Scraper with query: "${query}"`);
  console.log(`====================================================\n`);

  try {
    console.log('--- 1. Testing Title & Subtitle Parsing Helpers ---');
    const sampleTitle = '[SubsPlease] One Piece - 1090 (1080p) [ESP-ENG Multi-Sub]';
    const sampleDesc = 'Subtitles included: Spanish (ESP), English (ENG). Video codec H264.';
    console.log('Sample Title:', sampleTitle);
    console.log('Extracted Metadata:', extractMetadataFromTitle(sampleTitle));
    console.log('Extracted Subtitles:', extractSubtitleInfo(sampleTitle, sampleDesc));
    console.log('\n--- 2. Testing Listing Scraping ---');
    const listings = await scrapeListings({ query, limit: 3 });
    console.log(`Found ${listings.length} items in listings.`);
    if (listings.length > 0) {
      console.log('First item summary:', JSON.stringify(listings[0], null, 2));

      console.log('\n--- 3. Testing Deep View Scraping ---');
      const firstId = listings[0].id;
      console.log(`Fetching deep view details for ID: ${firstId}...`);
      const details = await scrapeViewDetails(firstId);
      console.log('Title:', details.title);
      console.log('Download Link:', details.downloadUrl);
      console.log('Magnet Link:', details.magnetUrl ? details.magnetUrl.substring(0, 60) + '...' : 'N/A');
      console.log('Subtitles Detected:', details.metadata.languages);
      console.log('Spanish Subtitles:', details.metadata.hasSpanish ? 'Yes' : 'No');
      console.log('English Subtitles:', details.metadata.hasEnglish ? 'Yes' : 'No');
      console.log('Description Text Preview (first 200 chars):');
      console.log('----------------------------------------------------');
      console.log(details.descriptionText.substring(0, 200) + '...');
      console.log('----------------------------------------------------');
    }

    console.log('\n✅ Scraper test complete!');
  } catch (err) {
    console.error('❌ Error during scraper test:', err);
  }
}

main();
