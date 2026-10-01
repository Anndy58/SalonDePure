import React, { memo } from "react";

const GLOBAL_STYLES = `
  #tavern-root {
    --radio-color: #d4af37;
    --radio-intensity: 0.1;
  }

  .magic-board .group {
    border: 1px solid var(--radio-color, #2a160d) !important;
    border-radius: 8px;
    background: #0f0805;
    box-shadow: 0 5px 15px rgba(0,0,0,0.8);
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    will-change: transform;
    transform: translateZ(0);
  }
  .magic-board .group:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: var(--radio-color, #d4af37) !important;
    box-shadow: 0 20px 40px rgba(0,0,0,1), 0 0 30px var(--radio-color, #d4af37)40 !important;
    z-index: 10;
  }
  .magic-board .group img {
    transition: filter 0.5s ease, transform 0.8s ease;
    filter: brightness(0.85) contrast(1.1);
  }
  .magic-board .group:hover img {
    transform: scale(1.05);
    filter: brightness(1.1) contrast(1.1);
  }

  .premium-board {
    background: linear-gradient(180deg, #1f100a 0%, #0d0603 100%);
    box-shadow: 
      inset 0 1px 1px rgba(255,255,255,0.05),
      inset 0 -5px 15px rgba(0,0,0,0.8),
      0 25px 50px -12px rgba(0,0,0,1),
      0 40px 80px -20px var(--radio-color, #d4af37)30;
    border: 2px solid var(--radio-color, #2a160d);
    border-radius: 12px;
  }

  .neon-glow-master {
    --n-color: var(--radio-color, #d4af37);
    transition: text-shadow 0.1s ease-out, filter 0.1s ease-out;
    will-change: filter, text-shadow;
  }
  
  .neon-text-main {
    color: #fffaf0;
    text-shadow: 
      0 0 5px rgba(255,255,255,0.5),
      0 0 calc(10px + var(--radio-intensity, 0) * 10px) var(--n-color),
      0 0 calc(20px + var(--radio-intensity, 0) * 20px) var(--n-color),
      0 0 calc(40px + var(--radio-intensity, 0) * 40px) var(--n-color);
  }
  
  .neon-text-sub {
    color: var(--n-color);
    text-shadow: 
      0 0 calc(5px + var(--radio-intensity, 0) * 5px) var(--n-color),
      0 0 calc(15px + var(--radio-intensity, 0) * 15px) var(--n-color);
  }

  .flicker-1 { animation: flick 4s infinite alternate; }
  .flicker-2 { animation: flick 7s infinite alternate-reverse; }
  @keyframes flick {
    0%, 20%, 22%, 50%, 52%, 100% { opacity: 1; text-shadow: inherit; }
    21%, 51% { opacity: 0.4; text-shadow: none; }
  }

  html { scroll-behavior: smooth; }
  .custom-scrollbar { scroll-behavior: smooth; }
`;




export const GlobalStyleSheet = memo(() => <style>{GLOBAL_STYLES}</style>);