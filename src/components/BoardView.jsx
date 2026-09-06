import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import CardDetailModal from './CardDetailModal';

export default function BoardView({ activeBoard, currentUser, onBack, onOpenShare }) {
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [newColumnName, setNewColumnName] = useState('');
  
  // Stato per la modale (modifica o creazione)
  const [modalCard, setModalCard] = useState(null);
  const [modalColId, setModalColId] = useState(null);

  // Drag & Drop States
  const [draggedCard, setDraggedCard] = useState(null);
  const [draggedColIndex, setDraggedColIndex] = useState(null);
  const [dragOverCardColId, setDragOverCardColId] = useState(null);

  const columnHeaderColors = [
    'bg-slate-800 text-white',
    'bg-blue-600 text-white',
    'bg-indigo-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-600 text-white'
  ];

  useEffect(() => {
    if (activeBoard) fetchBoardData();
  }, [activeBoard]);

  const fetchBoardData = async () => {
    try {
      const { data: cols, error: colErr } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', activeBoard.id)
        .order('position', { ascending: true });

      if (colErr) throw colErr;
      setColumns(cols || []);

      if (cols && cols.length > 0) {
        const colIds = cols.map((c) => String(c.id));
        const { data: crds, error: cardErr } = await supabase
          .from('cards')
          .select('*, attachments(*)')
          .in('column_id', colIds)
          .order('position', { ascending: true });

        if (cardErr) throw cardErr;
        setCards(crds || []);
      } else {
        setCards([]);
      }
    } catch (err) {
      console.error('Errore recupero dati bacheca:', err.message);
    }
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    try {
      const newCol = {
        id: `col-${Date.now()}`,
        user_id: currentUser.id,
        board_id: activeBoard.id,
        name: newColumnName.trim(),
        position: columns.length
      };
      const { data, error } = await supabase.from('columns').insert([newCol]).select();
      if (error) throw error;
      setColumns([...columns, data[0]]);
      setNewColumnName('');
    } catch (err) {
      alert(err.message);
    }
  };

  // Salva o aggiorna scheda gestito dalla modale
  const handleSaveCardFromModal = (savedCard, isNew) => {
    if (isNew) {
      setCards((prev) => [...prev, savedCard]);
    } else {
      setCards((prev) => prev.map((c) => (c.id === savedCard.id ? savedCard : c)));
    }
  };

  const handleDeleteCard = async (cardId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Sei sicuro di voler eliminare questa scheda?')) return;

    try {
      await supabase.from('cards').delete().eq('id', cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (modalCard?.id === cardId) setModalCard(null);
    } catch (err) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  // Drag & Drop
  const handleCardDragStart = (e, card) => {
    e.stopPropagation();
    setDraggedCard(card);
    setDraggedColIndex(null);
  };

  const handleCardDrop = async (e, targetColumnId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardColId(null);

    if (!draggedCard) return;

    const sourceColId = draggedCard.column_id;
    if (String(sourceColId) === String(targetColumnId)) return;

    const updatedCards = cards.map((c) =>
      c.id === draggedCard.id ? { ...c, column_id: String(targetColumnId) } : c
    );
    setCards(updatedCards);

    try {
      await supabase
        .from('cards')
        .update({ column_id: String(targetColumnId) })
        .eq('id', draggedCard.id);
    } catch (err) {
      console.error('Errore spostamento scheda:', err);
      fetchBoardData();
    } finally {
      setDraggedCard(null);
    }
  };

  const handleColDragStart = (e, index) => {
    setDraggedColIndex(index);
    setDraggedCard(null);
  };

  const handleColDragOver = (e, index) => {
    e.preventDefault();
    if (draggedColIndex === null || draggedColIndex === index || draggedCard !== null) return;

    const reordered = [...columns];
    const [movedCol] = reordered.splice(draggedColIndex, 1);
    reordered.splice(index, 0, movedCol);

    setDraggedColIndex(index);
    setColumns(reordered);
  };

  const handleColDragEnd = async () => {
    if (draggedColIndex === null) return;
    setDraggedColIndex(null);

    try {
      for (let i = 0; i < columns.length; i++) {
        await supabase
          .from('columns')
          .update({ position: i })
          .eq('id', columns[i].id);
      }
    } catch (err) {
      console.error('Errore salvataggio ordine colonne:', err);
    }
  };

  return (
    <div>
      {/* BARRA SUPERIORE */}
      <div className="flex justify-between items-center mb-5 bg-white p-3 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-blue-600 hover:underline font-medium text-xs">
            ← Dashboard
          </button>
          <h2 className="font-bold text-base text-slate-800 flex items-center gap-2">
            {activeBoard?.title}
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border">
              Proprietario: {activeBoard?.ownerEmail}
            </span>
          </h2>
        </div>
        <button onClick={onOpenShare} className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-medium text-xs shadow-sm">
          Condividi
        </button>
      </div>

      {/* AREA COLONNE KANBAN */}
      <div className="flex gap-4 overflow-x-auto pb-6 items-start">
        {columns.map((col, colIdx) => {
          const colCards = cards.filter((c) => String(c.column_id) === String(col.id));
          const isTargetCardCol = dragOverCardColId === col.id;
          const isColumnBeingDragged = draggedColIndex === colIdx;
          const headerColorStyle = columnHeaderColors[colIdx % columnHeaderColors.length];

          return (
            <div
              key={col.id}
              draggable
              onDragStart={(e) => handleColDragStart(e, colIdx)}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedCard) {
                  setDragOverCardColId(col.id);
                } else {
                  handleColDragOver(e, colIdx);
                }
              }}
              onDragLeave={() => setDragOverCardColId(null)}
              onDrop={(e) => {
                if (draggedCard) handleCardDrop(e, col.id);
              }}
              onDragEnd={handleColDragEnd}
              className={`w-72 border rounded-xl overflow-hidden flex-shrink-0 shadow-sm transition-all duration-200 bg-slate-200/70 border-slate-300/70 ${
                isColumnBeingDragged
                  ? 'border-2 border-dashed border-blue-500 opacity-60 scale-95'
                  : isTargetCardCol
                  ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-300'
                  : ''
              }`}
            >
              {/* HEADER COLONNA COLORATO */}
              <div className={`p-3 flex justify-between items-center cursor-grab active:cursor-grabbing ${headerColorStyle}`}>
                <h3 className="font-bold text-base flex items-center gap-1.5">
                  <span className="opacity-60 text-sm">⋮⋮</span> {col.name}
                </h3>
                <span className="text-xs bg-white/20 text-white font-bold px-2.5 py-0.5 rounded-full border border-white/20">
                  {colCards.length}
                </span>
              </div>

              {/* CONTENUTO COLONNA */}
              <div className="p-2.5">
                {colCards.length > 0 && (
                  <div className="space-y-2.5 mb-2">
                    {colCards.map((card) => {
                      const cardDetails = card.description || card.details;
                      const isBeingDragged = draggedCard?.id === card.id;

                      return (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={(e) => handleCardDragStart(e, card)}
                          onClick={() => {
                            setModalCard(card);
                            setModalColId(col.id);
                          }}
                          className={`bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer relative ${
                            isBeingDragged ? 'opacity-30 border-dashed border-blue-500' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h4 className="font-bold text-slate-900 text-base leading-snug flex-1">
                              {card.title}
                            </h4>
                            <button
                              onClick={(e) => handleDeleteCard(card.id, e)}
                              title="Elimina scheda"
                              className="text-slate-300 hover:text-red-600 transition p-0.5 rounded hover:bg-red-50 text-sm font-bold"
                            >
                              🗑️
                            </button>
                          </div>

                          {cardDetails && (
                            <p className="text-sm text-slate-600 line-clamp-3 mb-2 leading-relaxed">
                              {cardDetails}
                            </p>
                          )}

                          {card.attachments && card.attachments.length > 0 && (
                            <div className="flex justify-end pt-1.5 border-t border-slate-100">
                              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200 font-medium">
                                📎 {card.attachments.length}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {isTargetCardCol && draggedCard && String(draggedCard.column_id) !== String(col.id) && (
                  <div className="border-2 border-dashed border-blue-400 bg-blue-100/50 rounded-lg p-3 text-center text-blue-600 text-xs font-medium mb-2">
                    Rilascia qui la scheda
                  </div>
                )}

                {/* BOTTONE AGGIUNGI SCHEDA DIRECTO IN MODALE */}
                <button
                  onClick={() => {
                    setModalCard(null); // Scheda nuova
                    setModalColId(col.id);
                  }}
                  className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-300 bg-white hover:border-blue-400 text-slate-600 hover:text-blue-600 font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>+</span> Aggiungi scheda
                </button>
              </div>
            </div>
          );
        })}

        {/* BOX AGGIUNGI COLONNA */}
        <div className="w-72 bg-white border-2 border-dashed border-slate-300 rounded-xl p-3 flex-shrink-0">
          <input
            type="text"
            placeholder="Nome nuova colonna..."
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
            className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs mb-2 text-slate-800 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleAddColumn}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-1.5 rounded-lg text-xs transition"
          >
            + Aggiungi Colonna
          </button>
        </div>
      </div>

      {/* POP-UP UNICO DETTAGLI / NUOVA SCHEDA */}
      {(modalCard !== null || modalColId !== null) && (
        <CardDetailModal
          card={modalCard}
          columnId={modalColId}
          onClose={() => {
            setModalCard(null);
            setModalColId(null);
          }}
          onSaveCard={handleSaveCardFromModal}
          onDeleteCard={(id) => handleDeleteCard(id)}
        />
      )}
    </div>
  );
}