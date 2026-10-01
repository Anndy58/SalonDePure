import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from "react";
import { ArrowLeft, Loader2, FolderOpen, Check, MonitorPlay, Search, Info, Download, Star, RefreshCw, Settings2, X, FileVideo, Copy, Play, Plus, Minus, Edit2, LayoutList, LayoutGrid, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Image as ImageIcon, Film, Radio, ExternalLink, Sparkles, Maximize2, Zap } from "lucide-react";
import anime from "animejs";
import { animateIn, animateModalIn, animateButtonPress } from "../utils/animeUtils";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

import StatusButtons from "./StatusButtons.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// 🏷️ COMPONENTES DE TAGS Y BOTONES MEMOIZADOS PARA EVITAR RE-RENDERS Y SHIFTS
// ─────────────────────────────────────────────────────────────────────────────
const MemoizedTag = memo(({ text, type }) => {
  if (!text) return null;
  let styleClass = "bg-gray-800 text-gray-300 border-gray-700 font-medium";
  if (type === 'spanish') {
    styleClass = "bg-amber-950/50 text-amber-400 border-amber-800/60 font-black";
  } else if (type === 'resolution') {
    styleClass = "bg-blue-950/50 text-blue-400 border-blue-800/60 font-black";
  } else if (type === 'group') {
    styleClass = "bg-neutral-800 text-neutral-300 border-neutral-700 font-bold";
  }

  return (
    <span className={`inline-flex items-center justify-center text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0 transition-colors max-w-full truncate ${styleClass}`}>
      {text}
    </span>
  );
});
MemoizedTag.displayName = 'MemoizedTag';

