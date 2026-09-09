import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

export default function PresentationModal({
  cards = [],
  onClose,
  onEditCard
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fontSize, setFontSize] = useState(24);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Riferimento al div principale del modale
  const modalRef = useRef(null);

  const currentCard = cards[currentIndex];

  // Gestione Fullscreen affidabile legata all'elemento modale
  const toggleFullscreen = () => {
    if (!modalRef.current) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (modalRef.current.requestFullscreen) {
        modalRef.current.requestFullscreen();
      } else if (modalRef.current.webkitRequestFullscreen) {
        modalRef.current.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFull);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleClose = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, cards.length]);

  if (!currentCard) return null;

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleIncreaseFont = () => setFontSize((prev) => Math.min(prev + 2, 40));
  const handleDecreaseFont = () => setFontSize((prev) => Math.max(prev - 2, 14));

  const columnBgClass = currentCard.columnColor || 'bg-blue-600';

  return (
    <div
      ref={modalRef}
      className={`fixed inset-0 flex flex-col justify-between p-6 z-50 font-sans transition-colors duration-300 ${
        isDarkMode
          ? 'bg-slate-950 text-white'
          : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* HEADER SLIDE SHOW */}
      <div className="flex justify-between items-center max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          {currentCard.columnName && (
            <span
              className={`text-xs font-black px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-white/20 text-white ${columnBgClass}`}
            >
              <span>📋</span>
              <span className="truncate max-w-[200px] sm:max-w-xs">{currentCard.columnName}</span>
            </span>
          )}
          <span
            className={`text-xs font-semibold ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Scheda {currentIndex + 1} di {cards.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* PULSANTE FULLSCREEN */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition border flex items-center gap-1.5 ${
              isDarkMode
                ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                : 'bg-white hover:bg-slate-200 border-slate-300 text-slate-800 shadow-sm'
            }`}
            title="Attiva/Disattiva schermo intero"
          >
            {isFullscreen ? '⤢ Riduci' : '⤢ Fullscreen'}
          </button>

          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition border flex items-center gap-1.5 ${
              isDarkMode
                ? 'bg-white/10 hover:bg-white/20 border-white/10 text-amber-300'
                : 'bg-white hover:bg-slate-200 border-slate-300 text-slate-800 shadow-sm'
            }`}
            title="Cambia tema della presentazione"
          >
            {isDarkMode ? '☀️ Chiaro' : '🌙 Scuro'}
          </button>

          <div
            className={`flex items-center rounded-xl border p-0.5 ${
              isDarkMode
                ? 'bg-white/10 border-white/10'
                : 'bg-white border-slate-300 shadow-sm'
            }`}
          >
            <button
              type="button"
              onClick={handleDecreaseFont}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                isDarkMode
                  ? 'text-slate-300 hover:text-white hover:bg-white/10'
                  : 'text-slate-700 hover:text-black hover:bg-slate-100'
              }`}
              title="Riduci testo"
            >
              A-
            </button>
            <span
              className={`text-[10px] px-1 font-mono font-bold ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {fontSize}px
            </span>
            <button
              type="button"
              onClick={handleIncreaseFont}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                isDarkMode
                  ? 'text-slate-300 hover:text-white hover:bg-white/10'
                  : 'text-slate-700 hover:text-black hover:bg-slate-100'
              }`}
              title="Ingrandisci testo"
            >
              A+
            </button>
          </div>

          {onEditCard && (
            <button
              type="button"
              onClick={() => {
                handleClose();
                onEditCard(currentCard);
              }}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition border flex items-center gap-1.5 ${
                isDarkMode
                  ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                  : 'bg-white hover:bg-slate-200 border-slate-300 text-slate-800 shadow-sm'
              }`}
            >
              ✏️ Modifica
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className={`font-black text-lg px-2 py-1 transition ${
              isDarkMode
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Chiudi presentazione (ESC)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* CONTENUTO CENTRALE SLIDE */}
      <div
        className={`max-w-4xl w-full mx-auto my-auto border rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden transition-colors duration-300 ${
          isDarkMode
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white border-slate-200 shadow-slate-300/50'
        }`}
      >
        <h1
          className={`text-2xl sm:text-4xl font-black leading-tight tracking-tight ${
            isDarkMode ? 'text-white' : 'text-slate-900'
          }`}
        >
          {currentCard.title}
        </h1>

        {currentCard.description ? (
          <div
            className={`leading-relaxed font-normal whitespace-pre-wrap max-h-[45vh] overflow-y-auto pr-2 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
            style={{ fontSize: `${fontSize}px` }}
          >
            <ReactMarkdown>{currentCard.description}</ReactMarkdown>
          </div>
        ) : (
          <p
            className={`italic text-xs ${
              isDarkMode ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            Nessuna descrizione presente per questa scheda.
          </p>
        )}

        {currentCard.attachments && currentCard.attachments.length > 0 && (
          <div
            className={`pt-4 border-t ${
              isDarkMode ? 'border-slate-800' : 'border-slate-100'
            }`}
          >
            <span
              className={`block text-xs font-bold mb-2 ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              📎 Allegati della scheda:
            </span>
            <div className="flex flex-wrap gap-2">
              {currentCard.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className={`border px-3.5 py-2 rounded-xl text-xs font-semibold transition truncate max-w-xs flex items-center gap-2 ${
                    isDarkMode
                      ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-blue-600 border-slate-200'
                  }`}
                >
                  📄 {att.file_name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER BARRA NAVIGAZIONE */}
      <div className="flex justify-between items-center max-w-xl w-full mx-auto pt-4">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white font-extrabold text-sm px-6 py-2.5 rounded-2xl transition shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          ← Precedente
        </button>

        <span
          className={`text-xs font-medium hidden sm:block ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Usa le frecce{' '}
          <kbd
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isDarkMode
                ? 'bg-slate-800 text-slate-300'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            ←
          </kbd>{' '}
          <kbd
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isDarkMode
                ? 'bg-slate-800 text-slate-300'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            →
          </kbd>{' '}
          della tastiera
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white font-extrabold text-sm px-6 py-2.5 rounded-2xl transition shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          Successiva →
        </button>
      </div>
    </div>
  );
}