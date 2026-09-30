import React, { useEffect, useState, memo } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const PARTICLES_OPTIONS = {
  fullScreen: { enable: true, zIndex: 0 },
  particles: {
    number: { value: 25, density: { enable: true, value_area: 1200 } },
    color: { value: "#d4af37" },
    opacity: { value: 0.3, random: true, anim: { enable: true, speed: 0.2, opacity_min: 0.05, sync: false } },
    size: { value: 2, random: true, anim: { enable: true, speed: 0.5, size_min: 0.5, sync: false } },
    move: { enable: true, speed: 0.4, direction: "top", random: true, straight: false, outModes: "out" }
  },
  interactivity: { events: { onHover: { enable: true, mode: "slow" } } }
};

export const TavernEmbers = memo(() => {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  if (!init) {
    return null;
  }
  
  return (
    <Particles 
      id="tsparticles" 
      options={PARTICLES_OPTIONS} 
      className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen" 
    />
  );
});