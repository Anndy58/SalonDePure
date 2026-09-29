import React, { useState, useEffect, useCallback, memo } from 'react';
import { Wine, Grape, Save, Plus, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const FRASES = [
  "El vino entra, la sabiduría sale.",
  "Una copa al día mantiene al diablo en la lejía.",
  "La bodega es el templo del reposo.",
  "Donde hay vino, hay alegría.",
  "El buen vino no necesita laurel.",
  "Brindar es compartir el alma.",
  "La uva madura da el mejor mosto.",
  "En la bodega, todos somos iguales.",
];

const BodegaView = memo(({ onVolver }) => {
  const [notas, setNotas] = useState('');
  const [brindis, setBrindis] = useState(0);
  const [frase, setFrase] = useState('');

  // Cargar datos al montar
  useEffect(() => {
    const savedNotas = localStorage.getItem('bodeja-notas') || '';
    setNotas(savedNotas);
    const savedBrindis = parseInt(localStorage.getItem('bodeja-brindis') || '0', 10);
    setBrindis(savedBrindis);
    const randomIndex = Math.floor(Math.random() * FRASES.length);
    setFrase(FRASES[randomIndex]);
  }, []);

  const handleNotasChange = useCallback((e) => {
    const value = e.target.value;
    setNotas(value);
    localStorage.setItem('bodeja-notas', value);
  }, []);

  const handleBrindar = useCallback(() => {
    const nuevoBrindis = brindis + 1;
    setBrindis(nuevoBrindis);
    localStorage.setItem('bodeja-brindis', String(nuevoBrindis));
  }, [brindis]);

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden relative z-20" style={{ backgroundColor: '#080402' }}>
      
      {/* Fondo con textura sutil */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

      {/* Letrero de la Bodega */}
      <div className="w-full max-w-[1500px] mx-auto flex justify-center items-start px-12 pt-6 pb-2 shrink-0">
        <motion.div 
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
          className="relative flex flex-col items-center z-40 select-none mb-4 mt-2 scale-90 origin-top"
        >
          <div className="absolute -top-[30px] left-[50px] w-2 h-8 border-x-4 border-[#0a0502] bg-[#1a0d06] rounded-sm shadow-[0_5px_10px_rgba(0,0,0,0.8)]"></div>
          <div className="absolute -top-[30px] right-[50px] w-2 h-8 border-x-4 border-[#0a0502] bg-[#1a0d06] rounded-sm shadow-[0_5px_10px_rgba(0,0,0,0.8)]"></div>

          <div className="premium-board relative flex flex-row items-center justify-center px-10 py-4 min-w-[400px]">
            <div className="absolute top-2 left-2 w-2 h-2 bg-[#4a2b18] rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.9)]"></div>
            <div className="absolute top-2 right-2 w-2 h-2 bg-[#4a2b18] rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.9)]"></div>
            <div className="absolute bottom-2 left-2 w-2 h-2 bg-[#4a2b18] rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.9)]"></div>
            <div className="absolute bottom-2 right-2 w-2 h-2 bg-[#4a2b18] rounded-full shadow-[inset_1px_1px_2px_rgba(0,0,0,0.9)]"></div>

            <div className="neon-glow-master relative z-10 flex items-center gap-5">
              <div className="flex items-center justify-center relative">
                <Wine size={42} strokeWidth={1.5} className="text-[#fffaf0] neon-text-main" style={{ filter: `drop-shadow(0 0 15px var(--n-color))` }} />
                <Grape size={20} strokeWidth={2} className="absolute -bottom-2 -right-3 text-[var(--n-color)] neon-text-sub flicker-2" />
              </div>
              
              <div className="flex flex-col items-center">
                <h1 className="text-[40px] flex leading-none tracking-wide" style={{ fontFamily: '"Tilt Neon", sans-serif' }}>
                  <span className="neon-text-main">B</span>
                  <span className="neon-text-main">O</span>
                  <span className="neon-text-main">D</span>
                  <span className="neon-text-main">E</span>
                  <span className="neon-text-main">G</span>
                  <span className="neon-text-main">A</span>
                </h1>
                <h2 className="text-[18px] flex mt-1 tracking-[0.2em]" style={{ fontFamily: '"Yellowtail", cursive' }}>
                  <span className="neon-text-sub">DE LAS&nbsp;</span>
                  <span className="neon-text-sub flicker-2">UVAS</span>
                </h2>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 w-full max-w-[1200px] mx-auto px-8 pb-8 overflow-y-auto custom-scrollbar">
        <div className="magic-board bg-gradient-to-br from-[#150a05] via-[#0d0603] to-[#0a0502] border rounded-2xl p-8 shadow-[0_30px_60px_rgba(0,0,0,0.9),inset_0_2px_15px_rgba(255,255,255,0.03)] relative">
          
          {/* Frase aleatoria */}
          <div className="text-sm italic font-serif text-amber-400/80 bg-amber-950/30 p-4 rounded-xl border border-amber-900/30 text-center mb-6">
            “{frase}”
          </div>

          {/* Bloc de notas */}
          <div className="flex flex-col gap-2 mb-6">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Save size={14} style={{ color: 'var(--radio-color, #d4af37)' }} /> Bloc de notas (se guarda solo)
            </label>
            <textarea
              value={notas}
              onChange={handleNotasChange}
              placeholder="Escribe aquí tus pensamientos, recetas o secretos..."
              className="w-full h-60 p-4 rounded-xl border-2 bg-black/60 text-white resize-none custom-scrollbar focus:outline-none transition-colors"
              style={{
                borderColor: 'var(--radio-color, #2a160d)',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '13px',
                lineHeight: '1.6',
              }}
            />
            <span className="text-right text-[9px] font-mono text-gray-500">
              {notas.length} caracteres
            </span>
          </div>

          {/* Barómetro de brindis */}
          <div className="flex flex-col gap-3 p-4 rounded-xl border-2 bg-black/40" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Plus size={14} style={{ color: 'var(--radio-color, #d4af37)' }} />
                Barómetro de la Bodega
              </span>
              <span className="text-2xl font-black" style={{ color: 'var(--radio-color, #d4af37)' }}>
                {brindis}
              </span>
            </div>
            <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
              <div
                className="h-full transition-all duration-700 rounded-full"
                style={{
                  width: `${Math.min(brindis, 100)}%`,
                  backgroundColor: 'var(--radio-color, #d4af37)',
                  boxShadow: `0 0 20px var(--radio-color, #d4af37)60`,
                }}
              />
            </div>
            <button
              onClick={handleBrindar}
              className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--radio-color, #d4af37)',
                color: '#0f0805',
                boxShadow: `0 0 20px var(--radio-color, #d4af37)40`,
              }}
            >
              🍷 Brindar
            </button>
          </div>

          {/* Botón volver */}
          <button
            onClick={onVolver}
            className="mt-8 px-6 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all hover:bg-white/5 flex items-center gap-2 mx-auto"
            style={{ borderColor: 'var(--radio-color, #d4af37)', color: 'var(--radio-color, #d4af37)' }}
          >
            <ArrowLeft size={16} /> Volver a la Taberna
          </button>
        </div>
      </div>
    </div>
  );
});

export default BodegaView;