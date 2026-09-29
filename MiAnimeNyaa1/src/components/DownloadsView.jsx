import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Download, AlertTriangle, X as XIcon, Loader2, Check, FileQuestion, Link as LinkIcon, Trash2 } from "lucide-react";

// --- RESOLVEDOR DE SONARR (MEMOIZADO) ---
const StuckResolverRow = memo(({ item, sonarrSeries, colors, onResolved }) => {
  const COLORS = colors;
  const [selectedSeries, setSelectedSeries] = useState("");
  const [epNumber, setEpNumber] = useState("");
  const [importing, setImporting] = useState(false);

  const cleanString = useCallback((str) => str.toLowerCase().replace(/[^a-z0-9]/g, ""), []);

  useEffect(() => {
    if (sonarrSeries.length > 0) {
      const cleanStuck = cleanString(item.title);
      const found = sonarrSeries.find(s => {
        const cleanS = cleanString(s.title);
        return cleanStuck.includes(cleanS) || cleanS.includes(cleanStuck.substring(0, 8));
      });
      if (found) setSelectedSeries(found.id);
      const epMatch = item.title.match(/(?:-\s*|e|episode\s*)(\d+)/i);
      if (epMatch) setEpNumber(epMatch[1]);
    }
  }, [sonarrSeries, item.title, cleanString]);

  const ejecutarImportacion = useCallback(() => {
    if (!selectedSeries || !epNumber) return alert("Completa los datos.");
    setImporting(true);
    fetch(`http://${window.location.hostname}:3000/api/sonarr/manual-import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: item.outputPath, seriesId: selectedSeries, episodeNumber: epNumber, downloadId: item.downloadId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) alert(data.error);
      else { alert("✅ Importación forzada exitosa."); onResolved(); }
    })
    .catch(() => alert("Error al intentar la importación manual."))
    .finally(() => setImporting(false));
  }, [selectedSeries, epNumber, item.outputPath, item.downloadId, onResolved]);

  return (
    <div className="flex flex-col gap-3 p-4 bg-red-950/20 rounded-xl border-2 text-left w-full" style={{ borderColor: `${COLORS.rust}40` }}>
      <div className="flex flex-col gap-1">
        <span className="text-xs sm:text-sm font-bold text-red-200 break-all leading-snug">{item.title}</span>
        <span className="text-[10px] font-mono text-red-400 break-words bg-red-950/50 p-2 rounded border border-red-900/50">{item.errorMessage}</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-2">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[9px] uppercase font-black text-gray-500">Anime (Sonarr)</span>
          <select value={selectedSeries} onChange={e => setSelectedSeries(e.target.value)} className="w-full bg-black/90 border-2 text-[10px] sm:text-xs p-2.5 rounded-lg outline-none text-white cursor-pointer" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
            <option value="">Seleccionar...</option>
            {sonarrSeries.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-24">
          <span className="text-[9px] uppercase font-black text-gray-500">Cap</span>
          <input type="number" value={epNumber} onChange={e => setEpNumber(e.target.value)} className="w-full bg-black/90 border-2 text-[10px] sm:text-xs p-2.5 rounded-lg outline-none text-white text-center focus:border-red-500" style={{ borderColor: 'var(--radio-color, #2a160d)' }} placeholder="Ej: 1" />
        </div>
      </div>
      <button onClick={ejecutarImportacion} disabled={importing} className="w-full mt-2 py-2.5 rounded-lg font-black text-[10px] sm:text-xs uppercase bg-red-900/50 hover:bg-red-600 text-white transition-colors border border-red-800 flex justify-center items-center gap-2">
        {importing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Forzar Sonarr
      </button>
    </div>
  );
});

// --- RESOLVEDOR DE SHOKO (MEMOIZADO) ---
const ShokoResolverRow = memo(({ item, library, colors, onResolved }) => {
  const COLORS = colors;
  const libraryTitles = useMemo(() => Object.keys(library || {}).sort(), [library]);
  const [selectedAnime, setSelectedAnime] = useState("");
  const [epNumber, setEpNumber] = useState("");
  const [linking, setLinking] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const epMatch = item.name.match(/(?:-\s*|e|episode\s*|ep\s*|v\d+)(\d+)/i);
    if (epMatch) setEpNumber(epMatch[1]);
  }, [item.name]);

  const ejecutarVinculacion = useCallback(() => {
    if (!selectedAnime || !epNumber) return alert("Completa los datos.");
    setLinking(true);
    fetch(`http://${window.location.hostname}:3000/api/shoko/manual-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: parseInt(item.id, 10), animeTitle: selectedAnime, episodeNumber: epNumber })
    })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error desconocido');
      return data;
    })
    .then(data => {
      alert("✅ " + (data.message || "Vinculación exitosa."));
      onResolved();
    })
    .catch(err => {
      alert("❌ " + err.message);
      console.error('Error detallado:', err);
    })
    .finally(() => setLinking(false));
  }, [selectedAnime, epNumber, item.id, onResolved]);

  const eliminarArchivo = useCallback(() => {
    if (!window.confirm(`¿Eliminar el archivo "${item.name}"?`)) return;
    setDeleting(true);
    fetch(`http://${window.location.hostname}:3000/api/shoko/file/${item.id}`, { method: 'DELETE' })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error desconocido');
      return data;
    })
    .then(data => {
      alert("✅ " + (data.message || "Archivo eliminado."));
      onResolved();
    })
    .catch(err => {
      alert("❌ " + err.message);
    })
    .finally(() => setDeleting(false));
  }, [item.id, item.name, onResolved]);

  return (
    <div className="flex flex-col gap-3 p-4 bg-purple-950/20 rounded-xl border-2 text-left w-full" style={{ borderColor: '#a855f740' }}>
      <div className="flex flex-col gap-1">
        <span className="text-xs sm:text-sm font-bold text-purple-200 break-all leading-snug">{item.name}</span>
        <span className="text-[10px] font-mono text-purple-400 bg-purple-950/50 p-1.5 rounded border border-purple-900/50 w-fit">{item.size} • Huérfano en Shoko</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 mt-2">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[9px] uppercase font-black text-gray-500">Mi Biblioteca (Shoko)</span>
          <select value={selectedAnime} onChange={e => setSelectedAnime(e.target.value)} className="w-full bg-black/90 border-2 text-[10px] sm:text-xs p-2.5 rounded-lg outline-none text-white cursor-pointer focus:border-purple-500" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
            <option value="">Seleccionar Anime...</option>
            {libraryTitles.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-24">
          <span className="text-[9px] uppercase font-black text-gray-500">Cap</span>
          <input type="number" value={epNumber} onChange={e => setEpNumber(e.target.value)} className="w-full bg-black/90 border-2 text-[10px] sm:text-xs p-2.5 rounded-lg outline-none text-white text-center focus:border-purple-500" style={{ borderColor: 'var(--radio-color, #2a160d)' }} placeholder="Ej: 1" />
        </div>
      </div>
      <div className="flex flex-row gap-2 w-full">
        <button onClick={ejecutarVinculacion} disabled={linking || deleting} className="flex-1 py-2.5 rounded-lg font-black text-[10px] sm:text-xs uppercase bg-purple-900/50 hover:bg-purple-600 text-white transition-colors border border-purple-800 flex justify-center items-center gap-2">
          {linking ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />} Vincular
        </button>
        <button onClick={eliminarArchivo} disabled={linking || deleting} className="flex-1 py-2.5 rounded-lg font-black text-[10px] sm:text-xs uppercase bg-red-900/50 hover:bg-red-600 text-white transition-colors border border-red-800 flex justify-center items-center gap-2">
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Eliminar
        </button>
      </div>
    </div>
  );
});