const MemoizedActionButton = memo(({ icon: Icon, onClick, href, title, variant = 'primary' }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer shadow-md shrink-0 w-6 h-6 sm:w-7 sm:h-7";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClasses} bg-blue-900/40 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-700/50`}
        title={title}
      >
        <Icon size={11} />
      </a>
    );
  }

  const variantClass = variant === 'primary'
    ? "bg-[var(--radio-color,#d4af37)] text-black hover:scale-105 active:scale-95 shadow-[0_0_10px_var(--radio-color,#d4af37)40]"
    : "bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white border border-white/10";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${variantClass}`}
      title={title}
    >
      <Icon size={11} />
    </button>
  );
});
MemoizedActionButton.displayName = 'MemoizedActionButton';

const MemoizedDeltaButton = memo(({ delta, onClick, activeColor }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 py-1 rounded-lg border text-[10px] font-black uppercase transition-all hover:bg-white/10 active:scale-95 cursor-pointer shrink-0"
      style={{ borderColor: activeColor || 'var(--radio-color, #d4af37)', color: activeColor || 'var(--radio-color, #d4af37)' }}
    >
      {delta > 0 ? `+${delta}` : delta}
    </button>
  );
});
MemoizedDeltaButton.displayName = 'MemoizedDeltaButton';

// =============================================================================
// 🃏 TARJETA DE TORRENT INTELIGENTE CON LAZY FETCHING POR INTERSECCIÓN
// =============================================================================
const TorrentCardItem = memo(({ torrent, fallbackImage, onOpenLightbox, onDownload, savedSlideIndex, onSlideChange, animeTitle, apiBase, onEnrichImages }) => {
  const isDead = torrent.seeders === 0;
  const isHealthy = torrent.seeders >= 50;
  const healthBorder = isDead ? 'border-red-900/60' : isHealthy ? 'border-green-800/60' : 'border-amber-800/60';
  const [enrichedImages, setEnrichedImages] = useState(torrent.images || []);

  useEffect(() => {
    // Si la tarjeta ya tiene capturas o no hay título, omitir
    if ((torrent.images && torrent.images.length > 0) || !torrent.title) return;

    let isMounted = true;
    // Si la búsqueda no incluye el título del anime actual, permitimos que Anitomy en el backend extraiga el título real
    const searchAnimeTitle = (animeTitle && torrent.title.toLowerCase().includes(animeTitle.toLowerCase()))
      ? animeTitle
      : '';

    fetch(`${apiBase}/enrich?title=${encodeURIComponent(torrent.title)}&animeTitle=${encodeURIComponent(searchAnimeTitle)}`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted && data.images && data.images.length > 0) {
          setEnrichedImages(data.images);
          if (onEnrichImages) onEnrichImages(torrent, data.images);
        }
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [torrent.title, torrent.images, animeTitle, apiBase, onEnrichImages]);

  const activeImages = enrichedImages.length > 0 ? enrichedImages : torrent.images;

  return (
    <div
      className={`group relative flex flex-col bg-black/60 rounded-xl border ${healthBorder} overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 h-full w-full min-w-0`}
    >
      <div className="relative w-full aspect-video bg-black/90 overflow-hidden rounded-t-xl shrink-0">
        <TorrentImageCarousel
          images={activeImages}
          fallbackImage={fallbackImage}
          title={torrent.title}
          onOpenLightbox={onOpenLightbox}
          savedSlideIndex={savedSlideIndex}
          onSlideChange={onSlideChange}
        />
      </div>

      <div className="p-1.5 sm:p-2 flex-1 flex flex-col justify-between gap-1 min-w-0 overflow-hidden">
        <div className="min-w-0">
          <h4 className="text-[10px] sm:text-[11px] font-bold text-gray-200 line-clamp-2 leading-tight mb-1 group-hover:text-[var(--radio-color,#d4af37)] transition-colors break-all" title={torrent.title}>
            {torrent.title}
          </h4>

          <div className="flex flex-wrap gap-0.5 items-center max-w-full overflow-hidden">
            {torrent.parsed?.resolution && <MemoizedTag text={torrent.parsed.resolution} type="resolution" />}
            {torrent.parsed?.group && torrent.parsed.group !== "Desconocido" && <MemoizedTag text={torrent.parsed.group} type="group" />}
            {torrent.parsed?.lang && (
              <span
                className="text-[8px] font-black uppercase px-1 py-0.5 rounded border shrink-0 truncate max-w-full"
                style={{
                  backgroundColor: `${torrent.parsed.lang.color}20`,
                  color: torrent.parsed.lang.color,
                  borderColor: `${torrent.parsed.lang.color}50`
                }}
              >
                {torrent.parsed.lang.label}
              </span>
            )}
          </div>
        </div>

        <div className="pt-1 border-t border-white/10 flex flex-col gap-0.5 min-w-0">
          <div className="flex justify-between items-center text-[8px] sm:text-[9px] font-mono text-gray-400 gap-0.5 min-w-0">
            <div className="min-w-0 truncate">
              <span className="text-gray-300 font-bold block truncate">{torrent.size}</span>
              <span className="text-gray-500 block truncate text-[7px] sm:text-[8px]">{torrent.date !== 'N/A' ? torrent.date : ''}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 text-[8px] sm:text-[9px]">
              <span className="text-green-400 font-bold">↑{torrent.seeders}</span>
              <span className="text-red-400 font-bold">↓{torrent.leechers}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-1 pt-0.5">
            {torrent.infoUrl && (
              <MemoizedActionButton
                icon={ExternalLink}
                href={torrent.infoUrl}
                title="Ver en Tracker"
              />
            )}

            <MemoizedActionButton
              icon={Download}
              onClick={() => onDownload(torrent.magnet)}
              title="Descargar en qBittorrent"
              variant="primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// 🖼️ CARRUSEL DE IMÁGENES FUTURISTA PARA TARJETAS EN MOSAICO CON LIGHTBOX
// =============================================================================
const TorrentImageCarousel = memo(({ images, fallbackImage, title, onOpenLightbox, savedSlideIndex = 0, onSlideChange }) => {
  const [failedUrls, setFailedUrls] = useState({});
  const [activeIndex, setActiveIndex] = useState(savedSlideIndex);

  const handleImageError = useCallback((url) => {
    setFailedUrls((prev) => ({ ...prev, [url]: true }));
  }, []);

  const validCaptures = useMemo(() => {
    if (!Array.isArray(images)) return [];
    return images.filter((img) => img && typeof img === 'string' && !failedUrls[img]);
  }, [images, failedUrls]);

  const hasCaptures = validCaptures.length > 0;
  const currentFallback = fallbackImage || null;

  const handleSlideChange = useCallback((swiper) => {
    setActiveIndex(swiper.activeIndex);
    if (onSlideChange) onSlideChange(swiper.activeIndex);
  }, [onSlideChange]);

  if (!hasCaptures && !currentFallback) {
    return (
      <div className="w-full aspect-video bg-black/80 rounded-t-xl flex flex-col items-center justify-center text-gray-500 gap-0.5 border-b border-white/10">
        <ImageIcon size={18} />
        <span className="text-[8px] font-mono uppercase tracking-wider">Sin vistas previas</span>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black/90 overflow-hidden rounded-t-xl group/carousel select-none border-b border-white/10">
      {hasCaptures ? (
        <>
          <Swiper
            initialSlide={savedSlideIndex}
            modules={[Navigation, Pagination, Autoplay]}
            pagination={{ clickable: true, dynamicBullets: true }}
            autoplay={validCaptures.length > 1 ? { delay: 4000, disableOnInteraction: false } : false}
            onSlideChange={handleSlideChange}
            className="w-full h-full max-w-full max-h-full overflow-hidden"
          >
            {validCaptures.map((url, idx) => (
              <SwiperSlide key={url || idx} className="w-full h-full max-w-full max-h-full relative cursor-pointer overflow-hidden" onClick={() => onOpenLightbox && onOpenLightbox(url)}>
                <img
                  src={url}
                  alt={`${title || 'Captura'} - ${idx + 1}`}
                  onError={() => handleImageError(url)}
                  className="w-full h-full max-w-full max-h-full object-cover transition-transform duration-700 group-hover/carousel:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                <div className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-white/80 opacity-0 group-hover/carousel:opacity-100 transition-opacity backdrop-blur-md">
                  <Maximize2 size={10} />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <span className="absolute top-1 left-1 z-20 text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded-md bg-black/80 text-yellow-400 border border-yellow-500/40 backdrop-blur-md shadow-lg flex items-center gap-0.5">
            <Sparkles size={8} /> {activeIndex + 1}/{validCaptures.length}
          </span>
        </>
      ) : (
        <div className="relative w-full h-full max-w-full max-h-full overflow-hidden">
          <img
            src={currentFallback}
            alt={title || "Portada Anime"}
            className="w-full h-full max-w-full max-h-full object-cover filter brightness-75 transition-transform duration-700 group-hover/carousel:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20 pointer-events-none" />
          <span className="absolute bottom-1 left-1 z-20 text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-black/80 text-gray-300 border border-white/10 backdrop-blur-sm">
            Portada Anime
          </span>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// 🌌 MOTOR VISUAL ACELERADO POR GPU
// =============================================================================
const GeometricBlurEngine = memo(({ settings }) => {
  const shapes = useMemo(() => {
    const configs = [
      { d: "M50 0 L100 100 L0 100 Z" },
      { d: "M25 0 L75 0 L100 50 L75 100 L25 100 L0 50 Z" },
      { d: "M50 0 L100 50 L50 100 L0 50 Z" },
      { d: "M20 20 H80 V80 H20 Z" },
    ];

    return Array.from({ length: settings.count || 8 }).map((_, i) => {
      const config = configs[Math.floor(Math.random() * configs.length)];
      const depth = Math.random();
      return {
        id: i,
        path: config.d,
        size: Math.random() * 200 + 80,
        left: Math.random() * 100 + '%',
        top: Math.random() * 100 + '%',
        duration: (Math.random() * 20 + 15) / (settings.speed || 1) + 's',
        delay: Math.random() * -15 + 's',
        opacity: (Math.random() * 0.25 + 0.08) * depth,
        blurPx: (settings.blur || 40) * (1.1 - depth) * 0.4,
        zIndex: Math.floor(depth * 10),
        rotation: Math.random() * 360 + 'deg',
      };
    });
  }, [settings.count, settings.speed, settings.blur]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <style>{`
        @keyframes gpuDrift {
          0% { transform: translate3d(0, 0, 0); }
          33% { transform: translate3d(80px, 60px, 0); }
          66% { transform: translate3d(-70px, 90px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .gpu-layer {
          position: absolute;
          will-change: transform;
          transform: translateZ(0);
          contain: strict;
        }
        .blur-target {
          width: 100%;
          height: 100%;
          will-change: transform;
          transform: translateZ(0);
        }
      `}</style>
      {shapes.map((s) => (
        <div
          key={s.id}
          className="gpu-layer"
          style={{
            width: s.size, height: s.size, left: s.left, top: s.top,
            zIndex: s.zIndex,
            opacity: s.opacity,
            animation: `gpuDrift ${s.duration} infinite ease-in-out`,
            animationDelay: s.delay,
          }}
        >
          <div
            className="blur-target"
            style={{
              transform: `rotate(${s.rotation}) scale(calc(1 + var(--radio-intensity, 0) * ${settings.pulse || 0.8}))`,
              filter: s.blurPx > 0 ? `blur(${s.blurPx}px)` : 'none',
            }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <path d={s.path} fill="var(--radio-color, #d4af37)" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
});

// =============================================================================
// 🚀 COMPONENTE PRINCIPAL (ANIME DETAIL SCREEN - PÁGINA ÚNICA SIN SCROLL)
// =============================================================================
const AnimeDetailScreen = memo(({
  anime, statusKey, onBack, onSet, onRemove, colors, watched, onToggleWatched, onUpdateLocalCount, bgImage, bgOpacity, activeDownloads
}) => {
  const COLORS = colors;
  const API_BASE = `http://${window.location.hostname}:3000/api`;

  const formatDate = useCallback((dateObj) => {
    if (!dateObj) return 'Fecha desconocida';
    if (typeof dateObj === 'string') return dateObj;
    if (typeof dateObj === 'object' && dateObj.year) {
      const day = dateObj.day ? String(dateObj.day).padStart(2, '0') : '??';
      const month = dateObj.month ? String(dateObj.month).padStart(2, '0') : '??';
      const year = dateObj.year || '????';
      return `${day}/${month}/${year}`;
    }
    return 'Fecha desconocida';
  }, []);

  const [visualSettings, setVisualSettings] = useState(() => {
    const saved = localStorage.getItem("taberna-visual-settings");
    return saved ? JSON.parse(saved) : { count: 8, blur: 40, speed: 1, pulse: 0.8 };
  });
  const [showVisualSettings, setShowVisualSettings] = useState(false);

  useEffect(() => { 
    localStorage.setItem("taberna-visual-settings", JSON.stringify(visualSettings)); 
  }, [visualSettings]);

  const [activeTab, setActiveTab] = useState('torrents');

  const [episodes, setEpisodes] = useState([]);
  const [loadingEps, setLoadingEps] = useState(false);
  const [forcingScan, setForcingScan] = useState(false);
  const [baseQuery, setBaseQuery] = useState(anime.title || "");
  const [torrents, setTorrents] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'seeders', direction: 'desc' });
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("viñedo-torrent-view") || "grid");

  const [lightboxImage, setLightboxImage] = useState(null);
  const [deepScraping, setDeepScraping] = useState({});

  useEffect(() => {
    localStorage.setItem("viñedo-torrent-view", viewMode);
  }, [viewMode]);

  const sortedTorrents = useMemo(() => {
    let sortableItems = [...torrents];
    sortableItems.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'size') {
        aVal = a.rawSize || 0;
        bVal = b.rawSize || 0;
      } else if (sortConfig.key === 'date') {
        aVal = a.rawDate ? new Date(a.rawDate).getTime() : 0;
        bVal = b.rawDate ? new Date(b.rawDate).getTime() : 0;
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortableItems;
  }, [torrents, sortConfig]);

  const [loadingTorrents, setLoadingTorrents] = useState(false);
  const [synopsis, setSynopsis] = useState(anime.synopsis || "");
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [translating, setTranslating] = useState(true);
  const [gridCols, setGridCols] = useState(4);
  const [carouselIndices, setCarouselIndices] = useState({});

  const handleCarouselSlideChange = useCallback((tKey, slideIdx) => {
    setCarouselIndices((prev) => ({ ...prev, [tKey]: slideIdx }));
  }, []);

  const [localFiles, setLocalFiles] = useState([]);
  const [scanningFiles, setScanningFiles] = useState(false);

  const [progressInput, setProgressInput] = useState('');
  const [isEditingProgress, setIsEditingProgress] = useState(false);

  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const stripHtmlTags = (text) => {
    if (!text) return "";
    return text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>?/gm, '');
  };

  const translateText = useCallback(async () => {
    if (!anime.synopsis) { setTranslating(false); return; }

    const cleanText = stripHtmlTags(anime.synopsis);

    try {
      const res = await fetch(`${API_BASE}/translate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: cleanText })
      });
      const data = await res.json();
      setSynopsis(data.text || cleanText);
    } catch (e) { console.error("Translation error", e); }
    setTranslating(false);
  }, [anime.synopsis, API_BASE]);

  useEffect(() => {
    translateText();
  }, [translateText]);

  const scanLocalFiles = useCallback(async () => {
    if (!anime.title) return;
    setScanningFiles(true);
    try {
      const res = await fetch(`${API_BASE}/scan-anime-files?title=${encodeURIComponent(anime.title)}`);
      const data = await res.json();
      if (data.files) {
        setLocalFiles(data.files);
        if (onUpdateLocalCount) {
          onUpdateLocalCount(anime.title, data.files.length);
        }
      } else {
        setLocalFiles([]);
      }
    } catch (e) {
      console.error("Error escaneando archivos:", e);
      setLocalFiles([]);
      showNotification("❌ Error escaneando carpeta local", "error");
    }
    setScanningFiles(false);
  }, [anime.title, API_BASE, onUpdateLocalCount, showNotification]);

  useEffect(() => {
    scanLocalFiles();
  }, [scanLocalFiles]);

  const finalQuery = useMemo(() => {
    return baseQuery.trim();
  }, [baseQuery]);

 const buscarManual = useCallback(async () => {
    if (!finalQuery.trim()) return;
    setLoadingTorrents(true);
    try {
      const res = await fetch(`${API_BASE}/torrents/${encodeURIComponent(finalQuery)}`);
      if (!res.ok) throw new Error("Error de servidor");
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.results || []);
      setTorrents(list);

      if (data.scheduleUpdated && data.newDay) {
        // Confiamos 100% en el día calculado y normalizado por el backend
        const displayDay = data.newDay;
        
        showNotification(`📅 ¡Calendario actualizado al ${displayDay}!`, "info");
        window.dispatchEvent(new CustomEvent('taberna:schedule-updated', {
          detail: { animeTitle: anime.title, newDay: displayDay }
        }));
      } else if (list.length === 0) {
        showNotification("ℹ️ No se encontraron torrents en Prowlarr", "info");
      }
    } catch (e) {
      console.error("Error buscando torrents:", e);
      showNotification("❌ Error conectando con Prowlarr", "error");
    }
    setLoadingTorrents(false);
  }, [finalQuery, API_BASE, showNotification, anime.title]);

  const escanearShoko = useCallback(async () => {
    setLoadingEps(true);
    try {
      const t1 = encodeURIComponent(anime.title || "");
      const t2 = encodeURIComponent(anime.titleEnglish || "");
      const res = await fetch(`${API_BASE}/episodes/search?t1=${t1}&t2=${t2}`);
      const data = await res.json();
      if (data.error) alert(data.error);
      else setEpisodes(data);
    } catch (e) { alert("Error conectando con Shoko."); }
    setLoadingEps(false);
  }, [anime.title, anime.titleEnglish, API_BASE]);

  const forzarEscaneoGlobal = useCallback(async () => {
    setForcingScan(true);
    try {
      const res = await fetch(`${API_BASE}/shoko/scan`, { method: 'POST' });
      const data = await res.json();
      if (data.success) alert("🚀 ¡Shoko despertó!");
      else alert("Error: " + data.error);
    } catch (e) { alert("No se pudo enviar la orden."); }
    setForcingScan(false);
  }, [API_BASE]);

  const enviarAQbittorrent = useCallback(async (magnet) => {
    try {
      const res = await fetch(`${API_BASE}/downloads/add`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ magnet })
      });
      const data = await res.json();
      if (data.success) alert("🚀 ¡Descarga enviada!");
    } catch (e) { alert("Error de conexión."); }
  }, [API_BASE]);

  const copiarEnlaceRed = useCallback((fullPath) => {
    const streamUrl = `${API_BASE}/play?path=${encodeURIComponent(fullPath)}`;
    navigator.clipboard.writeText(streamUrl).then(() => alert("✅ Enlace copiado."));
  }, [API_BASE]);

  const cargarStreamBasico = useCallback((fullPath) => {
    window.open(`${API_BASE}/play?path=${encodeURIComponent(fullPath)}`, '_blank');
  }, [API_BASE]);

  const cancelarDescarga = useCallback(async (torrentData) => {
    const hash = torrentData.hash || torrentData.id;
    if (!hash || !window.confirm("¿Seguro?")) return;
    try {
      await fetch(`${API_BASE}/downloads/cancel`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hash })
      });
    } catch (e) { alert("Error al cancelar."); }
  }, [API_BASE]);

  const handleToggleWatched = useCallback(async (episodePath) => {
    showNotification('📤 Enviando progreso a AniList…', 'loading');
    try {
      onToggleWatched(anime.title, episodePath);
      await new Promise(resolve => setTimeout(resolve, 500));
      const updatedWatched = watched[anime.title] || [];
      showNotification(`✅ Progreso actualizado: ${updatedWatched.length} episodios`, 'success');
    } catch (error) {
      console.error('[handleToggleWatched] Error:', error);
      showNotification('❌ Error al sincronizar. Revisa la consola.', 'error');
    }
  }, [anime.title, onToggleWatched, watched, showNotification]);

  const handleBulkProgressUpdate = useCallback(async (newProgress) => {
    try {
      if (!anime.anilistId) {
        alert('⚠️ Este anime no tiene ID de AniList. Agrégalo a tu biblioteca primero.');
        return;
      }

      const totalEpisodes = anime.episodes || 0;
      const currentProgress = (watched[anime.title] || []).length;

      if (newProgress < 0) {
        alert('No puedes tener episodios negativos.');
        return;
      }

      if (totalEpisodes > 0 && newProgress > totalEpisodes) {
        if (!confirm(`⚠️ Solo hay ${totalEpisodes} episodios en total. ¿Estás seguro de marcar ${newProgress}?`)) {
          return;
        }
      }

      if (newProgress === currentProgress) {
        showNotification(`ℹ️ Ya tienes ${currentProgress} episodios vistos.`, 'info');
        return;
      }

      await handleToggleWatched(`bulk_update_${newProgress}`);
      setProgressInput('');
      setIsEditingProgress(false);
    } catch (error) {
      console.error('[handleBulkProgressUpdate] Error:', error);
      showNotification('❌ Error al actualizar el progreso.', 'error');
    }
  }, [anime.anilistId, anime.episodes, anime.title, watched, handleToggleWatched, showNotification]);

  const abrirEnVLC = useCallback(async (fullPathOrUrl, episodePath = null) => {
    if (episodePath) {
      const isEpWatched = watched[anime.title]?.includes(episodePath);
      if (!isEpWatched) {
        await handleToggleWatched(episodePath);
      }
    }

    const isUrl = fullPathOrUrl.startsWith('http://') || fullPathOrUrl.startsWith('https://');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const streamUrl = isUrl ? fullPathOrUrl : `${API_BASE}/play?path=${encodeURIComponent(fullPathOrUrl)}`;

    if (isMobile) {
      const isAndroid = /Android/i.test(navigator.userAgent);
      try {
        if (isAndroid) {
          const cleanUrl = streamUrl.replace(/^https?:\/\//, '');
          const intentUrl = `intent://${cleanUrl}#Intent;package=org.videolan.vlc;type=video/*;scheme=http;end;`;
          window.location.href = intentUrl;
        } else {
          window.location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(streamUrl)}`;
        }
      } catch (e) {
        window.open(streamUrl, '_blank');
      }
      return;
    }

    if (isUrl) {
      try {
        window.location.href = `vlc://${encodeURIComponent(fullPathOrUrl)}`;
      } catch (e) {
        alert('Error al abrir VLC. Asegúrate de que esté instalado.');
      }
    } else {
      try {
        await fetch(`${API_BASE}/open-local?path=${encodeURIComponent(fullPathOrUrl)}`);
      } catch (e) {
        alert('Error al abrir VLC localmente.');
      }
    }
  }, [anime.title, watched, handleToggleWatched, API_BASE]);

  const formatEpisodeNumber = useCallback((num) => {
    if (!num) return null;
    return `EP ${String(num).padStart(2, '0')}`;
  }, []);

  const currentProgress = (watched[anime.title] || []).length;
  const totalEpisodes = anime.episodes || 0;

  return (
    <>
      <div
        ref={(el) => animateIn(el, { duration: 350 })}
        className="fixed inset-0 z-[60] flex flex-col h-screen max-h-screen overflow-hidden text-gray-200"
        style={{ backgroundColor: `${COLORS.ink}f6`, backdropFilter: 'blur(25px)' }}
      >
        <GeometricBlurEngine settings={visualSettings} />

        {bgImage && (
          <div
            className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: (bgOpacity / 100) * 0.5,
              filter: 'blur(20px) brightness(0.25)',
            }}
          />
        )}

        {/* NOTIFICACIÓN FLOTANTE ANIMADA */}
        {notification && (
          <div
            ref={(el) => animateModalIn(el, { duration: 250 })}
            className={`fixed top-4 right-6 z-[80] px-5 py-3 rounded-2xl shadow-2xl border-2 backdrop-blur-2xl transition-all font-medium text-xs sm:text-sm flex items-center gap-2 ${
              notification.type === 'loading' ? 'bg-blue-950/90 border-blue-500/80 text-blue-200' :
              notification.type === 'success' ? 'bg-green-950/90 border-green-500/80 text-green-200' :
              notification.type === 'info' ? 'bg-yellow-950/90 border-yellow-500/80 text-yellow-200' :
              'bg-red-950/90 border-red-500/80 text-red-200'
            }`}
          >
            {notification.message}
          </div>
        )}

        <div className="relative z-10 flex flex-col h-full w-full max-w-[1700px] mx-auto px-3 sm:px-6 md:px-8 py-3 min-h-0 overflow-hidden">

          {/* 1. TITULO ANIME (BARRA SUPERIOR ANCHO COMPLETO - SEGÚN BOCETO) */}
          <div
            className="flex-shrink-0 border rounded-2xl p-2.5 px-4 flex items-center justify-between shadow-2xl mb-3 transition-all duration-300"
            style={{
              borderColor: 'var(--radio-color, rgba(212, 175, 55, 0.3))',
              backgroundColor: 'rgba(12, 6, 3, 0.94)',
              boxShadow: `0 8px 32px rgba(0, 0, 0, 0.8), 0 0 calc(var(--radio-intensity, 0) * 15px) var(--radio-color, #d4af37)20`,
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider hover:scale-105 transition-all cursor-pointer bg-[#1f100a] hover:bg-[#3d2114] border border-[#3d2114] px-3 py-1.5 rounded-xl text-[#d4af37] shadow-lg shrink-0"
              >
                <ArrowLeft size={15} /> <span>Volver</span>
              </button>

              <div className="flex flex-col min-w-0">
                <h1 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-wider uppercase truncate" style={{ textShadow: `0 0 15px var(--radio-color, #d4af37)50` }}>
                  {anime.title}
                </h1>
                <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400 flex-wrap">
                  {anime.startDate && <span>📅 {formatDate(anime.startDate)}</span>}
                  {anime.score && <span className="flex items-center gap-1 text-yellow-400 font-bold"><Star size={11} fill="#d4af37" /> {anime.score}</span>}
                  {anime.episodes && <span>📺 {anime.episodes} eps</span>}
                  {anime.duration && <span>⏱️ ~{anime.duration} min/ep</span>}
                  {anime.format && <span className="px-1.5 py-0.2 rounded bg-white/10 text-gray-300 font-bold uppercase text-[9px]">{anime.format}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowVisualSettings(true)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/20 transition-all text-gray-400 hover:text-white cursor-pointer border border-white/10"
                title="Ajustes GPU Engine"
              >
                <Settings2 size={15} />
              </button>
            </div>
          </div>

          {/* CONTENEDOR GRID DOS COLUMNAS - AJUSTADO PARA OCURRIR SIN SCROLL GLOBAL */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[300px_1fr] gap-4 overflow-hidden">

            {/* COLUMNA IZQUIERDA: PORTADA, ESTADOS Y CONTROLES */}
            <div className="flex flex-col gap-3 min-h-0 overflow-y-auto custom-scrollbar pr-1 shrink-0">
              {/* BLOQUE PORTADA */}
              <div
                className="relative overflow-hidden rounded-2xl border p-2 bg-black/80 backdrop-blur-xl shadow-xl flex flex-col items-center justify-center shrink-0 w-full max-w-full"
                style={{ borderColor: 'var(--radio-color, #d4af37)' }}
              >
                {anime.image ? (
                  <img
                    src={anime.image}
                    alt={anime.title}
                    className="w-full max-w-full aspect-[2/3] max-h-[380px] object-cover rounded-xl shadow-lg overflow-hidden"
                  />
                ) : (
                  <div className="w-full h-48 bg-black/70 rounded-xl flex items-center justify-center text-xs text-gray-500">
                    Sin Portada
                  </div>
                )}
              </div>

              {/* BLOQUE ESTADOS Y PROGRESO */}
              <div className="p-3 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md shadow-xl flex flex-col gap-3">
                {/* BOTONES DE ESTADO ANILIST */}
                <div className="w-full">
                  <StatusButtons anime={anime} currentStatus={statusKey} onSet={onSet} onRemove={onRemove} colors={COLORS} isListView={false} />
                </div>

                {/* PROGRESO DE EPISODIOS */}
                <div className="bg-black/70 p-2.5 rounded-xl border border-white/10 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-gray-400 uppercase tracking-wider text-[9px]">Progreso Visto</span>
                    <span className="text-white font-mono">{currentProgress} {totalEpisodes > 0 ? `/ ${totalEpisodes}` : ''}</span>
                  </div>

                  {!isEditingProgress ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-black/80 rounded-full h-2 overflow-hidden border border-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: totalEpisodes > 0 ? `${(currentProgress / totalEpisodes) * 100}%` : `${Math.min(currentProgress * 2, 100)}%`,
                            backgroundColor: 'var(--radio-color, #d4af37)',
                            boxShadow: '0 0 10px var(--radio-color, #d4af37)60',
                          }}
                        />
                      </div>
                      <button
                        onClick={() => { setProgressInput(String(currentProgress)); setIsEditingProgress(true); }}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-gray-300 hover:text-white cursor-pointer"
                        title="Editar manualmente"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max={totalEpisodes > 0 ? totalEpisodes : 9999}
                        value={progressInput}
                        onChange={(e) => setProgressInput(e.target.value)}
                        className="flex-1 bg-black/80 border rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[var(--radio-color)]"
                        style={{ borderColor: 'var(--radio-color, #d4af37)' }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = parseInt(progressInput);
                            if (!isNaN(val) && val >= 0) handleBulkProgressUpdate(val);
                          }
                          if (e.key === 'Escape') { setIsEditingProgress(false); setProgressInput(''); }
                        }}
                      />
                      <button
                        onClick={() => {
                          const val = parseInt(progressInput);
                          if (!isNaN(val) && val >= 0) handleBulkProgressUpdate(val);
                        }}
                        className="px-2 py-0.5 rounded-lg text-xs font-black uppercase cursor-pointer"
                        style={{ backgroundColor: 'var(--radio-color, #d4af37)', color: '#000' }}
                      >
                        OK
                      </button>
                    </div>
                  )}

                  {!isEditingProgress && (
                    <div className="flex gap-1 pt-0.5">
                      {[-1, +1, +5, +10].map((delta) => (
                        <MemoizedDeltaButton
                          key={delta}
                          delta={delta}
                          onClick={() => handleBulkProgressUpdate(Math.max(0, currentProgress + delta))}
                        />
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* COLUMNA DERECHA: DESCRIPCION COMPACTA + RADAR PROWLARR Y ARCHIVOS LOCALES */}
            <div className="flex flex-col gap-3 min-w-0 h-full overflow-hidden">

              {/* BLOQUE DESCRIPCION Y DETALLES */}
              <div className="p-3.5 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-md shadow-xl flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between border-b border-white/10 pb-1">
                  <h2 className="text-[11px] font-black uppercase tracking-wider text-[var(--radio-color,#d4af37)] flex items-center gap-1.5">
                    <Info size={13} /> Descripción e Información
                  </h2>
                  {anime.status && (
                    <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/50">
                      {anime.status === 'RELEASING' ? 'En Emisión' : anime.status === 'FINISHED' ? 'Finalizado' : anime.status}
                    </span>
                  )}
                </div>

                {/* GÉNEROS */}
                {Array.isArray(anime.genres) && anime.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider mr-1">Géneros:</span>
                    {anime.genres.map((g, idx) => (
                      <span key={idx} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-200 border border-white/10 hover:bg-white/20 transition-colors">
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {translating ? (
                  <div className="flex items-center gap-2 text-xs animate-pulse text-gray-400 py-1">
                    <Loader2 size={14} className="animate-spin" /> Traduciendo sinopsis...
                  </div>
                ) : (
                  <div className="text-xs leading-relaxed text-gray-300">
                    <p className={showFullSynopsis ? "max-h-32 overflow-y-auto custom-scrollbar" : "line-clamp-2"}>
                      {synopsis || "Sin descripción disponible."}
                    </p>
                    {synopsis && synopsis.length > 180 && (
                      <button
                        onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                        className="mt-1 text-[10px] font-bold text-[var(--radio-color,#d4af37)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {showFullSynopsis ? <>Ver menos <ChevronUp size={12} /></> : <>Ver más <ChevronDown size={12} /></>}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* BLOQUE RADAR PROWLARR Y ARCHIVOS LOCALES (PESTAÑAS) */}
              <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 gap-3 shrink-0">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('torrents');
                        if (torrents.length === 0) buscarManual();
                      }}
                      className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                        activeTab === 'torrents'
                          ? 'bg-[var(--radio-color,#d4af37)] text-black border-[var(--radio-color,#d4af37)] shadow-lg'
                          : 'bg-black/40 text-gray-400 border-white/10 hover:text-white hover:bg-black/70'
                      }`}
                    >
                      <Search size={14} /> Radar Prowlarr ({torrents.length})
                    </button>

                    <button
                      onClick={() => setActiveTab('episodes')}
                      className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                        activeTab === 'episodes'
                          ? 'bg-[var(--radio-color,#d4af37)] text-black border-[var(--radio-color,#d4af37)] shadow-lg'
                          : 'bg-black/40 text-gray-400 border-white/10 hover:text-white hover:bg-black/70'
                      }`}
                    >
                      <Film size={14} /> Archivos Locales ({localFiles.length + episodes.length})
                    </button>
                  </div>
                </div>

                {/* CONTENIDO DE LAS PESTAÑAS (TRANSICIÓN DE FADE PURA SIN SALTOS) */}
                {activeTab === 'torrents' ? (
                  <div
                    ref={(el) => animateIn(el, { duration: 250 })}
                    className="p-3.5 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl flex flex-col gap-3 flex-1 min-h-0 overflow-hidden"
                  >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <Search size={16} style={{ color: 'var(--radio-color, #d4af37)' }} />
                          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">Radar Torrents</h3>
                        </div>

                        <div className="flex items-center gap-2">
                          {viewMode === 'grid' && (
                            <div className="flex items-center bg-black/60 rounded-xl p-1 border border-white/10 text-xs font-bold text-gray-400">
                              <span className="px-1.5 text-[9px] uppercase font-mono text-gray-500">Cols:</span>
                              {[4, 6, 8, 12].map((cols) => (
                                <button
                                  key={cols}
                                  onClick={() => setGridCols(cols)}
                                  className={`px-1.5 py-0.5 rounded-lg transition-all cursor-pointer text-[10px] ${gridCols === cols ? 'bg-[var(--radio-color,#d4af37)] text-black font-black' : 'hover:text-white'}`}
                                  title={`${cols} Columnas`}
                                >
                                  {cols}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center bg-black/60 rounded-xl p-1 border border-white/10">
                            <button
                              onClick={() => setViewMode('grid')}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${viewMode === 'grid' ? 'bg-[var(--radio-color,#d4af37)] text-black' : 'text-gray-400 hover:text-white'}`}
                              title="Vista Mosaico con Capturas"
                            >
                              <LayoutGrid size={14} /> Mosaico
                            </button>
                            <button
                              onClick={() => setViewMode('list')}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold ${viewMode === 'list' ? 'bg-[var(--radio-color,#d4af37)] text-black' : 'text-gray-400 hover:text-white'}`}
                              title="Vista Lista Compacta"
                            >
                              <LayoutList size={14} /> Lista
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <div className="flex-1 flex items-center bg-black/70 border rounded-xl px-3 py-1.5 shadow-inner" style={{ borderColor: 'var(--radio-color, #d4af37)' }}>
                          <Search size={15} className="text-gray-400 mr-2" />
                          <input
                            value={baseQuery}
                            onChange={(e) => setBaseQuery(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') buscarManual(); }}
                            placeholder="Buscar por título del anime..."
                            className="bg-transparent w-full text-xs text-white focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={buscarManual}
                          disabled={loadingTorrents}
                          className="px-4 py-2 rounded-xl font-black text-xs uppercase transition-all shadow-lg cursor-pointer bg-gradient-to-r from-amber-600 to-amber-400 text-black hover:brightness-110 disabled:opacity-50"
                        >
                          {loadingTorrents ? <Loader2 size={14} className="animate-spin inline" /> : 'Buscar'}
                        </button>
                      </div>

                      <div className="flex-1 min-h-0 overflow-hidden">
                        {loadingTorrents && (
                          <div className="text-center py-16" style={{ color: 'var(--radio-color, #d4af37)' }}>
                            <Loader2 size={32} className="animate-spin inline mb-2" />
                            <p className="text-xs font-mono uppercase tracking-widest text-gray-400">Rastreando Prowlarr...</p>
                          </div>
                        )}

                        {!loadingTorrents && torrents.length === 0 && (
                          <div className="text-center py-16 text-gray-400 font-mono text-xs bg-black/20 rounded-2xl border border-white/5">
                            No hay resultados para esta búsqueda. Haz clic en 'Buscar'.
                          </div>
                        )}

                        {!loadingTorrents && torrents.length > 0 && (
                          <>
                            {viewMode === 'grid' ? (
                              <div className="h-full">
                                <VirtuosoGrid
                                  key={`virtuoso-grid-cols-${gridCols}`}
                                  className="custom-scrollbar h-full w-full overflow-x-hidden"
                                  style={{ height: '100%', width: '100%' }}
                                  totalCount={sortedTorrents.length}
                                  listClassName={
                                    gridCols === 12
                                      ? "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-1.5 pb-6 w-full min-w-0"
                                      : gridCols === 8
                                      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 pb-6 w-full min-w-0"
                                      : gridCols === 6
                                      ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pb-6 w-full min-w-0"
                                      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-6 w-full min-w-0"
                                  }
                                  itemContent={(idx) => {
                                    const t = sortedTorrents[idx];
                                    const tKey = t.infoUrl || t.title || idx;
                                    return (
                                      <div className="w-full min-w-0 h-full overflow-hidden">
                                        <TorrentCardItem
                                          key={tKey}
                                          torrent={t}
                                          fallbackImage={anime.image}
                                          onOpenLightbox={(url) => setLightboxImage(url)}
                                          onDownload={enviarAQbittorrent}
                                          savedSlideIndex={carouselIndices[tKey] || 0}
                                          onSlideChange={(slideIdx) => handleCarouselSlideChange(tKey, slideIdx)}
                                          animeTitle={anime.title}
                                          apiBase={API_BASE}
                                        />
                                      </div>
                                    );
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="h-full">
                                <Virtuoso
                                  className="custom-scrollbar h-full"
                                  style={{ height: '100%' }}
                                  data={sortedTorrents}
                                  itemContent={(i, t) => (
                                    <div className="group flex flex-col lg:grid lg:grid-cols-[1fr_auto_80px_110px_60px_60px] gap-2 lg:items-center p-2.5 mb-2 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-all">
                                      <div className="min-w-0 flex flex-col gap-1">
                                        <span className="text-xs font-mono text-blue-400 hover:text-blue-300 break-all leading-snug block font-bold">
                                          {t.title}
                                        </span>

                                        <div className="flex flex-wrap gap-1 items-center">
                                          {t.parsed?.lang && (
                                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border" style={{ backgroundColor: `${t.parsed.lang.color}20`, color: t.parsed.lang.color, borderColor: `${t.parsed.lang.color}40` }}>
                                              {t.parsed.lang.label}
                                            </span>
                                          )}
                                          {t.parsed?.resolution && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/50">{t.parsed.resolution}</span>}
                                          {t.parsed?.group && t.parsed.group !== "Desconocido" && <span className="text-[9px] font-black px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">{t.parsed.group}</span>}
                                        </div>
                                      </div>

                                      <div className="flex justify-start lg:justify-center gap-1.5">
                                        {t.infoUrl && (
                                          <a href={t.infoUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors" title="Info">
                                            <ExternalLink size={13} />
                                          </a>
                                        )}
                                        <button onClick={() => enviarAQbittorrent(t.magnet)} className="p-1.5 rounded-lg bg-[var(--radio-color,#d4af37)] text-black hover:scale-110 cursor-pointer" title="Descargar">
                                          <Download size={13} />
                                        </button>
                                      </div>

                                      <div className="hidden lg:block text-right text-xs font-mono text-gray-300 font-bold">{t.size}</div>
                                      <div className="hidden lg:block text-center text-[10px] font-mono text-gray-400">{t.date !== 'N/A' ? t.date : '-'}</div>
                                      <div className="hidden lg:block text-center text-xs font-mono text-green-400 font-bold">↑{t.seeders}</div>
                                      <div className="hidden lg:block text-center text-xs font-mono text-red-400 font-bold">↓{t.leechers}</div>
                                    </div>
                                  )}
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      ref={(el) => animateIn(el, { duration: 250 })}
                      className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar"
                    >
                      {/* ARCHIVOS LOCALES */}
                      <div className="p-4 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                            <FileVideo size={16} style={{ color: 'var(--radio-color, #d4af37)' }} />
                            Archivos Locales en Disco ({localFiles.length})
                          </h3>

                          {/* ACCIONES LOCALES */}
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={scanLocalFiles}
                              disabled={scanningFiles}
                              className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 bg-blue-950/60 text-blue-400 border border-blue-600/80 hover:bg-blue-900/80 transition-all cursor-pointer shadow-md"
                            >
                              {scanningFiles ? <Loader2 size={12} className="animate-spin" /> : <FileVideo size={12} />}
                              <span>Escanear Locales</span>
                            </button>

                            <button
                              onClick={escanearShoko}
                              disabled={loadingEps}
                              className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 bg-amber-950/60 text-amber-400 border border-amber-600/80 hover:bg-amber-900/80 transition-all cursor-pointer shadow-md"
                            >
                              {loadingEps ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />}
                              <span>Consultar Shoko</span>
                            </button>

                            <button
                              onClick={forzarEscaneoGlobal}
                              disabled={forcingScan}
                              className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-600/80 hover:bg-emerald-900/80 transition-all cursor-pointer shadow-md"
                            >
                              {forcingScan ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                              <span>Forzar Shoko</span>
                            </button>
                          </div>
                        </div>

                        {scanningFiles ? (
                          <div className="text-center py-8 text-gray-400">
                            <Loader2 size={24} className="animate-spin inline mr-2 text-[var(--radio-color)]" />
                            Buscando archivos locales...
                          </div>
                        ) : localFiles.length === 0 ? (
                          <div className="text-center py-8 text-gray-400 font-mono text-xs bg-black/30 rounded-xl border border-white/5">
                            No se encontraron vídeos en disco para este anime.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                            {localFiles.map((file, idx) => {
                              const fileSize = (file.size / (1024 * 1024)).toFixed(1);
                              const epNumber = file.episodeNumber ? formatEpisodeNumber(file.episodeNumber) : null;
                              const score = file.score || 0;
                              const isHighMatch = score >= 70;

                              return (
                                <div
                                  key={idx}
                                  className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-2.5 rounded-xl border transition-all gap-2 ${
                                    isHighMatch ? 'bg-green-950/20 border-green-800/40' : 'bg-white/5 border-white/10'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-bold text-white break-all leading-snug block">
                                      {file.name}
                                    </span>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className="text-[9px] font-mono text-gray-400 bg-black/50 px-1.5 py-0.5 rounded border border-white/5">
                                        {fileSize} MB • {file.ext.toUpperCase()}
                                      </span>
                                      {epNumber && (
                                        <span className="text-[9px] font-mono text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded border border-yellow-800/50">
                                          {epNumber}
                                        </span>
                                      )}
                                      {score > 0 && (
                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                          isHighMatch ? 'text-green-400 bg-green-900/30 border border-green-800/50' : 'text-gray-400 bg-gray-800/50'
                                        }`}>
                                          Match: {score}%
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                    <button
                                      onClick={() => copiarEnlaceRed(file.path)}
                                      className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition-all cursor-pointer"
                                      title="Copiar URL Streaming"
                                    >
                                      <Copy size={13} />
                                    </button>
                                    <button
                                      onClick={() => cargarStreamBasico(file.path)}
                                      className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition-all cursor-pointer"
                                      title="Reproducir en Navegador"
                                    >
                                      <Play size={13} />
                                    </button>
                                    <button
                                      onClick={() => abrirEnVLC(file.path, null)}
                                      className="px-2.5 py-1.5 rounded-lg text-xs font-black uppercase transition-all shadow-md flex items-center gap-1 cursor-pointer hover:brightness-110"
                                      style={{ backgroundColor: 'var(--radio-color, #d4af37)', color: COLORS.ink }}
                                    >
                                      <MonitorPlay size={13} /> VLC
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* SHOKO EPISODIOS */}
                      {episodes.length > 0 && (
                        <div className="p-4 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-xl">
                          <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3 flex items-center gap-1.5">
                            <FolderOpen size={16} style={{ color: 'var(--radio-color, #d4af37)' }} />
                            Episodios Indexados en Shoko ({episodes.length})
                          </h3>
                          <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                            {episodes.map((ep, idx) => {
                              const isEpWatched = watched[anime.title]?.includes(ep.path);
                              return (
                                <div
                                  key={idx}
                                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-2.5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all gap-2"
                                >
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-xs font-bold block leading-snug ${isEpWatched ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                                      {ep.epString} - {ep.title}
                                    </span>
                                    <span className="text-[9px] font-mono text-gray-500 block mt-0.5 break-all">
                                      {ep.fileName}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                    <button
                                      onClick={() => handleToggleWatched(ep.path)}
                                      className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                        isEpWatched ? 'bg-green-950/40 border-green-800 text-green-400' : 'bg-black/50 border-white/10 text-gray-400'
                                      }`}
                                    >
                                      <Check size={12} /> {isEpWatched ? 'Visto' : 'Marcar'}
                                    </button>
                                    <button onClick={() => cargarStreamBasico(ep.path)} className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 cursor-pointer">Web</button>
                                    <button onClick={() => abrirEnVLC(ep.path, ep.path)} className="px-2.5 py-1 text-[10px] font-black uppercase rounded-lg transition-all shadow-md flex items-center gap-1 cursor-pointer" style={{ backgroundColor: 'var(--radio-color, #d4af37)', color: COLORS.ink }}>
                                      <MonitorPlay size={12} /> VLC
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>

            </div>

          </div>
        </div>

        {/* BARRA INFERIOR DE DESCARGAS ACTIVAS */}
        {activeDownloads && activeDownloads.length > 0 && (
          <div
            className="fixed bottom-0 left-0 right-0 bg-black/95 border-t-2 z-50 p-2 shadow-2xl backdrop-blur-2xl transition-all"
            style={{ borderColor: 'var(--radio-color, #d4af37)' }}
          >
            <div className="max-w-[1700px] mx-auto flex items-center gap-3">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 shrink-0 flex items-center gap-1">
                <Download size={13} /> PC Descargando ({activeDownloads.length}):
              </h4>
              <div className="flex gap-2 overflow-x-auto custom-scrollbar py-0.5 flex-1">
                {[...activeDownloads].reverse().map((dl, i) => (
                  <div key={i} className="min-w-[180px] max-w-[220px] bg-blue-950/30 p-2 rounded-xl border border-blue-900/50 flex-shrink-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-1 mb-0.5">
                      <div className="text-[10px] text-white line-clamp-1 font-bold">{dl.title}</div>
                      <button onClick={() => cancelarDescarga(dl)} className="text-[8px] font-black uppercase bg-red-900/60 text-red-300 px-1 py-0.5 rounded border border-red-800 hover:bg-red-600 hover:text-white cursor-pointer">X</button>
                    </div>
                    <div>
                      <div className="flex justify-between text-[9px] font-mono text-blue-300 mb-0.5"><span>{dl.size}</span><span className="font-bold">{dl.progress}%</span></div>
                      <div className="w-full bg-black/80 rounded-full h-1 overflow-hidden"><div className="bg-blue-500 h-full rounded-full" style={{ width: `${dl.progress}%` }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* LIGHTBOX PREVIEW EN PANTALLA COMPLETA */}
      {lightboxImage && (
        <div
          ref={(el) => animateIn(el, { duration: 200 })}
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-black/60 text-white hover:bg-white/20 transition-all border border-white/20 cursor-pointer"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Preview Fullscreen"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10"
          />
        </div>
      )}

      {showVisualSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div
            className="w-full max-w-md p-6 rounded-3xl border-2 bg-black/80 backdrop-blur-3xl shadow-2xl text-white"
            style={{ borderColor: 'var(--radio-color, #d4af37)' }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--radio-color, #d4af37)' }}><Settings2 size={20} /> Motor de Manchas</h2>
              <button onClick={() => setShowVisualSettings(false)} className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="flex flex-col gap-5">
              {Object.entries({
                count: { label: 'Densidad de Figuras', min: 2, max: 20, step: 1, unit: '' },
                blur: { label: 'Nivel de Mancha', min: 0, max: 100, step: 1, unit: 'px' },
                speed: { label: 'Velocidad de Flujo', min: 0.1, max: 3, step: 0.1, unit: 'x' },
                pulse: { label: 'Energía del Pulso', min: 0, max: 3, step: 0.1, unit: 'x' },
              }).map(([key, cfg]) => (
                <div key={key} className="flex flex-col gap-2">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400"><span>{cfg.label}</span><span>{visualSettings[key]}{cfg.unit}</span></div>
                  <input type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={visualSettings[key]} onChange={(e) => setVisualSettings({ ...visualSettings, [key]: parseFloat(e.target.value) })} className="w-full accent-white h-1 bg-white/10 rounded-lg cursor-pointer" />
                </div>
              ))}
            </div>
            <button onClick={() => setShowVisualSettings(false)} className="w-full mt-8 py-3 rounded-xl font-black uppercase text-xs transition-all shadow-lg hover:brightness-125" style={{ backgroundColor: 'var(--radio-color, #d4af37)', color: 'black' }}>Guardar</button>
          </div>
        </div>
      )}
    </>
  );
});

export default AnimeDetailScreen;