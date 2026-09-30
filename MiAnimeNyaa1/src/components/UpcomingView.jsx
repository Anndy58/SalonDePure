// src/components/UpcomingView.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import anime from 'animejs';
import { animateIn, animateButtonPress } from '../utils/animeUtils';
import { Calendar, ExternalLink, Loader2, Sparkles, Newspaper, AlertCircle, LayoutGrid, List } from 'lucide-react';

// ─── MODOS DE VISUALIZACIÓN PARA ESTRENOS ──────────────────────────
const RELEASE_VIEW_MODES = [
  { id: 'list', label: '📋 Lista', cols: 1 },
  { id: 'grid_2', label: '📐 2 Col.', cols: 2 },
  { id: 'grid_3', label: '📐 3 Col.', cols: 3 },
];

// ─── MODOS PARA NOTICIAS ────────────────────────────────────────────
const NEWS_VIEW_MODES = [
  { id: 'list', label: '📋 Lista', cols: 1 },
  { id: 'grid_2', label: '📐 2 Col.', cols: 2 },
  { id: 'grid_3', label: '📐 3 Col.', cols: 3 },
];

const UpcomingView = ({ onOpenAnime, library, colors }) => {
  const [releases, setReleases] = useState([]);
  const [news, setNews] = useState([]);
  const [loadingReleases, setLoadingReleases] = useState(true);
  const [loadingNews, setLoadingNews] = useState(true);
  const [errorReleases, setErrorReleases] = useState(null);
  const [errorNews, setErrorNews] = useState(null);
  const [newsCategory, setNewsCategory] = useState('anime');
  const [releaseViewMode, setReleaseViewMode] = useState('list');
  const [newsViewMode, setNewsViewMode] = useState('list');

  // ─── ESTRENOS ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchReleases = async () => {
      setLoadingReleases(true);
      try {
        const res = await fetch(
          `http://${window.location.hostname}:3000/api/anime/catalog?status=NOT_YET_RELEASED&sort=START_DATE_DESC`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const parsedData = (Array.isArray(data) ? data : []).map(item => {
          if (typeof item.startDate === 'string' && item.startDate !== '???') {
            const parts = item.startDate.split('/');
            if (parts.length === 3) {
              return { ...item, startDate: { year: parseInt(parts[2]), month: parseInt(parts[1]), day: parseInt(parts[0]) } };
            }
          }
          return item;
        });

        const sorted = parsedData.sort((a, b) => {
          if (a.startDate && b.startDate) {
            const dateA = new Date(a.startDate.year, a.startDate.month - 1, a.startDate.day || 1);
            const dateB = new Date(b.startDate.year, b.startDate.month - 1, b.startDate.day || 1);
            return dateA - dateB;
          }
          if (a.startDate) return -1;
          if (b.startDate) return 1;
          return a.title.localeCompare(b.title);
        });

        setReleases(sorted);
      } catch (err) {
        console.error('[UpcomingView] Error en estrenos:', err);
        setErrorReleases('No se pudieron cargar los estrenos.');
      } finally {
        setLoadingReleases(false);
      }
    };
    fetchReleases();
  }, []);

  // ─── NOTICIAS ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchNews = async () => {
      setLoadingNews(true);
      setErrorNews(null);
      try {
        const url = `http://${window.location.hostname}:3000/api/news?category=${newsCategory}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setNews(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('[UpcomingView] Error en noticias:', err);
        setErrorNews('No se pudieron cargar las noticias.');
      } finally {
        setLoadingNews(false);
      }
    };
    fetchNews();
  }, [newsCategory]);

  // ─── AGRUPAR ESTRENOS ─────────────────────────────────────────────
  const groupedReleases = useMemo(() => {
    const groups = {};
    releases.forEach(anime => {
      let key = 'Sin fecha confirmada';
      if (anime.startDate && anime.startDate.year && anime.startDate.month) {
        const date = new Date(anime.startDate.year, anime.startDate.month - 1, 1);
        key = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(anime);
    });
    return groups;
  }, [releases]);

  // ─── FORMATEADORES ────────────────────────────────────────────────
  const formatMonthYear = (startDate) => {
    if (!startDate || !startDate.year || !startDate.month) return '📅 Fecha por confirmar';
    const date = new Date(startDate.year, startDate.month - 1, startDate.day || 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const getDaysUntil = (startDate) => {
    if (!startDate || !startDate.year || !startDate.month || !startDate.day) return null;
    const today = new Date();
    const release = new Date(startDate.year, startDate.month - 1, startDate.day);
    const diff = Math.ceil((release - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const cleanHtml = (html) => {
    if (!html) return 'Sin descripción.';
    return html.replace(/<[^>]*>?/gm, '').substring(0, 200) + (html.length > 200 ? '...' : '');
  };

  const getCategoryEmoji = (cat) => {
    if (cat === 'anime') return '🎌';
    if (cat === 'cultura') return '🎭';
    if (cat === 'japon') return '🗾';
    return '📰';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
      const date = new Date(dateString);
      if (isNaN(date)) return 'Fecha desconocida';
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return 'Fecha desconocida'; }
  };

  // ─── GET GRID CLASS ──────────────────────────────────────────────
  const getGridClass = (mode, itemsCount) => {
    if (mode === 'list') return 'space-y-3';
    const cols = mode === 'grid_2' ? 2 : 3;
    return `grid grid-cols-1 sm:grid-cols-${Math.min(cols, itemsCount || 1)} gap-3`;
  };

  const totalReleases = releases.length;
  const withDate = releases.filter(a => a.startDate && a.startDate.year).length;

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-6">

      {/* ─── TÍTULO ──────────────────────────────────────────────────── */}
      <div className="border-b-2 pb-4 flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
        <Sparkles size={24} style={{ color: 'var(--radio-color, #d4af37)' }} />
        <h2 className="text-2xl font-black uppercase tracking-widest text-white">Próximamente</h2>
        <span className="text-xs font-mono text-gray-500 ml-auto">
          {totalReleases} estrenos · {withDate} con fecha · {totalReleases - withDate} pendientes
        </span>
      </div>

      {/* ─── DOS COLUMNAS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

        {/* ─── COLUMNA IZQUIERDA: ESTRENOS ──────────────────────────── */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--radio-color, #d4af37)' }}>
              <Calendar size={18} /> Estrenos
            </h3>

            {/* SELECTOR DE GRID PARA ESTRENOS */}
            <div className="flex gap-1 bg-black/40 rounded-lg p-1 border border-[var(--radio-color)]/20">
              {RELEASE_VIEW_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setReleaseViewMode(mode.id)}
                  className={`p-1.5 rounded-md transition-all ${
                    releaseViewMode === mode.id
                      ? 'bg-[var(--radio-color)] text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title={mode.label}
                >
                  {mode.id === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
            {loadingReleases ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={28} className="animate-spin text-[var(--radio-color)]" />
              </div>
            ) : errorReleases ? (
              <div className="text-center text-yellow-400 p-4 bg-yellow-950/20 rounded-xl border border-yellow-800/30">
                <AlertCircle size={20} className="inline mr-2" /> {errorReleases}
              </div>
            ) : releases.length === 0 ? (
              <div className="text-center text-gray-500 p-8 bg-black/30 rounded-xl border border-dashed border-gray-700">
                No hay estrenos programados próximamente.
              </div>
            ) : (
              Object.entries(groupedReleases).map(([monthKey, animes]) => (
                <div key={monthKey} className="space-y-2">
                  <div className="flex items-center gap-2 sticky top-0 bg-[#0a0502] py-1 z-10">
                    <span className="text-xs font-black uppercase tracking-widest text-[var(--radio-color)]">
                      {monthKey}
                    </span>
                    <span className="text-[9px] text-gray-500">({animes.length})</span>
                    <div className="flex-1 border-b border-[var(--radio-color)]/20"></div>
                  </div>

                  <div className={getGridClass(releaseViewMode, animes.length)}>
                    {animes.map((anime, idx) => {
                      const inLibrary = library && library[anime.title];
                      const daysUntil = getDaysUntil(anime.startDate);
                      const isSoon = daysUntil !== null && daysUntil <= 30 && daysUntil >= 0;

                      return (
                        <div
                          key={anime.id || idx}
                          ref={(el) => animateIn(el, { duration: 250, delay: idx * 20 })}
                          className={`group p-3 rounded-xl border bg-black/40 hover:bg-black/60 transition-all cursor-pointer hover:border-[var(--radio-color)] ${
                            releaseViewMode === 'list' ? 'flex gap-3' : ''
                          } ${isSoon ? 'border-yellow-800/50 bg-yellow-950/10' : ''}`}
                          style={{ borderColor: 'var(--radio-color, #2a160d)' }}
                          onClick={(e) => { animateButtonPress(e.currentTarget); onOpenAnime(anime); }}
                        >
                          {anime.image && (
                            <div className={`flex-shrink-0 rounded-lg overflow-hidden bg-black/60 ${
                              releaseViewMode === 'list' ? 'w-16 h-20' : 'w-full aspect-video mb-2'
                            }`}>
                              <img
                                src={anime.image}
                                alt={anime.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white group-hover:text-[var(--radio-color)] transition-colors line-clamp-2">
                              {anime.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                              {anime.startDate && anime.startDate.year ? (
                                <>
                                  <Calendar size={12} />
                                  <span>{formatMonthYear(anime.startDate)}</span>
                                  {isSoon && (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                      🔥 {daysUntil === 0 ? '¡HOY!' : `en ${daysUntil}d`}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-500">📅 Fecha por confirmar</span>
                              )}
                            </div>
                            {inLibrary && (
                              <span className="text-[9px] px-2 py-0.5 rounded bg-green-900/40 text-green-400 border border-green-800 inline-block mt-1">
                                En colección
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── COLUMNA DERECHA: NOTICIAS ───────────────────────────── */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--radio-color, #d4af37)' }}>
              <Newspaper size={18} /> Noticias
              <span className="text-xs font-mono text-gray-500 ml-2">{news.length}</span>
            </h3>

            {/* SELECTOR DE GRID PARA NOTICIAS */}
            <div className="flex gap-1 bg-black/40 rounded-lg p-1 border border-[var(--radio-color)]/20">
              {NEWS_VIEW_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setNewsViewMode(mode.id)}
                  className={`p-1.5 rounded-md transition-all ${
                    newsViewMode === mode.id
                      ? 'bg-[var(--radio-color)] text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title={mode.label}
                >
                  {mode.id === 'list' ? <List size={14} /> : <LayoutGrid size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* PESTAÑAS DE CATEGORÍAS */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { id: 'anime', label: '🎌 Anime' },
              { id: 'cultura', label: '🎭 Cultura' },
              { id: 'japon', label: '🗾 Japón' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setNewsCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  newsCategory === cat.id
                    ? 'bg-[var(--radio-color)] text-black shadow-[0_0_20px_var(--radio-color)]'
                    : 'bg-black/40 text-gray-400 hover:text-white border border-[var(--radio-color)]/30'
                }`}
                style={{
                  backgroundColor: newsCategory === cat.id ? 'var(--radio-color, #d4af37)' : 'transparent',
                  borderColor: 'var(--radio-color, #2a160d)',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {loadingNews ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 size={28} className="animate-spin text-[var(--radio-color)]" />
              </div>
            ) : errorNews ? (
              <div className="text-center text-yellow-400 p-4 bg-yellow-950/20 rounded-xl border border-yellow-800/30">
                <AlertCircle size={20} className="inline mr-2" /> {errorNews}
              </div>
            ) : news.length === 0 ? (
              <div className="text-center text-gray-500 p-8 bg-black/30 rounded-xl border border-dashed border-gray-700">
                No hay noticias disponibles.
              </div>
            ) : (
              <div className={getGridClass(newsViewMode, news.length)}>
                {news.map((item, idx) => (
                  <a
                    key={`${item.id}-${idx}`}
                    ref={(el) => animateIn(el, { duration: 250, delay: idx * 25 })}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group p-3 rounded-xl border bg-black/40 hover:bg-black/60 transition-all hover:border-[var(--radio-color)] ${
                      newsViewMode === 'list' ? 'flex gap-3' : ''
                    }`}
                    style={{ borderColor: 'var(--radio-color, #2a160d)' }}
                  >
                    {item.image && (
                      <div className={`flex-shrink-0 rounded-lg overflow-hidden bg-black/60 ${
                        newsViewMode === 'list' ? 'w-16 h-16' : 'w-full aspect-video mb-2'
                      }`}>
                        <img
                          src={item.image}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white group-hover:text-[var(--radio-color)] transition-colors line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">
                        {cleanHtml(item.description)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 flex-wrap">
                        <span>{formatDate(item.pubDate)}</span>
                        <ExternalLink size={10} className="opacity-50" />
                        {item.category && (
                          <span className="px-2 py-0.5 rounded bg-[var(--radio-color)]/20 text-[8px] text-[var(--radio-color)]">
                            {getCategoryEmoji(item.category)} {item.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default UpcomingView;