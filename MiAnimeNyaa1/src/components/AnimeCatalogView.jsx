import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Loader2, Search, X, Sparkles, Star, ListFilter, RefreshCw, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from 'framer-motion';
import CoverCard from "./CoverCard";
import { useStore } from "../store/useStore";

const resultCache = new Map();

const AnimeCatalogView = React.memo(({
  onOpenAnime,
  onSet,
  onRemove,
  colors,
}) => {
  const { library, watched, recommendations, anilistUser } = useStore();
  const COLORS = colors;

  const [searchQuery, setSearchQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [season, setSeason] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("RELEVANCE");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultCount, setResultCount] = useState(0);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40;

  const totalPages = Math.ceil(results.length / itemsPerPage);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [genre, year, season, status, sort, searchQuery]);

  const paginatedCatalog = results.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const GENRES = useMemo(() => [
    "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi",
    "Slice of Life", "Romance", "Supernatural", "Mystery", "Psychological",
    "Thriller", "Horror", "Sports", "Magic", "Mecha", "Military",
    "School", "Musical", "Parody", "Vampire", "Demon", "Angel",
    "Harem", "Isekai", "Reincarnation", "Dungeon", "Lifestyle",
    "Shounen", "Shoujo", "Seinen", "Josei", "Ecchi"
  ], []);

  const SEASONS = useMemo(() => [
    { value: "WINTER", label: "Invierno" },
    { value: "SPRING", label: "Primavera" },
    { value: "SUMMER", label: "Verano" },
    { value: "FALL", label: "Otoño" }
  ], []);

  const YEARS = useMemo(() => Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i), []);

  const SORT_OPTIONS = useMemo(() => [
    { value: "RELEVANCE", label: "Relevancia" },
    { value: "POPULARITY_DESC", label: "Popularidad" },
    { value: "SCORE_DESC", label: "Mejor puntuados" },
    { value: "START_DATE_DESC", label: "Más recientes" },
    { value: "TITLE_ROMAJI", label: "A-Z" }
  ], []);

  const getCacheKey = useCallback(() => {
    return JSON.stringify({ genre, year, season, status, sort, query: searchQuery });
  }, [genre, year, season, status, sort, searchQuery]);

  const fetchResults = useCallback(async (forceRefresh = false) => {
    const cacheKey = getCacheKey();

    if (!forceRefresh && resultCache.has(cacheKey)) {
      const cached = resultCache.get(cacheKey);
      setResults(cached.results);
      setResultCount(cached.count);
      return;
    }

    setLoading(true);

    try {
      let data;

      if (searchQuery.trim().length >= 3) {
        const res = await fetch(
          `http://${window.location.hostname}:3000/api/anime/search?q=${encodeURIComponent(searchQuery)}`
        );
        data = await res.json();
        data = Array.isArray(data) ? data : [];
      } else {
        const queryParams = new URLSearchParams();
        if (genre) queryParams.append("genre", genre);
        if (year) queryParams.append("year", year);
        if (season) queryParams.append("season", season);
        if (sort && sort !== "RELEVANCE") queryParams.append("sort", sort);
        if (status) queryParams.append("status", status);

        const res = await fetch(
          `http://${window.location.hostname}:3000/api/anime/catalog?${queryParams.toString()}`
        );
        data = await res.json();
        data = Array.isArray(data) ? data : [];

        if (sort === "RELEVANCE") {
          data.sort((a, b) => {
            const aScore = (parseFloat(a.score) || 0) * 1.5 + (parseFloat(a.popularity) || 0) / 1000;
            const bScore = (parseFloat(b.score) || 0) * 1.5 + (parseFloat(b.popularity) || 0) / 1000;
            return bScore - aScore;
          });
        }
      }

      resultCache.set(cacheKey, { results: data, count: data.length });

      if (resultCache.size > 50) {
        const firstKey = resultCache.keys().next().value;
        resultCache.delete(firstKey);
      }

      setResults(data);
      setResultCount(data.length);
    } catch (error) {
      console.error('[Catálogo] Error:', error);
      setResults([]);
      setResultCount(0);
    } finally {
      setLoading(false);
    }
  }, [genre, year, season, status, sort, searchQuery]);

  // Debounce de 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchResults]);

  const handleRefresh = useCallback(() => {
    resultCache.clear();
    fetchResults(true);
  }, [fetchResults]);

  const handleSet = useCallback((anime, status) => {
    onSet(anime, status);
  }, [onSet]);

  const handleRemove = useCallback((title) => {
    onRemove(title);
  }, [onRemove]);



  // ============================
  // RENDERIZADO CONDICIONAL
  // ============================

  // Carga inicial: mostramos spinner
  if (loading && results.length === 0 && searchQuery.trim().length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4">
        <Loader2 size={40} className="animate-spin text-[var(--radio-color)]" />
        <span className="text-sm font-mono font-bold tracking-widest uppercase text-[var(--radio-color)]/70">
          Cargando catálogo...
        </span>
      </div>
    );
  }

  // Siempre mostramos el grid, incluso si no hay resultados.
  // El grid se encargará de mostrar un mensaje vacío si es necesario.
  return (
    <div className="flex h-full overflow-hidden">

      {/* Sidebar de filtros */}
      <aside
        className="w-64 shrink-0 h-full overflow-y-auto custom-scrollbar bg-[#0d0603] border-r-4 p-4 space-y-5 sticky top-0"
        style={{ borderColor: 'var(--radio-color, #d4af37)' }}
      >
        <div className="flex items-center justify-between border-b-2 pb-3" style={{ borderColor: 'var(--radio-color, #d4af37)' }}>
          <div className="flex items-center gap-2">
            <ListFilter size={18} className="text-[var(--radio-color)]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-[var(--radio-color)]">
              Filtros
            </h2>
          </div>
          {anilistUser && recommendations.length > 0 && (
            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="p-1.5 rounded-lg border transition-all hover:bg-[var(--radio-color)]/20"
              style={{ borderColor: 'var(--radio-color, #2a160d)', color: 'var(--radio-color)' }}
              title={showRecommendations ? "Ocultar recomendaciones" : "Mostrar recomendaciones"}
            >
              {showRecommendations ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar anime (mínimo 3 caracteres)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-black/50 border rounded-lg text-sm text-white placeholder-gray-500 focus:border-[var(--radio-color)] focus:shadow-[0_0_15px_var(--radio-color)_10] transition-all outline-none"
            style={{ borderColor: 'var(--radio-color, #2a160d)' }}
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Género</label>
          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            className="w-full bg-black/70 border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--radio-color)] transition-all"
            style={{ borderColor: 'var(--radio-color, #2a160d)' }}
          >
            <option value="">Todos</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Año</label>
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="w-full bg-black/70 border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--radio-color)] transition-all"
            style={{ borderColor: 'var(--radio-color, #2a160d)' }}
          >
            <option value="">Todos</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Temporada</label>
          <select
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="w-full bg-black/70 border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--radio-color)] transition-all"
            style={{ borderColor: 'var(--radio-color, #2a160d)' }}
          >
            <option value="">Todas</option>
            {SEASONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Estado</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full bg-black/70 border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--radio-color)] transition-all"
            style={{ borderColor: 'var(--radio-color, #2a160d)' }}
          >
            <option value="">Todos</option>
            <option value="RELEASING">📡 Emitiendo</option>
            <option value="FINISHED">✅ Finalizado</option>
            <option value="NOT_YET_RELEASED">⏳ Próximo</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-1">Orden</label>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="w-full bg-black/70 border rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--radio-color)] transition-all"
            style={{ borderColor: 'var(--radio-color, #2a160d)' }}
          >
            {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <button
          onClick={handleRefresh}
          className="w-full mt-2 py-2 rounded-lg border-2 text-xs font-black uppercase tracking-widest transition-all hover:bg-[var(--radio-color)] hover:text-black flex items-center justify-center gap-2"
          style={{ borderColor: 'var(--radio-color, #2a160d)', color: 'var(--radio-color)' }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refrescar
        </button>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col h-full overflow-hidden pl-6">

        {/* Recomendaciones */}
        {anilistUser && recommendations.length > 0 && showRecommendations && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-4 p-3 rounded-xl bg-gradient-to-r from-[#1a0d06] to-[#0d0603] border border-[var(--radio-color)]/20 shadow-[0_0_30px_var(--radio-color)_5] shrink-0"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--radio-color)]" />
                <span className="text-xs font-black uppercase tracking-widest text-[var(--radio-color)]">
                  Recomendaciones
                </span>
                <span className="text-[9px] text-gray-400 bg-black/40 px-2 py-0.5 rounded-full border border-[var(--radio-color)]/20">
                  {recommendations.length}
                </span>
              </div>
              <button
                onClick={() => setShowRecommendations(false)}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
                title="Ocultar recomendaciones"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar snap-x snap-mandatory">
              {recommendations.map((rec, idx) => (
                <button
                  key={idx}
                  onClick={() => onOpenAnime(rec)}
                  className="snap-start flex-shrink-0 w-[110px] text-left transition-all duration-300 hover:scale-105 group"
                >
                  <div className="relative rounded-lg overflow-hidden shadow-lg border border-[var(--radio-color)]/30 group-hover:border-[var(--radio-color)] transition-all">
                    <img
                      src={rec.image}
                      alt={rec.title}
                      className="w-full h-auto aspect-[2/3] object-cover group-hover:brightness-110 transition-all"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/90 to-transparent">
                      <p className="text-[9px] font-bold text-white truncate">{rec.title}</p>
                      <div className="flex items-center gap-1">
                        <Star size={8} fill="var(--radio-color)" color="var(--radio-color)" />
                        <span className="text-[8px] text-gray-300">{rec.score || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Cabecera con contador */}
        <div className="flex justify-between items-center mb-2 shrink-0">
          <span className="text-sm font-mono text-gray-400">
            {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 ? (
              <span className="text-yellow-500 font-bold">⏳ Escribe al menos 3 caracteres</span>
            ) : loading ? (
              <span className="text-blue-400 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Buscando...
              </span>
            ) : (
              <span><span className="font-bold text-[var(--radio-color)]">{resultCount}</span> resultados</span>
            )}
          </span>
          <span className="text-[10px] text-gray-500 italic">
            {(genre || year || season || status || sort !== "RELEVANCE") ? "Filtros activos" : "Todos los animes"}
          </span>
        </div>

        {/* Borde separador */}
        <div className="border-b-4 mb-3" style={{ borderColor: 'var(--radio-color, #d4af37)' }} />

        {/* Grid */}
        <div className="flex-1 overflow-y-auto w-full relative custom-scrollbar pb-16">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 pt-2 pl-2 pr-4">
            {paginatedCatalog.map((a, index) => {
              if (!a || !a.title) return null;

              const safeLib = library || {};
              const localAnimeData = safeLib[a.title] || {};
              const currentStatus = localAnimeData.status;
              const epWatchedCount = watched ? (watched[a.title]?.length || 0) : 0;

              return (
                <div key={a.id || index} className="flex flex-col p-1.5">
                  <CoverCard
                    anime={{ ...a, ...localAnimeData, nextAiringAt: a.nextAiringAt }}
                    statusKey={currentStatus}
                    onOpen={() => onOpenAnime({ ...a, ...localAnimeData })}
                    colors={COLORS}
                    watchedCount={epWatchedCount}
                    viewMode="grid"
                  />
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 mb-4">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-2 rounded-lg border-2 text-white disabled:opacity-50 hover:bg-[var(--radio-color)]/20 transition-all cursor-pointer"
                style={{ borderColor: 'var(--radio-color, #2a160d)' }}
              >
                <ChevronLeft size={20} style={{ color: 'var(--radio-color, #d4af37)' }} />
              </button>
              <span className="text-sm font-bold text-[var(--radio-color)] uppercase tracking-widest">
                Pág {currentPage} de {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-2 rounded-lg border-2 text-white disabled:opacity-50 hover:bg-[var(--radio-color)]/20 transition-all cursor-pointer"
                style={{ borderColor: 'var(--radio-color, #2a160d)' }}
              >
                <ChevronRight size={20} style={{ color: 'var(--radio-color, #d4af37)' }} />
              </button>
            </div>
          )}
          {/* Mensaje de "sin resultados" dentro del grid */}
          {results.length === 0 && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-5xl mb-4 opacity-30">🔍</div>
              <h3 className="text-lg font-bold text-white/50 text-center">
                {searchQuery.trim().length >= 3
                  ? `No hay resultados para "${searchQuery}"`
                  : searchQuery.trim().length > 0
                    ? `Escribe al menos 3 caracteres`
                    : "Ajusta los filtros para encontrar animes"}
              </h3>
              {(genre || year || season || status || sort !== "RELEVANCE") && (
                <button
                  onClick={() => {
                    setGenre("");
                    setYear("");
                    setSeason("");
                    setStatus("");
                    setSort("RELEVANCE");
                  }}
                  className="mt-4 px-4 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all hover:bg-[var(--radio-color)] hover:text-black pointer-events-auto"
                  style={{ borderColor: 'var(--radio-color, #2a160d)', color: 'var(--radio-color)' }}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default AnimeCatalogView;