// ============================================================================
// COMPONENTE PRINCIPAL DownloadsView (MEMOIZADO)
// ============================================================================
const DownloadsView = memo(({ activeDownloads, stuckItems, sonarrSeries, hiddenStuckIds, setHiddenStuckIds, fetchQueue, colors, library }) => {
  const COLORS = colors;
  const [shokoOrphans, setShokoOrphans] = useState([]);
  const [loadingShoko, setLoadingShoko] = useState(false);

  const fetchShokoOrphans = useCallback(() => {
    setLoadingShoko(true);
    fetch(`http://${window.location.hostname}:3000/api/shoko/unrecognized`)
      .then(res => res.json())
      .then(data => setShokoOrphans(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingShoko(false));
  }, []);

  useEffect(() => { fetchShokoOrphans(); }, [fetchShokoOrphans]);

  const visibleStuckItems = useMemo(() => {
    return stuckItems.filter(i => !hiddenStuckIds.includes(i.id));
  }, [stuckItems, hiddenStuckIds]);

  const eliminarTodosHuérfanos = useCallback(() => {
    if (shokoOrphans.length === 0) return alert("No hay huérfanos para eliminar.");
    if (!window.confirm(`¿Eliminar TODOS los ${shokoOrphans.length} archivos huérfanos?\nEsta acción no se puede deshacer.`)) return;
    const promises = shokoOrphans.map(item =>
      fetch(`http://${window.location.hostname}:3000/api/shoko/file/${item.id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => ({ id: item.id, success: data.success, error: data.error }))
        .catch(() => ({ id: item.id, success: false, error: 'Network error' }))
    );
    Promise.all(promises).then(results => {
      const successes = results.filter(r => r.success).length;
      const failures = results.filter(r => !r.success).length;
      alert(`✅ ${successes} archivos eliminados correctamente.\n${failures > 0 ? `❌ ${failures} fallaron.` : ''}`);
      fetchShokoOrphans();
    });
  }, [shokoOrphans, fetchShokoOrphans]);

  return (
    <div className="h-full overflow-y-auto max-w-7xl mx-auto w-full flex flex-col gap-6 pb-20">
      <div className="flex items-center gap-3 border-b-2 pb-4 shrink-0" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
        <Download size={24} style={{ color: COLORS.magnetBlue }}/>
        <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest text-white">Terminal Central</h2>
      </div>

      {/* SHOKO: ARCHIVOS NO RECONOCIDOS */}
      <div className="flex flex-col gap-4 bg-purple-950/20 p-4 sm:p-6 rounded-2xl border-2 shadow-lg shrink-0" style={{ borderColor: '#a855f750' }}>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-purple-900/50 pb-3">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-purple-400 flex items-center gap-2">
            <FileQuestion size={16}/> Archivos Huérfanos en Shoko ({shokoOrphans.length})
          </h3>
          <div className="flex gap-2">
            <button onClick={fetchShokoOrphans} disabled={loadingShoko} className="text-[10px] font-mono text-purple-300 hover:text-white bg-purple-950/50 border border-purple-900 px-4 py-2.5 rounded-lg uppercase font-bold cursor-pointer transition-colors flex items-center justify-center gap-2" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
              {loadingShoko ? <Loader2 size={12} className="animate-spin" /> : null}
              {loadingShoko ? "Buscando..." : "Refrescar"}
            </button>
            <button onClick={eliminarTodosHuérfanos} disabled={shokoOrphans.length === 0 || loadingShoko} className="text-[10px] font-mono text-red-400 hover:text-white bg-red-950/50 border border-red-900 px-4 py-2.5 rounded-lg uppercase font-bold cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
              <Trash2 size={14} /> Eliminar todos
            </button>
          </div>
        </div>

        {shokoOrphans.length === 0 ? (
          <p className="text-xs sm:text-sm text-purple-300/50 italic font-mono bg-black/30 p-6 rounded-xl border-2 border-dashed border-purple-900/30 text-center" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
            ✅ Todo perfecto. Shoko tiene todos los archivos reconocidos.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {shokoOrphans.map((item) => (
              <ShokoResolverRow key={item.id} item={item} library={library} colors={COLORS} onResolved={fetchShokoOrphans} />
            ))}
          </div>
        )}
      </div>

      {/* SONARR: MISMATCHES */}
      {visibleStuckItems.length > 0 && (
        <div className="flex flex-col gap-4 bg-red-950/20 p-4 sm:p-6 rounded-2xl border-2 border-red-900 shadow-lg shrink-0" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-red-900/50 pb-3">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
              <AlertTriangle size={16}/> Mismatches en Sonarr
            </h3>
            <button onClick={() => setHiddenStuckIds([...hiddenStuckIds, ...stuckItems.map(i => i.id)])} className="text-[10px] font-mono text-red-300 hover:text-white bg-red-950/50 border border-red-900 px-4 py-2.5 rounded-lg uppercase tracking-widest font-bold cursor-pointer transition-colors" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
              Ocultar Temporales
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleStuckItems.map((item) => (
              <div key={item.id} className="relative group w-full">
                <button onClick={() => setHiddenStuckIds([...hiddenStuckIds, item.id])} className="absolute -top-3 -right-3 bg-red-900 border border-red-700 rounded-full p-1.5 text-red-200 hover:text-white z-10 shadow-lg cursor-pointer hidden group-hover:block"><XIcon size={12}/></button>
                <StuckResolverRow item={item} sonarrSeries={sonarrSeries} colors={COLORS} onResolved={fetchQueue} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COLA DE DESCARGAS QBITTORRENT */}
      <div className="flex flex-col gap-4 bg-black/40 p-4 sm:p-6 rounded-2xl border-2 shadow-lg" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
        <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-blue-400 border-b border-blue-900/50 pb-3 flex items-center gap-2" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
          Cola de qBittorrent <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-800">{activeDownloads.length}</span>
        </h3>
        {activeDownloads.length === 0 ? (
          <p className="text-xs sm:text-sm text-gray-500 italic font-mono bg-black/30 p-8 rounded-xl border-2 border-dashed border-gray-800 text-center shadow-inner" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
            No hay descargas activas en este momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeDownloads.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-3 p-4 sm:p-5 bg-blue-950/10 rounded-xl border-2 shadow-md transition-all hover:bg-blue-950/20 w-full" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
                <span className="text-xs sm:text-sm font-bold break-all line-clamp-3 text-white leading-snug" title={item.title}>{item.title}</span>
                <div className="flex flex-wrap justify-between items-center text-[10px] font-mono text-gray-400 uppercase gap-2 mt-1">
                  <span className="bg-black/80 px-2.5 py-1.5 rounded border border-gray-800" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>{item.size} • {item.status}</span>
                  <span className="text-blue-400 font-black text-base sm:text-lg">{item.progress}%</span>
                </div>
                <div className="w-full bg-black rounded-full h-3 overflow-hidden border border-gray-800 mt-1" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
                  <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)] rounded-full transition-all duration-500 relative" style={{ width: `${item.progress}%` }}>
                    <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/40 blur-[2px]"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default DownloadsView;