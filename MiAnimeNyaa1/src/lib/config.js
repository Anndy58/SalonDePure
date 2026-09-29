// src/lib/config.js

// Si usas Vite:
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// NOTA: Si estás usando Create React App en lugar de Vite, usarías:
// export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';