import React, { memo } from "react";
import { BookmarkPlus, Eye, Check, Pause, X as XIcon, Trash2 } from "lucide-react";

export const STATUS = { 
  quiero_ver: { label: "Quiero ver", icon: BookmarkPlus }, 
  viendo: { label: "Viendo", icon: Eye }, 
  completado: { label: "Completado", icon: Check }, 
  en_pausa: { label: "En pausa", icon: Pause }, 
  abandonado: { label: "Abandonado", icon: XIcon } 
};

const StatusButtons = memo(({ anime, currentStatus, onSet, onRemove, colors, isListView }) => {
  const COLORS = colors;
  const statusColors = { 
    quiero_ver: COLORS.gold, 
    viendo: COLORS.coral, 
    completado: COLORS.sage, 
    en_pausa: COLORS.khaki, 
    abandonado: COLORS.rust 
  };

  // MODO LISTA (más grande y horizontal)
  if (isListView) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex w-full gap-1">
          {Object.entries(STATUS).map(([key, info]) => {
            const active = currentStatus === key;
            const color = statusColors[key];
            return (
              <button 
                key={key} 
                type="button"
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  onSet(anime, key); 
                }} 
                className="flex-1 py-2 rounded-lg border transition-all cursor-pointer relative overflow-hidden flex items-center justify-center gap-1.5 text-xs font-bold uppercase"
                style={{ 
                  background: active 
                    ? `linear-gradient(180deg, #0f0704 0%, #1a0b06 100%)`
                    : `linear-gradient(180deg, #241006 0%, #150a05 100%)`, 
                  color: active ? color : "#8a7f71", 
                  borderColor: active ? color : 'var(--radio-color, #2a160d)', 
                  boxShadow: active 
                    ? `inset 0 2px 4px rgba(0,0,0,0.9), 0 0 8px ${color}30` 
                    : "0 1px 2px rgba(0,0,0,0.4)" 
                }} 
                title={info.label}
              >
                {React.createElement(info.icon, { size: 16 })}
                <span className="hidden sm:inline">{info.label}</span>
              </button>
            );
          })}
        </div>
        {currentStatus && (
          <button 
            type="button"
            onClick={(e) => { 
              e.preventDefault();
              e.stopPropagation(); 
              onRemove(anime.title); 
            }} 
            className="w-full py-2 text-red-500 border border-red-950/40 rounded-lg transition-all hover:bg-red-950/20 bg-black/40 hover:text-red-400 cursor-pointer text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1"
          >
            <Trash2 size={14} /> Eliminar
          </button>
        )}
      </div>
    );
  }

  // MODO GRID (botones más grandes y siempre visibles)
  return (
    <div className="flex flex-col gap-1.5 w-full mt-1">
      <div className="grid grid-cols-5 gap-1 w-full">
        {Object.entries(STATUS).map(([key, info]) => {
          const active = currentStatus === key;
          const color = statusColors[key];
          return (
            <button 
              key={key} 
              type="button"
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                onSet(anime, key); 
              }} 
              className="py-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center text-xs font-bold uppercase"
              style={{ 
                background: active 
                  ? `linear-gradient(180deg, #0f0704 0%, #1a0b06 100%)`
                  : `linear-gradient(180deg, #241006 0%, #150a05 100%)`, 
                color: active ? color : "#8a7f71", 
                borderColor: active ? color : 'var(--radio-color, #2a160d)', 
                boxShadow: active 
                  ? `inset 0 2px 4px rgba(0,0,0,0.9), 0 0 8px ${color}30` 
                  : "0 1px 2px rgba(0,0,0,0.4)" 
              }} 
              title={info.label}
            >
              {React.createElement(info.icon, { size: 18 })}
            </button>
          );
        })}
      </div>
      {currentStatus && (
        <button 
          type="button"
          onClick={(e) => { 
            e.preventDefault();
            e.stopPropagation(); 
            onRemove(anime.title); 
          }} 
          className="w-full py-2.5 text-red-500 border border-red-950/40 rounded-lg transition-all hover:bg-red-950/20 bg-black/40 hover:text-red-400 cursor-pointer text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-1.5"
        >
          <Trash2 size={14} /> Eliminar
        </button>
      )}
    </div>
  );
});

export default StatusButtons;