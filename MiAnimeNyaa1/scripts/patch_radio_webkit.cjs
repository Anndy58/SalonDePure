const fs = require('fs');

let content = fs.readFileSync('src/components/LoFiRadio.jsx', 'utf8');

// The instruction mentioned: Añadir un selector de carpeta local (usando input[type="file"] con atributo webkitdirectory).

const oldInputs = `
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
                <label className="text-xs w-full bg-amber-900/50 hover:bg-amber-800 text-amber-100 py-1 rounded border border-amber-700 transition-colors text-center cursor-pointer">
                  Seleccionar Carpeta Local
                  <input
                    type="file"
                    webkitdirectory=""
                    directory=""
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const audioFiles = Array.from(files).filter(f => f.type.startsWith('audio/'));
                        if (audioFiles.length > 0) {
                          // Seleccionar el primero para empezar, o crear una lista de reproducción en el futuro
                          const fileUrl = URL.createObjectURL(audioFiles[0]);
                          setCustomUrl(fileUrl);
                        } else {
                          alert("No se encontraron archivos de audio en la carpeta seleccionada.");
                        }
                      }
                    }}
                  />
                </label>
              </div>
`;

content = content.replace(oldInputs, newInputs);

fs.writeFileSync('src/components/LoFiRadio.jsx', content);
