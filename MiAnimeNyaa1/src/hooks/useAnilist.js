import { useEffect, useCallback, useState } from 'react';
import { useStore } from '../store/useStore';

export function useAnilist(guardarEnServidor, libraryRef, setLibrary, setWatched) {
  const [syncingProgress, setSyncingProgress] = useState(false);
  const {
    anilistToken, setAnilistToken,
    anilistUser, setAnilistUser,
    setRecommendations
  } = useStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('anilist') === 'connected';

    if (connected) {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);

      fetch('/api/anilist/me')
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setAnilistUser(data);
            setAnilistToken('logged_in');
            localStorage.setItem('anilist_token', 'logged_in');
            fetch('/api/anilist/recommendations')
              .then(res => res.json())
              .then(recs => setRecommendations(recs))
              .catch(() => {});
          }
        })
        .catch(() => {});
      return;
    }

    const stored = localStorage.getItem('anilist_token');
    if (stored) {
      setAnilistToken(stored);
      fetch('/api/anilist/me')
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setAnilistUser(data);
          } else {
            console.warn('Token inválido, pero mantenemos el estado. Reintenta más tarde.');
          }
        })
        .catch(() => {
          console.warn('Error de red al verificar token. Mantenemos el estado.');
        });
    }
  }, [setAnilistUser, setAnilistToken, setRecommendations]);

  useEffect(() => {
    if (anilistToken) {
      fetch('/api/anilist/recommendations')
        .then(res => res.json())
        .then(data => setRecommendations(data))
        .catch(() => {});
    }
  }, [anilistToken, setRecommendations]);

  const logoutAnilist = useCallback(async () => {
    setAnilistUser(null);
    setAnilistToken(null);
    localStorage.removeItem('anilist_token');
    try {
      await fetch('/api/anilist/logout', { method: 'POST' });
    } catch (e) {
      console.error('Error al cerrar sesión de AniList:', e);
    }
  }, [setAnilistUser, setAnilistToken]);

  const connectAnilist = () => {
    if (anilistUser) {
      logoutAnilist();
    } else {
      window.location.href = '/api/anilist/auth';
    }
  };

  const syncProgressFromAnilist = useCallback(async (watchedRef) => {
    if (!anilistToken || syncingProgress) return;

    setSyncingProgress(true);
    try {
      const res = await fetch('/api/anilist/library');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const currentLibrary = libraryRef.current;
      const currentWatched = watchedRef.current;
      const newWatched = { ...currentWatched };
      let watchedChanges = false;

      data.forEach(anime => {
        if (!anime.anilistId || !anime.progress) return;

        const existingKey = Object.keys(currentLibrary).find(key =>
          currentLibrary[key].anilistId === anime.anilistId || key === anime.title
        );

        if (existingKey) {
          const title = anime.title || existingKey;
          const watchedList = [];
          for (let i = 1; i <= anime.progress; i++) {
            watchedList.push(`anilist_ep_${i}`);
          }
          const currentList = newWatched[title] || [];
          if (JSON.stringify(currentList) !== JSON.stringify(watchedList)) {
            newWatched[title] = watchedList;
            watchedChanges = true;
          }
        }
      });

      if (watchedChanges) {
        setWatched(newWatched);
        localStorage.setItem("viñedo-watched-v1", JSON.stringify(newWatched));
        guardarEnServidor('watched', newWatched);
      }
    } catch (error) {
      console.error('[AniList] Error en sincro en segundo plano:', error);
    } finally {
      setSyncingProgress(false);
    }
  }, [anilistToken, setWatched]);


  const syncWithAnilist = useCallback(async (libraryRef, watchedRef, guardarEnServidor, setLibrary) => {
    if (!anilistToken) {
      alert('Primero conecta con AniList usando el botón correspondiente.');
      return;
    }
    try {
      const res = await fetch('/api/anilist/library');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const currentLibrary = libraryRef.current;
      const currentWatched = watchedRef.current;
      const newLibrary = { ...currentLibrary };
      const newWatched = { ...currentWatched };
      let libraryChanges = false;
      let watchedChanges = false;

      data.forEach(anime => {
        if (!anime.anilistId) return;

        const existingKey = Object.keys(newLibrary).find(key =>
          newLibrary[key].anilistId === anime.anilistId || key === anime.title
        );

        if (existingKey) {
          newLibrary[existingKey] = {
            ...newLibrary[existingKey],
            ...anime,
            localCount: newLibrary[existingKey].localCount || 0,
            status: anime.status || newLibrary[existingKey].status,
          };
          libraryChanges = true;
        } else if (anime.title) {
          newLibrary[anime.title] = {
            ...anime,
            localCount: 0,
            anilistId: anime.anilistId,
          };
          libraryChanges = true;
        }

        if (anime.progress !== undefined && anime.progress > 0) {
          const title = anime.title || existingKey;
          if (title && newLibrary[title]) {
            const watchedList = [];
            for (let i = 1; i <= anime.progress; i++) {
              watchedList.push(`anilist_ep_${i}`);
            }
            const currentList = newWatched[title] || [];
            if (JSON.stringify(currentList) !== JSON.stringify(watchedList)) {
              newWatched[title] = watchedList;
              watchedChanges = true;
            }
          }
        }
      });

      if (libraryChanges) {
        setLibrary(newLibrary);
        localStorage.setItem("viñedo-biblioteca-pro-v4", JSON.stringify(newLibrary));
        guardarEnServidor('library', newLibrary);
      }

      if (watchedChanges) {
        setWatched(newWatched);
        localStorage.setItem("viñedo-watched-v1", JSON.stringify(newWatched));
        guardarEnServidor('watched', newWatched);
      }

      const watchedCount = Object.keys(newWatched).filter(k => newWatched[k].length > 0).length;
      alert(`✅ Sincronizado desde AniList:\n- ${Object.keys(newLibrary).length} animes en biblioteca\n- ${watchedCount} animes con progreso`);
    } catch (error) {
      alert('❌ Error al sincronizar: ' + error.message);
    }
  }, [anilistToken, setWatched]);

  const syncAllWithAnilist = useCallback(async (libraryRef, watchedRef, guardarEnServidor) => {
    if (!anilistToken) {
      alert('Primero conecta con AniList.');
      return;
    }

    const currentLibrary = libraryRef.current;
    const currentWatched = watchedRef.current;

    const itemsToSync = [];
    for (const [title, anime] of Object.entries(currentLibrary)) {
      let anilistId = anime.anilistId;
      if (!anilistId) {
        try {
          const res = await fetch(`/api/anime/search?q=${encodeURIComponent(title)}`);
          const data = await res.json();
          if (data && data.length > 0 && data[0].anilistId) {
            anilistId = data[0].anilistId;
          }
        } catch (e) {
          console.error(`Error buscando ID de AniList para ${title}:`, e);
        }
      }

      if (anilistId) {
        const progress = (currentWatched[title] || []).length;
        let anilistStatus = 'CURRENT';
        if (anime.status === 'completado') anilistStatus = 'COMPLETED';
        else if (anime.status === 'quiero_ver') anilistStatus = 'PLANNING';

        itemsToSync.push({
          mediaId: anilistId,
          status: anilistStatus,
          score: anime.score || 0,
          progress: progress
        });
      }
    }

    if (itemsToSync.length === 0) {
      alert('No se pudo encontrar IDs de AniList para ningún anime.');
      return;
    }

    try {
      const response = await fetch('/api/anilist/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToSync }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      const successCount = result.results.filter(r => r.success).length;
      alert(`✅ ${successCount} de ${itemsToSync.length} animes enviados a AniList.`);
    } catch (error) {
      alert('❌ Error al sincronizar: ' + error.message);
    }
  }, [anilistToken, guardarEnServidor]);

  return { connectAnilist, logoutAnilist, syncProgressFromAnilist, syncWithAnilist, syncAllWithAnilist };
}
