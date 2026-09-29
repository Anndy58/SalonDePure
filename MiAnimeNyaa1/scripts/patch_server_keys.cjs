const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

// Replace hardcoded API keys with empty strings or environment variables
content = content.replace(
  /const SONARR_API_KEY = '.*?';/,
  "const SONARR_API_KEY = process.env.SONARR_API_KEY || '';"
);
content = content.replace(
  /const PROWLARR_API_KEY = '.*?';/,
  "const PROWLARR_API_KEY = process.env.PROWLARR_API_KEY || '';"
);
content = content.replace(
  /const SHOKO_API_KEY = '.*?';/,
  "const SHOKO_API_KEY = process.env.SHOKO_API_KEY || '';"
);

fs.writeFileSync('server.js', content);
