import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-[#080402]">
          <h1 className="text-2xl font-black text-red-500 mb-4">🍷 Algo salió mal</h1>
          <p className="text-gray-400 mb-6 max-w-md">
            La Taberna ha tenido un problema inesperado. 
            Revisa la consola para más detalles o recarga la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all hover:bg-[#d4af37] hover:text-black"
            style={{ borderColor: 'var(--radio-color, #d4af37)', color: 'var(--radio-color, #d4af37)' }}
          >
            🔄 Recargar Taberna
          </button>
          <pre className="mt-6 text-xs text-gray-600 max-w-xl overflow-auto p-4 bg-black/50 rounded border border-red-900/30">
            {this.state.error?.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}