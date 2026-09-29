/**
 * La Taberna Nyaa Dashboard App
 */

let currentResults = [];

document.addEventListener('DOMContentLoaded', () => {
  checkHealth();
  setInterval(checkHealth, 30000);
  initApiUrls();
});

/**
 * Populate API & Torznab URLs based on current host
 */
function initApiUrls() {
  const origin = window.location.origin;
  const torznabEl = document.getElementById('api-torznab-url');
  const rssEl = document.getElementById('api-rss-url');

  if (torznabEl) torznabEl.value = `${origin}/api/torznab`;
  if (rssEl) rssEl.value = `${origin}/api/torznab/rss`;
}

/**
 * Check Health Status of API
 */
async function checkHealth() {
  const pingEl = document.getElementById('status-ping');
  const dotEl = document.getElementById('status-dot');
  const textEl = document.getElementById('status-text');

  try {
    const res = await fetch('/health');
    const data = await res.json();
    if (data.status === 'ok') {
      pingEl.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
      dotEl.className = 'relative inline-flex rounded-full h-2 w-2 bg-emerald-500';
      textEl.innerText = 'API Online';
      textEl.className = 'text-emerald-400 font-medium';
    } else {
      throw new Error('API Offline');
    }
  } catch (err) {
    pingEl.className = 'hidden';
    dotEl.className = 'relative inline-flex rounded-full h-2 w-2 bg-rose-500';
    textEl.innerText = 'API Offline';
    textEl.className = 'text-rose-400 font-medium';
  }
}

/**
 * Switch View Tabs
 */
let selectedTorrentIndexes = new Set();

function switchTab(tab) {
  const searchView = document.getElementById('view-search');
  const benchmarkView = document.getElementById('view-benchmark');
  const scheduleView = document.getElementById('view-schedule');
  const apiView = document.getElementById('view-api');

  const tabSearch = document.getElementById('tab-search');
  const tabBenchmark = document.getElementById('tab-benchmark');
  const tabSchedule = document.getElementById('tab-schedule');
  const tabApi = document.getElementById('tab-api');

  const inactiveClass = 'px-4 py-1.5 rounded-lg transition-all flex items-center gap-2 text-slate-400 hover:text-slate-200';
  const activeClass = 'px-4 py-1.5 rounded-lg transition-all flex items-center gap-2 bg-slate-800 text-white shadow-sm';

  searchView.classList.add('hidden');
  if (benchmarkView) benchmarkView.classList.add('hidden');
  scheduleView.classList.add('hidden');
  apiView.classList.add('hidden');

  tabSearch.className = inactiveClass;
  if (tabBenchmark) tabBenchmark.className = inactiveClass;
  tabSchedule.className = inactiveClass;
  tabApi.className = inactiveClass;

  let activeEl = null;

  if (tab === 'search') {
    searchView.classList.remove('hidden');
    tabSearch.className = activeClass;
    activeEl = searchView;
  } else if (tab === 'benchmark') {
    if (benchmarkView) benchmarkView.classList.remove('hidden');
    if (tabBenchmark) tabBenchmark.className = activeClass;
    activeEl = benchmarkView;
  } else if (tab === 'schedule') {
    scheduleView.classList.remove('hidden');
    tabSchedule.className = activeClass;
    activeEl = scheduleView;
  } else if (tab === 'api') {
    apiView.classList.remove('hidden');
    tabApi.className = activeClass;
    activeEl = apiView;
  }

  // Anime.js Tab Switch Transition
  if (typeof anime !== 'undefined' && activeEl) {
    anime({
      targets: activeEl,
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 350,
      easing: 'easeOutCubic'
    });
  }
}

/**
 * Append Log to Live Console Terminal
 */
