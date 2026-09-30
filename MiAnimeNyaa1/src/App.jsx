import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense, Profiler } from "react";
import anime from 'animejs';
import { animateIn, animateModalIn, animateButtonPress, useAnimeIn, useAnimeModal } from "./utils/animeUtils";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { 
  Palette, Folder, Download, Search, Terminal, X, Wine, Grape, QrCode, Info, User, Settings, MoreVertical,
  LogOut, RefreshCw, ExternalLink, ChevronDown
} from "lucide-react";
import QRCode from 'qrcode.react';

// ─── Imports de fuentes ────────────────────────────────────────────────
import '@fontsource/tilt-neon';
import '@fontsource/yellowtail';

// ─── Componentes extraídos ─────────────────────────────────────────────
import { GlobalStyleSheet } from "./styles/GlobalStyles";
import { TavernEmbers } from "./components/TavernEmbers";
import { TavernSign } from "./components/TavernSign";
import { LiveTerminalModal } from "./components/LiveTerminalModal";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useIsMobile } from "./hooks/useIsMobile";
import { COLORS } from "./constants/colors";

// ─── Componentes lazy ──────────────────────────────────────────────────
const DownloadsView = lazy(() => import("./components/DownloadsView.jsx"));
const MyLibraryView = lazy(() => import("./components/MyLibraryView.jsx"));
const AnimeCatalogView = lazy(() => import("./components/AnimeCatalogView.jsx"));
const GlobalCalendarView = lazy(() => import("./components/GlobalCalendarView.jsx"));
const AnimeDetailScreen = lazy(() => import("./components/AnimeDetailScreen.jsx"));
const UpcomingView = lazy(() => import('./components/UpcomingView.jsx'));

// ─── Imports de otros componentes ──────────────────────────────────────
import AppearanceCustomizer from "./components/AppearanceCustomizer.jsx";
import LoFiRadio from "./components/LoFiRadio.jsx";
import MobileLayout from "./components/MobileLayout.jsx";
import BodegaView from './components/BodegaView.jsx';
import AboutModal from './components/AboutModal.jsx';
import { initGlobalLogger } from './logger';
import { useStore } from './store/useStore';
import { Toaster } from 'react-hot-toast';

// ─── Custom Hooks ──────────────────────────────────────────────────────
import { useAnilist } from './hooks/useAnilist';
import { useLibraryActions } from './hooks/useLibraryActions';
import { useAppData } from './hooks/useAppData';
import { useAppLogic } from './hooks/useAppLogic';

// ─── Silenciar logs en producción ──────────────────────────────────────
if (process.env.NODE_ENV !== "development") {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
}
initGlobalLogger();

// ─── Constantes ─────────────────────────────────────────────────────────
const NET_NEW_KEY = "viñedo-biblioteca-pro-v4";

// ─── Componente principal ──────────────────────────────────────────────
const onRenderCallback = (id, phase, actualDuration, baseDuration, startTime, commitTime, interactions) => {
  if (actualDuration > 25) { // Loguear solo renders que tarden más de 25ms (potencial lag)
    console.warn(`[Performance] ${id} (${phase}): ${actualDuration.toFixed(2)}ms (Base: ${baseDuration.toFixed(2)}ms)`);
  }
};

