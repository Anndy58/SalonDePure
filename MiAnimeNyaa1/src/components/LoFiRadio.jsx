import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAudioEngine } from '../hooks/useAudioEngine';
import Visualizer from './Visualizer';
import ControlPanel from './ControlPanel';
import { Radio, Disc, Loader2, Activity } from 'lucide-react';

export const RADIO_CONFIG = {
  asia: [ { id: "anime", label: "Anime", freq: "96.6 MHz" }, { id: "kpop", label: "K-Pop", freq: "88.1 MHz" }, { id: "vocaloid", label: "Vocaloid", freq: "102.5 MHz" }, { id: "citypop", label: "City Pop", freq: "93.4 MHz" }, { id: "jpop", label: "J-Pop", freq: "99.1 MHz" } ],
  gaming: [ { id: "vgm", label: "Rainwave VGM", freq: "91.3 MHz" }, { id: "sega", label: "Retro SEGA", freq: "94.7 MHz" }, { id: "chiptune", label: "Chiptunes", freq: "89.9 MHz" }, { id: "nintendo", label: "Nintendo Mix", freq: "105.1 MHz" }, { id: "rpg", label: "RPG Tavern", freq: "107.5 MHz" } ],
  relax: [ { id: "jazz", label: "Café Jazz", freq: "93.3 MHz" }, { id: "clasica", label: "Clásica", freq: "104.1 MHz" }, { id: "drone", label: "Chillsynth", freq: "90.2 MHz" }, { id: "lofi", label: "Lofi Chill", freq: "105.7 MHz" }, { id: "ambient", label: "Ambient", freq: "88.5 MHz" } ],
  beats: [ { id: "rock_es", label: "Rock Leyendas", freq: "98.9 MHz" }, { id: "house", label: "Groove House", freq: "90.9 MHz" }, { id: "dubstep", label: "Drum & Bass", freq: "107.1 MHz" }, { id: "synth", label: "Synthwave", freq: "103.3 MHz" }, { id: "phonk", label: "Phonk", freq: "101.9 MHz" } ],
  tropical: [ { id: "salsa", label: "Salsa Mix", freq: "99.9 MHz" }, { id: "cumbia", label: "Cumbia", freq: "101.1 MHz" }, { id: "reggae", label: "Reggae Roots", freq: "95.5 MHz" }, { id: "bossa", label: "Bossa Nova", freq: "89.5 MHz" }, { id: "afro", label: "Afrobeat", freq: "97.3 MHz" } ],
  custom: [ { id: "local", label: "Carpeta Local", freq: "00.0 MHz" } ]
};

const mhz = Object.values(RADIO_CONFIG).flat().reduce((acc, curr) => { acc[curr.id] = curr.freq; return acc; }, {});

