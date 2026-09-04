import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, GripVertical, AlertTriangle } from 'lucide-react';

// Colonne fisse iniziali
const INITIAL_COLUMNS = [
  { id: 'col-1', name: 'Backlog' },
  { id: 'col-2', name: 'Da fare' },
  { id: 'col-3', name: 'In corso' },
  { id: 'col-4', name: 'In revisione' },
  { id: 'col-5', name: 'Completato' }
];

// Schede dimostrative iniziali
const INITIAL_CARDS = [
  {
    id: 'card-1',
    columnId: 'col-1',
    title: 'Ricerca di mercato',
    details: 'Valutare le soluzioni attuali nei flussi di lavoro e nella produttività.'
  },
  {
    id: 'card-2',
    columnId: 'col-2',
    title: 'Allineamento risorse brand',
    details: 'Verificare i token di stile e assicurare gli standard di contrasto colore.'
  },
  {
    id: 'card-3',
    columnId: 'col-2',
    title: 'Bozza schema database',
    details: 'Definire le entità e le relazioni per progetti, bacheche e schede.'
  },
  {
    id: 'card-4',
    columnId: 'col-3',
    title: 'Implementazione Drag and Drop',
    details: 'Garantire il riordinamento fluido sia intra-colonna che inter-colonna.'
  },
  {
    id: 'card-5',
    columnId: 'col-4',
    title: 'Verifica cross-browser',
    details: 'Controllare il comportamento del layout e dei puntatori su diversi browser.'
  },
  {
    id: 'card-6',
    columnId: 'col-5',
    title: 'Rilascio in produzione',
    details: 'Preparare i pacchetti frontend ed eseguire i controlli automatizzati.'
  }
];

