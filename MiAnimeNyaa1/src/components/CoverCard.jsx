import React, { useState, useEffect, useMemo, memo } from "react";
import { Tv, Star } from "lucide-react";
import { STATUS } from "./StatusButtons";

const AiringCountdown = memo(({ nextAiringAt }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!nextAiringAt) return;
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = nextAiringAt - now;
      if (diff <= 0) { setTimeLeft("HOY"); return; }
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      let str = "";
      if (days > 0) str += `${days}D `;
      if (hours > 0 || days > 0) str += `${hours}H `;
      str += `${minutes}M`;
      setTimeLeft(str);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [nextAiringAt]);

  if (!nextAiringAt) return null;
  return <>{timeLeft}</>;
});

const CoverCard = memo(({ anime, statusKey, onOpen, colors, watchedCount, viewMode }) => {
  if (!anime) return null;
  const COLORS = colors;

  const statusColors = useMemo(() => ({
    quiero_ver: COLORS?.gold,
    viendo: COLORS?.coral,
    completado: COLORS?.sage,
    en_pausa: COLORS?.khaki,
    abandonado: COLORS?.rust
  }), [COLORS]);

  const sColor = statusKey ? statusColors[statusKey] : null;
  const totalEps = Number(anime.localCount || anime.episodes);
  const progressPercent = (totalEps > 0 && watchedCount > 0) ? Math.min((watchedCount / totalEps) * 100, 100) : 0;

  // ========== MODO LISTA ==========
  if (viewMode === 'list') {
    return (
      <div 
        className="group relative flex items-center overflow-hidden rounded-lg transition-all duration-300 hover:bg-white/5 border h-20 bg-black/40 hover:shadow-xl pr-4 cursor-pointer"
        style={{ borderColor: 'var(--radio-color, #2a160d)' }}
        onClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
      >
        <div className="h-full w-14 shrink-0 relative overflow-hidden bg-black/40">
          {anime.image ? (
            <img
              src={anime.image}
              alt={anime.title}
              loading="lazy"
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 origin-center group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-black/80 flex items-center justify-center">
              <Tv size={16} style={{ color: COLORS.mist }} />
            </div>
          )}
          <div
            className="absolute bottom-0 left-0 right-0 h-1 z-40 transition-all duration-300"
            style={{
              backgroundColor: 'var(--radio-color, #d4af37)',
              boxShadow: '0 0 10px var(--radio-color, #d4af37)',
              opacity: 0.8,
            }}
          />
        </div>
        <div className="flex-1 flex flex-col justify-center px-4 overflow-hidden">
          <div className="text-left text-sm font-bold text-white truncate" style={{ textShadow: `0 0 8px ${COLORS.gold}40` }}>
            {anime.title}
          </div>
          {/* 🔥 Título en inglés en modo lista */}
          {anime.titleEnglish && anime.titleEnglish !== anime.title && (
            <div className="text-[9px] text-gray-400 truncate">
              {anime.titleEnglish}
            </div>
          )}
          <div className="flex items-center gap-3 text-[10px] font-mono mt-1 flex-wrap" style={{ color: COLORS.mist }}>
            {statusKey && (
              <span style={{ color: sColor }} className="font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/40">
                {STATUS[statusKey]?.label}
              </span>
            )}
            {anime.nextAiringAt && <span className="font-bold uppercase tracking-wider text-red-500 ">EMISIÓN</span>}
            {anime.score && <span className="flex items-center gap-0.5"><Star size={10} fill={COLORS.gold} color={COLORS.gold}/> {anime.score}</span>}
            <span>{anime.episodes ? `${anime.episodes} EPS` : "??"}</span>
            {anime.localCount !== undefined && <span style={{ color: COLORS.sage }}>📂 {anime.localCount}</span>}
          </div>
          {progressPercent > 0 && (
            <div className="w-48 h-1 bg-black/60 rounded-full mt-2 overflow-hidden border" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
              <div className="h-full rounded-full" style={{ width: `${progressPercent}%`, backgroundColor: 'var(--radio-color, #d4af37)', boxShadow: '0 0 6px var(--radio-color, #d4af37)' }}></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== MODO GRID ==========
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-xl transition-all duration-300 border h-full bg-black/60 hover:shadow-2xl hover:scale-[1.02] hover:border-[var(--radio-color,#d4af37)] cursor-pointer"
      style={{
        borderColor: 'var(--radio-color, #2a160d)',
        transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease-out',
        borderBottom: `2px solid var(--radio-color, #d4af37)`,
        transform: 'scale(1)',
        willChange: 'transform, border-color',
      }}
      onClick={(e) => {
        e.preventDefault();
        onOpen();
      }}
    >
      {statusKey && STATUS[statusKey] && (
        <div
          className={`absolute left-0 z-40 py-1 pl-2 pr-3 text-[9px] font-black uppercase pointer-events-none tracking-widest ${
            anime.nextAiringAt ? 'top-6' : 'top-3'
          }`}
          style={{
            backgroundColor: sColor,
            color: COLORS.ink,
            clipPath: 'polygon(0 0, 100% 0, 88% 100%, 0% 100%)',
          }}
        >
          {STATUS[statusKey].label}
        </div>
      )}

      {(anime.isUnavailable || anime.statusBadge === 'Indisponible' || anime.statusBadge === 'INDISPONIBLE') ? (
        <div
          className="absolute top-0 inset-x-0 z-30 text-[8px] font-black uppercase py-0.5 text-white bg-black text-center pointer-events-none shadow-md backdrop-blur-sm border-b border-white/20"
        >
          INDISPONIBLE
        </div>
      ) : (anime.isUpcoming || (anime.statusBadge && anime.statusBadge.includes('Por estrenarse'))) ? (
        <div
          className="absolute top-0 inset-x-0 z-30 text-[8px] font-black uppercase py-0.5 text-white text-center pointer-events-none shadow-md backdrop-blur-sm"
          style={{
            backgroundColor: 'var(--badge-upcoming, #9333ea)',
            boxShadow: '0 2px 10px var(--badge-upcoming, rgba(147,51,234,0.4))'
          }}
        >
          POR ESTRENARSE: {anime.nextAiringAt ? <AiringCountdown nextAiringAt={anime.nextAiringAt} /> : (anime.statusBadge ? anime.statusBadge.replace('Por estrenarse:', '').trim().toUpperCase() : '')}
        </div>
      ) : anime.isFinishedRecently ? (
        <div
          className="absolute top-0 inset-x-0 z-30 text-[8px] font-black uppercase py-0.5 text-white text-center pointer-events-none shadow-md backdrop-blur-sm"
          style={{
            backgroundColor: 'var(--badge-finished, #2563eb)',
            boxShadow: '0 2px 10px var(--badge-finished, rgba(37,99,235,0.4))'
          }}
        >
          RECIÉN FINALIZADO
        </div>
      ) : anime.nextAiringAt ? (
        (anime.nextAiringEpisodeNumber <= 2 || anime.statusBadge === "Estreno") ? (
          <div
            className="absolute top-0 inset-x-0 z-30 text-[8px] font-black uppercase py-0.5 text-white text-center pointer-events-none shadow-md backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--badge-estreno, #10b981)',
              boxShadow: '0 2px 10px var(--badge-estreno, rgba(16,185,129,0.4))'
            }}
          >
            ESTRENO: <AiringCountdown nextAiringAt={anime.nextAiringAt} />
          </div>
        ) : (
          <div
            className="absolute top-0 inset-x-0 z-30 text-[8px] font-black uppercase py-0.5 text-white text-center pointer-events-none shadow-md backdrop-blur-sm"
            style={{
              backgroundColor: 'var(--badge-emision, #dc2626)',
              boxShadow: '0 2px 10px var(--badge-emision, rgba(220,38,38,0.4))'
            }}
          >
            EN EMISIÓN: <AiringCountdown nextAiringAt={anime.nextAiringAt} />
          </div>
        )
      ) : null}

      <div className="relative w-full pt-[145%] overflow-hidden flex-shrink-0 bg-black/80 block border-b" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
        {anime.image ? (
          <div className="absolute inset-0 h-full w-full">
            <img
              src={anime.image}
              alt={anime.title}
              loading="lazy"
              className="h-full w-full object-cover opacity-85 group-hover:opacity-100 transition-all duration-700 origin-center group-hover:scale-110"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Tv size={20} style={{ color: COLORS.mist }} />
          </div>
        )}

        <div
          className="absolute bottom-0 left-0 right-0 h-1 z-40 transition-all duration-300"
          style={{
            backgroundColor: 'var(--radio-color, #d4af37)',
            boxShadow: '0 0 15px var(--radio-color, #d4af37)',
            opacity: 0.9,
          }}
        />

        {anime.localCount !== undefined && (
          <div
            className="absolute top-2 right-2 z-40 text-[9px] font-black font-mono px-2 py-1 rounded bg-black/90 border text-white pointer-events-none "
            style={{ borderColor: 'var(--radio-color, #2a160d)' }}
          >
            📂 {anime.localCount}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/90 to-transparent pt-16 pb-3 px-3 text-left pointer-events-none flex flex-col justify-end">
          <span
            className="text-[11px] sm:text-xs font-black line-clamp-2 leading-tight "
            style={{ color: COLORS.cream }}
          >
            {anime.title}
          </span>
          {/* 🔥 Título en inglés debajo del romaji en modo grid */}
          {anime.titleEnglish && anime.titleEnglish !== anime.title && (
            <span className="text-[8px] sm:text-[9px] text-gray-400 truncate mt-0.5 ">
              {anime.titleEnglish}
            </span>
          )}
        </div>

        {progressPercent > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1 z-40 bg-black/80">
            <div
              className="h-full transition-all duration-1000 relative rounded-r-md group-hover:brightness-125"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: 'var(--radio-color, #d4af37)',
                boxShadow: '0 0 10px var(--radio-color, #d4af37)',
              }}
            >
              <span className="absolute right-1 text-[8px] text-white -top-3 leading-none drop-shadow-md font-bold">{Math.round(progressPercent)}%</span>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_white]"></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer con puntuación y episodios (sin botones) */}
      <div className="flex flex-col p-2 flex-shrink-0" style={{ minHeight: '45px' }}>
        <div
          className="flex justify-between items-center text-[9px] font-mono font-bold"
          style={{ color: COLORS.mist }}
        >
          <span className="flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded">
            <Star size={10} fill={COLORS.gold} style={{ color: COLORS.gold }} />{' '}
            {anime.score || 'N/A'}
          </span>
          {anime.nextAiringEpisodeNumber && !anime.isFinishedRecently ? (
             <span className="bg-black/50 px-1.5 py-0.5 rounded text-[10px]" style={{ color: COLORS.gold }}>
               ▶ CAP {anime.nextAiringEpisodeNumber}
             </span>
          ) : anime.isFinishedRecently && anime.episodes ? (
             <span className="bg-black/50 px-1.5 py-0.5 rounded text-[10px]" style={{ color: COLORS.gold }}>
               ▶ CAP FINAL ({anime.episodes})
             </span>
          ) : (
            <span className="bg-black/50 px-1.5 py-0.5 rounded">
              {anime.episodes ? `${anime.episodes} EPS` : '??'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

CoverCard.displayName = "CoverCard";
AiringCountdown.displayName = "AiringCountdown";

export default CoverCard;