export default function App() {
  const isMobile = useIsMobile();

  // ─── Estados de UI ──────────────────────────────────────────────────
  const [bgImage, setBgImage] = useState(() => localStorage.getItem("viñedo-bg-image") || "");
  const [bgOpacity, setBgOpacity] = useState(() => Number(localStorage.getItem("viñedo-bg-opacity") || "85"));
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const { modoBodega, setModoBodega } = useStore();
  const [showAbout, setShowAbout] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleAbout = () => setShowAbout(!showAbout);
  const toggleModo = () => setModoBodega(!modoBodega);


  const navigate = useNavigate();
  const location = useLocation();

  // ─── Estados de datos ────────────────────────────────────────────────
  const {
    library, setLibrary,
    watched, setWatched,
    openAnime, setOpenAnime,
    anilistUser, setAnilistUser,
    anilistToken, setAnilistToken,
    recommendations, setRecommendations,
    stuckCount, setStuckCount,
    stuckItems, setStuckItems,
    activeDownloads, setActiveDownloads,
    sonarrSeries, setSonarrSeries,
    hiddenStuckIds, setHiddenStuckIds
  } = useStore();

  const [syncingProgress, setSyncingProgress] = useState(false);

  // ─── Tema (Radio / colores dinámicos) ─────────────────────────────────
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("viñedo-theme-mode") || "arcoiris");
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem("viñedo-theme-color") || COLORS.gold);

  useEffect(() => {
    const tavernRoot = document.getElementById('tavern-root');
    if (tavernRoot) {
      if (themeMode === 'static') {
        tavernRoot.style.setProperty('--radio-color', themeColor);
        tavernRoot.style.setProperty('--radio-intensity', '0.1'); // Fixed low intensity for static
      }
    }
  }, [themeMode, themeColor]);

  // ─── Radio / colores dinámicos ────────────────────────────────────────
  const [dynamicGold, setDynamicGold] = useState(COLORS.gold);
  const activeColors = useMemo(() => ({ ...COLORS, gold: dynamicGold }), [dynamicGold]);

  // ─── Refs ──────────────────────────────────────────────────────────────
  const libraryRef = useRef(library);
  const watchedRef = useRef(watched);

  useEffect(() => { libraryRef.current = library; }, [library]);
  useEffect(() => { watchedRef.current = watched; }, [watched]);

  // ─── Instanciando Hooks ────────────────────────────────────────────────
  const { guardarEnServidor } = useAppData(libraryRef, watchedRef);
  const { connectAnilist, logoutAnilist, syncProgressFromAnilist, syncWithAnilist, syncAllWithAnilist } = useAnilist(guardarEnServidor, libraryRef, setLibrary, setWatched);
  const [showAnilistMenu, setShowAnilistMenu] = useState(false);
  const { addOrUpdate, toggleWatched, remove, replaceLibrary, updateLocalCount, bulkImport } = useLibraryActions(libraryRef, watchedRef, guardarEnServidor);
  const { query, setQuery, results, setResults, loading, setLoading, fetchQueue, abrirCarpetaAnimes, handleOpenAnime, handleRemoveAnime } = useAppLogic(libraryRef);

  // Sync de Anilist en el inicio
  useEffect(() => {
    syncProgressFromAnilist(watchedRef);
  }, [syncProgressFromAnilist, watchedRef]);
  const handleQR = (e) => {
    if (e) e.preventDefault();
    setShowQRModal(true);
  };

  const getQRUrl = () => {
    return 'http://192.168.1.79:5173/';
  };

  // ==========================================================================
  // 🎨 ESTILOS DE FONDO
  // ==========================================================================
  const bgStyles = useMemo(() => {
    const tavernBackground = {
      backgroundColor: COLORS.ink,
      backgroundImage: `radial-gradient(circle at 50% 0%, #1a0d06 0%, #080402 80%)`,
      backgroundAttachment: 'fixed'
    };
    return bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundAttachment: 'fixed' } : tavernBackground;
  }, [bgImage]);

  // ==========================================================================
  // 🧭 NAV TABS
  // ==========================================================================
  const navTabs = useMemo(() => [
    { id: 'calendario', path: '/calendario', label: 'Emisión' },
    { id: 'proximamente', path: '/proximamente', label: 'Próximamente' },
    { id: 'catalogo', path: '/catalogo', label: 'Catálogo' },
    { id: 'biblioteca', path: '/biblioteca', label: `Colección (${Object.keys(library).length})` },
    { id: 'descargas', path: '/descargas', label: 'Terminal', icon: <Download size={12}/>, badge: activeDownloads.length > 0 ? activeDownloads.length : null }
  ], [library, activeDownloads.length]);