function appendLogToConsole(logObj) {
  const consoleEl = document.getElementById('logs-console');
  if (!consoleEl) return;

  const logRow = document.createElement('div');
  logRow.className = 'flex items-start gap-2 text-[11px] font-mono leading-relaxed py-0.5 border-b border-slate-900/60';

  const timeStr = logObj.timestamp ? new Date(logObj.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

  let badgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
  if (logObj.level === 'INFO') badgeClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (logObj.level === 'SCRAPE') badgeClass = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
  if (logObj.level === 'CACHE') badgeClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (logObj.level === 'WARN') badgeClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (logObj.level === 'ERROR') badgeClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  if (logObj.level === 'SUCCESS') badgeClass = 'bg-brand-500/10 text-brand-400 border-brand-500/20';

  logRow.innerHTML = `
    <span class="text-slate-500 shrink-0 select-none">[${timeStr}]</span>
    <span class="px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase shrink-0 ${badgeClass}">${logObj.level || 'LOG'}</span>
    <span class="text-slate-200 break-all flex-1">${escapeHtml(logObj.message || '')}</span>
  `;

  consoleEl.appendChild(logRow);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function clearLogsConsole() {
  const consoleEl = document.getElementById('logs-console');
  if (consoleEl) {
    consoleEl.innerHTML = '<p class="text-slate-500 italic">🧹 Consola de logs limpiada.</p>';
  }
}

/**
 * Live Benchmark Runner Function with Streaming SSE Logs
 */
async function runLiveBenchmark() {
  const btn = document.getElementById('bench-run-btn');
  const query = document.getElementById('bench-query').value || '1080p';
  const category = document.getElementById('bench-category')?.value || '1_0';
  const mode = document.getElementById('bench-mode')?.value || 'full';
  const limit = document.getElementById('bench-limit').value || '10';
  const statusMsg = document.getElementById('bench-status-msg');

  const useCache = document.getElementById('debug-cache')?.checked !== false;
  const spanishOnly = document.getElementById('bench-spanish-only')?.checked || false;
  const concurrency = document.getElementById('debug-concurrency')?.value || '10';

  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner animate-spin"></i> Ejecutando...`;
  statusMsg.innerText = `Ejecutando streaming de logs en tiempo real...`;

  const consoleEl = document.getElementById('logs-console');
  if (consoleEl) {
    consoleEl.innerHTML = '';
  }

  appendLogToConsole({ level: 'INFO', message: `▶️ Iniciando transmisión de logs para la búsqueda "${query}" (Límite: ${limit}, Categoría: ${category})...` });

  const startTime = Date.now();

  try {
    const params = new URLSearchParams({
      q: query,
      c: category,
      mode: mode,
      limit: limit,
      useCache: useCache ? 'true' : 'false',
      spanishOnly: spanishOnly ? 'true' : 'false',
      concurrency: concurrency
    });

    const eventSource = new EventSource(`/api/nyaa/stream-logs?${params.toString()}`);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'COMPLETE') {
          const durationMs = Date.now() - startTime;
          const results = payload.data || [];
          const torrentsPerSec = parseFloat((results.length / (durationMs / 1000 || 1)).toFixed(2));
          const stats = results.stats || {};
          const spanishCount = results.filter(r => r.metadata?.hasSpanish).length;

          // Update Numerical Metrics
          document.getElementById('metric-duration').innerText = durationMs;
          document.getElementById('metric-tps').innerText = torrentsPerSec;
          document.getElementById('metric-scanned').innerText = stats.scannedCount || results.length;
          document.getElementById('metric-spanish').innerText = spanishCount;
          document.getElementById('metric-total').innerText = `/ ${results.length} Válidos`;
          document.getElementById('metric-retry').innerText = stats.retried429Count || 0;

          // Update Progress Bars
          document.getElementById('bar-duration').style.width = `${Math.min(Math.round((durationMs / 10000) * 100), 100)}%`;
          document.getElementById('bar-tps').style.width = `${Math.min(Math.round((torrentsPerSec / 10) * 100), 100)}%`;
          document.getElementById('bar-scanned').style.width = `${Math.min(Math.round(((stats.scannedCount || 1) / 200) * 100), 100)}%`;
          document.getElementById('bar-spanish').style.width = `${Math.round((spanishCount / (results.length || 1)) * 100)}%`;
          document.getElementById('bar-retry').style.width = `${Math.min(Math.round(((stats.retried429Count || 0) / 10) * 100), 100)}%`;

          statusMsg.innerText = `✅ Benchmark completado: ${results.length} torrents válidos en ${durationMs} ms (${torrentsPerSec} t/s).`;
          renderBenchmarkSampleList(results);
          showToast(`Benchmark completado: ${torrentsPerSec} torrents/seg`, 'success');

          eventSource.close();
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-play"></i> Ejecutar Benchmark`;
        } else if (payload.type === 'ERROR') {
          throw new Error(payload.error || 'Error en streaming de logs');
        } else {
          appendLogToConsole(payload);
        }
      } catch (err) {
        appendLogToConsole({ level: 'ERROR', message: `❌ Error de lectura de log: ${err.message}` });
        eventSource.close();
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-play"></i> Ejecutar Benchmark`;
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-play"></i> Ejecutar Benchmark`;
    };

  } catch (err) {
    appendLogToConsole({ level: 'ERROR', message: `❌ Error iniciando SSE: ${err.message}` });
    statusMsg.innerText = `❌ Error: ${err.message}`;
    showToast(`Error de Benchmark: ${err.message}`, 'error');
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-play"></i> Ejecutar Benchmark`;
  }
}

