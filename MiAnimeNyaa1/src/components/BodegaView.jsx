import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Wine, Grape, ArrowLeft as ArrowLeftIcon, Save, Plus } from 'lucide-react';
import anime from 'animejs';
import { animateIn, animateButtonPress } from '../utils/animeUtils';

import { useStore } from '../store/useStore';

// ============================================================
// 🐍 SNAKE GAME (Canvas)
// ============================================================
const SnakeGame = memo(() => {
  const canvasRef = useRef(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('bodega-snake-highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const gameStateRef = useRef({
    snake: [[10, 10]],
    direction: [1, 0],
    food: [15, 10],
    running: true,
  });

  const CELL_SIZE = 20;
  const GRID_W = 30;
  const GRID_H = 20;

  // Generar comida en posición aleatoria
  const generateFood = useCallback((snake) => {
    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
      const fx = Math.floor(Math.random() * GRID_W);
      const fy = Math.floor(Math.random() * GRID_H);
      if (!snake.some(seg => seg[0] === fx && seg[1] === fy)) {
        return [fx, fy];
      }
    }
    // Si falla, buscar en todo el grid (muy raro)
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (!snake.some(seg => seg[0] === x && seg[1] === y)) {
          return [x, y];
        }
      }
    }
    return [0, 0];
  }, []);

  // Inicializar o reiniciar
  const resetGame = useCallback(() => {
    const initialSnake = [[10, 10], [9, 10], [8, 10]];
    const state = gameStateRef.current;
    state.snake = initialSnake;
    state.direction = [1, 0];
    state.food = generateFood(initialSnake);
    state.running = true;
    setGameOver(false);
    setScore(0);
  }, [generateFood]);

  // Lógica del juego (ejecutada en cada frame)
  const gameLoop = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.running) return;

    const snake = state.snake;
    const dir = state.direction;

    // Calcular nueva cabeza
    const head = snake[0];
    const newHead = [head[0] + dir[0], head[1] + dir[1]];

    // Comprobar colisión con paredes
    if (newHead[0] < 0 || newHead[0] >= GRID_W || newHead[1] < 0 || newHead[1] >= GRID_H) {
      state.running = false;
      setGameOver(true);
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('bodega-snake-highscore', String(score));
      }
      return;
    }

    // Comprobar colisión con el propio cuerpo
    if (snake.some(seg => seg[0] === newHead[0] && seg[1] === newHead[1])) {
      state.running = false;
      setGameOver(true);
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('bodega-snake-highscore', String(score));
      }
      return;
    }

    // Comer comida
    const isEating = newHead[0] === state.food[0] && newHead[1] === state.food[1];
    const newSnake = [newHead, ...snake];
    if (!isEating) {
      newSnake.pop();
    }

    state.snake = newSnake;
    if (isEating) {
      setScore(prev => prev + 1);
      state.food = generateFood(newSnake);
    }

    // Dibujar
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a0502';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dibujar serpiente
      newSnake.forEach((seg, idx) => {
        const x = seg[0] * CELL_SIZE;
        const y = seg[1] * CELL_SIZE;
        ctx.fillStyle = idx === 0 ? 'var(--radio-color, #d4af37)' : '#6b4c2a';
        ctx.shadowColor = idx === 0 ? 'var(--radio-color, #d4af37)' : 'transparent';
        ctx.shadowBlur = idx === 0 ? 15 : 0;
        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        ctx.shadowBlur = 0;
      });

      // Dibujar comida
      const fx = state.food[0] * CELL_SIZE;
      const fy = state.food[1] * CELL_SIZE;
      ctx.fillStyle = '#e74c3c';
      ctx.shadowColor = '#e74c3c';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(fx + CELL_SIZE/2, fy + CELL_SIZE/2, CELL_SIZE/2 - 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [score, highScore, generateFood]);

  // Ejecutar el bucle del juego con requestAnimationFrame
  useEffect(() => {
    let frameId;
    let lastTime = 0;
    const speed = 150; // ms por movimiento

    const step = (timestamp) => {
      if (!gameStateRef.current.running) {
        frameId = requestAnimationFrame(step);
        return;
      }
      if (timestamp - lastTime >= speed) {
        gameLoop();
        lastTime = timestamp;
      }
      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [gameLoop]);

  // Manejar teclas (direcciones)
  useEffect(() => {
    const handleKey = (e) => {
      const key = e.key;
      const state = gameStateRef.current;
      const dir = state.direction;
      // Evitar que la serpiente vaya en sentido contrario
      if (key === 'ArrowUp' && dir[1] !== 1) state.direction = [0, -1];
      else if (key === 'ArrowDown' && dir[1] !== -1) state.direction = [0, 1];
      else if (key === 'ArrowLeft' && dir[0] !== 1) state.direction = [-1, 0];
      else if (key === 'ArrowRight' && dir[0] !== -1) state.direction = [1, 0];
      else if (key === 'r' || key === 'R') resetGame();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [resetGame]);

  // Inicializar el juego
  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // Dibujar primera vez
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a0502';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Controles táctiles (para móvil)
  const handleTouch = (dx, dy) => {
    const state = gameStateRef.current;
    const dir = state.direction;
    if (dx === 1 && dir[0] !== -1) state.direction = [1, 0];
    else if (dx === -1 && dir[0] !== 1) state.direction = [-1, 0];
    else if (dy === 1 && dir[1] !== -1) state.direction = [0, 1];
    else if (dy === -1 && dir[1] !== 1) state.direction = [0, -1];
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-xl border-2 bg-black/40" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
      <div className="flex justify-between w-full text-xs font-mono">
        <span style={{ color: 'var(--radio-color, #d4af37)' }}>🐍 Snake</span>
        <span className="text-gray-400">Puntuación: <span style={{ color: 'var(--radio-color, #d4af37)' }}>{score}</span></span>
        <span className="text-gray-400">Récord: <span style={{ color: 'var(--radio-color, #d4af37)' }}>{highScore}</span></span>
      </div>

      <canvas
        ref={canvasRef}
        width={GRID_W * CELL_SIZE}
        height={GRID_H * CELL_SIZE}
        className="rounded-lg border-2 w-full max-w-[600px] aspect-[3/2] bg-black"
        style={{ borderColor: 'var(--radio-color, #2a160d)' }}
      />

      {gameOver && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-red-500 font-bold text-sm">¡Game Over!</span>
          <button
            onClick={resetGame}
            className="px-4 py-2 rounded-lg border-2 text-xs font-black uppercase tracking-wider transition-all hover:bg-white/5"
            style={{ borderColor: 'var(--radio-color, #d4af37)', color: 'var(--radio-color, #d4af37)' }}
          >
            🔄 Reiniciar
          </button>
        </div>
      )}

      {/* Controles táctiles (móvil) */}
      <div className="grid grid-cols-3 gap-1 w-full max-w-[200px] mt-2">
        <div />
        <button
          onClick={() => handleTouch(0, -1)}
          className="p-3 rounded-lg border-2 text-xs font-black hover:bg-white/5 transition-colors"
          style={{ borderColor: 'var(--radio-color, #2a160d)', color: 'var(--radio-color, #d4af37)' }}
        >
          ▲
        </button>
        <div />
        <button
          onClick={() => handleTouch(-1, 0)}
          className="p-3 rounded-lg border-2 text-xs font-black hover:bg-white/5 transition-colors"
          style={{ borderColor: 'var(--radio-color, #2a160d)', color: 'var(--radio-color, #d4af37)' }}
        >
          ◄
        </button>
        <button
          onClick={() => handleTouch(0, 0)}
          className="p-3 rounded-lg border-2 text-xs font-black hover:bg-white/5 transition-colors"
          style={{ borderColor: 'var(--radio-color, #2a160d)', color: 'var(--radio-color, #d4af37)' }}
        >
          ●
        </button>
        <button
          onClick={() => handleTouch(1, 0)}
          className="p-3 rounded-lg border-2 text-xs font-black hover:bg-white/5 transition-colors"
          style={{ borderColor: 'var(--radio-color, #2a160d)', color: 'var(--radio-color, #d4af37)' }}
        >
          ►
        </button>
        <div />
        <button
          onClick={() => handleTouch(0, 1)}
          className="p-3 rounded-lg border-2 text-xs font-black hover:bg-white/5 transition-colors"
          style={{ borderColor: 'var(--radio-color, #2a160d)', color: 'var(--radio-color, #d4af37)' }}
        >
          ▼
        </button>
        <div />
      </div>
      <span className="text-[9px] text-gray-500">Usa las teclas ↑ ↓ ← → o los botones táctiles</span>
    </div>
  );
});

// ============================================================
// 🏛️ BODEGA VIEW PRINCIPAL
// ============================================================
const BodegaView = memo(({ onVolver }) => {
  const { library, watched } = useStore();
  const [notas, setNotas] = useState('');
  const [slotResult, setSlotResult] = useState('');
  const [brindis, setBrindis] = useState(0);
  const [frase, setFrase] = useState('');

  // Cargar datos al montar
  useEffect(() => {
    fetch('http://localhost:3000/api/notes')
      .then(r => r.json())
      .then(d => setNotas(d.notas))
      .catch(() => {});
    const savedBrindis = parseInt(localStorage.getItem('bodeja-brindis') || '0', 10);
    setBrindis(savedBrindis);
    const frases = [
      "El vino entra, la sabiduría sale.",
      "Una copa al día mantiene al diablo en la lejía.",
      "La bodega es el templo del reposo.",
      "Donde hay vino, hay alegría.",
      "El buen vino no necesita laurel.",
      "Brindar es compartir el alma.",
      "La uva madura da el mejor mosto.",
      "En la bodega, todos somos iguales.",
    ];
    setFrase(frases[Math.floor(Math.random() * frases.length)]);
  }, []);

  const handleNotasChange = useCallback((e) => {
    const value = e.target.value;
    setNotas(value);
    fetch('http://localhost:3000/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas: value })
    });
  }, []);

  const handleBrindar = useCallback(() => {
    const nuevoBrindis = brindis + 1;
    setBrindis(nuevoBrindis);
    localStorage.setItem('bodeja-brindis', String(nuevoBrindis));
  }, [brindis]);

  return (
    <div
      className="flex flex-col w-full h-screen overflow-hidden relative z-20"
      style={{ backgroundColor: '#050201' }}
    >
      {/* Fondo con textura */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />

      {/* Cabecera con botón volver y título */}
      <div className="w-full max-w-[1500px] mx-auto flex justify-between items-start px-4 sm:px-12 pt-4 sm:pt-6 pb-2 shrink-0 relative z-30">
        <div
          ref={(el) => animateIn(el, { duration: 300 })}
          className="flex items-center gap-4"
        >
          <button
            onClick={(e) => { animateButtonPress(e.currentTarget); onVolver(); }}
            className="p-2 rounded-lg border-2 transition-all hover:bg-white/5 flex items-center gap-2 text-xs font-black uppercase tracking-wider cursor-pointer"
            style={{
              borderColor: 'var(--radio-color, #2a160d)',
              color: 'var(--radio-color, #d4af37)',
            }}
          >
            <ArrowLeftIcon size={16} /> Volver
          </button>
          <div className="flex items-center gap-2">
            <Wine size={24} style={{ color: 'var(--radio-color, #d4af37)' }} />
            <h2
              className="text-xl font-black uppercase tracking-widest"
              style={{
                fontFamily: '"Tilt Neon", sans-serif',
                color: 'var(--radio-color, #d4af37)',
              }}
            >
              Bodega
            </h2>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 pb-8 overflow-y-auto custom-scrollbar relative z-20">
        <div
          className="magic-board bg-gradient-to-br from-[#0a0502] via-[#050201] to-[#020100] border rounded-2xl p-4 sm:p-6 shadow-[0_30px_60px_rgba(0,0,0,0.9),inset_0_2px_15px_rgba(255,255,255,0.02)] relative flex flex-col gap-6"
          style={{ borderColor: 'var(--radio-color, #1a0d06)' }}
        >
          {/* Frase */}
          <div className="text-sm italic font-serif text-amber-400/80 bg-amber-950/30 p-4 rounded-xl border border-amber-900/30 text-center">
            “{frase}”
          </div>


          {/* Dashboard Estadísticas y Slot Machine */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-900/30 flex flex-col justify-center items-center text-amber-200">
              <h3 className="text-xs uppercase font-bold text-amber-500 mb-2">Estadísticas de la Taberna</h3>
              <div className="text-2xl font-black">{Object.keys(library).length}</div>
              <div className="text-[10px] text-amber-600/80 uppercase">Animes en Colección</div>
              
              <div className="text-2xl font-black mt-2">
                {Object.values(watched).reduce((acc, curr) => acc + curr.length, 0)}
              </div>
              <div className="text-[10px] text-amber-600/80 uppercase">Episodios Vistos</div>
            </div>
            
            <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-900/30 flex flex-col justify-center items-center">
              <h3 className="text-xs uppercase font-bold text-amber-500 mb-2">Anime Aleatorio</h3>
              <button 
                onClick={() => {
                  const vals = Object.values(library);
                  if(vals.length > 0) {
                    const randomAnime = vals[Math.floor(Math.random() * vals.length)];
                    setSlotResult(randomAnime.title);
                  } else {
                    setSlotResult("¡Tu biblioteca está vacía!");
                  }
                }}
                className="bg-amber-900 hover:bg-amber-800 text-amber-100 font-bold py-2 px-4 rounded border border-amber-700 transition-colors w-full mb-3 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
              >
                Tirar de la palanca 🎰
              </button>
              <div className="text-sm font-black text-amber-300 text-center min-h-[40px] flex items-center justify-center">
                {slotResult || "Descubre tu próxima aventura..."}
              </div>
            </div>
          </div>

          {/* 🐍 Juego Snake */}
          <SnakeGame />

          {/* Bloc de notas */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Save size={14} style={{ color: 'var(--radio-color, #d4af37)' }} /> Bloc de notas (se guarda solo)
            </label>
            <textarea
              value={notas}
              onChange={handleNotasChange}
              placeholder="Escribe aquí tus pensamientos, recetas o secretos..."
              className="w-full h-40 p-4 rounded-xl border-2 bg-black/60 text-white resize-none custom-scrollbar focus:outline-none transition-colors"
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
        </div>
      </div>

      {/* Radio flotante */}
    </div>
  );
});

export default BodegaView;