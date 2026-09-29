import React, { useRef, useEffect, memo } from 'react';
import { Loader2 } from 'lucide-react';

const Visualizer = memo(({ analyserNode, isPlaying, isConnecting, settings, visualizerType = 'bars', themeMode, themeColor }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const hueRef = useRef(0);
  const lastDrawTimeRef = useRef(0);
  const lastCssUpdateTimeRef = useRef(0);

  useEffect(() => {
    if (!isPlaying || !analyserNode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const tavernRoot = document.getElementById('tavern-root');

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      
      const now = performance.now();
      if (now - lastDrawTimeRef.current < 30) return; // Limitar a ~30fps 
      lastDrawTimeRef.current = now;

      analyserNode.getByteFrequencyData(dataArray);
      hueRef.current = (hueRef.current + 0.5) % 360;
      const currentHue = hueRef.current;

      // Efecto de rastro (Motion Blur)
      ctx.fillStyle = '#08020f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(8, 2, 15, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      let bassSum = 0;
      const bassCount = Math.floor(bufferLength * 0.3) || 1;
      for (let i = 0; i < bassCount; i++) bassSum += dataArray[i]; 

      // === 3 ESTILOS DE VISUALIZADOR ===
      if (visualizerType === 'bars') {
        let x = 0;
        const step = 2;
        const barWidth = canvas.width / (bufferLength / step);
        
        for (let i = 0; i < bufferLength; i += step) {
          const val = dataArray[i] / 255;
          const barHeight = val * canvas.height * 0.85;
          const y = canvas.height - barHeight - 2;
          
          // Barra
          ctx.fillStyle = `hsl(${(currentHue + i * 4) % 360}, 100%, 65%)`;
          ctx.fillRect(x, y, barWidth - 1, barHeight + 2);
          
          // Tope brillante (Cap)
          if (val > 0.1) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, y - 2, barWidth - 1, 2);
          }
          x += barWidth;
        }
      } 
      else if (visualizerType === 'wave') {
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 255;
          const y = canvas.height - (v * canvas.height * 0.9);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        
        // Gradiente bajo la onda
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        
        const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, `hsla(${currentHue}, 100%, 60%, 0.4)`);
        grad.addColorStop(1, `hsla(${currentHue}, 100%, 10%, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.lineWidth = 2;
        ctx.strokeStyle = `hsl(${currentHue}, 100%, 75%)`;
        ctx.stroke();
      }
      else if (visualizerType === 'symmetric') {
        const step = 2;
        const barWidth = (canvas.width / 2) / (bufferLength / step);
        const centerX = canvas.width / 2;

        for (let i = 0; i < bufferLength; i += step) {
          const val = dataArray[i] / 255;
          const barHeight = val * canvas.height * 0.8;
          const y = (canvas.height / 2) - (barHeight / 2);
          
          ctx.fillStyle = `hsl(${(currentHue + i * 6) % 360}, 100%, ${40 + (val*40)}%)`;
          
          // Derecha e Izquierda
          ctx.fillRect(centerX + (i/step * barWidth), y, barWidth - 1, barHeight);
          ctx.fillRect(centerX - (i/step * barWidth) - barWidth, y, barWidth - 1, barHeight);
          
          // Núcleo central vibrante
          if (val > 0.6 && i === 0) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(centerX - 1, y - 5, 2, barHeight + 10);
          }
        }
      }

      // === LUCES DE TABERNA ===
      if (tavernRoot && (now - lastCssUpdateTimeRef.current > 100)) { // Throttled to ~10fps for CSS properties to prevent lag
        lastCssUpdateTimeRef.current = now;

        const rawIntensity = bassSum / (bassCount * 255);
        const flicker = settings?.flicker || 50;
        // Smooth intensity slightly to avoid abrupt jumps when throttled
        const intensity = (rawIntensity * (flicker / 50)).toFixed(3);

        if (themeMode === 'arcoiris') {
          const pulseColor = `hsl(${Math.round(currentHue)}, 100%, ${50 + intensity * 15}%)`;
          const shadowColor = `hsla(${Math.round(currentHue)}, 100%, 50%, ${0.25 + intensity * 0.75})`;
          const bgThemeColor = `hsla(${Math.round(currentHue)}, 20%, ${3.5 + intensity * 2.0}%, 0.98)`;

          tavernRoot.style.setProperty('--radio-intensity', intensity.toString());
          tavernRoot.style.setProperty('--radio-color', pulseColor);
          tavernRoot.style.setProperty('--radio-shadow-color', shadowColor);
          tavernRoot.style.setProperty('--radio-bg-color', bgThemeColor);
        } else {
          // Static theme mode
          tavernRoot.style.setProperty('--radio-intensity', (intensity * 0.3).toFixed(3).toString());
          // color is maintained from App.jsx effect
        }
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (tavernRoot) {
        if (themeMode === 'arcoiris') {
          tavernRoot.style.setProperty('--radio-intensity', '0');
        } else {
           tavernRoot.style.setProperty('--radio-intensity', '0.1'); // Reset to default static intensity
        }
      }
    };
  }, [isPlaying, analyserNode, settings, visualizerType, themeMode, themeColor]);

  return (
    <div className="w-full h-12 bg-black/90 rounded-xl border-2 border-amber-950 overflow-hidden relative flex items-center justify-center shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)]">
      {isConnecting && (
        <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center backdrop-blur-[2px] transition-all">
          <Loader2 className="animate-spin text-amber-500 mb-1" size={18} />
          <span className="text-amber-500 font-mono text-[8px] uppercase tracking-widest animate-pulse">Sintonizando...</span>
        </div>
      )}
      <canvas ref={canvasRef} width={250} height={48} className="w-full h-full block relative z-10" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/45 pointer-events-none z-15" />
    </div>
  );
});

export default Visualizer;