// src/components/AppearanceCustomizer.jsx
import React, { useState, useRef, useEffect } from "react";
import { X as XIcon, Palette, Upload, Image as ImageIcon, Video, Link as LinkIcon, Trash2, Tag } from "lucide-react";

export default function AppearanceCustomizer({ 
  showCustomizer, 
  setShowCustomizer, 
  bgImage, 
  setBgImage, 
  bgOpacity, 
  setBgOpacity,
  themeMode,
  setThemeMode,
  themeColor,
  setThemeColor,
  colors 
}) {
  if (!showCustomizer) return null;

  const COLORS = colors || { gold: "#d4af37", line: "#2a160d" };
  const [previewUrl, setPreviewUrl] = useState(bgImage || "");
  const [uploadStatus, setUploadStatus] = useState("");
  const fileInputRef = useRef(null);

  // Estados de colores para franjas/insignias de tarjetas
  const [badgeUpcoming, setBadgeUpcoming] = useState(() => localStorage.getItem("viñedo-badge-upcoming") || "#9333ea");
  const [badgeEstreno, setBadgeEstreno] = useState(() => localStorage.getItem("viñedo-badge-estreno") || "#10b981");
  const [badgeEmision, setBadgeEmision] = useState(() => localStorage.getItem("viñedo-badge-emision") || "#dc2626");
  const [badgeFinished, setBadgeFinished] = useState(() => localStorage.getItem("viñedo-badge-finished") || "#2563eb");

  useEffect(() => {
    document.documentElement.style.setProperty("--badge-upcoming", badgeUpcoming);
    document.documentElement.style.setProperty("--badge-estreno", badgeEstreno);
    document.documentElement.style.setProperty("--badge-emision", badgeEmision);
    document.documentElement.style.setProperty("--badge-finished", badgeFinished);
  }, [badgeUpcoming, badgeEstreno, badgeEmision, badgeFinished]);

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setPreviewUrl(url);
    setBgImage(url);
    localStorage.setItem("viñedo-bg-image", url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/", "video/", "image/gif"];
    if (!validTypes.some(t => file.type.startsWith(t))) {
      setUploadStatus("⚠️ Formato no soportado. Usa imagen, GIF o video.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadStatus("⚠️ El archivo es muy grande (máx 50MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPreviewUrl(dataUrl);
      setBgImage(dataUrl);
      localStorage.setItem("viñedo-bg-image", dataUrl);
      setUploadStatus("✅ Archivo cargado correctamente.");
    };
    reader.onerror = () => setUploadStatus("❌ Error al leer el archivo.");
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const handleRemove = () => {
    if (window.confirm("¿Quitar el fondo personalizado?")) {
      setPreviewUrl("");
      setBgImage("");
      setBgOpacity(85);
      localStorage.removeItem("viñedo-bg-image");
      localStorage.removeItem("viñedo-bg-opacity");
      setUploadStatus("");
    }
  };

  const updateBadgeColor = (key, val) => {
    if (key === 'upcoming') {
      setBadgeUpcoming(val);
      localStorage.setItem("viñedo-badge-upcoming", val);
    } else if (key === 'estreno') {
      setBadgeEstreno(val);
      localStorage.setItem("viñedo-badge-estreno", val);
    } else if (key === 'emision') {
      setBadgeEmision(val);
      localStorage.setItem("viñedo-badge-emision", val);
    } else if (key === 'finished') {
      setBadgeFinished(val);
      localStorage.setItem("viñedo-badge-finished", val);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-8 rounded-2xl border-2 flex flex-col gap-6 text-left bg-[#0f0805] shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative"
        style={{ borderColor: COLORS.gold }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-center border-b-2 pb-4 relative z-10" style={{ borderColor: COLORS.line }}>
          <span className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-3">
            <Palette className="text-[#d4af37]" size={20} /> Ajustes de la Taberna
          </span>
          <button 
            onClick={() => setShowCustomizer(false)} 
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white cursor-pointer transition-colors"
          >
            <XIcon size={20}/>
          </button>
        </div>

        {/* Previsualización en vivo */}
        <div className="relative w-full aspect-video bg-black/60 rounded-xl border-2 overflow-hidden flex items-center justify-center" style={{ borderColor: COLORS.line }}>
          {previewUrl ? (
            <>
              {previewUrl.startsWith('data:video/') || previewUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                <video src={previewUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={previewUrl} alt="Fondo" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/40 pointer-events-none" style={{ opacity: 1 - (bgOpacity / 100) }} />
            </>
          ) : (
            <div className="text-gray-600 text-xs font-mono flex flex-col items-center gap-2">
              <ImageIcon size={32} />
              <span>Sin fondo personalizado</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] font-mono text-gray-400">
            Vista previa
          </div>
        </div>

        {/* Controles */}
        <div className="flex flex-col gap-5 relative z-10">
          {/* Opacidad */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex justify-between">
              Oscuridad de fondo <span>{bgOpacity}%</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={bgOpacity} 
              onChange={(e) => { 
                const val = Number(e.target.value);
                setBgOpacity(val);
                localStorage.setItem("viñedo-bg-opacity", String(val));
              }} 
              className="w-full accent-[#d4af37] cursor-pointer h-1 bg-[#2a160d] rounded-lg"
            />
          </div>

          {/* Configuración de Franjas / Insignias de Tarjetas */}
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-dashed bg-black/40" style={{ borderColor: COLORS.line }}>
            <label className="text-[10px] font-black uppercase text-[#d4af37] tracking-wider flex items-center gap-2">
              <Tag size={14} /> Colores de Franjas en Tarjetas (Emisión)
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Por estrenarse */}
              <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-black/50 border border-white/10">
                <span className="text-[8px] font-black uppercase tracking-wider text-gray-300 flex items-center justify-between">
                  Por estrenarse
                  <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: badgeUpcoming }} />
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={badgeUpcoming}
                    onChange={(e) => updateBadgeColor('upcoming', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={badgeUpcoming}
                    onChange={(e) => updateBadgeColor('upcoming', e.target.value)}
                    className="w-full bg-black/80 text-[9px] font-mono px-1.5 py-0.5 rounded text-white border border-white/10 uppercase"
                  />
                </div>
              </div>

              {/* Estreno */}
              <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-black/50 border border-white/10">
                <span className="text-[8px] font-black uppercase tracking-wider text-gray-300 flex items-center justify-between">
                  Estreno (2 wks)
                  <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: badgeEstreno }} />
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={badgeEstreno}
                    onChange={(e) => updateBadgeColor('estreno', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={badgeEstreno}
                    onChange={(e) => updateBadgeColor('estreno', e.target.value)}
                    className="w-full bg-black/80 text-[9px] font-mono px-1.5 py-0.5 rounded text-white border border-white/10 uppercase"
                  />
                </div>
              </div>

              {/* En emisión */}
              <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-black/50 border border-white/10">
                <span className="text-[8px] font-black uppercase tracking-wider text-gray-300 flex items-center justify-between">
                  En emisión
                  <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: badgeEmision }} />
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={badgeEmision}
                    onChange={(e) => updateBadgeColor('emision', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={badgeEmision}
                    onChange={(e) => updateBadgeColor('emision', e.target.value)}
                    className="w-full bg-black/80 text-[9px] font-mono px-1.5 py-0.5 rounded text-white border border-white/10 uppercase"
                  />
                </div>
              </div>

              {/* Recién Finalizado */}
              <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-black/50 border border-white/10">
                <span className="text-[8px] font-black uppercase tracking-wider text-gray-300 flex items-center justify-between">
                  Finalizado
                  <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: badgeFinished }} />
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={badgeFinished}
                    onChange={(e) => updateBadgeColor('finished', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent shrink-0"
                  />
                  <input
                    type="text"
                    value={badgeFinished}
                    onChange={(e) => updateBadgeColor('finished', e.target.value)}
                    className="w-full bg-black/80 text-[9px] font-mono px-1.5 py-0.5 rounded text-white border border-white/10 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Presets de franjas */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[9px] font-bold uppercase text-gray-400">Paletas Neón Rápidas:</span>
              {[
                { name: "Cíber Neón", upcoming: "#a855f7", estreno: "#10b981", emision: "#ef4444", finished: "#3b82f6" },
                { name: "Verde Esmeralda", upcoming: "#9333ea", estreno: "#22c55e", emision: "#dc2626", finished: "#06b6d4" },
                { name: "Fuego y Sol", upcoming: "#f59e0b", estreno: "#10b981", emision: "#dc2626", finished: "#2563eb" },
                { name: "Dorado Taberna", upcoming: "#d4af37", estreno: "#059669", emision: "#e11d48", finished: "#3b82f6" }
              ].map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    updateBadgeColor('upcoming', p.upcoming);
                    updateBadgeColor('estreno', p.estreno);
                    updateBadgeColor('emision', p.emision);
                    updateBadgeColor('finished', p.finished);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 text-gray-200 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <div className="flex gap-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.upcoming }} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.estreno }} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.emision }} />
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.finished }} />
                  </div>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Configuración de Tema / Color */}
          <div className="flex flex-col gap-3 p-4 rounded-xl border border-dashed bg-black/40" style={{ borderColor: COLORS.line }}>
            <label className="text-[10px] font-black uppercase text-[#d4af37] tracking-wider flex items-center gap-2">
              <Palette size={14} /> Color de Tema Global
            </label>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="themeMode"
                  value="arcoiris"
                  checked={themeMode === 'arcoiris'}
                  onChange={() => {
                    setThemeMode('arcoiris');
                    localStorage.setItem('viñedo-theme-mode', 'arcoiris');
                  }}
                  className="accent-[#d4af37] w-4 h-4 cursor-pointer"
                />
                Dinámico (Radio Lofi)
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="themeMode"
                  value="static"
                  checked={themeMode === 'static'}
                  onChange={() => {
                    setThemeMode('static');
                    localStorage.setItem('viñedo-theme-mode', 'static');
                  }}
                  className="accent-[#d4af37] w-4 h-4 cursor-pointer"
                />
                Color Estático
              </label>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[10px] font-bold uppercase text-gray-400">Paletas Neón Rápidas:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Dorado Taberna", color: "#d4af37" },
                  { name: "Verde Neón", color: "#22c55e" },
                  { name: "Rojo Carmesí", color: "#ef4444" },
                  { name: "Azul Eléctrico", color: "#3b82f6" },
                  { name: "Morado Cíber", color: "#a855f7" }
                ].map((p) => (
                  <button
                    key={p.color}
                    type="button"
                    onClick={() => {
                      setThemeMode('static');
                      setThemeColor(p.color);
                      localStorage.setItem('viñedo-theme-mode', 'static');
                      localStorage.setItem('viñedo-theme-color', p.color);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                      themeColor === p.color && themeMode === 'static'
                        ? 'border-white shadow-lg scale-105 ring-2 ring-white/50'
                        : 'border-white/10 hover:border-white/30 opacity-80'
                    }`}
                    style={{ backgroundColor: `${p.color}30`, color: p.color }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {themeMode === 'static' && (
              <div className="flex items-center gap-4 mt-2 p-3 bg-black/60 rounded-lg border border-white/10">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => {
                    setThemeColor(e.target.value);
                    localStorage.setItem('viñedo-theme-color', e.target.value);
                  }}
                  className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                />
                <div className="flex flex-col">
                  <span className="text-xs text-gray-300 font-mono font-bold">{themeColor}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setThemeColor('#d4af37');
                      localStorage.setItem('viñedo-theme-color', '#d4af37');
                    }}
                    className="text-[10px] text-[#d4af37] hover:underline text-left mt-1 cursor-pointer font-bold"
                  >
                    Restaurar Dorado Original
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sección URL */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
              <LinkIcon size={14} /> URL de imagen / GIF / video
            </label>
            <input 
              type="text" 
              placeholder="Pega la URL directa..." 
              value={bgImage} 
              onChange={handleUrlChange}
              className="w-full bg-black/60 border-2 rounded-xl p-3 text-white outline-none focus:border-[#d4af37] transition-colors text-sm" 
              style={{ borderColor: COLORS.line }} 
            />
          </div>

          {/* Subida de archivos */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-2">
              <Upload size={14} /> Subir desde tu PC
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 px-4 rounded-xl border-2 border-dashed text-xs font-black uppercase tracking-wider transition-all hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center gap-2"
                style={{ borderColor: COLORS.line }}
              >
                <Upload size={16} /> Seleccionar archivo
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
                accept="image/*,video/*,image/gif"
                className="hidden" 
              />
            </div>
            {uploadStatus && (
              <span className={`text-xs font-mono ${uploadStatus.includes('✅') ? 'text-green-400' : 'text-red-400'}`}>
                {uploadStatus}
              </span>
            )}
            <span className="text-[9px] text-gray-500 font-mono">Formatos: imagen, GIF, MP4, WebM (máx 50MB)</span>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4 mt-2">
            <button
              onClick={handleRemove}
              className="flex-1 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all hover:bg-red-950/30 flex items-center justify-center gap-2"
              style={{ borderColor: COLORS.rust || '#b85a3a', color: COLORS.rust || '#b85a3a' }}
            >
              <Trash2 size={16} /> Quitar fondo
            </button>
            <button
              onClick={() => setShowCustomizer(false)}
              className="flex-1 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all hover:bg-[#d4af37] hover:text-black flex items-center justify-center gap-2"
              style={{ borderColor: COLORS.gold, color: COLORS.gold }}
            >
              <Palette size={16} /> Aceptar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}