import { useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';

export function useAppData(libraryRef, watchedRef) {
  const { setLibrary, setWatched } = useStore();

  const guardarEnServidor = useCallback((endpoint, data) => {
    fetch(`http://${window.location.hostname}:3000/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch((err) => {
      console.warn(`[guardarEnServidor] Fallo al guardar ${endpoint}:`, err.message);
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resLib = await fetch(`http://${window.location.hostname}:3000/api/library`);
        setLibrary(await resLib.json() || {});
        const resWatched = await fetch(`http://${window.location.hostname}:3000/api/watched`);
        setWatched(await resWatched.json() || {});
      } catch (error) {}
    };
    fetchData();
  }, [setLibrary, setWatched]);

  return { guardarEnServidor };
}
