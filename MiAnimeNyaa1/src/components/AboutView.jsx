import React, { memo } from 'react';
import { X, Github, Coffee, Calendar, User, Code, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const AboutView = memo(({ onClose }) => {
  // Datos del proyecto (cámbialos a tu gusto)
  const project = {
    name: 'La Taberna de las Uvas',
    version: 'v20.7',
    startDate: '4 de julio del 2026',
    endDate: '16 de julio de 2026 (finalizado)',
    developer: 'BlackCats58 with Gemini and DeepSeek',
    description: 'Un gestor de biblioteca de anime con radio LoFi, explorador de archivos, integración con Shoko/Sonarr.',
    techStack: ['React', 'Node.js', 'Express', 'Tailwind', 'Framer Motion', 'Web Audio API'],
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6 sm:p-8 rounded-2xl border-2 shadow-2xl flex flex-col gap-6"
        style={{
          backgroundColor: '#0f0805',
          borderColor: 'var(--radio-color, #d4af37)',
          boxShadow: `0 0 calc(var(--radio-intensity, 0) * 40px + 20px) var(--radio-color, #d4af37)40`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex justify-between items-center border-b-2 pb-4" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
          <div className="flex items-center gap-3">
            <Coffee size={24} style={{ color: 'var(--radio-color, #d4af37)' }} />
            <h2 className="text-xl font-black uppercase tracking-widest" style={{ fontFamily: '"Tilt Neon", sans-serif', color: 'var(--radio-color, #d4af37)' }}>
              Sobre la Taberna
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex flex-col gap-4 text-gray-300">
          <div className="flex items-center gap-3">
            <Code size={18} style={{ color: 'var(--radio-color, #d4af37)' }} />
            <span className="text-xl font-bold text-white">{project.name}</span>
            <span className="text-xs font-mono text-gray-500 bg-black/50 px-2 py-1 rounded border border-amber-900/30">{project.version}</span>
          </div>

          <p className="text-sm leading-relaxed opacity-90">{project.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} style={{ color: 'var(--radio-color, #d4af37)' }} />
              <span><span className="text-gray-500">Inicio:</span> {project.startDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar size={16} style={{ color: 'var(--radio-color, #d4af37)' }} />
              <span><span className="text-gray-500">Final:</span> {project.endDate}</span>
            </div>
            <div className="flex items-center gap-2 text-sm col-span-full">
              <User size={16} style={{ color: 'var(--radio-color, #d4af37)' }} />
              <span><span className="text-gray-500">Desarrollador:</span> {project.developer}</span>
            </div>
          </div>

          <div className="border-t border-amber-950/30 pt-4">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Tecnologías</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {project.techStack.map((tech) => (
                <span key={tech} className="px-2.5 py-1 rounded text-[10px] font-mono bg-black/60 border border-amber-900/30 text-amber-400">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-2 pt-2 border-t border-amber-950/30">
            <a
              href={project.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 text-xs font-black uppercase tracking-wider transition-all hover:bg-white/5"
              style={{ borderColor: 'var(--radio-color, #d4af37)', color: 'var(--radio-color, #d4af37)' }}
            >
              <Github size={16} /> Repositorio
            </a>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Heart size={12} style={{ color: 'var(--radio-color, #d4af37)' }} /> Hecho con pasión
            </span>
          </div>
        </div>

        <p className="text-[9px] font-mono text-gray-500 text-center border-t border-amber-950/30 pt-4">
          {project.license} · {new Date().getFullYear()}
        </p>
      </motion.div>
    </motion.div>
  );
});

export default AboutView;