/**
 * Render Sample List of Benchmark Results
 */
function renderBenchmarkSampleList(results) {
  const container = document.getElementById('bench-results-list');
  container.innerHTML = '';

  if (!results || results.length === 0) {
    container.innerHTML = '<p class="text-xs text-slate-500 italic">Sin resultados obtenidos.</p>';
    return;
  }

  results.forEach(item => {
    const card = document.createElement('div');
    card.className = 'bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2 text-xs';

    const langBadges = buildLanguageBadges(item.metadata);
    const fansubBadge = item.metadata?.fansub ? `<span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">${escapeHtml(item.metadata.fansub)}</span>` : '';

    card.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <h4 class="font-bold text-slate-200 truncate">${escapeHtml(item.title)}</h4>
        <div class="flex items-center gap-1.5 shrink-0">
          ${fansubBadge}
          ${langBadges}
        </div>
      </div>
      <p class="text-[11px] font-mono text-slate-400 line-clamp-2 bg-slate-900 p-2 rounded border border-slate-800/60">
        ${escapeHtml(item.descriptionText || 'Sin descripción')}
      </p>
    `;

    container.appendChild(card);
  });
}

/**
 * Perform Search with Mode and Filter Controls
 */
async function handleSearch(event) {
  if (event) event.preventDefault();

  const query = document.getElementById('search-query').value.trim();
  const mode = document.getElementById('mode-select')?.value || 'full';
  const spanishOnly = document.getElementById('spanish-only-toggle')?.checked || false;
  const minSeeders = document.getElementById('min-seeders-input')?.value || '0';
  const category = document.getElementById('category-select').value;
  const limit = document.getElementById('limit-select').value;

  const emptyEl = document.getElementById('results-empty');
  const loaderEl = document.getElementById('results-loader');
  const listEl = document.getElementById('results-list');
  const loaderText = document.getElementById('loader-text');

  emptyEl.classList.add('hidden');
  listEl.classList.add('hidden');
  loaderEl.classList.remove('hidden');

  if (mode === 'full') {
    loaderText.innerText = 'Raspando Nyaa.si y realizando deep scraping paralelo en fichas...';
  } else if (mode === 'shallow') {
    loaderText.innerText = 'Modo Rápido: Obteniendo listado en tiempo récord (~50ms)...';
  } else {
    loaderText.innerText = 'Cargando torrents...';
  }

  try {
    const params = new URLSearchParams({
      q: query,
      mode: mode,
      spanishOnly: spanishOnly ? 'true' : 'false',
      minSeeders: minSeeders,
      limit: limit,
      c: category
    });

    const res = await fetch(`/api/nyaa/search?${params.toString()}`);
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || 'Error al buscar en Nyaa');
    }

    currentResults = data.data || [];
    renderResults(currentResults);
    showToast(`Se encontraron ${currentResults.length} resultados`, 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
    emptyEl.classList.remove('hidden');
  } finally {
    loaderEl.classList.add('hidden');
  }
}

/**
 * Export Search Results to JSON File
 */
function exportSearchJSON() {
  if (!currentResults || currentResults.length === 0) {
    showToast('No hay datos para exportar', 'error');
    return;
  }

  const jsonStr = JSON.stringify(currentResults, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nyaa_results_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Resultados exportados a archivo JSON', 'success');
}

/**
 * Quick Search trigger
 */
function quickSearch(query) {
  document.getElementById('search-query').value = query;
  handleSearch();
}

/**
 * Render Search Results
 */
function renderResults(results) {
  const emptyEl = document.getElementById('results-empty');
  const listEl = document.getElementById('results-list');
  const cardsContainer = document.getElementById('results-cards');
  const countBadge = document.getElementById('results-count-badge');

  if (!results || results.length === 0) {
    emptyEl.classList.remove('hidden');
    listEl.classList.add('hidden');
    return;
  }

  countBadge.innerText = `${results.length} resultado(s) encontrado(s)`;
  cardsContainer.innerHTML = '';

  selectedTorrentIndexes.clear();
  updateBatchBarUI();

  results.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'torrent-result-card bg-slate-900 border border-slate-800/90 hover:border-slate-700/90 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-brand-500/5 group flex flex-col md:flex-row md:items-center justify-between gap-4';

    const langBadges = buildLanguageBadges(item.metadata);
    const resBadge = item.metadata?.resolution
      ? `<span class="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase">${item.metadata.resolution}</span>`
      : '';
    const epBadge = item.metadata?.episode
      ? `<span class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold uppercase">Ep ${item.metadata.episode}</span>`
      : '';

    const categoryName = item.categoryName || 'Anime';
    const descSnippet = item.descriptionText
      ? `<p class="text-xs text-slate-400 line-clamp-2 mt-2 font-mono bg-slate-950/60 p-2 rounded border border-slate-800/50">${escapeHtml(item.descriptionText)}</p>`
      : '';

    card.innerHTML = `
      <div class="flex items-start gap-3 flex-1">
        <input type="checkbox" onchange="toggleSelectTorrent(${index}, this.checked)" class="torrent-checkbox rounded border-slate-800 text-brand-500 focus:ring-brand-500 mt-1 cursor-pointer">
        <div class="flex-1 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/50 text-[10px] font-semibold uppercase">
              ${escapeHtml(categoryName)}
            </span>
            ${resBadge}
            ${epBadge}
            ${langBadges}
          </div>

          <h3 class="text-sm font-semibold text-slate-100 group-hover:text-brand-400 transition-colors cursor-pointer" onclick="openDetailsModalByIndex(${index})">
            ${escapeHtml(item.title)}
          </h3>

          ${descSnippet}

          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span class="flex items-center gap-1"><i class="fa-solid fa-hard-drive text-slate-500"></i> ${escapeHtml(item.size || 'N/A')}</span>
            <span class="flex items-center gap-1 text-emerald-400 font-medium"><i class="fa-solid fa-arrow-up"></i> ${item.seeders ?? item.metadata?.seeders ?? 0}</span>
            <span class="flex items-center gap-1 text-rose-400"><i class="fa-solid fa-arrow-down"></i> ${item.leechers ?? item.metadata?.leechers ?? 0}</span>
            <span class="flex items-center gap-1 text-slate-500"><i class="fa-regular fa-clock"></i> ${escapeHtml(item.date || item.metadata?.date || 'N/A')}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80 justify-end">
        <button onclick="openDetailsModalByIndex(${index})" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1">
          <i class="fa-solid fa-circle-info text-slate-400"></i> Detalles
        </button>

        ${item.magnetUrl ? `
          <button onclick="copyMagnet('${escapeHtml(item.magnetUrl)}')" class="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-lg transition-all flex items-center gap-1" title="Copiar Magnet Link">
            <i class="fa-solid fa-magnet"></i> Magnet
          </button>
        ` : ''}

        ${item.downloadUrl ? `
          <a href="${escapeHtml(item.downloadUrl)}" target="_blank" class="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1 shadow-sm shadow-brand-500/20" title="Descargar Torrent">
            <i class="fa-solid fa-download"></i>
          </a>
        ` : ''}
      </div>
    `;

    cardsContainer.appendChild(card);
  });

  listEl.classList.remove('hidden');

  // Stagger entry animation with Anime.js
  if (typeof anime !== 'undefined') {
    anime({
      targets: '.torrent-result-card',
      opacity: [0, 1],
      translateY: [15, 0],
      delay: anime.stagger(40),
      duration: 400,
      easing: 'easeOutCubic'
    });
  }
}

