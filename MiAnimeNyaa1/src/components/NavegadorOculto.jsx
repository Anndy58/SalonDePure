import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ArrowLeft, ArrowRight, RotateCw, Home, Plus, X, 
  Bookmark, BookmarkCheck, ExternalLink, Trash2, 
  Globe, Lock, AlertCircle
} from 'lucide-react';

const NavegadorOculto = () => {
  // Estado de pestañas
  const [tabs, setTabs] = useState([
    { id: 1, url: 'https://www.google.com', title: 'Google' }
  ]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [inputUrl, setInputUrl] = useState('https://www.google.com');
  const [history, setHistory] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [incognito, setIncognito] = useState(false);
  const iframeRef = useRef(null);
  const nextTabId = useRef(2);

  // Cargar marcadores e historial desde localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('bodega-bookmarks');
    if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    const savedHistory = localStorage.getItem('bodega-history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // Guardar marcadores e historial
  useEffect(() => {
    localStorage.setItem('bodega-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem('bodega-history', JSON.stringify(history));
  }, [history]);

  // Obtener pestaña activa
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Navegar a una URL
  const navigateTo = useCallback((url) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setInputUrl(url);
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, url } : tab
    ));
    // Añadir al historial (si no es incógnito)
    if (!incognito) {
      setHistory(prev => {
        const newHistory = [url, ...prev.filter(h => h !== url)];
        return newHistory.slice(0, 50); // límite 50
      });
    }
  }, [activeTabId, incognito]);

  // Crear nueva pestaña
  const newTab = useCallback(() => {
    const id = nextTabId.current++;
    setTabs(prev => [...prev, { id, url: 'https://www.google.com', title: 'Nueva pestaña' }]);
    setActiveTabId(id);
    setInputUrl('https://www.google.com');
  }, []);

  // Cerrar pestaña
  const closeTab = useCallback((id) => {
    if (tabs.length === 1) return;
    setTabs(prev => prev.filter(tab => tab.id !== id));
    if (activeTabId === id) {
      const remaining = tabs.filter(tab => tab.id !== id);
      setActiveTabId(remaining[0]?.id || tabs[0]?.id);
    }
  }, [tabs, activeTabId]);

  // Recargar iframe
  const reload = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  // Volver atrás en el iframe (si el iframe lo permite)
  const goBack = useCallback(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.history.back();
      } catch (e) {
        // Si no se puede, usar historial propio
        const currentIdx = history.indexOf(activeTab?.url);
        if (currentIdx < history.length - 1) {
          navigateTo(history[currentIdx + 1]);
        }
      }
    }
  }, [history, activeTab, navigateTo]);

  // Adelante
  const goForward = useCallback(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.history.forward();
      } catch (e) {
        const currentIdx = history.indexOf(activeTab?.url);
        if (currentIdx > 0) {
          navigateTo(history[currentIdx - 1]);
        }
      }
    }
  }, [history, activeTab, navigateTo]);

  // Toggle marcador
  const toggleBookmark = useCallback(() => {
    const url = activeTab?.url;
    if (!url) return;
    if (bookmarks.includes(url)) {
      setBookmarks(prev => prev.filter(b => b !== url));
    } else {
      setBookmarks(prev => [...prev, url]);
    }
  }, [bookmarks, activeTab]);

  // Abrir en ventana externa
  const openExternal = useCallback(() => {
    const url = activeTab?.url;
    if (url) window.open(url, '_blank');
  }, [activeTab]);

  // Eliminar historial
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Navegar a marcador
  const goToBookmark = useCallback((url) => {
    navigateTo(url);
  }, [navigateTo]);

  // Manejar submit de la barra
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    navigateTo(inputUrl);
  }, [inputUrl, navigateTo]);

  return (
    <div className="flex flex-col h-full w-full bg-black/95 text-gray-300" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
      
      {/* Barra de herramientas superior */}
      <div className="flex items-center gap-1 p-2 border-b border-red-900/50 bg-black/80 flex-wrap">
        {/* Botones de navegación */}
        <button onClick={goBack} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Atrás">
          <ArrowLeft size={16} />
        </button>
        <button onClick={goForward} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Adelante">
          <ArrowRight size={16} />
        </button>
        <button onClick={reload} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Recargar">
          <RotateCw size={16} />
        </button>
        <button onClick={() => navigateTo('https://www.google.com')} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Inicio">
          <Home size={16} />
        </button>

        {/* Barra de direcciones */}
        <form onSubmit={handleSubmit} className="flex-1 min-w-[120px] relative">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full bg-black/60 border border-red-900/30 rounded px-3 py-1.5 text-xs text-white focus:border-red-700 outline-none transition-colors"
            placeholder="URL o búsqueda..."
            spellCheck="false"
          />
          {activeTab?.url?.startsWith('https') ? (
            <Lock size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500" />
          ) : (
            <AlertCircle size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-yellow-500" />
          )}
        </form>

        {/* Marcador */}
        <button onClick={toggleBookmark} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Marcador">
          {activeTab?.url && bookmarks.includes(activeTab.url) ? 
            <BookmarkCheck size={16} className="text-red-500" /> : 
            <Bookmark size={16} />
          }
        </button>

        {/* Abrir externo */}
        <button onClick={openExternal} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Abrir en ventana externa">
          <ExternalLink size={16} />
        </button>

        {/* Nueva pestaña */}
        <button onClick={newTab} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Nueva pestaña">
          <Plus size={16} />
        </button>

        {/* Modo incógnito toggle */}
        <button 
          onClick={() => setIncognito(!incognito)} 
          className={`p-1.5 rounded transition-colors ${incognito ? 'bg-red-900/30 text-red-400' : 'text-gray-400 hover:text-white'}`}
          title="Modo incógnito"
        >
          <Globe size={16} />
        </button>
      </div>

      {/* Pestañas */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-red-900/30 bg-black/60 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => { setActiveTabId(tab.id); setInputUrl(tab.url); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-t-lg text-xs cursor-pointer transition-all whitespace-nowrap ${
              tab.id === activeTabId 
                ? 'bg-red-950/50 text-white border border-red-700 border-b-0' 
                : 'text-gray-500 hover:bg-white/5'
            }`}
          >
            <span className="truncate max-w-[100px]">{tab.title || tab.url}</span>
            {tabs.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }} className="hover:text-red-400">
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Iframe */}
      <div className="flex-1 relative bg-black/90">
        {activeTab?.url ? (
          <iframe
            ref={iframeRef}
            src={activeTab.url}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            allow="fullscreen; autoplay; encrypted-media"
            title="Navegador oculto"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No hay URL para mostrar
          </div>
        )}
      </div>

      {/* Barra de estado inferior con marcadores e historial */}
      <div className="flex items-center gap-4 p-2 border-t border-red-900/30 bg-black/80 text-[10px] text-gray-500 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-red-700/60">Marcadores</span>
          {bookmarks.length === 0 ? (
            <span className="text-gray-600">(vacío)</span>
          ) : (
            <div className="flex gap-2">
              {bookmarks.slice(0, 8).map((url, i) => (
                <button
                  key={i}
                  onClick={() => goToBookmark(url)}
                  className="px-2 py-0.5 rounded bg-red-950/30 border border-red-900/30 hover:bg-red-900/50 text-xs text-gray-300 truncate max-w-[100px]"
                  title={url}
                >
                  {url.replace(/^https?:\/\//, '').slice(0, 20)}
                </button>
              ))}
              {bookmarks.length > 8 && <span className="text-gray-600">+{bookmarks.length - 8}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="font-bold uppercase tracking-wider text-red-700/60">Historial</span>
          <span className="text-gray-600">{history.length} sitios</span>
          <button onClick={clearHistory} className="px-2 py-0.5 rounded bg-red-950/30 hover:bg-red-900/50 text-red-400 transition-colors" title="Limpiar historial">
            <Trash2 size={12} />
          </button>
        </div>

        {incognito && (
          <span className="text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/30 px-2 py-0.5 rounded">🕵️ Incógnito</span>
        )}
      </div>
    </div>
  );
};

export default NavegadorOculto;