const renderRoutes = () => (
  <Suspense fallback={
    <div className="w-full h-full min-h-[300px] flex items-center justify-center font-mono text-xs text-[#d4af37] animate-pulse">
      Encendiendo sistema...
    </div>
  }>
    <Routes>
      <Route path="/" element={<Navigate to="/calendario" replace />} />

      <Route path="/calendario" element={
        <GlobalCalendarView onOpenAnime={handleOpenAnime} library={library} onSet={addOrUpdate} onRemove={remove} colors={COLORS} watched={watched} />
      } />

      <Route path="/proximamente" element={
        <UpcomingView onOpenAnime={handleOpenAnime} library={library} colors={COLORS} />
      } />

      <Route path="/catalogo" element={
        <AnimeCatalogView onOpenAnime={handleOpenAnime} onSet={addOrUpdate} onRemove={remove} colors={COLORS} />
      } />

      <Route path="/biblioteca" element={
        <MyLibraryView
          library={library}
          watched={watched}
          addOrUpdate={addOrUpdate}
          remove={remove}
          bulkImport={bulkImport}
          replaceLibrary={replaceLibrary}
          onOpenAnime={handleOpenAnime}
          colors={COLORS}
          anilistUser={anilistUser}
          syncWithAnilist={() => syncWithAnilist(libraryRef, watchedRef, guardarEnServidor, setLibrary)}
          syncAllWithAnilist={() => syncAllWithAnilist(libraryRef, watchedRef, guardarEnServidor)}
        />
      } />

      <Route path="/descargas" element={
        <DownloadsView activeDownloads={activeDownloads} stuckItems={stuckItems} sonarrSeries={sonarrSeries} hiddenStuckIds={hiddenStuckIds} setHiddenStuckIds={setHiddenStuckIds} fetchQueue={fetchQueue} colors={COLORS} library={library} />
      } />
    </Routes>
  </Suspense>
);

  // ==========================================================================
  // 🏛️ RENDER PRINCIPAL (condicional BODEGA / TABERNA)
  // ==========================================================================
  return (
    <ErrorBoundary>
      <Profiler id="App" onRender={onRenderCallback}>
      <div id="tavern-root" className={`relative min-h-screen w-full font-sans text-[#e2d5cc] ${modoBodega ? '' : 'flex flex-col selection:bg-[#d4af37] selection:text-black'}`} style={modoBodega ? {} : bgStyles}>
        <GlobalStyleSheet />

        <Toaster position="bottom-right" toastOptions={{ style: { background: '#1a0d06', color: '#d4af37', border: '1px solid #3d2114' } }} />

        <LoFiRadio
          colors={COLORS}
          className={isMobile ? 'bottom-24 right-3' : 'bottom-6 right-6'}
          isMobile={isMobile}
          themeMode={themeMode}
          themeColor={themeColor}
        />

        {modoBodega ? (
          <BodegaView onVolver={() => setModoBodega(false)} />
        ) : (
          <>
            {!bgImage && <TavernEmbers />}

        {bgImage && <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundColor: COLORS.ink, opacity: bgOpacity / 100, backdropFilter: 'blur(5px)' }}></div>}

        {openAnime && (
          <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center font-mono text-xs text-[#d4af37] animate-pulse">Cargando archivo...</div>}>
            <AnimeDetailScreen
              anime={openAnime} statusKey={library[openAnime.title]?.status} onBack={() => setOpenAnime(null)}
              onSet={addOrUpdate} onRemove={(t) => handleRemoveAnime(t, remove)} colors={activeColors}
              watched={watched} onToggleWatched={toggleWatched} onUpdateLocalCount={updateLocalCount} bgImage={bgImage} bgOpacity={bgOpacity}
              activeDownloads={activeDownloads} setDynamicColor={setDynamicGold} defaultGold={COLORS.gold}
            />
          </Suspense>
        )}

        <AppearanceCustomizer
          showCustomizer={showCustomizer} setShowCustomizer={setShowCustomizer}
          bgImage={bgImage} setBgImage={setBgImage}
          bgOpacity={bgOpacity} setBgOpacity={setBgOpacity}
          themeMode={themeMode} setThemeMode={setThemeMode}
          themeColor={themeColor} setThemeColor={setThemeColor}
          colors={activeColors}
        />
        
        <AboutModal isOpen={showAbout} onClose={toggleAbout} />

        {showTerminal && <LiveTerminalModal onClose={() => setShowTerminal(false)} />}

        {!isMobile ? (
          <div className="flex flex-col w-full h-screen overflow-hidden relative z-20">
            <div className="w-full max-w-[1500px] mx-auto flex justify-between items-start px-12 pt-6 pb-2 shrink-0">
              <TavernSign defaultColor={activeColors.gold} modoBodega={modoBodega} onToggleModo={toggleModo} />
              <div className="flex gap-4 mt-8">
                <div className="relative">
                  {anilistUser ? (
                    <button
                      type="button"
                      onClick={() => setShowAnilistMenu(!showAnilistMenu)}
                      className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.08)] border text-xs font-bold transition-all bg-gradient-to-b from-[#1a0d06] to-[#0a0502] text-[#d4af37] hover:border-[#d4af37]"
                      style={{ borderColor: 'var(--radio-color, #d4af37)' }}
                    >
                      {anilistUser.avatar?.large ? (
                        <img src={anilistUser.avatar.large} alt={anilistUser.name} className="w-6 h-6 rounded-full object-cover ring-1 ring-[#d4af37]/50" />
                      ) : (
                        <User size={15} />
                      )}
                      <span>{anilistUser.name}</span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${showAnilistMenu ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={connectAnilist}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.05)] border text-xs font-bold uppercase transition-all bg-gradient-to-b from-[#1a0d06] to-[#0a0502] text-[#a89f91] hover:text-[#d4af37] hover:border-[#d4af37]/60"
                      style={{ borderColor: 'var(--radio-color, #3d2114)' }}
                    >
                      <User size={14} /> Conectar AniList
                    </button>
                  )}

                  {showAnilistMenu && anilistUser && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAnilistMenu(false)}></div>
                      <div
                        ref={(el) => animateModalIn(el, { duration: 300 })}
                        className="absolute right-0 top-full mt-2 w-64 bg-[#1a0d06]/95 backdrop-blur-md border border-[#3d2114] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] z-50 overflow-hidden"
                      >
                        <div className="p-3 border-b border-[#3d2114]/60 bg-[#0a0502]/40 flex items-center gap-3">
                          {anilistUser.avatar?.large ? (
                            <img src={anilistUser.avatar.large} alt={anilistUser.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#d4af37]/60" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#1a0d06] flex items-center justify-center text-[#d4af37] border border-[#3d2114]">
                              <User size={20} />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-[#f5efe6] truncate">{anilistUser.name}</span>
                            <span className="text-[10px] text-[#d4af37] uppercase tracking-wider font-mono">Conectado con AniList</span>
                          </div>
                        </div>

                        <div className="p-1.5 flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              animateButtonPress(e.currentTarget);
                              setShowAnilistMenu(false);
                              syncWithAnilist(libraryRef, watchedRef, guardarEnServidor, setLibrary);
                            }}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-[#a89f91] hover:text-[#d4af37] hover:bg-[#3d2114]/40 transition-colors w-full text-left cursor-pointer"
                          >
                            <RefreshCw size={14} className="text-[#d4af37]" /> Sincronizar Biblioteca
                          </button>

                          {anilistUser.siteUrl && (
                            <a
                              href={anilistUser.siteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setShowAnilistMenu(false)}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-[#a89f91] hover:text-[#d4af37] hover:bg-[#3d2114]/40 transition-colors w-full text-left"
                            >
                              <ExternalLink size={14} className="text-[#a89f91]" /> Ver perfil en AniList.co
                            </a>
                          )}

                          <div className="h-px bg-[#3d2114]/60 my-0.5"></div>

                          <button
                            type="button"
                            onClick={(e) => {
                              animateButtonPress(e.currentTarget);
                              setShowAnilistMenu(false);
                              logoutAnilist();
                            }}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-red-400/90 hover:text-red-300 hover:bg-red-950/40 transition-colors w-full text-left cursor-pointer"
                          >
                            <LogOut size={14} /> Cerrar Sesión
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="w-px h-6 bg-[#3d2114] mx-1"></div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    title="Menú de Herramientas"
                    className={`p-2 rounded-lg transition-all border ${showDropdown ? 'bg-[#1f100a] text-[#d4af37] border-[#3d2114]' : 'bg-[#1a0d06] text-[#a89f91] border-transparent hover:text-[#d4af37] hover:bg-[#1f100a] hover:border-[#3d2114]/50'}`}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {showDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
                      <div
                        ref={(el) => animateModalIn(el, { duration: 250 })}
                        className="absolute right-0 top-full mt-2 w-56 bg-[#1a0d06]/95 backdrop-blur-md border border-[#3d2114] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
                      >
                        <div className="p-1 flex flex-col">
                          <button onClick={(e) => { animateButtonPress(e.currentTarget); abrirCarpetaAnimes(); setShowDropdown(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a89f91] hover:text-[#d4af37] hover:bg-[#3d2114]/30 transition-colors w-full text-left cursor-pointer">
                            <Folder size={16} /> Abrir Carpeta Local
                          </button>
                          <button onClick={(e) => { animateButtonPress(e.currentTarget); setShowTerminal(true); setShowDropdown(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a89f91] hover:text-[#d4af37] hover:bg-[#3d2114]/30 transition-colors w-full text-left cursor-pointer">
                            <Terminal size={16} /> Terminal
                          </button>
                          <button onClick={(e) => { animateButtonPress(e.currentTarget); setShowCustomizer(true); setShowDropdown(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a89f91] hover:text-[#d4af37] hover:bg-[#3d2114]/30 transition-colors w-full text-left cursor-pointer">
                            <Palette size={16} /> Personalizar Colores
                          </button>
                          <button onClick={(e) => { animateButtonPress(e.currentTarget); handleQR(); setShowDropdown(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a89f91] hover:text-[#d4af37] hover:bg-[#3d2114]/30 transition-colors w-full text-left cursor-pointer">
                            <QrCode size={16} /> Código QR
                          </button>

                          <div className="h-px bg-[#3d2114]/50 my-1"></div>

                          <button onClick={(e) => { animateButtonPress(e.currentTarget); toggleAbout(); setShowDropdown(false); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a89f91] hover:text-[#d4af37] hover:bg-[#3d2114]/30 transition-colors w-full text-left cursor-pointer">
                            <Info size={16} /> Acerca de
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full max-w-[1500px] mx-auto px-8 pb-4 flex-1 flex flex-col mt-4 min-h-0">
              <div className="flex gap-2 ml-8 relative z-10 shrink-0">
                {navTabs.map(item => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { navigate(item.path); setQuery(""); }}
                      className={`relative px-8 py-3.5 rounded-t-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-b-0 ${
                        isActive
                          ? 'bg-gradient-to-b from-[#1f100a] to-[#120a06] text-[#d4af37] shadow-[0_-10px_20px_rgba(0,0,0,0.5)] translate-y-[1px]'
                          : 'bg-[#0a0502] text-[#6b6255] hover:bg-[#120a06] hover:text-[#a89f91] shadow-inner'
                      }`}
                      style={{ 
                        borderColor: isActive ? 'var(--radio-color, #3d2114)' : 'var(--radio-color, #1a0d06)',
                        borderBottom: isActive ? 'none' : '1px solid var(--radio-color, #1a0d06)'
                      }}
                    >
                      {item.icon} {item.label}
                      {item.badge && (
                        <span className="bg-[#8b0000] text-[#fff] px-2 py-0.5 rounded text-[10px] ml-1 shadow-inner border border-[#ff4757]/30">
                          {item.badge}
                        </span>
                      )}
                      {isActive && (
                        <div
                          ref={(el) => {
                            if (el) anime({ targets: el, width: ['0%', '100%'], duration: 300, easing: 'easeOutQuad' });
                          }}
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4af37] rounded-full shadow-[0_0_15px_rgba(212,175,55,0.6)]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div 
                className="magic-board flex-1 bg-gradient-to-br from-[#1a0d06]/80 via-[#120a05]/90 to-[#0a0502]/95 backdrop-blur-md border rounded-2xl rounded-tl-none p-4 sm:p-6 lg:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] relative overflow-hidden"
                style={{ borderColor: 'var(--radio-color, #3d2114)' }}
              >
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                <div className="relative z-10 w-full h-full min-w-0">
                  <div
                    key={location.pathname}
                    ref={(el) => { if (el) animateIn(el, { duration: 350 }); }}
                    className="w-full h-full"
                  >
                    {renderRoutes()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full relative z-20">
            <MobileLayout 
              library={library} 
              activeDownloads={activeDownloads} 
              setShowTerminal={setShowTerminal} 
              setShowCustomizer={setShowCustomizer} 
              abrirCarpetaAnimes={abrirCarpetaAnimes}
              onToggleBodega={() => setModoBodega(!modoBodega)}
              onToggleAbout={toggleAbout}
              onSetupAPI={() => {}}
            >
              <div className="magic-board px-2 pt-2">
                {renderRoutes()}
              </div>
            </MobileLayout>
          </div>
        )}
          </>
        )}

        {showQRModal && !isMobile && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowQRModal(false)}
          >
            <div
              ref={(el) => animateModalIn(el)}
              className="w-full max-w-md p-8 rounded-2xl border-2 bg-[#120a06] shadow-[0_30px_80px_rgba(0,0,0,1)] text-center"
              style={{ borderColor: 'var(--radio-color, #d4af37)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black uppercase tracking-widest text-[#d4af37]" style={{ fontFamily: '"Tilt Neon", sans-serif' }}>
                  📱 ESCANEA CON TU MÓVIL
                </h3>
                <button 
                  type="button"
                  onClick={(e) => { animateButtonPress(e.currentTarget); setShowQRModal(false); }}
                  className="text-gray-400 hover:text-white transition-colors p-2 cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="bg-white p-4 rounded-xl inline-block mx-auto shadow-lg">
                <QRCode
                  value={getQRUrl()}
                  size={256}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="H"
                  includeMargin={true}
                />
              </div>

              <p className="text-xs text-gray-400 mt-4 font-mono break-all">
                URL: {getQRUrl()}
              </p>

              <button
                type="button"
                onClick={(e) => {
                  animateButtonPress(e.currentTarget);
                  navigator.clipboard.writeText(getQRUrl());
                  alert('✅ URL copiada al portapapeles');
                }}
                className="mt-4 px-6 py-2 rounded-lg border-2 text-xs font-black uppercase tracking-wider transition-all hover:bg-[#d4af37] hover:text-black cursor-pointer"
                style={{ borderColor: 'var(--radio-color, #d4af37)', color: 'var(--radio-color, #d4af37)' }}
              >
                Copiar URL
              </button>

              <p className="text-[10px] text-gray-500 mt-4">
                Escanea el código QR desde la cámara de tu móvil para abrir la aplicación
              </p>
            </div>
          </div>
        )}
      </div>
      </Profiler>
    </ErrorBoundary>
  );
}