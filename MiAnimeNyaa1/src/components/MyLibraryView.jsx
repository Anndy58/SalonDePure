import React, { useState, useMemo, useRef, useCallback } from "react";
import { Search, Grid, List as ListIcon, Download, Sparkles, Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import anime from "animejs";
import { animateIn, animateButtonPress } from "../utils/animeUtils";
import CoverCard from "./CoverCard";
import StatusButtons, { STATUS } from "./StatusButtons";

const cleanTitle = (title) => {
  if (!title) return "";
  return title
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .replace(/\s*:\s*/g, " ")
    .replace(/\(TV\)/gi, "")
    .replace(/\(OVA\)/gi, "")
    .replace(/\(Movie\)/gi, "")
    .replace(/第.*期/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const fetchAnimeMetadata = async (title) => {
  const variants = [
    cleanTitle(title),
    title,
    title.replace(/["']/g, ""),
    title.replace(/[^\w\s]/g, ""),
    title.replace(/^(The|A|An)\s+/i, ""),
  ];
  const uniqueVariants = [...new Set(variants)].filter(Boolean);
  
  for (const query of uniqueVariants) {
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/api/anime/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
    } catch (e) {
      console.warn(`❌ Error buscando "${query}":`, e.message);
    }
  }
  return null;
};

const MyLibraryView = React.memo(({
  library,
  watched,
  addOrUpdate,
  remove,
  bulkImport,
  replaceLibrary,
  onOpenAnime,
  colors,
  anilistUser,
  syncWithAnilist,
  syncAllWithAnilist,
}) => {
  const COLORS = colors;
  const [collectionQuery, setCollectionQuery] = useState("");
  const [libFilter, setLibFilter] = useState("todos");
  const [showStats, setShowStats] = useState(false);
  const [libView, setLibView] = useState(() => localStorage.getItem("viñedo-lib-view") || "grid");
  const [libSort, setLibSort] = useState(() => localStorage.getItem("viñedo-lib-sort") || "date_added");
  const [syncingCovers, setSyncingCovers] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40;
  const malInputRef = useRef(null);

  const changeLibView = useCallback((mode) => { setLibView(mode); localStorage.setItem("viñedo-lib-view", mode); }, []);
  const changeLibSort = useCallback((mode) => { setLibSort(mode); localStorage.setItem("viñedo-lib-sort", mode); }, []);

  const { totalEpsVistos, totalTiempo, statusPrincipal } = useMemo(() => {
    let count = 0;
    Object.values(watched || {}).forEach(list => { if (Array.isArray(list)) count += list.length; });
    const totalMinutos = count * 24;
    let tiempoStr = `${totalMinutos} min`;
    if (totalMinutos >= 60) {
      const horas = Math.floor(totalMinutos / 60);
      const minutos = totalMinutos % 60;
      tiempoStr = horas < 24 ? `${horas}h ${minutos}m` : `${Math.floor(horas / 24)}d ${horas % 24}h`;
    }
    const counts = {};
    Object.values(library || {}).forEach(a => { if (a && a.status) counts[a.status] = (counts[a.status] || 0) + 1; });
    let maxStatus = "Ninguno";
    let maxCount = 0;
    Object.entries(counts).forEach(([status, c]) => { if (c > maxCount) { maxCount = c; maxStatus = STATUS[status]?.label || status; } });
    return { totalEpsVistos: count, totalTiempo: tiempoStr, statusPrincipal: maxStatus };
  }, [watched, library]);

  const handleMALImport = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setProgress({ current: 0, total: 0 });

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(ev.target.result, "text/xml");
        const animes = xmlDoc.getElementsByTagName("anime");
        
        const statusMap = {
          "1": "viendo", "watching": "viendo",
          "2": "completado", "completed": "completado",
          "3": "en_pausa", "on-hold": "en_pausa",
          "4": "abandonado", "dropped": "abandonado",
          "6": "quiero_ver", "plan to watch": "quiero_ver"
        };

        const items = [];
        for (let i = 0; i < animes.length; i++) {
          const node = animes[i];
          const title = node.getElementsByTagName("series_title")[0]?.textContent;
          let rawStatus = node.getElementsByTagName("my_status")[0]?.textContent;
          const image = node.getElementsByTagName("series_image")[0]?.textContent;
          const episodes = node.getElementsByTagName("series_episodes")[0]?.textContent;
          const rawScore = node.getElementsByTagName("my_score")[0]?.textContent;
          if (title && rawStatus) {
            rawStatus = rawStatus.toLowerCase().trim();
            const estadoFinal = statusMap[rawStatus];
            if (estadoFinal) {
              items.push({
                title,
                status: estadoFinal,
                image: image || null,
                episodes: episodes && episodes !== "0" ? episodes : "??",
                score: rawScore && rawScore !== "0" ? parseFloat(rawScore).toFixed(1) : null,
              });
            }
          }
        }

        if (items.length === 0) {
          alert("⚠️ No se encontraron animes válidos en tu XML.");
          setImporting(false);
          return;
        }

        setProgress({ current: 0, total: items.length });

        const importedDict = {};
        let updated = 0;
        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          setProgress({ current: idx + 1, total: items.length });
          console.log(`[${idx+1}/${items.length}] Buscando: ${item.title}`);
          const metadata = await fetchAnimeMetadata(item.title);
          if (metadata) {
            const combined = {
              ...metadata,
              status: item.status,
              dateAdded: Date.now() + idx,
              titleEnglish: metadata.titleEnglish || item.title,
            };
            importedDict[combined.title] = combined;
            updated++;
          } else {
            const fallback = {
              title: item.title,
              status: item.status,
              image: item.image || null,
              episodes: item.episodes,
              score: item.score,
              synopsis: "",
              genres: [],
              startDate: "",
              nextAiringAt: null,
              dateAdded: Date.now() + idx,
              _partial: true,
            };
            importedDict[fallback.title] = fallback;
          }
        }

        bulkImport(importedDict, false);
        alert(`✅ Importados ${Object.keys(importedDict).length} animes (${updated} con metadatos completos).`);
      } catch (error) {
        console.error("Error en importación:", error);
        alert("❌ Error al procesar el archivo XML.");
      }
      setImporting(false);
      setProgress({ current: 0, total: 0 });
    };
    reader.readAsText(file);
    e.target.value = null;
  }, [bulkImport]);

  const sincronizarPortadasHD = useCallback(async () => {
    const libraryEntries = Object.entries(library || {});
    if (libraryEntries.length === 0) {
      alert("📭 Tu biblioteca está vacía. Importa primero desde MAL.");
      return;
    }

    setSyncingCovers(true);
    setProgress({ current: 0, total: libraryEntries.length });

    const newLibrary = {};

    for (let idx = 0; idx < libraryEntries.length; idx++) {
      const [key, anime] = libraryEntries[idx];
      setProgress({ current: idx + 1, total: libraryEntries.length });
      console.log(`[${idx+1}/${libraryEntries.length}] Actualizando: ${key}`);
      
      const oldStatus = anime.status;
      const oldDateAdded = anime.dateAdded || Date.now() + idx;
      
      const metadata = await fetchAnimeMetadata(key);
      if (metadata) {
        const combined = {
          ...metadata,
          status: oldStatus,
          dateAdded: oldDateAdded,
          titleEnglish: metadata.titleEnglish || key,
        };
        newLibrary[combined.title] = combined;
      } else {
        console.warn(`⚠️ No se encontró metadata para: ${key}, conservando original.`);
        newLibrary[key] = {
          ...anime,
          _partial: true,
        };
      }
    }

    replaceLibrary(newLibrary);
    alert(`✅ Sincronizados ${Object.keys(newLibrary).length} animes con metadatos actualizados.`);
    setSyncingCovers(false);
    setProgress({ current: 0, total: 0 });
  }, [library, replaceLibrary]);

  const handleExport = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(library || {}));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "vinedo_backup.json");
    document.body.appendChild(a); a.click(); a.remove();
  }, [library]);

  const filteredLibrary = useMemo(() => {
    let filtered = Object.values(library || {}).filter(a => {
      if (!a || !a.title) return false;
      if (libFilter !== "todos" && a.status !== libFilter) return false;
      if (collectionQuery.trim() !== "") {
        const q = collectionQuery.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchTitleEng = a.titleEnglish && a.titleEnglish.toLowerCase().includes(q);
        return matchTitle || matchTitleEng;
      }
      return true;
    });
    filtered.sort((a, b) => {
      if (libSort === "title_asc") return a.title.localeCompare(b.title);
      if (libSort === "title_desc") return b.title.localeCompare(a.title);
      if (libSort === "score_desc") return (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0);
      if (libSort === "eps_desc") return (parseInt(b.localCount) || 0) - (parseInt(a.localCount) || 0);
      return 0;
    });
    return filtered;
  }, [library, libFilter, collectionQuery, libSort]);

  const totalPages = Math.ceil(filteredLibrary.length / itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [libFilter, collectionQuery, libSort]);

  const paginatedLibrary = filteredLibrary.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const safeLibraryKeys = useMemo(() => Object.keys(library || {}), [library]);

  const handleSet = useCallback((anime, status) => {
    addOrUpdate(anime, status);
  }, [addOrUpdate]);

  const handleRemove = useCallback((title) => {
    remove(title);
  }, [remove]);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fadeIn text-left">
      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-black/60 backdrop-blur-xl border mb-4 shrink-0" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
        <div className="flex-1 min-w-[140px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={collectionQuery}
            onChange={(e) => setCollectionQuery(e.target.value)}
            className="w-full bg-black/80 border rounded-lg py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#d4af37]/50 transition-colors"
            style={{ borderColor: 'var(--radio-color, #2a160d)' }}
          />
        </div>
        <div className="flex gap-1.5">
          <button 
            type="button"
            onClick={() => changeLibView('grid')} 
            className={`p-2 rounded-lg transition-all ${libView === 'grid' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-white/5 text-gray-400'}`} 
            style={{ border: '1px solid var(--radio-color, #2a160d)' }}
          >
            <Grid size={16} />
          </button>
          <button 
            type="button"
            onClick={() => changeLibView('list')} 
            className={`p-2 rounded-lg transition-all ${libView === 'list' ? 'bg-[#d4af37]/20 text-[#d4af37]' : 'bg-white/5 text-gray-400'}`} 
            style={{ border: '1px solid var(--radio-color, #2a160d)' }}
          >
            <ListIcon size={16} />
          </button>
        </div>
        
        {anilistUser && (
          <>
            <button 
              type="button"
              onClick={syncWithAnilist}
              className="p-2 rounded-lg bg-white/5 text-xs font-bold text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-1"
              style={{ border: '1px solid var(--radio-color, #2a160d)' }}
              title="Traer datos desde AniList"
            >
              <RefreshCw size={14} /> Traer
            </button>
            <button 
              type="button"
              onClick={syncAllWithAnilist}
              className="p-2 rounded-lg bg-white/5 text-xs font-bold text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-1"
              style={{ border: '1px solid var(--radio-color, #2a160d)' }}
              title="Enviar toda la biblioteca a AniList"
            >
              <RefreshCw size={14} className="rotate-180" /> Enviar
            </button>
          </>
        )}

        <div className="flex-1 flex gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => setShowStats(!showStats)}
            className="px-3 py-2 rounded-lg bg-white/5 text-xs font-bold text-gray-300 hover:bg-white/10 transition-colors"
            style={{ border: '1px solid var(--radio-color, #2a160d)' }}
          >
            Stats
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-2 rounded-lg bg-white/5 text-xs font-bold text-gray-300 hover:bg-white/10 transition-colors"
            style={{ border: '1px solid var(--radio-color, #2a160d)' }}
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            onClick={() => malInputRef.current?.click()}
            className="px-3 py-2 rounded-lg bg-blue-900/30 text-xs font-bold text-blue-400 hover:bg-blue-900/50 transition-colors"
            style={{ border: '1px solid var(--radio-color, #2a160d)' }}
          >
            MAL
          </button>
          <button
            type="button"
            onClick={sincronizarPortadasHD}
            disabled={syncingCovers}
            className={`px-3 py-2 rounded-lg bg-purple-900/30 text-xs font-bold text-purple-400 transition-colors ${syncingCovers ? 'opacity-50' : 'hover:bg-purple-900/50'}`}
            style={{ border: '1px solid var(--radio-color, #2a160d)' }}
          >
            {syncingCovers ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          </button>
        </div>
        <input type="file" accept=".xml" className="hidden" ref={malInputRef} onChange={handleMALImport} />
      </div>

      {showStats && (
        <div className="p-6 rounded-2xl border mb-6 animate-fadeIn shrink-0 bg-black/80 shadow-2xl" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-black/60 rounded-xl border flex flex-col justify-center items-center text-center" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
              <span className="text-[10px] font-black uppercase text-amber-600/60 tracking-widest mb-1">Colección</span>
              <span className="text-3xl font-black text-amber-200">{safeLibraryKeys.length}</span>
            </div>
            <div className="p-4 bg-black/60 rounded-xl border flex flex-col justify-center items-center text-center" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
              <span className="text-[10px] font-black uppercase text-amber-600/60 tracking-widest mb-1">Vistos</span>
              <span className="text-3xl font-black text-emerald-400">{totalEpsVistos} <span className="text-sm font-bold">eps</span></span>
            </div>
            <div className="p-4 bg-black/60 rounded-xl border flex flex-col justify-center items-center text-center" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
              <span className="text-[10px] font-black uppercase text-amber-600/60 tracking-widest mb-1">Tiempo</span>
              <span className="text-xl font-black text-amber-400 mt-2">{totalTiempo}</span>
            </div>
            <div className="p-4 bg-black/60 rounded-xl border flex flex-col justify-center items-center text-center" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
              <span className="text-[10px] font-black uppercase text-amber-600/60 tracking-widest mb-1">Afinidad</span>
              <span className="text-lg font-black text-amber-300 uppercase mt-2">{statusPrincipal}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 shrink-0 custom-scrollbar">
        <button 
          type="button"
          onClick={() => setLibFilter("todos")} 
          className={`tavern-btn text-[10px] px-5 py-2.5 whitespace-nowrap ${libFilter === "todos" ? 'border-amber-600/60 text-amber-200' : 'border-amber-900/30 text-amber-600/70'}`} 
          style={{ borderColor: libFilter === "todos" ? 'var(--radio-color, #d4af37)' : 'var(--radio-color, #2a160d)' }}
        >
          Todas ({safeLibraryKeys.length})
        </button>
        {Object.entries(STATUS).map(([key, info]) => {
          const count = Object.values(library).filter(a => a.status === key).length;
          const isActive = libFilter === key;
          return (
            <button 
              key={key} 
              type="button"
              onClick={() => setLibFilter(key)} 
              className={`tavern-btn text-[10px] px-5 py-2.5 whitespace-nowrap flex items-center gap-2 ${isActive ? 'border-amber-600/60 text-amber-200' : 'border-amber-900/30 text-amber-600/70'}`} 
              style={{ borderColor: isActive ? 'var(--radio-color, #d4af37)' : 'var(--radio-color, #2a160d)' }}
            >
              {React.createElement(info.icon, { size: 12 })} {info.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden h-full min-h-[300px] relative pb-20">
        {filteredLibrary.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-amber-600/40 font-mono gap-4 border-2 border-dashed rounded-2xl bg-black/30 h-full" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
            <Search size={48} />
            <p className="text-sm">No hay animes en tu bodega.</p>
          </div>
        ) : (
          <div className="absolute inset-0 h-full overflow-y-auto custom-scrollbar pr-2 pb-32">
            {libView === 'list' ? (
              <div className="flex flex-col gap-2">
                {paginatedLibrary.map((a, index) => {
                  const epWatchedCount = watched[a.title]?.length || 0;
                  return (
                    <div key={a.title || index} className="pb-2">
                      <CoverCard
                        anime={a}
                        statusKey={a.status}
                        onOpen={() => onOpenAnime(a)}
                        colors={COLORS}
                        watchedCount={epWatchedCount}
                        viewMode={libView}
                        actionLabel={
                          <StatusButtons
                            anime={a}
                            currentStatus={a.status}
                            onSet={handleSet}
                            onRemove={handleRemove}
                            colors={COLORS}
                            isListView={true}
                          />
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 pb-8">
                {paginatedLibrary.map((a, index) => {
                  const epWatchedCount = watched[a.title]?.length || 0;
                  return (
                    <div key={a.title || index} className="flex flex-col h-full">
                      <CoverCard
                        anime={a}
                        statusKey={a.status}
                        onOpen={() => onOpenAnime(a)}
                        colors={COLORS}
                        watchedCount={epWatchedCount}
                        viewMode="grid"
                        actionLabel={
                          <StatusButtons
                            anime={a}
                            currentStatus={a.status}
                            onSet={handleSet}
                            onRemove={handleRemove}
                            colors={COLORS}
                            isListView={false}
                          />
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t mb-8" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition-all border ${
                    currentPage === 1
                      ? 'opacity-50 cursor-not-allowed bg-black/40 text-gray-500 border-gray-800'
                      : 'hover:bg-[var(--radio-color)] hover:text-black bg-black/60 text-white border-[var(--radio-color)]/30'
                  }`}
                  style={currentPage !== 1 ? { borderColor: 'var(--radio-color, #d4af37)' } : {}}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>

                <div className="text-sm font-mono font-bold px-4 py-2 rounded-lg bg-black/60 border text-[var(--radio-color)]" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
                  PÁGINA {currentPage} DE {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition-all border ${
                    currentPage === totalPages
                      ? 'opacity-50 cursor-not-allowed bg-black/40 text-gray-500 border-gray-800'
                      : 'hover:bg-[var(--radio-color)] hover:text-black bg-black/60 text-white border-[var(--radio-color)]/30'
                  }`}
                  style={currentPage !== totalPages ? { borderColor: 'var(--radio-color, #d4af37)' } : {}}
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default MyLibraryView;