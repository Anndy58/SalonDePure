// src/components/AboutModal.jsx
import React from 'react';
import { X, Github, Calendar, User, Code, Coffee } from 'lucide-react';

const AboutModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar p-6 sm:p-8 rounded-2xl border-2 shadow-2xl flex flex-col gap-6"
        style={{
          backgroundColor: '#0f0805',
          borderColor: 'var(--radio-color, #d4af37)',
          boxShadow: `0 0 calc(var(--radio-intensity, 0) * 40px + 20px) var(--radio-color, #d4af37)40`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b-2 pb-4" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
          <h2 className="text-xl font-black uppercase tracking-widest" style={{ fontFamily: '"Tilt Neon", sans-serif', color: 'var(--radio-color, #d4af37)' }}>
            Sobre la Taberna
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4 text-gray-300 text-sm">
          <div className="flex items-center gap-3">
            <Coffee size={20} style={{ color: 'var(--radio-color, #d4af37)' }} />
            <span className="font-bold">Proyecto:</span>
            <span>La Taberna de las Uvas</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar size={20} style={{ color: 'var(--radio-color, #d4af37)' }} />
            <span className="font-bold">Inicio:</span>
            <span>4 de julio de 2026</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar size={20} style={{ color: 'var(--radio-color, #d4af37)' }} />
            <span className="font-bold">Finalización:</span>
            <span>16 de julio de 2026</span>
          </div>
          <div className="flex items-center gap-3">
            <User size={20} style={{ color: 'var(--radio-color, #d4af37)' }} />
            <span className="font-bold">Autor:</span>
            <span>BlackCats58 en colaboracion con Gemini y DeepSeek</span> {/* Cambia esto */}
          </div>
          <div className="flex items-center gap-3">
            <Code size={20} style={{ color: 'var(--radio-color, #d4af37)' }} />
            <span className="font-bold">Versión:</span>
            <span>20.67</span>
          </div>
          <div className="flex items-start gap-3 mt-2 border-t pt-4" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
            <Github size={20} style={{ color: 'var(--radio-color, #d4af37)' }} />
            <div className="flex flex-col">
              <span className="font-bold">Tecnologías:</span>
              <ul className="list-disc list-inside text-xs text-gray-400 mt-1 space-y-1">
                <li>React 18 + Hooks</li>
                <li>Tailwind CSS 4</li>
                <li>Framer Motion</li>
                <li>Node.js + Express</li>
                <li>Web Audio API</li>
				<li>NYAA.SI</li>
                <li>Electron (para escritorio)</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            🍇 Hecho para ahorrame solo 10 segundos.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;