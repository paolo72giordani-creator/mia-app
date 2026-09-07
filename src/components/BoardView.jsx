import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import CardDetailModal from './CardDetailModal';

export default function BoardView({ activeBoard, currentUser, onBack, onOpenShare, onLogout }) {
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [newColumnName, setNewColumnName] = useState('');

  const isViewer = activeBoard?.role === 'viewer';

  const [modalCard, setModalCard] = useState(null);
  const [modalColId, setModalColId] = useState(null);
  const [activeColorPickerColId, setActiveColorPickerColId] = useState(null);

  const [draggedCard, setDraggedCard] = useState(null);
  const [draggedColIndex, setDraggedColIndex] = useState(null);
  const [dragOverCardColId, setDragOverCardColId] = useState(null);
  const [dragOverCardId, setDragOverCardId] = useState(null);

  const availableColors = [
    { label: 'Blu', value: 'bg-blue-600' },
    { label: 'Grigio', value: 'bg-slate-800' },
    { label: 'Indaco', value: 'bg-indigo-600' },
    { label: 'Smeraldo', value: 'bg-emerald-600' },
    { label: 'Ambra', value: 'bg-amber-600' },
    { label: 'Rosso', value: 'bg-rose-600' },
    { label: 'Viola', value: 'bg-purple-600' }
  ];

  // CARICAMENTO E ASCOLTO IN TEMPO REALE (BIDIREZIONALE)
  useEffect(() => {
    if (!activeBoard) return;

    fetchBoardData();

    // Sottoscrizione globale ai cambiamenti di colonne e schede
    const channel = supabase
      .channel(`board-realtime-${activeBoard.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'columns' },
        () => fetchBoardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards' },
        () => fetchBoardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    if (isViewer || !newColumnName.trim()) return;
    try {
      const newCol = {
        id: `col-${Date.now()}`,
        user_id: currentUser.id,
        board_id: activeBoard.id,
        name: newColumnName.trim(),
        position: columns.length,
        color: 'bg-blue-600'
      };
      const { data, error } = await supabase.from('columns').insert([newCol]).select();
      if (error) throw error;
      setColumns([...columns, data[0]]);
      setNewColumnName('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChangeColumnColor = async (columnId, newColor) => {
    if (isViewer) return;
    try {
      setColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, color: newColor } : c))
      );
      setActiveColorPickerColId(null);

      await supabase
        .from('columns')
        .update({ color: newColor })
        .eq('id', columnId);
    } catch (err) {
      console.error('Errore aggiornamento colore:', err);
    }
  };

  const handleDeleteColumn = async (columnId, colName, e) => {
    e.stopPropagation();
    if (isViewer) return;
    if (!window.confirm(`Sei sicuro di voler eliminare la colonna "${colName}" e tutte le sue schede?`)) return;

    try {
      await supabase.from('cards').delete().eq('column_id', String(columnId));
      const { error } = await supabase.from('columns').delete().eq('id', columnId);
      if (error) throw error;

      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setCards((prev) => prev.filter((c) => String(c.column_id) !== String(columnId)));
    } catch (err) {
      alert('Errore eliminazione colonna: ' + err.message);
    }
  };

  const handleSaveCardFromModal = (savedCard, isNew) => {
    if (isNew) {
      setCards((prev) => [...prev, savedCard]);
    } else {
      setCards((prev) => prev.map((c) => (c.id === savedCard.id ? savedCard : c)));
    }
  };

  const handleDeleteCard = async (cardId, e) => {
    if (e) e.stopPropagation();
    if (isViewer) return;
    if (!window.confirm('Sei sicuro di voler eliminare questa scheda?')) return;

    try {
      await supabase.from('cards').delete().eq('id', cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      if (modalCard?.id === cardId) setModalCard(null);
    } catch (err) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  const handleCardDragStart = (e, card) => {
    if (isViewer) return;
    e.stopPropagation();
    setDraggedCard(card);
    setDraggedColIndex(null);
  };

  const handleCardDragOverCard = (e, targetCard) => {
    if (isViewer || !draggedCard) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverCardColId(targetCard.column_id);
    setDragOverCardId(targetCard.id);
  };

  const handleCardDrop = async (e, targetColumnId) => {
    if (isViewer || !draggedCard) return;
    e.preventDefault();
    e.stopPropagation();

    let reordered = cards.filter((c) => c.id !== draggedCard.id);
    const updatedDraggedCard = { ...draggedCard, column_id: String(targetColumnId) };

    if (dragOverCardId) {
      const dropIndex = reordered.findIndex((c) => c.id === dragOverCardId);
      if (dropIndex !== -1) {
        reordered.splice(dropIndex, 0, updatedDraggedCard);
      } else {
        reordered.push(updatedDraggedCard);
      }
    } else {
      reordered.push(updatedDraggedCard);
    }

    setCards(reordered);
    setDragOverCardColId(null);
    setDragOverCardId(null);

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
    if (isViewer) return;
    setDraggedColIndex(index);
    setDraggedCard(null);
  };

  const handleColDragOver = (e, index) => {
    if (isViewer || draggedCard) return;
    e.preventDefault();
    if (draggedColIndex === null || draggedColIndex === index) return;

    const reordered = [...columns];
    const [movedCol] = reordered.splice(draggedColIndex, 1);
    reordered.splice(index, 0, movedCol);

    setDraggedColIndex(index);
    setColumns(reordered);
  };

  const handleColDragEnd = async () => {
    if (isViewer || draggedColIndex === null) return;
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
     {/* BARRA SUPERIORE UNIFORMATA */}
<div className="flex justify-between items-center mb-5 bg-white p-4 rounded-xl border shadow-sm">
  <div className="flex items-center gap-4">
    {/* LOGO E TITOLO CON FUNZIONE HOME / DASHBOARD */}
    <div 
      onClick={onBack}
      className="flex items-center gap-3 cursor-pointer group"
      title="Torna alla Dashboard"
    >
      <div className="w-10 h-10 bg-blue-600 group-hover:bg-blue-700 rounded-lg flex items-center justify-center text-white font-black text-base shadow-md shadow-blue-500/20 tracking-tighter flex-shrink-0 transition">
        DK
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition leading-tight">
            {activeBoard?.title}
          </h1>
          {isViewer && (
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300 font-bold">
              👁️ Sola Lettura
            </span>
          )}
        </div>

        {/* UTENTE E PROPRIETARIO */}
        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
          <span>Utente: {currentUser?.email}</span>
          {!activeBoard?.isOwner && (
            <>
              <span className="text-slate-300">•</span>
              <span>Proprietario: {activeBoard?.ownerEmail}</span>
            </>
          )}
        </p>
      </div>
    </div>
  </div>

  {/* PULSANTI DI AZIONE */}
  <div className="flex items-center gap-2">
    <button
      onClick={onBack}
      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3.5 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
    >
      <span>←</span> Dashboard
    </button>

    {activeBoard?.isOwner && (
      <button
        onClick={onOpenShare}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm transition"
      >
        Condividi
      </button>
    )}

    <button
      onClick={onLogout}
      className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
      title="Disconnetti account"
    >
      <span>🚪</span> Esci
    </button>
  </div>
</div>

      {/* AREA COLONNE KANBAN */}
      <div className="flex gap-4 overflow-x-auto pb-6 items-start">
        {columns.map((col, colIdx) => {
          const colCards = cards.filter((c) => String(c.column_id) === String(col.id));
          const isTargetCardCol = dragOverCardColId === col.id;
          const isColumnBeingDragged = draggedColIndex === colIdx;
          const colBgColor = col.color || 'bg-blue-600';
          const isPickerOpen = activeColorPickerColId === col.id;

          return (
            <div
              key={col.id}
              draggable={!isViewer && !draggedCard}
              onDragStart={(e) => handleColDragStart(e, colIdx)}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedCard) {
                  setDragOverCardColId(col.id);
                } else {
                  handleColDragOver(e, colIdx);
                }
              }}
              onDrop={(e) => {
                if (draggedCard) handleCardDrop(e, col.id);
              }}
              onDragEnd={handleColDragEnd}
              className={`w-72 border rounded-xl overflow-hidden flex-shrink-0 shadow-sm transition-all duration-200 bg-slate-200/70 border-slate-300/70 ${
                isColumnBeingDragged
                  ? 'border-2 border-dashed border-blue-500 opacity-60 scale-95'
                  : isTargetCardCol
                  ? 'bg-blue-100/80 border-blue-500 ring-2 ring-blue-300'
                  : ''
              }`}
            >
              {/* HEADER COLONNA */}
              <div className={`p-3 flex justify-between items-center text-white relative ${colBgColor} ${!isViewer ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                <h3 className="font-bold text-base flex items-center gap-1.5 truncate">
                  {!isViewer && <span className="opacity-60 text-sm flex-shrink-0">⋮⋮</span>}
                  <span className="truncate">{col.name}</span>
                </h3>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs bg-white/20 text-white font-bold px-2 py-0.5 rounded-full border border-white/20">
                    {colCards.length}
                  </span>

                  {!isViewer && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveColorPickerColId(isPickerOpen ? null : col.id);
                        }}
                        title="Cambia colore colonna"
                        className="text-white/80 hover:text-white hover:bg-white/20 transition p-1 rounded text-xs"
                      >
                        🎨
                      </button>
                      <button
                        onClick={(e) => handleDeleteColumn(col.id, col.name, e)}
                        title="Elimina colonna"
                        className="text-white/80 hover:text-white hover:bg-white/20 transition p-1 rounded font-bold text-xs"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>

                {isPickerOpen && !isViewer && (
                  <div className="absolute right-3 top-11 bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-20 flex gap-1.5">
                    {availableColors.map((c) => (
                      <button
                        key={c.value}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChangeColumnColor(col.id, c.value);
                        }}
                        className={`w-6 h-6 rounded-full border border-black/10 transition hover:scale-110 ${c.value}`}
                        title={c.label}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* SCHEDE DELLA COLONNA */}
              <div className="p-2.5 min-h-[100px]">
                <div className="space-y-2.5 mb-2">
                  {colCards.map((card) => {
                    const cardDetails = card.description || card.details;
                    const isBeingDragged = draggedCard?.id === card.id;
                    const isDragOverThisCard = dragOverCardId === card.id && draggedCard?.id !== card.id;

                    return (
                      <React.Fragment key={card.id}>
                        {isDragOverThisCard && (
                          <div className="border-2 border-dashed border-blue-500 bg-blue-50/90 rounded-lg p-3 text-center text-blue-700 text-xs font-bold shadow-inner">
                            📍 Rilascia qui
                          </div>
                        )}

                        <div
                          draggable={!isViewer}
                          onDragStart={(e) => handleCardDragStart(e, card)}
                          onDragOver={(e) => handleCardDragOverCard(e, card)}
                          onClick={() => {
                            setModalCard(card);
                            setModalColId(col.id);
                          }}
                          className={`bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer relative ${
                            isBeingDragged ? 'opacity-25 border-dashed border-blue-500 scale-95' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h4 className="font-bold text-slate-900 text-base leading-snug flex-1">
                              {card.title}
                            </h4>
                            {!isViewer && (
                              <button
                                onClick={(e) => handleDeleteCard(card.id, e)}
                                title="Elimina scheda"
                                className="text-slate-300 hover:text-red-600 transition p-0.5 rounded hover:bg-red-50 text-sm font-bold"
                              >
                                🗑️
                              </button>
                            )}
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
                      </React.Fragment>
                    );
                  })}

                  {isTargetCardCol && draggedCard && !dragOverCardId && (
                    <div className="border-2 border-dashed border-blue-500 bg-blue-50/90 rounded-lg p-3 text-center text-blue-700 text-xs font-bold shadow-inner">
                      📍 Rilascia qui in fondo
                    </div>
                  )}
                </div>

                {!isViewer && (
                  <button
                    onClick={() => {
                      setModalCard(null);
                      setModalColId(col.id);
                    }}
                    className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-300 bg-white hover:border-blue-400 text-slate-600 hover:text-blue-600 font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm mt-2"
                  >
                    <span>+</span> Aggiungi scheda
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* BOX NUOVA COLONNA */}
        {!isViewer && (
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
        )}
      </div>

      {modalCard !== null || modalColId !== null ? (
        <CardDetailModal
          card={modalCard}
          columnId={modalColId}
          isViewer={isViewer}
          onClose={() => {
            setModalCard(null);
            setModalColId(null);
          }}
          onSaveCard={handleSaveCardFromModal}
          onDeleteCard={(id) => handleDeleteCard(id)}
        />
      ) : null}
    </div>
  );
}