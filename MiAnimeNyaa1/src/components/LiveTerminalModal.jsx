import React, { useState, useEffect, useRef, memo } from "react";
import { motion } from "framer-motion";
import { X, Terminal } from "lucide-react";

export const LiveTerminalModal = memo(({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);
  const prevLogsRef = useRef("");

  useEffect(() => {
    let timeoutId;
    const fetchLogs = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:3000/api/logs/view`);
        const data = await res.json();
        const currentStr = JSON.stringify(data.logs || []);
        if (prevLogsRef.current !== currentStr) {
          prevLogsRef.current = currentStr;
          setLogs(data.logs || []);
        }
      } catch (e) {}
      timeoutId = setTimeout(fetchLogs, 2000);
    };
    fetchLogs();
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [logs]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-4xl h-[70vh] flex flex-col bg-[#0a0502] border-2 rounded-sm overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,1)]"
        style={{ borderColor: 'var(--radio-color, #2a160d)' }}
      >
        <div className="flex justify-between items-center p-4 border-b-2 bg-gradient-to-b from-[#1a0d06] to-[#0a0502] shadow-md z-10" style={{ borderColor: 'var(--radio-color, #2a160d)' }}>
          <span className="font-mono font-bold tracking-widest uppercase flex items-center gap-3 text-[#d4af37] text-sm">
            <Terminal size={16}/> Registro de la Taberna
          </span>
          <button 
            type="button"
            onClick={onClose} 
            className="text-[#a89f91] hover:text-[#d4af37] transition-colors p-1 bg-[#1a0d06] border border-[#2a160d] rounded shadow-inner"
          >
            <X size={18}/>
          </button>
        </div>
        <div className="flex-1 p-5 overflow-y-auto font-mono text-[11px] sm:text-xs text-[#a89f91] custom-scrollbar flex flex-col gap-1.5 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
          {logs.map((line, i) => {
            let textColor = 'text-[#a89f91] opacity-80';
            if (line.includes('[ERROR]') || line.includes('[FAIL]')) textColor = 'text-[#e74c3c] font-bold drop-shadow-[0_0_3px_rgba(231,76,60,0.5)]';
            if (line.includes('[WARN]')) textColor = 'text-[#f39c12] font-bold';
            if (line.includes('[SUCCESS]') || line.includes('[OK]')) textColor = 'text-[#27ae60] font-bold';
            return <div key={i} className={`${textColor} border-b border-[#2a160d]/30 pb-1.5`}>{line}</div>;
          })}
          <div ref={bottomRef} />
        </div>
      </motion.div>
    </motion.div>
  );
});