import express from 'express';
import nyaaRoutes from './routes/nyaaRoutes.js';
import torznabRoutes from './routes/torznabRoutes.js';
import { startBackgroundPrewarmer } from './services/nyaaScraper.js';

const app = express();
const PORT = process.env.PORT || 6767;

app.use(express.json());

// Enable CORS if requested
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static frontend files
app.use(express.static('public'));

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'la-taberna-nyaa-extractor', timestamp: new Date().toISOString() });
});

// Mount Nyaa Extractor routes
app.use('/api/nyaa', nyaaRoutes);

// Mount Torznab / RSS Indexer routes (for Prowlarr / Jackett / Sonarr / Radarr)
app.use('/api/torznab', torznabRoutes);
// Alias for Prowlarr default API Path (/api)
app.use('/api', torznabRoutes);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`La Taberna Nyaa Extractor API running on http://localhost:${PORT}`);
    startBackgroundPrewarmer();
  });
}

export default app;
