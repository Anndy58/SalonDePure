import React, { useState, useEffect } from "react";
import { Loader2, Calendar as CalIcon, ChevronLeft, ChevronRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CoverCard from "./CoverCard";
import StatusButtons from "./StatusButtons";

// 🔥 FUNCIÓN PARA FORMATEAR FECHA
const formatDate = (dateObj) => {
  if (!dateObj) return 'Fecha desconocida';
  if (typeof dateObj === 'string') return dateObj;
  if (typeof dateObj === 'object' && dateObj.year) {
    const day = dateObj.day ? String(dateObj.day).padStart(2, '0') : '??';
    const month = dateObj.month ? String(dateObj.month).padStart(2, '0') : '??';
    const year = dateObj.year || '????';
    return `${day}/${month}/${year}`;
  }
  return 'Fecha desconocida';
};

// Variantes de animación para las tarjetas en cuadrícula
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02
    }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

const cardItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 25
    }
  },
  exit: { opacity: 0, y: -10, scale: 0.95 }
};

export default function GlobalCalendarView({ onOpenAnime, library, onSet, onRemove, colors, watched }) {
  const COLORS = colors;
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [calibrating, setCalibrating] = useState(false);
  const [calibProgress, setCalibProgress] = useState(null);
  const [slideDirection, setSlideDirection] = useState(1); // 1 = derecha, -1 = izquierda

  const ORDEN_DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const NOMBRES_JS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const hoyReal = NOMBRES_JS[new Date().getDay()];
  const [activeTab, setActiveTab] = useState(hoyReal);

  const regroupScheduleByClientTimezone = (rawSchedule) => {
    if (!rawSchedule || typeof rawSchedule !== 'object') return {};

    const grouped = {
      "Lunes": [],
      "Martes": [],
      "Miércoles": [],
      "Jueves": [],
      "Viernes": [],
      "Sábado": [],
      "Domingo": [],
      "Donghuas": []
    };

    const seenIds = new Set();

    Object.entries(rawSchedule).forEach(([key, list]) => {
      if (!Array.isArray(list)) return;

      list.forEach(item => {
        if (!item || !item.id || seenIds.has(item.id)) return;
        seenIds.add(item.id);

        if (key === "Donghuas") {
          grouped["Donghuas"].push(item);
          return;
        }

        let itemTimestamp = item.nextAiringAt;

        if (!itemTimestamp && item.startDate) {
          if (typeof item.startDate === 'string' && item.startDate.includes('/')) {
            const parts = item.startDate.split('/');
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                itemTimestamp = Math.floor(Date.UTC(year, month - 1, day) / 1000) - (9 * 3600);
              }
            }
          } else if (typeof item.startDate === 'object' && item.startDate.year) {
            itemTimestamp = Math.floor(Date.UTC(item.startDate.year, item.startDate.month - 1, item.startDate.day) / 1000) - (9 * 3600);
          }
        }

        if (itemTimestamp) {
          const localDate = new Date(itemTimestamp * 1000);
          const localDayName = NOMBRES_JS[localDate.getDay()];
          if (grouped[localDayName]) {
            grouped[localDayName].push(item);
          } else if (grouped[key]) {
            grouped[key].push(item);
          } else {
            grouped["Domingo"].push(item);
          }
        } else {
          if (grouped[key]) {
            grouped[key].push(item);
          }
        }
      });
    });

    Object.keys(grouped).forEach(k => {
      grouped[k].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    });

    return grouped;
  };

  const fetchSchedule = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    fetch(`/api/schedule`)
      .then(res => res.json())
      .then(data => {
        if (data && data.error) {
          if (!isSilent) setErrorMsg(data.error);
        } else if (data && typeof data === 'object') {
          setSchedule(regroupScheduleByClientTimezone(data));
          setErrorMsg(null);
        } else if (!isSilent) {
          setErrorMsg("Error en la estructura de datos del servidor.");
        }
        if (!isSilent) setLoading(false);
      })
      .catch(e => {
        if (!isSilent) {
          setErrorMsg("Error de comunicación con el servidor local.");
          setLoading(false);
        }
      });
  };

  const iniciarCalibracionTandas = () => {
    fetch(`/api/schedule/calibrate-all`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCalibrating(true);
        } else if (data.message) {
          alert(data.message);
        }
      })
      .catch(() => alert("Error iniciando la calibración."));
  };

  useEffect(() => {
    let interval = null;
    if (calibrating) {
      interval = setInterval(() => {
        fetch(`/api/schedule/calibration-status`)
          .then(res => res.json())
          .then(status => {
            setCalibProgress(status);
            if (status.finished || !status.running) {
              setCalibrating(false);
              fetchSchedule(true);
            }
          })
          .catch(() => {});
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [calibrating]);

  useEffect(() => {
    fetchSchedule(false);

    const LAST_CALIB_KEY = "taberna_last_auto_calibration";
    const lastCalibTime = localStorage.getItem(LAST_CALIB_KEY);
    const now = Date.now();
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

    if (!lastCalibTime || (now - parseInt(lastCalibTime, 10)) > TWO_HOURS_MS) {
      localStorage.setItem(LAST_CALIB_KEY, String(now));
      setTimeout(() => {
        iniciarCalibracionTandas();
      }, 3000);
    }

    const handleScheduleUpdated = () => {
      fetchSchedule(true);
    };

    window.addEventListener('taberna:schedule-updated', handleScheduleUpdated);
    return () => {
      window.removeEventListener('taberna:schedule-updated', handleScheduleUpdated);
    };
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-64 gap-4"
        style={{ color: COLORS.gold }}
      >
        <Loader2 size={44} className="animate-spin" />
        <span className="text-sm font-bold tracking-widest font-mono">SINCRONIZANDO CON JAPÓN...</span>
      </motion.div>
    );
  }

  if (errorMsg) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-10 text-red-400 font-bold text-sm bg-red-500/10 rounded-md border border-red-500/20 max-w-md mx-auto"
      >
        {errorMsg}
      </motion.div>
    );
  }

  const safeSchedule = schedule || {};
  const animesDelDia = safeSchedule[activeTab] || [];
  const filtrados = animesDelDia.filter(a => {
    if (statusFilter === "Todos") return true;
    if (statusFilter === "Finalizados") return a.isFinishedRecently;
    if (statusFilter === "Por estrenarse") return a.isUpcoming || (a.statusBadge && a.statusBadge.includes("Por estrenarse"));
    if (statusFilter === "Emisión") return !a.isFinishedRecently && !a.isUpcoming && !(a.statusBadge && a.statusBadge.includes("Por estrenarse"));
    return true;
  });

  const diaActualIndex = ORDEN_DIAS.indexOf(activeTab);
  const irDia = (direccion) => {
    if (diaActualIndex === -1) return;
    setSlideDirection(direccion);
    const maxIndex = ORDEN_DIAS.length;
    const nuevoIndex = (diaActualIndex + direccion + maxIndex) % maxIndex;
    setActiveTab(ORDEN_DIAS[nuevoIndex]);
  };

  const cambiarPestañaDia = (nuevoDia) => {
    const idxActual = ORDEN_DIAS.indexOf(activeTab);
    const idxNuevo = ORDEN_DIAS.indexOf(nuevoDia);
    if (idxNuevo !== -1 && idxActual !== -1) {
      setSlideDirection(idxNuevo > idxActual ? 1 : -1);
    }
    setActiveTab(nuevoDia);
  };

  return (
    <div className="flex flex-col h-full gap-4 relative z-10 text-left overflow-hidden">
      {/* BARRA DE NAVEGACIÓN DE DÍAS (TABERNA HEADER) */}
      <div className="flex items-center gap-2 border-b-2 pb-3 shrink-0 flex-wrap" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => irDia(-1)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white flex-shrink-0 cursor-pointer"
        >
          <ChevronLeft size={18} />
        </motion.button>

        <div className="flex overflow-x-auto gap-2 pb-1 snap-x snap-mandatory scrollbar-hide flex-1 items-center relative">
          {ORDEN_DIAS.map(dia => {
            const isToday = dia === hoyReal;
            const isActive = dia === activeTab;
            return (
              <button
                key={dia}
                onClick={() => cambiarPestañaDia(dia)}
                className={`snap-start flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors relative cursor-pointer ${
                  isActive ? 'bg-white/10 text-amber-300 border border-amber-500/30' : 'bg-black/30 text-gray-400 hover:text-gray-200 border border-white/5 hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="calendarActiveTab"
                    className="absolute inset-0 rounded-lg bg-amber-500/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {dia}
                  {isToday && <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-black border border-amber-500/30">HOY</span>}
                </span>
              </button>
            );
          })}

          <div className="w-px h-5 mx-1 bg-white/10 flex-shrink-0"></div>

          <button
            onClick={() => cambiarPestañaDia("Donghuas")}
            className={`snap-start flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors relative cursor-pointer ${
              activeTab === "Donghuas" ? 'bg-white/10 text-amber-300 border border-amber-500/30' : 'bg-black/30 text-gray-400 hover:text-gray-200 border border-white/5 hover:bg-white/5'
            }`}
          >
            {activeTab === "Donghuas" && (
              <motion.div
                layoutId="calendarActiveTab"
                className="absolute inset-0 rounded-lg bg-amber-500/10"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">DONGHUAS</span>
          </button>
        </div>

        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => irDia(1)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white flex-shrink-0 cursor-pointer"
        >
          <ChevronRight size={18} />
        </motion.button>

        <div className="w-px h-6 mx-1 bg-gray-700/50 flex-shrink-0"></div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={iniciarCalibracionTandas}
          disabled={calibrating}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border cursor-pointer shrink-0 hover:brightness-125"
          style={{
            backgroundColor: 'var(--radio-color, #d4af37)20',
            color: 'var(--radio-color, #d4af37)',
            borderColor: 'var(--radio-color, #2a160d)'
          }}
          title="Calibrar días del calendario por tandas de torrents"
        >
          {calibrating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          <span>{calibrating ? 'Calibrando...' : '⚡ Calibrar Torrents'}</span>
        </motion.button>
      </div>

      {/* FILTROS DE ESTADO ANIMADOS */}
      <div className="flex gap-2 w-full max-w-md flex-wrap relative">
        {["Todos", "Emisión", "Finalizados", "Por estrenarse"].map(filtro => {
          const isFilterActive = statusFilter === filtro;
          return (
            <button
              key={filtro}
              onClick={() => setStatusFilter(filtro)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all relative cursor-pointer ${
                isFilterActive ? 'text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-transparent'
              }`}
              style={{
                borderColor: isFilterActive ? 'var(--radio-color, #d4af37)' : 'transparent',
              }}
            >
              {isFilterActive && (
                <motion.div
                  layoutId="statusFilterActive"
                  className="absolute inset-0 rounded-full bg-white/10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{filtro}</span>
            </button>
          );
        })}
      </div>

      {/* VISTA PRINCIPAL CON ANIMACIÓN FLUIDA DE CAMBIO DE DÍA */}
      <div className="flex-1 overflow-y-auto w-full pb-20 pr-4 custom-scrollbar">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${activeTab}-${statusFilter}`}
            initial={{ opacity: 0, x: slideDirection * 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection * -25 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ willChange: "transform, opacity" }}
            className="w-full"
          >
            {/* BANNER DEL DÍA ACTIVO */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex shrink-0 items-center gap-3 mb-6 bg-black/40 w-fit px-4 py-2 rounded-xl border backdrop-blur-md shadow-lg"
              style={{ borderColor: 'var(--radio-color, #2a160d)' }}
            >
              <CalIcon size={20} style={{ color: 'var(--radio-color, #d4af37)' }} />
              <h2 className="text-xl font-black uppercase tracking-widest text-white">{activeTab}</h2>
              <span className="text-xs font-mono text-gray-400 ml-2">({filtrados.length} Series)</span>
            </motion.div>

            {filtrados.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-20 text-sm font-mono bg-black/30 rounded-xl border-2 border-dashed"
                style={{ borderColor: 'var(--radio-color, #2a160d)', color: COLORS.mist }}
              >
                No hay estrenos programados para este día.
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 pt-2 pl-2"
              >
                {filtrados.map((a, index) => {
                  if (!a || !a.title) return null;
                  const safeLib = library || {};
                  const animeData = { ...a, ...safeLib[a.title] };
                  const watchedCount = watched[a.title]?.length || 0;

                  const animeWithFormattedDate = {
                    ...animeData,
                    startDate: formatDate(animeData.startDate)
                  };

                  return (
                    <motion.div
                      key={a.id || a.title || index}
                      variants={cardItemVariants}
                      whileHover={{ scale: 1.03, y: -4 }}
                      style={{ willChange: "transform, opacity" }}
                      className="flex flex-col relative group"
                    >
                      <CoverCard
                        anime={animeWithFormattedDate}
                        statusKey={safeLib[a.title]?.status}
                        onOpen={() => onOpenAnime(a)}
                        colors={COLORS}
                        watchedCount={watchedCount}
                        viewMode="grid"
                        actionLabel={
                          <StatusButtons
                            anime={a}
                            currentStatus={safeLib[a.title]?.status}
                            onSet={onSet}
                            onRemove={onRemove}
                            colors={COLORS}
                            isListView={false}
                          />
                        }
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* MODAL DE PROGRESO DE CALIBRACIÓN */}
      <AnimatePresence>
        {calibProgress && calibProgress.running && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-28 right-6 z-50 bg-black/85 border-2 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl max-w-sm w-full font-mono text-xs flex flex-col gap-2.5 overflow-hidden"
            style={{ borderColor: 'var(--radio-color, #d4af37)', boxShadow: '0 0 25px var(--radio-color, #d4af37)30' }}
          >
            <div className="flex justify-between items-center text-white font-bold">
              <span className="flex items-center gap-2" style={{ color: 'var(--radio-color, #d4af37)' }}>
                <Zap size={16} className="animate-pulse" /> Calibrando Torrents...
              </span>
              <span className="text-[11px] font-black bg-white/10 px-2 py-0.5 rounded-md border border-white/10">
                {calibProgress.current} / {calibProgress.total}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 truncate">
              Analizando: <span className="text-gray-100 font-bold">{calibProgress.currentAnime}</span>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-white/10 p-0.5">
              <motion.div
                className="h-full rounded-full transition-all duration-300 shadow-[0_0_12px_var(--radio-color,#d4af37)]"
                style={{
                  width: `${(calibProgress.current / (calibProgress.total || 1)) * 100}%`,
                  backgroundColor: 'var(--radio-color, #d4af37)'
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}