export default function App() {
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const [cards, setCards] = useState(INITIAL_CARDS);

  // Stato per rinominare la colonna
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState('');

  // Stato per la creazione di una nuova colonna
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // Stato per la creazione di una nuova scheda
  const [activeNewCardColumnId, setActiveNewCardColumnId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDetails, setNewDetails] = useState('');

  // Stato per Drag and Drop e indicatore visivo di posizione
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { columnId, index }

  // Stato per la finestra modale di conferma cancellazione
  // Formato: null oppure { type: 'card' | 'column', id: string, name: string, cardCount?: number }
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Avvia modifica nome colonna
  const startRenameColumn = (col) => {
    setEditingColumnId(col.id);
    setEditingColumnName(col.name);
  };

  // Salva nuovo nome colonna
  const saveRenameColumn = (id) => {
    const trimmed = editingColumnName.trim();
    if (trimmed) {
      setColumns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c))
      );
    }
    setEditingColumnId(null);
    setEditingColumnName('');
  };

  // Annulla rinomina
  const cancelRenameColumn = () => {
    setEditingColumnId(null);
    setEditingColumnName('');
  };

  // Aggiunta di una nuova colonna
  const handleAddColumn = () => {
    const trimmed = newColumnName.trim();
    if (!trimmed) return;

    const newCol = {
      id: `col-${Date.now()}`,
      name: trimmed
    };

    setColumns((prev) => [...prev, newCol]);
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  // Apertura modale per eliminazione colonna
  const requestDeleteColumn = (col) => {
    if (columns.length <= 1) return;
    const count = cards.filter((c) => c.columnId === col.id).length;
    setConfirmDelete({
      type: 'column',
      id: col.id,
      name: col.name,
      cardCount: count
    });
  };

  // Apertura modale per eliminazione scheda
  const requestDeleteCard = (card) => {
    setConfirmDelete({
      type: 'card',
      id: card.id,
      name: card.title
    });
  };

  // Conferma effettiva dell'eliminazione
  const handleConfirmDelete = () => {
    if (!confirmDelete) return;

    if (confirmDelete.type === 'card') {
      setCards((prev) => prev.filter((c) => c.id !== confirmDelete.id));
    } else if (confirmDelete.type === 'column') {
      setColumns((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      setCards((prev) => prev.filter((c) => c.columnId !== confirmDelete.id));

      if (activeNewCardColumnId === confirmDelete.id) {
        setActiveNewCardColumnId(null);
      }
      if (editingColumnId === confirmDelete.id) {
        setEditingColumnId(null);
      }
    }

    setConfirmDelete(null);
  };

  // Creazione nuova scheda
  const handleAddCard = (columnId) => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    const newCard = {
      id: `card-${Date.now()}`,
      columnId,
      title: trimmedTitle,
      details: newDetails.trim()
    };

    setCards((prev) => [...prev, newCard]);
    setNewTitle('');
    setNewDetails('');
    setActiveNewCardColumnId(null);
  };

  // Inizio trascinamento
  const handleDragStart = (e, cardId) => {
    setDraggedCardId(cardId);
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Fine trascinamento (reset stati)
  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDropTarget(null);
  };

  // Calcolo della posizione di inserimento sopra/sotto alla scheda sorvolata
  const handleCardDragOver = (e, columnId, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isTopHalf = e.clientY < midY;
    const targetIndex = isTopHalf ? index : index + 1;

    setDropTarget({ columnId, index: targetIndex });
  };

  // Trascinamento nello spazio vuoto della colonna
  const handleColumnDragOver = (e, columnId, cardCount) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!dropTarget || dropTarget.columnId !== columnId) {
      setDropTarget({ columnId, index: cardCount });
    }
  };

  // Gestione del rilascio e riposizionamento effettivo della scheda
  const handleDrop = (e, columnId) => {
    e.preventDefault();
    e.stopPropagation();

    const cardId = draggedCardId || e.dataTransfer.getData('text/plain');
    if (!cardId) {
      setDraggedCardId(null);
      setDropTarget(null);
      return;
    }

    const draggedCard = cards.find((c) => c.id === cardId);
    if (!draggedCard) {
      setDraggedCardId(null);
      setDropTarget(null);
      return;
    }

    const targetColId = dropTarget ? dropTarget.columnId : columnId;
    const targetCards = cards.filter((c) => c.columnId === targetColId);

    let targetIndex = dropTarget ? dropTarget.index : targetCards.length;

    // Se lo spostamento avviene nella stessa colonna e la scheda era prima dell'indice target, aggiustiamo l'indice
    const currentIndexInTarget = targetCards.findIndex((c) => c.id === cardId);
    if (currentIndexInTarget !== -1 && currentIndexInTarget < targetIndex) {
      targetIndex = Math.max(0, targetIndex - 1);
    }

    // Rimuoviamo la scheda dalla lista attuale
    const remainingCards = cards.filter((c) => c.id !== cardId);
    const updatedCard = { ...draggedCard, columnId: targetColId };

    // Troviamo l'indice globale corretto in cui inserire
    const colCardsAfterRemoval = remainingCards.filter((c) => c.columnId === targetColId);

    if (targetIndex >= colCardsAfterRemoval.length) {
      if (colCardsAfterRemoval.length === 0) {
        setCards([...remainingCards, updatedCard]);
      } else {
        const lastCardOfCol = colCardsAfterRemoval[colCardsAfterRemoval.length - 1];
        const insertPos = remainingCards.indexOf(lastCardOfCol) + 1;
        const nextCards = [...remainingCards];
        nextCards.splice(insertPos, 0, updatedCard);
        setCards(nextCards);
      }
    } else {
      const cardToInsertBefore = colCardsAfterRemoval[targetIndex];
      const insertPos = remainingCards.indexOf(cardToInsertBefore);
      const nextCards = [...remainingCards];
      nextCards.splice(insertPos, 0, updatedCard);
      setCards(nextCards);
    }

    setDraggedCardId(null);
    setDropTarget(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-[#ecad0a]/20">
      {/* Intestazione */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-xs">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-2 rounded bg-[#ecad0a]" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#032147]">
                Bacheca di Progetto
              </h1>
              <p className="text-xs text-[#888888]">
                Flusso di lavoro a bacheca singola
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs font-medium text-[#888888]">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[#209dd7]">
              {columns.length} {columns.length === 1 ? 'Colonna' : 'Colonne'}
            </span>
            <span>{cards.length} Schede totali</span>
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-[#753991] hover:bg-[#632f7c] text-white px-3 py-1.5 text-xs font-medium shadow-2xs transition-colors"
            >
              <Plus size={14} />
              <span>Nuova colonna</span>
            </button>
          </div>
        </div>
      </header>

      {/* Area della bacheca */}
      <main className="flex-1 overflow-x-auto p-6">
        <div className="flex items-start gap-5 min-w-max pb-4">
          {columns.map((col) => {
            const columnCards = cards.filter((c) => c.columnId === col.id);
            const isColumnActive = dropTarget?.columnId === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleColumnDragOver(e, col.id, columnCards.length)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`w-80 shrink-0 flex flex-col rounded-xl border transition-colors duration-150 ${
                  isColumnActive
                    ? 'border-[#209dd7] bg-blue-50/30 ring-1 ring-[#209dd7]/30'
                    : 'border-slate-200 bg-slate-100/70'
                }`}
              >
                {/* Intestazione colonna */}
                <div className="p-3.5 flex items-center justify-between border-b border-slate-200 bg-white rounded-t-xl">
                  {editingColumnId === col.id ? (
                    <div className="flex items-center space-x-1 w-full">
                      <input
                        type="text"
                        value={editingColumnName}
                        onChange={(e) => setEditingColumnName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRenameColumn(col.id);
                          if (e.key === 'Escape') cancelRenameColumn();
                        }}
                        autoFocus
                        className="w-full text-xs font-semibold px-2 py-1 border border-[#209dd7] rounded outline-none text-[#032147]"
                      />
                      <button
                        onClick={() => saveRenameColumn(col.id)}
                        aria-label="Salva nome colonna"
                        className="p-1 text-emerald-600 hover:text-emerald-700"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={cancelRenameColumn}
                        aria-label="Annulla modifica colonna"
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-[#032147] tracking-tight">
                          {col.name}
                        </span>
                        <span className="text-[11px] font-semibold text-[#888888] bg-slate-100 rounded-full px-2 py-0.5">
                          {columnCards.length}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => startRenameColumn(col)}
                          aria-label={`Rinomina ${col.name}`}
                          className="p-1 text-[#888888] hover:text-[#032147] rounded transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                        {columns.length > 1 && (
                          <button
                            onClick={() => requestDeleteColumn(col)}
                            aria-label={`Elimina colonna ${col.name}`}
                            className="p-1 text-[#888888] hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Elenco schede */}
                <div className="p-3 flex flex-col space-y-2.5 min-h-[320px]">
                  {columnCards.map((card, idx) => {
                    const isTargetBeforeThis =
                      dropTarget?.columnId === col.id && dropTarget?.index === idx;

                    return (
                      <React.Fragment key={card.id}>
                        {/* Indicatore visivo di rilascio prima di questa scheda */}
                        {isTargetBeforeThis && (
                          <div className="rounded-lg border-2 border-dashed border-[#ecad0a] bg-[#ecad0a]/10 py-2.5 px-3 flex items-center justify-center space-x-2 text-[#032147] text-xs font-semibold animate-pulse transition-all">
                            <div className="w-2 h-2 rounded-full bg-[#ecad0a]" />
                            <span>Rilascia qui la scheda</span>
                          </div>
                        )}

                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleCardDragOver(e, col.id, idx)}
                          className={`group relative flex flex-col rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-150 cursor-grab active:cursor-grabbing hover:border-[#209dd7] hover:shadow-sm ${
                            draggedCardId === card.id
                              ? 'opacity-30 border-dashed border-[#209dd7]'
                              : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                              <GripVertical
                                size={12}
                                className="text-slate-300 group-hover:text-slate-500 shrink-0"
                              />
                              <h4 className="text-xs font-semibold text-[#032147] truncate leading-tight">
                                {card.title}
                              </h4>
                            </div>
                            <button
                              onClick={() => requestDeleteCard(card)}
                              aria-label={`Elimina scheda ${card.title}`}
                              className="opacity-0 group-hover:opacity-100 text-[#888888] hover:text-rose-600 transition-opacity p-0.5"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {card.details && (
                            <p className="mt-2 text-xs text-[#888888] leading-relaxed line-clamp-3">
                              {card.details}
                            </p>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {/* Indicatore visivo di rilascio in fondo alla colonna */}
                  {dropTarget?.columnId === col.id &&
                    dropTarget?.index === columnCards.length && (
                      <div className="rounded-lg border-2 border-dashed border-[#ecad0a] bg-[#ecad0a]/10 py-2.5 px-3 flex items-center justify-center space-x-2 text-[#032147] text-xs font-semibold animate-pulse transition-all">
                        <div className="w-2 h-2 rounded-full bg-[#ecad0a]" />
                        <span>Rilascia qui la scheda</span>
                      </div>
                    )}

                  {/* Modulo o pulsante per aggiungere una nuova scheda */}
                  {activeNewCardColumnId === col.id ? (
                    <div className="rounded-lg border border-[#209dd7] bg-white p-3 shadow-xs mt-2">
                      <input
                        type="text"
                        placeholder="Titolo scheda"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        autoFocus
                        className="w-full text-xs font-medium px-2 py-1.5 border border-slate-200 rounded outline-none focus:border-[#209dd7] text-[#032147] mb-2"
                      />
                      <textarea
                        placeholder="Dettagli scheda"
                        rows={2}
                        value={newDetails}
                        onChange={(e) => setNewDetails(e.target.value)}
                        className="w-full text-xs text-slate-700 px-2 py-1.5 border border-slate-200 rounded outline-none focus:border-[#209dd7] resize-none mb-3"
                      />
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveNewCardColumnId(null);
                            setNewTitle('');
                            setNewDetails('');
                          }}
                          className="text-xs px-2.5 py-1 text-[#888888] hover:text-slate-700 font-medium"
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddCard(col.id)}
                          className="text-xs px-3 py-1 bg-[#753991] hover:bg-[#632f7c] text-white font-medium rounded shadow-2xs transition-colors"
                        >
                          Aggiungi scheda
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNewCardColumnId(col.id);
                        setNewTitle('');
                        setNewDetails('');
                      }}
                      className="w-full flex items-center justify-center space-x-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-[#888888] hover:border-[#209dd7] hover:text-[#209dd7] hover:bg-white transition-colors mt-auto"
                    >
                      <Plus size={14} />
                      <span>Aggiungi scheda</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Modulo per aggiungere una nuova colonna */}
          {isAddingColumn ? (
            <div className="w-80 shrink-0 rounded-xl border border-[#209dd7] bg-white p-3.5 shadow-xs">
              <h4 className="text-xs font-semibold text-[#032147] mb-2">
                Aggiungi colonna
              </h4>
              <input
                type="text"
                placeholder="Nome della colonna"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn();
                  if (e.key === 'Escape') {
                    setIsAddingColumn(false);
                    setNewColumnName('');
                  }
                }}
                autoFocus
                className="w-full text-xs font-medium px-2 py-1.5 border border-slate-200 rounded outline-none focus:border-[#209dd7] text-[#032147] mb-3"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingColumn(false);
                    setNewColumnName('');
                  }}
                  className="text-xs px-2.5 py-1 text-[#888888] hover:text-slate-700 font-medium"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="text-xs px-3 py-1 bg-[#753991] hover:bg-[#632f7c] text-white font-medium rounded shadow-2xs transition-colors"
                >
                  Salva colonna
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="w-80 shrink-0 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-[#209dd7] hover:bg-white flex items-center justify-center space-x-2 text-xs font-medium text-[#888888] hover:text-[#209dd7] transition-all"
            >
              <Plus size={16} />
              <span>Aggiungi un'altra colonna</span>
            </button>
          )}
        </div>
      </main>

      {/* Modale di conferma eliminazione */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-start space-x-3">
              <div className="rounded-full bg-rose-50 p-2 text-rose-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#032147]">
                  {confirmDelete.type === 'column'
                    ? 'Elimina colonna'
                    : 'Elimina scheda'}
                </h3>
                <p className="mt-1.5 text-xs text-[#888888] leading-relaxed">
                  {confirmDelete.type === 'column' ? (
                    <>
                      Sei sicuro di voler eliminare la colonna{' '}
                      <span className="font-semibold text-[#032147]">
                        "{confirmDelete.name}"
                      </span>
                      {confirmDelete.cardCount > 0 && (
                        <> e le sue {confirmDelete.cardCount} schede associate</>
                      )}
                      ? L'azione non può essere annullata.
                    </>
                  ) : (
                    <>
                      Sei sicuro di voler eliminare la scheda{' '}
                      <span className="font-semibold text-[#032147]">
                        "{confirmDelete.name}"
                      </span>
                      ? L'azione non può essere annullata.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#888888] hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs transition-colors"
              >
                Elimina definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}