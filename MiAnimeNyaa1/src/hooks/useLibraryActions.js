import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import { COLORS } from '../constants/colors';

const NET_NEW_KEY = "viñedo-biblioteca-pro-v4";

export function useLibraryActions(libraryRef, watchedRef, guardarEnServidor) {
  const { setLibrary, setWatched, anilistToken } = useStore();

  const autoLinkAnime = useCallback(async (anime) => {
    console.log(`[AutoLink] Iniciando para: ${anime.title}`);
    try {
      const scanRes = await fetch(`http://${window.location.hostname}:3000/api/scan-anime-files?title=${encodeURIComponent(anime.title)}`);
      const scanData = await scanRes.json();

      if (!scanData.files || scanData.files.length === 0) {
        console.log(`[AutoLink] No se encontraron archivos para: ${anime.title}`);
        return;
      }

      const unrecognizedRes = await fetch(`http://${window.location.hostname}:3000/api/shoko/unrecognized`);
      const unrecognizedData = await unrecognizedRes.json();

      const fileMap = {};
      if (Array.isArray(unrecognizedData)) {
        unrecognizedData.forEach(f => {
          const name = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          fileMap[name] = f.id;
        });
      }

      let vinculados = 0;
      for (const file of scanData.files) {
        const fileName = file.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileId = fileMap[fileName];
        if (fileId) {
          const epMatch = file.name.match(/(?:-\s*|EP|E)(\d{2,3})/i);
          const episodeNumber = epMatch ? epMatch[1] : "1";

          await fetch(`http://${window.location.hostname}:3000/api/shoko/manual-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileId: fileId,
              animeTitle: anime.title,
              episodeNumber: episodeNumber
            })
          });
          vinculados++;
        }
      }
      console.log(`[AutoLink] Vinculados ${vinculados} archivos para ${anime.title}`);
    } catch (e) {
      console.error('[AutoLink] Error:', e);
    }
  }, []);

  const addOrUpdate = useCallback(async (anime, status) => {
    let animeWithId = { ...anime };
    if (!animeWithId.anilistId) {
      try {
        const res = await fetch(`/api/anime/search?q=${encodeURIComponent(anime.title)}`);
        const data = await res.json();
        if (data && data.length > 0 && data[0].anilistId) {
          animeWithId.anilistId = data[0].anilistId;
        } else {
          console.warn(`No se encontró ID para: ${anime.title}`);
        }
      } catch (e) {
        console.error(`Error buscando ID para ${anime.title}:`, e);
      }
    }

    const watchedList = watchedRef.current[anime.title] || [];
    const progress = watchedList.length;

    setLibrary((prev) => {
      const next = { ...prev, [anime.title]: { ...prev[anime.title], ...animeWithId, status } };
      localStorage.setItem(NET_NEW_KEY, JSON.stringify(next));
      guardarEnServidor('library', next);
      return next;
    });

    if (anilistToken && animeWithId.anilistId) {
      try {
        const response = await fetch('/api/anilist/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{
              mediaId: animeWithId.anilistId,
              status: status === 'completado' ? 'COMPLETED' : status === 'quiero_ver' ? 'PLANNING' : 'CURRENT',
              score: animeWithId.score || 0,
              progress: progress
            }]
          })
        });
        const result = await response.json();
        if (result.error) console.error('Error al sincronizar con AniList:', result.error);
      } catch (e) {
        console.error('Error al sincronizar:', e);
      }
    }

    if (status === 'viendo') {
      setTimeout(() => {
        autoLinkAnime(animeWithId);
      }, 1000);
    }
  }, [anilistToken, guardarEnServidor, setLibrary, watchedRef, autoLinkAnime]);

  const toggleWatched = useCallback((animeTitle, episodePath) => {
    let newList;
    setWatched((prev) => {
      const currentList = prev[animeTitle] || [];
      if (episodePath && typeof episodePath === 'string' && episodePath.startsWith('bulk_update_')) {
        const newProgress = parseInt(episodePath.replace('bulk_update_', ''));
        if (!isNaN(newProgress) && newProgress >= 0) {
          newList = Array.from({ length: newProgress }, (_, i) => `anilist_ep_${i + 1}`);
        } else {
          newList = currentList;
        }
      } else if (episodePath) {
        newList = currentList.includes(episodePath)
          ? currentList.filter(p => p !== episodePath)
          : [...currentList, episodePath];
      } else {
        newList = currentList;
      }

      const next = { ...prev, [animeTitle]: newList };
      localStorage.setItem("viñedo-watched-v1", JSON.stringify(next));
      guardarEnServidor('watched', next);
      return next;
    });

    setTimeout(() => {
      try {
        const anime = libraryRef.current[animeTitle];
        if (!anilistToken || !anime?.anilistId) return;

        const currentWatched = watchedRef.current[animeTitle] || [];
        const progress = currentWatched.length;
        const totalEpisodes = anime.episodes || 0;

        let anilistStatus = 'CURRENT';
        if (anime.status === 'completado') anilistStatus = 'COMPLETED';
        else if (anime.status === 'quiero_ver') anilistStatus = 'PLANNING';

        if (totalEpisodes > 0 && progress >= totalEpisodes && anime.status !== 'completado') {
          anilistStatus = 'COMPLETED';
          setLibrary(prev => {
            const next = { ...prev, [animeTitle]: { ...prev[animeTitle], status: 'completado' } };
            localStorage.setItem(NET_NEW_KEY, JSON.stringify(next));
            guardarEnServidor('library', next);
            return next;
          });
        }

        fetch('/api/anilist/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{
              mediaId: anime.anilistId,
              status: anilistStatus,
              progress: progress
            }]
          })
        }).catch(e => console.error('[AniList Sync] Error de red:', e));
      } catch (err) {
        console.error('[AniList Sync] Error crítico:', err);
      }
    }, 100);
  }, [anilistToken, guardarEnServidor, libraryRef, setLibrary, setWatched, watchedRef]);

  const remove = useCallback(async (title) => {
    const anime = libraryRef.current[title];
    setLibrary((prev) => {
      const next = { ...prev };
      delete next[title];
      localStorage.setItem(NET_NEW_KEY, JSON.stringify(next));
      guardarEnServidor('library', next);
      return next;
    });
    setWatched((prev) => {
      const next = { ...prev };
      delete next[title];
      localStorage.setItem("viñedo-watched-v1", JSON.stringify(next));
      guardarEnServidor('watched', next);
      return next;
    });

    if (anilistToken && anime?.anilistId) {
      try {
        await fetch('/api/anilist/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ mediaId: anime.anilistId, status: 'DROPPED', progress: 0 }] })
        });
      } catch (e) {
        console.error('Error al sincronizar borrado:', e);
      }
    }
  }, [anilistToken, guardarEnServidor, libraryRef, setLibrary, setWatched]);

  const replaceLibrary = useCallback((newLibrary, newWatched) => {
    setLibrary(newLibrary);
    setWatched(newWatched);
    localStorage.setItem(NET_NEW_KEY, JSON.stringify(newLibrary));
    localStorage.setItem("viñedo-watched-v1", JSON.stringify(newWatched));
    guardarEnServidor('library', newLibrary);
    guardarEnServidor('watched', newWatched);
  }, [guardarEnServidor, setLibrary, setWatched]);

  const updateLocalCount = useCallback((title, count) => {
    setLibrary((prev) => {
      if (!prev[title]) return prev;
      const next = { ...prev, [title]: { ...prev[title], localCount: count } };
      localStorage.setItem(NET_NEW_KEY, JSON.stringify(next));
      guardarEnServidor('library', next);
      return next;
    });
  }, [guardarEnServidor, setLibrary]);

  const bulkImport = useCallback((animesToImport, status = 'viendo') => {
    setLibrary((prev) => {
      const next = { ...prev };
      animesToImport.forEach(anime => {
        if (!next[anime.title]) {
          next[anime.title] = { ...anime, status, localCount: 0 };
        }
      });
      localStorage.setItem(NET_NEW_KEY, JSON.stringify(next));
      guardarEnServidor('library', next);
      return next;
    });
  }, [guardarEnServidor, setLibrary]);

  return { addOrUpdate, toggleWatched, remove, replaceLibrary, updateLocalCount, bulkImport };
}
