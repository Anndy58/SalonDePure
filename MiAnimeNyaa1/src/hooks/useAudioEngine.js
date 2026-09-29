import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioCore } from '../lib/audio/AudioCore'; 

export function useAudioEngine({ station, volume, filterStyle, envStyle, ambientStyle, customUrl }) {
  const audioRef1 = useRef(null);
  const audioRef2 = useRef(null);
  const coreRef = useRef(null);
  const activeIdx = useRef(1);
  const crossfadeTimeoutRef = useRef(null); // 🔥 para limpiar timeout

  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const getApiUrl = () => {
    return typeof API_URL !== 'undefined' ? API_URL : `http://${window.location.hostname}:3000`;
  };

  const initCore = useCallback(() => {
    if (!coreRef.current && audioRef1.current && audioRef2.current) {
      coreRef.current = new AudioCore(audioRef1.current, audioRef2.current);
    }
  }, []);

  const toggleRadio = useCallback(async () => {
    initCore();
    await coreRef.current.init();
    
    coreRef.current.setVolume(volume);

    const currentAudio = activeIdx.current === 1 ? audioRef1.current : audioRef2.current;
    const otherAudio = activeIdx.current === 1 ? audioRef2.current : audioRef1.current;

    if (isPlaying) {
      // 🔥 APAGAR: limpiar cualquier timeout pendiente
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }
      // Pausar y resetear ambos audios
      [currentAudio, otherAudio].forEach(a => {
        a.pause();
        a.src = '';
        a.load();
      });
      // Detener el motor de audio (ruido, ducking, etc.)
      coreRef.current.stop();
      setIsPlaying(false);
      setIsConnecting(false);
    } else {
      // 🔥 ENCENDER: forzar nueva conexión
      coreRef.current.resume();
      const src = customUrl ? customUrl : `${getApiUrl()}/api/radio?station=${station}&v=${Date.now()}`;
      currentAudio.src = src;
      currentAudio.load();
      currentAudio.play().catch(err => console.warn("Autoplay bloqueado:", err));
      setIsPlaying(true);
    }
  }, [isPlaying, station, volume, initCore]);

  // Efecto para cambiar de estación (solo cuando isPlaying cambia y está activo)
  useEffect(() => {
    if (!isPlaying || !coreRef.current) return;
    
    // Limpiar timeout anterior si existe
    if (crossfadeTimeoutRef.current) {
      clearTimeout(crossfadeTimeoutRef.current);
      crossfadeTimeoutRef.current = null;
    }

    setIsConnecting(true);
    coreRef.current.startTuning();

    const nextIdx = activeIdx.current === 1 ? 2 : 1;
    const currentAudio = activeIdx.current === 1 ? audioRef1.current : audioRef2.current;
    const nextAudio = nextIdx === 1 ? audioRef1.current : audioRef2.current;

    nextAudio.src = customUrl ? customUrl : `${getApiUrl()}/api/radio?station=${station}&v=${Date.now()}`;
    nextAudio.load();
    nextAudio.play().catch(() => {});

    coreRef.current.crossfade(nextIdx);

    // Guardar el timeout para poder limpiarlo después
    crossfadeTimeoutRef.current = setTimeout(() => {
      currentAudio.pause();
      currentAudio.src = '';
      currentAudio.load();
      crossfadeTimeoutRef.current = null;
    }, 1500);

    activeIdx.current = nextIdx;

    return () => {
      if (crossfadeTimeoutRef.current) {
        clearTimeout(crossfadeTimeoutRef.current);
        crossfadeTimeoutRef.current = null;
      }
    };
  }, [station, isPlaying]); // Dependencia en station e isPlaying

  // Efectos para controles
  useEffect(() => { 
    if (coreRef.current) coreRef.current.setVolume(volume); 
  }, [volume]);

  useEffect(() => { 
    if (coreRef.current) coreRef.current.setFilterStyle(filterStyle); 
  }, [filterStyle]);

  useEffect(() => { 
    if (coreRef.current) coreRef.current.setEnvStyle(envStyle); 
  }, [envStyle]);

  // Manejadores de eventos de audio para conectar/desconectar
  useEffect(() => {
    const handleWaiting = () => { 
      setIsConnecting(true); 
      if (coreRef.current) coreRef.current.startTuning(); 
    };
    const handlePlaying = () => { 
      setIsConnecting(false); 
      if (coreRef.current) coreRef.current.stopTuning(); 
    };

    const a1 = audioRef1.current;
    const a2 = audioRef2.current;

    if (a1 && a2) {
      [a1, a2].forEach(a => {
        a.addEventListener('waiting', handleWaiting);
        a.addEventListener('stalled', handleWaiting);
        a.addEventListener('playing', handlePlaying);
        a.addEventListener('canplay', handlePlaying);
      });
    }

    return () => {
      if (a1 && a2) {
        [a1, a2].forEach(a => {
          a.removeEventListener('waiting', handleWaiting);
          a.removeEventListener('stalled', handleWaiting);
          a.removeEventListener('playing', handlePlaying);
          a.removeEventListener('canplay', handlePlaying);
        });
      }
    };
  }, []);

  return {
    audioRef1,
    audioRef2,
    isPlaying,
    isConnecting,
    toggleRadio,
    analyserNode: coreRef.current ? coreRef.current.getAnalyser() : null
  };
}