/**
 * Batch Selection Helpers
 */
function toggleSelectTorrent(index, checked) {
  if (checked) {
    selectedTorrentIndexes.add(index);
  } else {
    selectedTorrentIndexes.delete(index);
  }
  updateBatchBarUI();
}

function toggleSelectAllTorrents(checked) {
  const checkboxes = document.querySelectorAll('.torrent-checkbox');
  checkboxes.forEach((cb, idx) => {
    cb.checked = checked;
    if (checked) {
      selectedTorrentIndexes.add(idx);
    } else {
      selectedTorrentIndexes.delete(idx);
    }
  });
  updateBatchBarUI();
}

function updateBatchBarUI() {
  const batchBar = document.getElementById('batch-actions-bar');
  const countEl = document.getElementById('selected-count');
  if (!batchBar || !countEl) return;

  if (selectedTorrentIndexes.size > 0) {
    batchBar.classList.remove('hidden');
    batchBar.classList.add('flex');
    countEl.innerText = selectedTorrentIndexes.size;
  } else {
    batchBar.classList.add('hidden');
    batchBar.classList.remove('flex');
  }
}

function copySelectedMagnets() {
  const magnets = Array.from(selectedTorrentIndexes)
    .map(idx => currentResults[idx]?.magnetUrl)
    .filter(Boolean);

  if (magnets.length === 0) {
    showToast('No hay Magnets válidos en los elementos seleccionados', 'error');
    return;
  }

  copyToClipboard(magnets.join('\n'), `¡Copiados ${magnets.length} Magnet Links!`);
}

