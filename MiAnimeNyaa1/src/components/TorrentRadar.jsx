import React, { useState, useCallback } from "react";
import { Search, Loader2, Info, Download, Users } from "lucide-react";

export default function TorrentRadar({ initialQuery, onDownload, colors }) {
  const COLORS = colors;
  const [query, setQuery] = useState(initialQuery || "");
  const [torrents, setTorrents] = useState([]);
  const [loadingTorrents, setLoadingTorrents] = useState(false);

  const buscarManual = useCallback(async () => {
    if (!query.trim()) return;
    setLoadingTorrents(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/api/torrents/${encodeURIComponent(query)}`);
      const data = await res.json();
      setTorrents(Array.isArray(data) ? data : []);
    } catch (e) {
      alert("Error buscando en Prowlarr");
    }
    setLoadingTorrents(false);
  }, [query]);

  // Detectar si tiene subtítulos o audio en español / latino
  const getSpanishTag = (torrent) => {
    const label = torrent.parsed?.lang?.label || '';
    if (label === 'Lat') return 'Lat';
    if (label === 'Multi Sub' || label.includes('Multi')) return 'Multi Sub';
    if (label === 'Sub ESP' || label.includes('Sub ESP')) return 'Sub ESP';

    const title = (torrent.title || '').toLowerCase();
    const desc = (torrent.description || '').toLowerCase();
    const fullText = `${title} ${desc}`;

    if (fullText.match(/\blat\b|latino|latam|es-la|spanish[\s_]*\(latin/i)) return 'Lat';
    if (fullText.match(/multi|multisub/i)) return 'Multi Sub';
    if (fullText.match(/sub_es|sub esp|español|castellano|spanish|vostfr/i)) return 'Sub ESP';
    return null;
  };

  return (
    <div className="mt-4 sm:mt-8 p-4 sm:p-6 md:p-8 rounded-2xl border-2 bg-black/60 backdrop-blur-md shadow-xl" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
      <div className="flex items-center gap-3 mb-6">
        <Search size={20} style={{ color: COLORS.magnetBlue }}/>
        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">Radar (Prowlarr)</h3>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input 
          value={query} 
          onChange={(e) => setQuery(e.target.value)} 
          onKeyDown={(e) => { if(e.key === 'Enter') buscarManual() }} 
          className="flex-1 bg-black/80 border-2 rounded-xl px-4 py-3 sm:py-3.5 text-xs sm:text-sm outline-none font-mono text-white" 
          style={{ borderColor: 'var(--radio-color, #2a160d)' }} 
          placeholder="Buscar manual..." 
        />
        <button 
          onClick={buscarManual} 
          className="px-8 py-3 sm:py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase text-black bg-gradient-to-r from-blue-600 to-blue-400 cursor-pointer w-full sm:w-auto"
        >
          Buscar
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {loadingTorrents && <div className="text-center py-10" style={{ color: COLORS.gold }}><Loader2 size={30} className="animate-spin inline mr-2" />Rastreando...</div>}
        
        {!loadingTorrents && torrents.map((t, i) => {
          const spanishTag = getSpanishTag(t);
          return (
            <div key={i} className="flex flex-col lg:flex-row justify-between lg:items-center p-4 rounded-xl border-2 bg-black/60 gap-4" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
              <div className="flex flex-col flex-1 min-w-0 text-left w-full">
                <span className="text-xs sm:text-sm font-mono font-bold break-all block w-full text-white leading-relaxed">{t.title}</span>
                
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-black/50 px-2 py-1 rounded" style={{ color: COLORS.gold }}>{t.size}</span>
                  
                  <span className="text-[10px] font-black uppercase px-2 py-1 rounded flex items-center gap-1 border border-green-800 bg-green-950/40 text-green-400">
                    <Users size={10} /> {t.seeders} S / {t.leechers} L
                  </span>

                  {/* 🔥 TAG DE IDIOMA EN ESPAÑOL / LATINO */}
                  {spanishTag && (
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border flex items-center gap-1 ${
                      spanishTag === 'Lat'
                        ? 'border-amber-500 bg-amber-950/40 text-amber-400'
                        : 'border-yellow-500 bg-yellow-950/40 text-yellow-400'
                    }`}>
                      {spanishTag}
                    </span>
                  )}

                  {t.parsed && (
                    <>
                      {t.parsed.group && t.parsed.group !== "Desconocido" && <span className="text-[9px] font-black uppercase px-2 py-1 rounded border border-gray-600 bg-gray-800 text-gray-300 break-words max-w-full">{t.parsed.group}</span>}
                      {t.parsed.resolution && <span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${t.parsed.resolution === '1080p' || t.parsed.resolution === '4K' ? 'bg-blue-950/40 text-blue-400 border-blue-800' : 'bg-gray-800 text-gray-300 border-gray-600'}`}>{t.parsed.resolution}</span>}
                      {t.parsed.lang && <span className="text-[9px] font-black uppercase px-2 py-1 rounded border break-words max-w-full" style={{ backgroundColor: `${t.parsed.lang.color}20`, color: t.parsed.lang.color, borderColor: `${t.parsed.lang.color}50` }}>{t.parsed.lang.label}</span>}
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex flex-row gap-2 shrink-0 w-full lg:w-auto justify-end border-t lg:border-none pt-3 lg:pt-0" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
                {t.infoUrl && <a href={t.infoUrl} target="_blank" rel="noopener noreferrer" className="p-3 flex-1 lg:flex-none flex justify-center items-center rounded-xl border-2 text-gray-400 hover:text-white" style={{ borderColor: 'var(--radio-color, #2a160d)' }}><Info size={20} /></a>}
                
                <button onClick={() => onDownload(t.magnet)} className="p-3 flex-1 lg:flex-none flex justify-center items-center gap-2 rounded-xl border-2 text-white cursor-pointer hover:bg-blue-600/50 transition-all font-black text-xs uppercase" style={{ backgroundColor: `${COLORS.magnetBlue}30`, borderColor: COLORS.magnetBlue }}>
                  <Download size={18} /> <span className="lg:hidden">Descargar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}