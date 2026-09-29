const fs = require('fs');

let content = fs.readFileSync('src/components/BodegaView.jsx', 'utf8');

// 1. Añadir el import de useStore
content = content.replace(
  `import LoFiRadio from './LoFiRadio.jsx';`,
  `import LoFiRadio from './LoFiRadio.jsx';\nimport { useStore } from '../store/useStore';`
);

// 2. Extraer el library desde el store y meter fetch en useEffect
content = content.replace(
  `const BodegaView = memo(({ onVolver }) => {
  const [notas, setNotas] = useState('');`,
  `const BodegaView = memo(({ onVolver }) => {
  const { library, watched } = useStore();
  const [notas, setNotas] = useState('');
  const [slotResult, setSlotResult] = useState('');`
);

content = content.replace(
  `const savedNotas = localStorage.getItem('bodeja-notas') || '';
    setNotas(savedNotas);`,
  `fetch('http://localhost:3000/api/notes')
      .then(r => r.json())
      .then(d => setNotas(d.notas))
      .catch(() => {});`
);

content = content.replace(
  `localStorage.setItem('bodeja-notas', value);`,
  `fetch('http://localhost:3000/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas: value })
    });`
);


// 3. Añadir el dashboard y el slot machine
const dashboardUI = `
          {/* Dashboard Estadísticas y Slot Machine */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-900/30 flex flex-col justify-center items-center text-amber-200">
              <h3 className="text-xs uppercase font-bold text-amber-500 mb-2">Estadísticas de la Taberna</h3>
              <div className="text-2xl font-black">{Object.keys(library).length}</div>
              <div className="text-[10px] text-amber-600/80 uppercase">Animes en Colección</div>
              
              <div className="text-2xl font-black mt-2">
                {Object.values(watched).reduce((acc, curr) => acc + curr.length, 0)}
              </div>
              <div className="text-[10px] text-amber-600/80 uppercase">Episodios Vistos</div>
            </div>
            
            <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-900/30 flex flex-col justify-center items-center">
              <h3 className="text-xs uppercase font-bold text-amber-500 mb-2">Anime Aleatorio</h3>
              <button 
                onClick={() => {
                  const vals = Object.values(library);
                  if(vals.length > 0) {
                    const randomAnime = vals[Math.floor(Math.random() * vals.length)];
                    setSlotResult(randomAnime.title);
                  } else {
                    setSlotResult("¡Tu biblioteca está vacía!");
                  }
                }}
                className="bg-amber-900 hover:bg-amber-800 text-amber-100 font-bold py-2 px-4 rounded border border-amber-700 transition-colors w-full mb-3 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
              >
                Tirar de la palanca 🎰
              </button>
              <div className="text-sm font-black text-amber-300 text-center min-h-[40px] flex items-center justify-center">
                {slotResult || "Descubre tu próxima aventura..."}
              </div>
            </div>
          </div>
`;

content = content.replace(
  `          {/* 🐍 Juego Snake */}`,
  dashboardUI + `\n          {/* 🐍 Juego Snake */}`
);

fs.writeFileSync('src/components/BodegaView.jsx', content);