/**
 * Helper to build language badges
 */
function buildLanguageBadges(metadata) {
  if (!metadata) return '';
  let html = '';

  if (metadata.hasSpanish) {
    html += `<span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">ESP</span>`;
  }
  if (metadata.hasEnglish) {
    html += `<span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">ENG</span>`;
  }
  if (metadata.isMulti) {
    html += `<span class="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">MULTI</span>`;
  }
  if (metadata.isRaw) {
    html += `<span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">RAW</span>`;
  }

  return html;
}

/**
 * Open Modal with Full Details
 */
async function openDetailsModalByIndex(index) {
  const item = currentResults[index];
  if (!item) return;

  const modal = document.getElementById('details-modal');
  modal.classList.remove('hidden');

  document.getElementById('modal-title').innerText = item.title;
  document.getElementById('modal-category').innerText = item.categoryName || item.metadata?.category || 'ANIME';
  document.getElementById('modal-size').innerText = item.size || item.metadata?.size || 'N/A';

  const seeders = item.seeders ?? item.metadata?.seeders ?? 0;
  const leechers = item.leechers ?? item.metadata?.leechers ?? 0;
  document.getElementById('modal-peers').innerText = `${seeders} / ${leechers}`;

  document.getElementById('modal-resolution').innerText = item.metadata?.resolution ? item.metadata.resolution.toUpperCase() : 'N/A';
  document.getElementById('modal-languages').innerHTML = buildLanguageBadges(item.metadata) || '<span class="text-xs text-slate-500">N/A</span>';

  document.getElementById('modal-nyaa-link').href = item.viewUrl || '#';

  const magnetBtn = document.getElementById('modal-copy-magnet');
  if (item.magnetUrl) {
    magnetBtn.onclick = () => copyMagnet(item.magnetUrl);
    magnetBtn.classList.remove('hidden');
  } else {
    magnetBtn.classList.add('hidden');
  }

  const dlLink = document.getElementById('modal-download-torrent');
  if (item.downloadUrl) {
    dlLink.href = item.downloadUrl;
    dlLink.classList.remove('hidden');
  } else {
    dlLink.classList.add('hidden');
  }

  const descEl = document.getElementById('modal-description');
  const filesEl = document.getElementById('modal-files');

  if (item.descriptionText !== undefined) {
    descEl.innerText = item.descriptionText || 'Sin descripción disponible para este torrent.';
    renderModalFiles(item.files || []);
  } else {
    descEl.innerText = 'Cargando descripción extraída desde Nyaa.si...';
    filesEl.innerHTML = '<li class="italic text-slate-600">Cargando lista de archivos...</li>';

    try {
      const res = await fetch(`/api/nyaa/view/${item.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        item.descriptionText = data.data.descriptionText;
        item.files = data.data.files;
        descEl.innerText = item.descriptionText || 'Sin descripción disponible.';
        renderModalFiles(item.files || []);
      } else {
        descEl.innerText = 'No se pudo obtener la descripción detallada.';
      }
    } catch (err) {
      descEl.innerText = 'Error al cargar la descripción: ' + err.message;
    }
  }
}

function renderModalFiles(files) {
  const filesEl = document.getElementById('modal-files');
  filesEl.innerHTML = '';

  if (!files || files.length === 0) {
    filesEl.innerHTML = '<li class="italic text-slate-600">Sin lista de archivos disponible</li>';
    return;
  }

  files.forEach(f => {
    const li = document.createElement('li');
    li.className = 'truncate text-slate-300 hover:text-white flex items-center gap-2';
    li.innerHTML = `<i class="fa-regular fa-file text-slate-500 text-[10px]"></i> ${escapeHtml(f)}`;
    filesEl.appendChild(li);
  });
}

function closeModal() {
  document.getElementById('details-modal').classList.add('hidden');
}

/**
 * Handle Schedule Form Submit
 */
async function handleScheduleSubmit(event) {
  event.preventDefault();

  const rawInput = document.getElementById('schedule-input').value;
  const queries = rawInput.split(',').map(q => q.trim()).filter(Boolean);

  if (queries.length === 0) {
    showToast('Ingresa al menos un nombre de anime para generar el schedule', 'error');
    return;
  }

  const container = document.getElementById('schedule-results');
  const loader = document.getElementById('schedule-loader');
  const grid = document.getElementById('schedule-grid');

  container.classList.remove('hidden');
  loader.classList.remove('hidden');
  grid.innerHTML = '';

  try {
    const res = await fetch('/api/nyaa/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Error al generar schedule');
    }

    renderScheduleResults(data.data);
    showToast('Schedule generado exitosamente', 'success');
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
  } finally {
    loader.classList.add('hidden');
  }
}

/**
 * Render Schedule Results
 */
function renderScheduleResults(scheduleData) {
  const grid = document.getElementById('schedule-grid');
  grid.innerHTML = '';

  Object.entries(scheduleData).forEach(([animeTitle, items]) => {
    const card = document.createElement('div');
    card.className = 'bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl';

    let itemsHtml = '';
    if (Array.isArray(items) && items.length > 0) {
      itemsHtml = items.map(item => `
        <div class="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2">
          <div class="flex items-start justify-between gap-2">
            <h4 class="text-xs font-semibold text-slate-200 line-clamp-2">${escapeHtml(item.title)}</h4>
            ${item.magnetUrl ? `
              <button onclick="copyMagnet('${escapeHtml(item.magnetUrl)}')" class="text-amber-400 hover:text-amber-300 text-xs p-1">
                <i class="fa-solid fa-magnet"></i>
              </button>
            ` : ''}
          </div>
          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span>Size: ${escapeHtml(item.size || 'N/A')}</span>
            <span class="text-emerald-400"><i class="fa-solid fa-arrow-up"></i> ${item.seeders ?? 0}</span>
            <span>${escapeHtml(item.date || '')}</span>
          </div>
        </div>
      `).join('');
    } else {
      itemsHtml = `<p class="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-slate-800/60">Sin lanzamientos recientes encontrados para este título.</p>`;
    }

    card.innerHTML = `
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <h3 class="font-bold text-slate-100 flex items-center gap-2">
          <i class="fa-solid fa-tv text-purple-400"></i> ${escapeHtml(animeTitle)}
        </h3>
        <span class="text-xs font-medium px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
          ${Array.isArray(items) ? items.length : 0} items
        </span>
      </div>
      <div class="space-y-3">
        ${itemsHtml}
      </div>
    `;

    grid.appendChild(card);
  });
}

/**
 * Copy Text to Clipboard
 */
function copyToClipboard(text, successMessage = 'Copiado al portapapeles') {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMessage, 'success');
  }).catch(() => {
    showToast('No se pudo copiar al portapapeles', 'error');
  });
}

/**
 * Copy Magnet URL
 */
function copyMagnet(url) {
  copyToClipboard(url, '¡Magnet Link copiado!');
}

/**
 * Toast Notification Utility
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');

  toastMsg.innerText = message;
  if (type === 'success') {
    toastIcon.className = 'fa-solid fa-circle-check text-brand-500 text-sm';
    toast.className = toast.className.replace(/border-[^\s]+/, 'border-brand-500/50');
  } else {
    toastIcon.className = 'fa-solid fa-circle-exclamation text-rose-500 text-sm';
    toast.className = toast.className.replace(/border-[^\s]+/, 'border-rose-500/50');
  }

  toast.classList.remove('translate-y-20', 'opacity-0');
  toast.classList.add('translate-y-0', 'opacity-100');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3000);
}

/**
 * HTML Escaper
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
