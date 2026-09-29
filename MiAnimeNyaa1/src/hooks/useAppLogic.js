import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';

export function useAppLogic(libraryRef) {
  const {
    tab,
    setStuckCount,
    setStuckItems,
    setActiveDownloads,
    setSonarrSeries,
    hiddenStuckIds,
    setOpenAnime
  } = useStore();

  const hiddenStuckIdsRef = useRef(hiddenStuckIds);
  useEffect(() => { hiddenStuckIdsRef.current = hiddenStuckIds; }, [hiddenStuckIds]);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==========================================================================
  // 📥 COLA DE DESCARGA
  // ==========================================================================
  const prevQueueDataRef = useRef("");
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/api/downloads/queue`);
      const data = await res.json();
      const currentDataStr = JSON.stringify(data);
      if (prevQueueDataRef.current !== currentDataStr) {
        prevQueueDataRef.current = currentDataStr;
        setStuckCount(data.stuckCount || 0);
        setStuckItems((data.stuckItems || []).filter(i => !hiddenStuckIdsRef.current.includes(i.id)));
        setActiveDownloads(data.active || []);
      }
    } catch (e) {}
  }, [setStuckCount, setStuckItems, setActiveDownloads]);

  useEffect(() => {
    let timeoutId;
    let isMounted = true;
    const loop = async () => {
      if (window.location.pathname === '/descargas') {
        await fetchQueue();
      }
      if (isMounted) {
        timeoutId = setTimeout(loop, 2000);
      }
    };
    loop();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchQueue]);

  useEffect(() => {
    let intervalId;
    const fetchSonarr = () => {
      if (window.location.pathname === '/descargas') {
        fetch(`http://${window.location.hostname}:3000/api/sonarr/series-list`)
          .then(res => res.json())
          .then(data => setSonarrSeries(data)).catch(() => {});
      }
    }
    fetchSonarr();
    intervalId = setInterval(fetchSonarr, 60000);
    return () => clearInterval(intervalId);
  }, [setSonarrSeries]);

  // ==========================================================================
  // 🔍 BÚSQUEDA
  // ==========================================================================
  useEffect(() => {
    if (!query || query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`http://${window.location.hostname}:3000/api/anime/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => setResults(Array.isArray(data) ? data : []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // ==========================================================================
  // 🗂️ ACCIONES VARIAS
  // ==========================================================================
  const abrirCarpetaAnimes = (e) => {
    if (e) e.preventDefault();
    fetch(`http://${window.location.hostname}:3000/api/open-local?path=${encodeURIComponent('D:\\Videos\\anime')}`);
  };

  const handleOpenAnime = useCallback((a) => {
    setOpenAnime({ ...a, ...libraryRef.current[a.title] });
  }, [setOpenAnime, libraryRef]);

  const handleRemoveAnime = useCallback((t, removeFunc) => {
    if (removeFunc) {
      removeFunc(t);
    }
    setOpenAnime(null);
  }, [setOpenAnime]);

  return {
    query, setQuery,
    results, setResults,
    loading, setLoading,
    fetchQueue,
    abrirCarpetaAnimes,
    handleOpenAnime,
    handleRemoveAnime
  };
}
