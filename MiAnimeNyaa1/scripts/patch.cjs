const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Añadir import de useStore y Toaster
content = content.replace(
  `import { initGlobalLogger } from './logger';`,
  `import { initGlobalLogger } from './logger';\nimport { useStore } from './store/useStore';\nimport { Toaster } from 'react-hot-toast';`
);

// 2. Reemplazar los useStates identificados
const stateBlockToReplace = `  // ─── Estados de datos ────────────────────────────────────────────────
  const [library, setLibrary] = useState({});
  const [watched, setWatched] = useState({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("calendario");
  const [openAnime, setOpenAnime] = useState(null);
  const [syncingProgress, setSyncingProgress] = useState(false);

  // ─── AniList ──────────────────────────────────────────────────────────
  const [anilistUser, setAnilistUser] = useState(null);
  const [anilistToken, setAnilistToken] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  // ─── Radio / colores dinámicos ────────────────────────────────────────
  const [dynamicGold, setDynamicGold] = useState(COLORS.gold);
  const activeColors = useMemo(() => ({ ...COLORS, gold: dynamicGold }), [dynamicGold]);

  // ─── Descargas y cola ─────────────────────────────────────────────────
  const [stuckCount, setStuckCount] = useState(0);
  const [stuckItems, setStuckItems] = useState([]);
  const [activeDownloads, setActiveDownloads] = useState([]);
  const [sonarrSeries, setSonarrSeries] = useState([]);
  const [hiddenStuckIds, setHiddenStuckIds] = useState([]);`;

const stateReplacementBlock = `  // ─── Estados de datos ────────────────────────────────────────────────
  const {
    library, setLibrary,
    watched, setWatched,
    tab, setTab,
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

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncingProgress, setSyncingProgress] = useState(false);

  // ─── Radio / colores dinámicos ────────────────────────────────────────
  const [dynamicGold, setDynamicGold] = useState(COLORS.gold);
  const activeColors = useMemo(() => ({ ...COLORS, gold: dynamicGold }), [dynamicGold]);`;

content = content.replace(stateBlockToReplace, stateReplacementBlock);

// Reemplazar también modoBodega
content = content.replace(
  `const [modoBodega, setModoBodega] = useState(false);`,
  `const { modoBodega, setModoBodega } = useStore();`
);

// 3. Añadir Toaster
content = content.replace(
  `{!bgImage && <TavernEmbers />}`,
  `<Toaster position="bottom-right" toastOptions={{ style: { background: '#1a0d06', color: '#d4af37', border: '1px solid #3d2114' } }} />\n        {!bgImage && <TavernEmbers />}`
);

fs.writeFileSync('src/App.jsx', content);
