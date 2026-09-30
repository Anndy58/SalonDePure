import React, { useState, useEffect } from "react";
import { 
  Grape, Terminal, Palette, Folder, Calendar, Search, Library, Download, 
  Wine, Radio, Info, Settings
} from "lucide-react";
import anime from "animejs";
import { animateIn, animateButtonPress } from "../utils/animeUtils";
import { useNavigate, useLocation } from "react-router-dom";

export default function MobileLayout({
  library,
  activeDownloads,
  setShowTerminal,
  setShowCustomizer,
  abrirCarpetaAnimes,
  onToggleBodega,
  onToggleAbout, // 🆕
  onSetupAPI,
  children
}) {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const tabs = [
    { id: 'calendario', path: '/calendario', icon: Calendar, label: 'Emisión' },
    { id: 'proximamente', path: '/proximamente', icon: Calendar, label: 'Próximamente' },
    { id: 'catalogo', path: '/catalogo', icon: Search, label: 'Catálogo' },
    { id: 'biblioteca', path: '/biblioteca', icon: Library, label: 'Colección', badge: Object.keys(library).length },
    { id: 'descargas', path: '/descargas', icon: Download, label: 'Descargas', badge: activeDownloads.length > 0 ? activeDownloads.length : null }
  ];

  return (
    <div className="flex flex-col h-[100dvh] w-full relative bg-[#080402] overflow-hidden">

      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="w-full h-full bg-gradient-to-br from-[#1a0d06] via-[#0d0603] to-[#080402] opacity-95" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-900/10 rounded-full blur-[150px] translate-x-1/3 translate-y-1/3" />
      </div>

      <div
        ref={(el) => animateIn(el, { duration: 300 })}
        className={`relative z-20 flex justify-between items-center px-4 py-3 transition-all duration-300 ${
          scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-[#d4af37]/20 shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="p-1.5 bg-gradient-to-br from-[#d4af37] to-amber-600 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <Grape size={18} className="text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="text-[16px] font-black tracking-tight text-white"
                style={{ fontFamily: '"Tilt Neon", sans-serif', textShadow: "0 0 20px rgba(212,175,55,0.15)" }}
              >
                TABERNA
              </span>
              <span
                className="text-[9px] tracking-[0.2em] text-[#d4af37] -mt-0.5 opacity-80"
                style={{ fontFamily: '"Yellowtail", cursive' }}
              >
                DE LAS UVAS
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onToggleBodega}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-[#d4af37] hover:border-[#d4af37]/40 transition-all shadow-lg"
            title="Bodega Secreta"
          >
            <Wine size={16} />
          </button>
          {/* 🆕 Botón About */}
          <button
            onClick={onToggleAbout}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-[#d4af37] hover:border-[#d4af37]/40 transition-all shadow-lg"
            title="Acerca de"
          >
            <Info size={16} />
          </button>
          <button
            onClick={abrirCarpetaAnimes}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-[#d4af37] hover:border-[#d4af37]/40 transition-all shadow-lg"
          >
            <Folder size={16} />
          </button>
          <button
            onClick={() => setShowTerminal(true)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-[#d4af37] hover:border-[#d4af37]/40 transition-all shadow-lg"
          >
            <Terminal size={16} />
          </button>
          <button
            onClick={() => setShowCustomizer(true)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-[#d4af37] hover:border-[#d4af37]/40 transition-all shadow-lg"
          >
            <Palette size={16} />
          </button>
        </div>
      </div>

      <div
        key={location.pathname}
        ref={(el) => animateIn(el, { duration: 250 })}
        className="flex-1 overflow-y-auto w-full custom-scrollbar relative z-10 px-3 pb-32 pt-2"
      >
        {children}
      </div>

      <div className="fixed bottom-0 left-0 w-full z-50 bg-black/90 backdrop-blur-2xl border-t border-[#d4af37]/10 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="flex justify-around items-center px-1 py-1.5">
          {tabs.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className="relative flex flex-col items-center justify-center w-full py-1.5 gap-0.5 transition-all duration-200 group"
              >
                {isActive && (
                  <div
                    className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#d4af37] rounded-full shadow-[0_0_15px_rgba(212,175,55,0.6)]"
                  />
                )}
                
                <div className={`relative p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-[#d4af37]/15 text-[#d4af37]' : 'text-gray-500 group-hover:text-gray-300'
                }`}>
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                
                <span className={`text-[8px] font-black uppercase tracking-wider transition-all ${
                  isActive ? 'text-[#d4af37]' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>

                {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                  <span
                    className="absolute -top-0.5 right-1/3 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg border border-red-700 min-w-[18px] text-center"
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-24 right-4 z-40">
        <button 
          className="w-14 h-14 rounded-full bg-gradient-to-br from-[#d4af37] to-amber-600 shadow-[0_0_30px_rgba(212,175,55,0.3)] flex items-center justify-center border-2 border-[#d4af37]/50 hover:scale-105 transition-transform"
          onClick={() => {
            const radioToggle = document.querySelector('.lofi-radio-toggle');
            if (radioToggle) radioToggle.click();
          }}
        >
          <Radio size={22} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
        </button>
      </div>
    </div>
  );
}