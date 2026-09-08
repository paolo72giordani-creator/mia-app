import React, { useState, useEffect } from 'react';

export default function PresentationModal({
  cards = [],
  onClose,
  onEditCard
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentCard = cards[currentIndex];

  // Gestione scorciatoie da tastiera (Frecce + ESC)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        onClose();
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

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-6 z-50 text-white font-sans">
      {/* HEADER SLIDE SHOW */}
      <div className="flex justify-between items-center max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          {/* BADGE NOME COLONNA */}
          {currentCard.columnName && (
            <span
              className="text-xs font-bold px-3 py-1 rounded-full border border-white/20 text-white shadow-sm"
              style={{ backgroundColor: currentCard.columnColor || '#3b82f6' }}
            >
              📋 {currentCard.columnName}
            </span>
          )}
          <span className="text-xs text-slate-400 font-semibold">
            Scheda {currentIndex + 1} di {cards.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* TASTO MODIFICA OPZIONALE */}
          {onEditCard && (
            <button
              onClick={() => {
                onClose();
                onEditCard(currentCard);
              }}
              className="text-xs font-bold bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl transition border border-white/10 flex items-center gap-1.5"
            >
              ✏️ Modifica
            </button>
          )}

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-black text-lg px-2 py-1 transition"
            title="Chiudi presentazione (ESC)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* CONTENUTO CENTRALE SLIDE */}
      <div className="max-w-4xl w-full mx-auto my-auto bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
        {/* TITOLO SCHEDA */}
        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
          {currentCard.title}
        </h1>

        {/* DESCRIZIONE */}
        {currentCard.description ? (
          <div className="text-slate-300 text-sm sm:text-base leading-relaxed font-normal whitespace-pre-wrap max-h-[40vh] overflow-y-auto pr-2">
            {currentCard.description}
          </div>
        ) : (
          <p className="text-slate-500 italic text-xs">Nessuna descrizione presente per questa scheda.</p>
        )}

        {/* ALLEGATI */}
        {currentCard.attachments && currentCard.attachments.length > 0 && (
          <div className="pt-4 border-t border-slate-800/80">
            <span className="block text-xs font-bold text-slate-400 mb-2">📎 Allegati della scheda:</span>
            <div className="flex flex-wrap gap-2">
              {currentCard.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition truncate max-w-xs flex items-center gap-2"
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
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="bg-white/10 hover:bg-white/20 disabled:opacity-20 text-white font-extrabold text-sm px-5 py-2.5 rounded-2xl transition border border-white/10 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          ← Precedente
        </button>

        <span className="text-xs text-slate-400 font-medium hidden sm:block">
          Usa le frecce <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">←</kbd> <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">→</kbd> della tastiera
        </span>

        <button
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