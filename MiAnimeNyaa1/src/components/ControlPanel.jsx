import React, { memo } from 'react';

// 🔥 COMPONENTE AISLADO: El Volumen ya NO redibuja los botones al moverse
const VolumeLEDBar = memo(({ volume, setVolume }) => {
  return (
    <div className="flex flex-col gap-1.5 mb-2">
      <span className="text-[9px] uppercase font-serif font-black tracking-wider text-amber-500/90 flex justify-between items-center">
        NIVEL DE SEÑAL 
        <span className="text-amber-400 font-mono bg-amber-950/50 px-1.5 py-0.5 rounded shadow-inner">
          {Math.round(volume * 100)}%
        </span>
      </span>
      
      {/* Diseño LED de 20 Segmentos con Slider Invisible */}
      <div className="relative flex items-center w-full h-3 bg-[#050200] rounded-sm shadow-[inset_0_1px_3px_rgba(0,0,0,1)] overflow-hidden px-[2px] gap-[2px]">
        {Array.from({ length: 20 }).map((_, i) => {
          const isActive = (i / 20) < volume;
          return (
            <div 
              key={i} 
              className={`flex-1 h-2 rounded-[1px] transition-all duration-75 pointer-events-none
                ${isActive ? 'bg-amber-500 shadow-[0_0_6px_#f59e0b]' : 'bg-amber-950/30'}`}
            />
          );
        })}
        <input 
          type="range" min="0" max="1" step="0.01" value={volume} 
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
        />
      </div>
    </div>
  );
});

// COMPONENTE AISLADO: Los botones de emisoras. (Solo se dibujan 1 vez)
const TunerBoard = memo(({ station, setStation, activeTab, setActiveTab, RADIO_CONFIG, pickRandomStation }) => {
  return (
    <>
      <div className="flex justify-between items-center mt-1">
        <span className="text-[9px] uppercase font-bold text-amber-500/80 tracking-wider font-serif">SINTONIZADOR</span>
        <button 
          type="button" onClick={pickRandomStation} 
          className="text-[8px] px-2.5 py-1 rounded bg-[#1f0e04] border border-amber-800 text-amber-500 font-serif font-black shadow-[0_2px_4px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.1)] active:translate-y-[1px] cursor-pointer hover:bg-amber-900 transition-colors"
        >
          🎲 ZAPPING
        </button>
      </div>

      <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-[#090300] border border-amber-950 rounded-lg shadow-inner mt-1">
        {Object.keys(RADIO_CONFIG).map((tab) => (
          <button 
            key={tab} type="button" onClick={() => setActiveTab(tab)} 
            className={`py-1 rounded font-black text-[8px] uppercase cursor-pointer transition-colors border border-amber-950 border-b-2 active:translate-y-[2px] active:border-b-0 
              ${activeTab === tab ? `bg-[#2b1203] text-yellow-500 border-amber-800 border-b-0 shadow-inner font-serif` : 'bg-[#140a02] text-amber-800 hover:text-amber-100/90'}`} 
          >
            {tab === "gaming" ? "Retro" : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1 min-h-[58px]">
        {RADIO_CONFIG[activeTab]?.map((st) => (
          <button 
            key={st.id} type="button" onClick={() => setStation(st.id)} 
            className={`py-1 px-1.5 rounded-lg font-black text-[8px] uppercase border cursor-pointer border-b-4 active:translate-y-[3px] active:border-b transition-colors
              ${st.span === 2 ? 'col-span-2' : ''} 
              ${station === st.id ? 'bg-[#291204] text-yellow-500 border-amber-700 border-b-amber-950 shadow-inner' : 'bg-[#140801] text-amber-700/80 border-amber-950 border-b-black hover:text-amber-100/90'}`}
          >
            {st.label} <span className="text-[6px] text-amber-800 font-mono block">{st.freq}</span>
          </button>
        ))}
      </div>
    </>
  );
});

export default function ControlPanel({ volume, setVolume, station, setStation, activeTab, setActiveTab, RADIO_CONFIG, pickRandomStation }) {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <VolumeLEDBar volume={volume} setVolume={setVolume} />
      <TunerBoard station={station} setStation={setStation} activeTab={activeTab} setActiveTab={setActiveTab} RADIO_CONFIG={RADIO_CONFIG} pickRandomStation={pickRandomStation} />
    </div>
  );
}