const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

const endpointsToAdd = `
// ============================================================================
// 📻 RADIO LOCAL Y NOTAS DE BODEGA
// ============================================================================
app.get('/api/radio/local', async (req, res) => {
  try {
    const musicDir = CARPETA_D; 
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
    if (!fs.existsSync('notas.json')) return res.json({ notas: '' });
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
    fs.writeFileSync('notas.json', JSON.stringify({ notas }));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'No se pudo guardar la nota' });
  }
});

`;

content = content.replace(
  `app.get('/api/radio', async (req, res) => {`,
  endpointsToAdd + `app.get('/api/radio', async (req, res) => {`
);

fs.writeFileSync('server.js', content);