export default function LoFiRadio({ colors, className, isMobile, themeMode, themeColor }) {
  const COLORS = colors || { gold: '#e5a93b', line: '#333333' };
  
  const [showPanel, setShowPanel] = useState(false);
  const [station, setStation] = useState("anime");
  const [customUrl, setCustomUrl] = useState(""); 
  const [activeTab, setActiveTab] = useState("asia"); 
  const [volume, setVolume] = useState(0.5); 
  
  const [filterStyle, setFilterStyle] = useState("afuera"); 
  const [envStyle, setEnvStyle] = useState("dry"); 
  const [ambientStyle, setAmbientStyle] = useState("off");
  const [songTitle, setSongTitle] = useState("Sintonizando...");
  const [visType, setVisType] = useState('bars'); 
  
  const [settings, setSettings] = useState({ flicker: 50, drift: 35, ducking: 45, thunderRate: 40 });

  const { audioRef1, audioRef2, isPlaying, isConnecting, toggleRadio, analyserNode } = useAudioEngine({ station, volume, filterStyle, envStyle, ambientStyle, settings, customUrl });

  // 🔥 SOLUCIÓN DEL BUG FANTASMA: Periodo de gracia para el mouse y eventos de puntero estrictos
  const closeTimeoutRef = useRef(null);
  
  const handlePanelEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    setShowPanel(true);
  };
  
  const handlePanelLeave = () => {
    closeTimeoutRef.current = setTimeout(() => setShowPanel(false), 250); 
  };

  const pickRandomStation = useCallback(() => {
    const allStations = Object.values(RADIO_CONFIG).flat().map(s => s.id);
    let next = allStations[Math.floor(Math.random() * allStations.length)];
    while(next === station && allStations.length > 1) { next = allStations[Math.floor(Math.random() * allStations.length)]; }
    for (const [category, stations] of Object.entries(RADIO_CONFIG)) {
      if (stations.some(s => s.id === next)) { setActiveTab(category); break; }
    }
    setStation(next);
  }, [station]);

  const cycleVisualizer = () => {
    const types = ['bars', 'wave', 'symmetric'];
    setVisType(types[(types.indexOf(visType) + 1) % types.length]);
  };

  useEffect(() => {
    let interval;
    const host = window.location.hostname || 'localhost'; 
    const fetchMetadata = () => {
      if (customUrl) {
        setSongTitle("Señal personalizada");
        return;
      }
      fetch(`http://${host}:3000/api/radio/metadata?station=${station}`)
        .then(res => res.json())
        .then(data => setSongTitle(data.title || "La Taberna Radio"))
        .catch(() => setSongTitle("Frecuencia Activa"));
    };
    fetchMetadata();
    if (isPlaying && !customUrl) interval = setInterval(fetchMetadata, 10000); 
    return () => clearInterval(interval);
  }, [station, isPlaying, customUrl]);

  return (
    <div 
      // NOTA: El contenedor padre NO captura el ratón (pointer-events-none)
      className={`fixed z-[100] flex flex-col items-end gap-4 pointer-events-none ${className || 'bottom-6 right-6'}`}
    >
      <audio ref={audioRef1} crossOrigin="anonymous" preload="none" />
      <audio ref={audioRef2} crossOrigin="anonymous" preload="none" />

      {/* EL PANEL (Solo captura el ratón cuando es visible gracias a pointer-events-auto) */}
      {!isMobile && (
        <div
          onPointerEnter={handlePanelEnter}
          onPointerLeave={handlePanelLeave}
          className={`p-5 rounded-3xl shadow-2xl flex flex-col gap-4 sm:w-[620px] w-72 text-amber-100/90 relative overflow-hidden border-t-2 border-l-2 border-r-2 border-b-4 origin-bottom-right transition-all duration-300 ease-in-out
            ${showPanel ? 'scale-100 opacity-100 pointer-events-auto translate-y-0' : 'scale-95 opacity-0 pointer-events-none translate-y-4'}`}
          style={{
          borderColor: isPlaying ? 'var(--radio-color)' : '#854d0e',
          borderBottomColor: isPlaying ? 'var(--radio-color)' : '#100600',
          backgroundImage: `linear-gradient(to bottom, #110500 0%, #2e1205 45%, #110500 100%)`,
          backgroundColor: isPlaying ? 'var(--radio-bg-color)' : '',
        }}
      >
          <div className="flex sm:flex-row flex-col gap-5 w-full relative z-10">

            <div className="flex-1 flex flex-col gap-3 justify-between">
            <div className="w-full bg-[#080400] rounded-xl border-2 border-amber-950 p-2.5 overflow-hidden relative flex items-center justify-between shadow-[inset_0_4px_10px_rgba(0,0,0,0.955)]">
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <Disc size={15} className={`flex-shrink-0 transition-all ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s', color: 'var(--radio-color, #e5a93b)', filter: 'drop-shadow(0 0 5px var(--radio-color))' }} />
                <div className="flex-1 overflow-hidden relative h-4">
                  <div className={`absolute whitespace-nowrap text-[10px] font-serif tracking-widest font-black transition-all ${isPlaying && !isConnecting ? 'animate-marquee' : ''}`} style={{ color: 'var(--radio-color, #e5a93b)', textShadow: '0 0 calc(4px + var(--radio-intensity, 0) * 6px) var(--radio-color)' }}>
                    <span style={{ color: 'var(--radio-color, #e5a93b)' }}>[{mhz[station]}]</span> {isConnecting ? "Sintonizando señal..." : songTitle}
                  </div>
                </div>
              </div>
              <button onClick={cycleVisualizer} className="flex-shrink-0 ml-2 text-amber-700 hover:text-amber-400 transition-colors z-20 cursor-pointer" title="Cambiar Visualizador">
                <Activity size={14} />
              </button>
            </div>

            <Visualizer analyserNode={analyserNode} isPlaying={isPlaying} isConnecting={isConnecting} settings={settings} visualizerType={visType} themeMode={themeMode} themeColor={themeColor} />

            <ControlPanel 
              volume={volume} setVolume={setVolume} station={station} setStation={setStation}
              activeTab={activeTab} setActiveTab={setActiveTab} RADIO_CONFIG={RADIO_CONFIG}
              pickRandomStation={pickRandomStation} COLORS={COLORS}
            />
          </div>

          {activeTab === 'custom' && (
            <div className="flex flex-col gap-2 p-3 mt-1 border-t border-amber-950/50 bg-[#080400]/40 rounded-b-xl shadow-inner">
              <span className="text-[9px] uppercase font-serif font-black text-amber-500/80 tracking-wider">Custom Stream URL</span>
              <input 
                type="text" 
                placeholder="Pega la URL de tu stream aquí..." 
                value={customUrl} 
                onChange={(e) => setCustomUrl(e.target.value)}
                className="w-full bg-[#050200] border border-amber-900/50 rounded-sm px-2 py-1.5 text-xs text-amber-300 outline-none focus:border-amber-500 transition-colors shadow-inner font-mono"
              />
              <label className="text-[10px] uppercase font-bold tracking-wider w-full bg-gradient-to-b from-[#1a0800] to-[#0a0300] hover:from-[#2a1000] hover:to-[#0f0400] text-amber-500/90 py-1.5 rounded-sm border border-amber-900/60 hover:border-amber-700 transition-all text-center cursor-pointer shadow-[0_2px_5px_rgba(0,0,0,0.5)] active:translate-y-[1px]">
                📂 Escuchar Carpeta Local
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
                        const fileUrl = URL.createObjectURL(audioFiles[0]);
                        setCustomUrl(fileUrl);
                      } else {
                        alert("No se encontraron archivos de audio válidos.");
                      }
                    }
                  }}
                />
              </label>
            </div>
          )}

          <div className="w-[3px] bg-[#0c0501] border-l border-amber-950 border-r border-amber-900/15 self-stretch sm:block hidden shadow-inner" />

            <div className="flex-1 flex flex-col gap-4 justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-bold text-amber-500/80 tracking-wider font-serif">Época (Filtro)</span>
                <div className="grid grid-cols-3 gap-1">
                  {["hd", "radio", "afuera"].map(style => (
                    <button key={style} type="button" onClick={() => setFilterStyle(style)} className={`py-1 px-1 rounded-lg font-black text-[8px] uppercase border transition-all active:translate-y-[2px] active:border-b-0 ${filterStyle === style ? 'bg-amber-900/40 text-amber-400 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)] border-b-0' : 'bg-[#140801] text-amber-800 border-amber-950 border-b-2 border-b-black hover:text-amber-100/90'}`}>{style === "radio" ? "Tubo" : style}</button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-bold text-amber-500/80 tracking-wider font-serif">Reverb</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => setEnvStyle("dry")} className={`py-1 px-1 rounded-lg font-black text-[8px] uppercase border transition-all active:translate-y-[2px] active:border-b-0 ${envStyle === "dry" ? 'bg-slate-900/60 text-slate-300 border-slate-500 shadow-[0_0_8px_rgba(148,163,184,0.3)] border-b-0' : 'bg-[#140801] text-amber-800 border-amber-950 border-b-2 border-b-black hover:text-amber-100/90'}`}>Seco</button>
                  <button type="button" onClick={() => setEnvStyle("entorno")} className={`py-1 px-1 rounded-lg font-black text-[8px] uppercase border transition-all active:translate-y-[2px] active:border-b-0 ${envStyle === "entorno" ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] border-b-0' : 'bg-[#140801] text-amber-800 border-amber-950 border-b-2 border-b-black hover:text-amber-100/90'}`}>Entorno</button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-bold text-amber-500/80 tracking-wider font-serif">Ambiente</span>
                <div className="grid grid-cols-5 gap-0.5">
                  {["off", "lluvia", "viento", "fuego", "vinilo"].map((ambient) => (
                    <button key={ambient} type="button" onClick={() => setAmbientStyle(ambient)} className={`py-1 px-0.5 rounded-lg font-black text-[8px] uppercase border transition-all active:translate-y-[2px] active:border-b-0 ${ambientStyle === ambient ? 'bg-amber-950/40 text-amber-400 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)] border-b-0' : 'bg-[#140801] text-amber-800 border-amber-950 border-b-2 border-b-black hover:text-amber-100/90'}`}>{ambient === "lluvia" ? "Lluvia ⚡" : ambient}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-3 bg-[#080400]/80 rounded-xl border border-amber-950/80 shadow-inner mt-auto">
              <div className="flex flex-col gap-1.5"><span className="text-amber-600/80 text-[8px] flex justify-between uppercase font-bold tracking-wider">Luces <span>{settings.flicker}%</span></span><input type="range" min="0" max="100" value={settings.flicker} onChange={(e) => setSettings({...settings, flicker: parseInt(e.target.value)})} className="w-full cursor-pointer h-1 bg-amber-950 rounded-lg" style={{ accentColor: COLORS.gold }} /></div>
              <div className="flex flex-col gap-1.5"><span className="text-amber-600/80 text-[8px] flex justify-between uppercase font-bold tracking-wider">Drift <span>{settings.drift}%</span></span><input type="range" min="0" max="100" value={settings.drift} onChange={(e) => setSettings({...settings, drift: parseInt(e.target.value)})} className="w-full cursor-pointer h-1 bg-amber-950 rounded-lg" style={{ accentColor: COLORS.gold }} /></div>
              <div className="flex flex-col gap-1.5"><span className="text-amber-600/80 text-[8px] flex justify-between uppercase font-bold tracking-wider">Ducking <span>{settings.ducking}%</span></span><input type="range" min="0" max="100" value={settings.ducking} onChange={(e) => setSettings({...settings, ducking: parseInt(e.target.value)})} className="w-full cursor-pointer h-1 bg-amber-950 rounded-lg" style={{ accentColor: COLORS.gold }} /></div>
              <div className="flex flex-col gap-1.5"><span className="text-amber-600/80 text-[8px] flex justify-between uppercase font-bold tracking-wider">Truenos <span>{settings.thunderRate === 0 ? "Off" : `${settings.thunderRate}%`}</span></span><input type="range" min="0" max="100" value={settings.thunderRate} onChange={(e) => setSettings({...settings, thunderRate: parseInt(e.target.value)})} className="w-full cursor-pointer h-1 bg-amber-950 rounded-lg" style={{ accentColor: COLORS.gold }} /></div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* EL BOTÓN (Captura el ratón con pointer-events-auto) */}
      <button 
        type="button" 
        onClick={toggleRadio}
        onPointerEnter={handlePanelEnter}
        onPointerLeave={handlePanelLeave}
        className={`group relative pointer-events-auto transition-all duration-75 flex flex-col items-center justify-center p-1 overflow-hidden border-2 cursor-pointer hover:scale-105 ${isMobile ? 'w-14 h-14 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.9)]' : 'w-20 h-28 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.9)]'}`}
        style={{ backgroundImage: 'linear-gradient(145deg, #5c2d0c 0%, #2e1205 50%, #1a0a00 100%)', borderColor: isPlaying ? 'var(--radio-color)' : '#3d1b04' }}
      >
        {!isMobile && (
          <div className="w-[90%] h-1/3 mt-2 flex flex-col gap-1 justify-center items-center opacity-60">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="w-full h-[2px] bg-black/80 rounded-full" />)}
          </div>
        )}
        <div className={`${isMobile ? 'w-10 h-10 border-2' : 'w-12 h-12 mt-1 border-4'} rounded-full flex items-center justify-center relative shadow-[inset_0_2px_4px_rgba(255,255,255,0.2)] bg-[#0f0a05]`} style={{ borderColor: isPlaying ? 'var(--radio-color)' : '#8b5e34' }}>
          {isPlaying ? (
            isConnecting ? <Loader2 size={22} className="text-amber-500 animate-spin" /> : <Disc size={22} className="text-amber-500 animate-spin" style={{ animationDuration: '3s' }} />
          ) : (
            <Radio size={20} className="text-amber-900" />
          )}
        </div>
      </button>
    </div>
  );
}