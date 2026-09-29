const fs = require('fs');
let content = fs.readFileSync('src/components/LoFiRadio.jsx', 'utf8');

const newRadioConfig = `export const RADIO_CONFIG = {
  asia: [ { id: "anime", label: "Anime", freq: "96.6 MHz" }, { id: "kpop", label: "K-Pop", freq: "88.1 MHz" }, { id: "vocaloid", label: "Vocaloid", freq: "102.5 MHz" }, { id: "citypop", label: "City Pop", freq: "93.4 MHz" }, { id: "jpop", label: "J-Pop", freq: "99.1 MHz" } ],
  gaming: [ { id: "vgm", label: "Rainwave VGM", freq: "91.3 MHz" }, { id: "sega", label: "Retro SEGA", freq: "94.7 MHz" }, { id: "chiptune", label: "Chiptunes", freq: "89.9 MHz" }, { id: "nintendo", label: "Nintendo Mix", freq: "105.1 MHz" }, { id: "rpg", label: "RPG Tavern", freq: "107.5 MHz" } ],
  relax: [ { id: "jazz", label: "Café Jazz", freq: "93.3 MHz" }, { id: "clasica", label: "Clásica", freq: "104.1 MHz" }, { id: "drone", label: "Chillsynth", freq: "90.2 MHz" }, { id: "lofi", label: "Lofi Chill", freq: "105.7 MHz" }, { id: "ambient", label: "Ambient", freq: "88.5 MHz" } ],
  beats: [ { id: "rock_es", label: "Rock Leyendas", freq: "98.9 MHz" }, { id: "house", label: "Groove House", freq: "90.9 MHz" }, { id: "dubstep", label: "Drum & Bass", freq: "107.1 MHz" }, { id: "synth", label: "Synthwave", freq: "103.3 MHz" }, { id: "phonk", label: "Phonk", freq: "101.9 MHz" } ],
  tropical: [ { id: "salsa", label: "Salsa Mix", freq: "99.9 MHz" }, { id: "cumbia", label: "Cumbia", freq: "101.1 MHz" }, { id: "reggae", label: "Reggae Roots", freq: "95.5 MHz" }, { id: "bossa", label: "Bossa Nova", freq: "89.5 MHz" }, { id: "afro", label: "Afrobeat", freq: "97.3 MHz" } ],
  custom: [ { id: "local", label: "Carpeta Local", freq: "00.0 MHz" } ]
};`;

content = content.replace(
  /export const RADIO_CONFIG = \{[\s\S]*?\};/,
  newRadioConfig
);

content = content.replace(
  `const [station, setStation] = useState("anime");`,
  `const [station, setStation] = useState("anime");\n  const [customUrl, setCustomUrl] = useState("");`
);

content = content.replace(
  `const { audioRef1, audioRef2, isPlaying, isConnecting, toggleRadio, analyserNode } = useAudioEngine({ station, volume, filterStyle, envStyle, ambientStyle, settings });`,
  `const { audioRef1, audioRef2, isPlaying, isConnecting, toggleRadio, analyserNode } = useAudioEngine({ station, volume, filterStyle, envStyle, ambientStyle, settings, customUrl });`
);

const newInputs = `
              <div className="flex flex-col gap-2 mt-4 p-4 border-2 border-amber-900 rounded-lg bg-[#2e1205] shadow-inner">
                <span className="text-[10px] uppercase font-bold text-amber-500/80 tracking-wider">Custom Radio (URL / Carpeta)</span>
                <input 
                  type="text" 
                  placeholder="URL del stream..." 
                  value={customUrl} 
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full bg-black/60 border border-amber-900 rounded px-2 py-1 text-xs text-amber-200 outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => setCustomUrl('http://localhost:3000/api/radio/local')}
                  className="text-xs w-full bg-amber-900/50 hover:bg-amber-800 text-amber-100 py-1 rounded border border-amber-700 transition-colors"
                >
                  Usar Carpeta Local
                </button>
              </div>
`;

content = content.replace(
  `<div className="w-[3px] bg-[#0c0501] border-l border-amber-950 border-r border-amber-900/15 self-stretch sm:block hidden shadow-inner" />`,
  newInputs + `\n          <div className="w-[3px] bg-[#0c0501] border-l border-amber-950 border-r border-amber-900/15 self-stretch sm:block hidden shadow-inner" />`
);

fs.writeFileSync('src/components/LoFiRadio.jsx', content);
