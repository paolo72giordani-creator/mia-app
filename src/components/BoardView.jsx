import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import CardDetailModal from './CardDetailModal';

export default function BoardView({ activeBoard, currentUser, onBack, onOpenShare }) {
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [newCardTitles, setNewCardTitles] = useState({});
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    if (activeBoard) fetchBoardData();
  }, [activeBoard]);

  const fetchBoardData = async () => {
    try {
      const { data: cols } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', activeBoard.id)
        .order('position', { ascending: true });
      setColumns(cols || []);

      const { data: crds } = await supabase
        .from('cards')
        .select('*, attachments(*)')
        .eq('board_id', activeBoard.id)
        .order('position', { ascending: true });
      setCards(crds || []);
    } catch (err) {
      console.error(err);
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

  const handleAddCard = async (columnId) => {
    const title = newCardTitles[columnId]?.trim();
    if (!title) return;

    try {
      const colCards = cards.filter((c) => c.column_id === columnId);
      const newCard = {
        id: `card-${Date.now()}`,
        user_id: currentUser.id,
        column_id: columnId,
        title: title,
        position: colCards.length
      };

      const { data, error } = await supabase.from('cards').insert([newCard]).select();
      if (error) throw error;

      if (data && data.length > 0) {
        setCards((prev) => [...prev, { ...data[0], attachments: [] }]);
        setNewCardTitles((prev) => ({ ...prev, [columnId]: '' }));
      }
    } catch (err) {
      alert('Errore scheda: ' + err.message);
    }
  };

  const handleUpdateCard = (updatedCard) => {
    setCards((prevCards) =>
      prevCards.map((c) => (c.id === updatedCard.id ? updatedCard : c))
    );
  };

  const handleDeleteCard = async (cardId) => {
    try {
      await supabase.from('cards').delete().eq('id', cardId);
      setCards(cards.filter((c) => c.id !== cardId));
      setSelectedCard(null);
    } catch (err) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  return (
    <div>
      {/* BARRA SUPERIORE VISTA BACHECA */}
      <div className="flex justify-between items-center mb-4 bg-white p-2.5 rounded-lg border shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-blue-600 hover:underline font-medium text-xs">
            ← Dashboard
          </button>
          <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            {activeBoard?.title}
            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded border">
              Proprietario: {activeBoard?.ownerEmail}
            </span>
          </h2>
        </div>
        <button onClick={onOpenShare} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded font-medium text-xs">
          Condividi
        </button>
      </div>

      {/* AREA COLONNE KANBAN */}
      <div className="flex gap-3 overflow-x-auto pb-4 items-start">
        {columns.map((col) => {
          const colCards = cards.filter((c) => c.column_id === col.id);
          return (
            <div key={col.id} className="w-60 bg-slate-200/60 border rounded-lg p-2.5 flex-shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-slate-700 text-xs">{col.name}</h3>
                <span className="text-[10px] bg-slate-300 text-slate-600 font-bold px-1.5 py-0.2 rounded-full">
                  {colCards.length}
                </span>
              </div>

              {/* LISTA SCHEDE CLICCABILI */}
              <div className="space-y-1.5 mb-2 min-h-[30px]">
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="bg-white border rounded p-2 shadow-sm text-xs text-slate-800 font-medium cursor-pointer hover:border-blue-400 hover:shadow transition flex justify-between items-center"
                  >
                    <span className="truncate">{card.title}</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-normal">
                      {card.description && <span title="Ha una descrizione">📝</span>}
                      {card.attachments && card.attachments.length > 0 && (
                        <span>📎 {card.attachments.length}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* FORM NUOVA SCHEDA */}
              <div className="flex gap-1 pt-1.5 border-t border-slate-300/60">
                <input
                  type="text"
                  placeholder="Nuova scheda..."
                  value={newCardTitles[col.id] || ''}
                  onChange={(e) => setNewCardTitles({ ...newCardTitles, [col.id]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCard(col.id)}
                  className="w-full bg-white border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                />
                <button onClick={() => handleAddCard(col.id)} className="bg-blue-600 text-white px-2 py-1 rounded font-bold">
                  +
                </button>
              </div>
            </div>
          );
        })}

        {/* AGGIUNGI NUOVA COLONNA */}
        <div className="w-60 bg-white border-2 border-dashed rounded-lg p-2.5 flex-shrink-0">
          <input
            type="text"
            placeholder="Nuova colonna..."
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
            className="w-full border rounded px-2 py-1 text-xs mb-1.5 focus:outline-none focus:border-blue-500"
          />
          <button onClick={handleAddColumn} className="w-full bg-slate-800 text-white font-medium py-1 rounded text-xs">
            + Colonna
          </button>
        </div>
      </div>

      {/* POP-UP DETTAGLI SCHEDA */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdateCard={handleUpdateCard}
          onDeleteCard={handleDeleteCard}
        />
      )}
    </div>
  );
}