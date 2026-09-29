import React, { memo } from "react";
import { motion } from "framer-motion";
import { Wine, Grape } from "lucide-react";

export const TavernSign = memo(({ defaultColor, modoBodega, onToggleModo }) => {
  return (
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
              {modoBodega ? (
                <>
                  <span className="neon-text-main">B</span>
                  <span className="neon-text-main">O</span>
                  <span className="neon-text-main">D</span>
                  <span className="neon-text-main">E</span>
                  <span className="neon-text-main">G</span>
                  <span className="neon-text-main">A</span>
                </>
              ) : (
                <>
                  <span className="neon-text-main">L</span>
                  <span className="neon-text-main">A</span>
                  <span className="neon-text-main">&nbsp;T</span>
                  <span 
                    className="neon-text-main flicker-1 cursor-default" 
                    onClick={onToggleModo}
                  >
                    A
                  </span>
                  <span className="neon-text-main">BERNA</span>
                </>
              )}
            </h1>
            <h2 className="text-[18px] flex mt-1 tracking-[0.2em]" style={{ fontFamily: '"Yellowtail", cursive' }}>
              <span className="neon-text-sub">DE LAS&nbsp;</span>
              <span className="neon-text-sub flicker-2">UVAS</span>
            </h2>
          </div>
        </div>
      </div>
    </motion.div>
  );
});