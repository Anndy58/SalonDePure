// ─── COMPONENTE WIDGET DE RSS.APP MEJORADO ─────────────────────────
const RssAppWidget = ({ widgetId, type = 'wall' }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    const script = document.createElement('script');
    // El tipo de widget determina el script a cargar
    const scriptSrc = type === 'imageboard' 
      ? 'https://widget.rss.app/v1/imageboard.js'
      : 'https://widget.rss.app/v1/wall.js';
    script.src = scriptSrc;
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;

    script.onload = () => setLoading(false);
    const timeoutId = setTimeout(() => setLoading(false), 8000);

    document.head.appendChild(script);

    return () => {
      clearTimeout(timeoutId);
      const oldScript = document.querySelector(`script[src="${scriptSrc}"]`);
      if (oldScript) oldScript.remove();
      scriptLoaded.current = false;
    };
  }, [type]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {loading && (
        <div className="flex items-center justify-center h-32 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2 text-[var(--radio-color)]" />
          <span className="text-xs font-mono">Cargando noticias...</span>
        </div>
      )}
      {type === 'imageboard' ? (
        <rssapp-imageboard id={widgetId}></rssapp-imageboard>
      ) : (
        <rssapp-wall id={widgetId}></rssapp-wall>
      )}
    </div>
  );
};