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

  const handleAddCard = async (columnId) => {
    const title = newCardTitles[columnId]?.trim();
    if (!title) return;

    try {
      const colCards = cards.filter((c) => String(c.column_id) === String(columnId));
      const newCard = {
        id: `card-${Date.now()}`,
        user_id: currentUser.id,
        column_id: String(columnId),
        board_id: String(activeBoard.id),
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

      {/* AREA COLONNE KANBAN (LARGHEZZA AUMENTATA) */}
      <div className="flex gap-4 overflow-x-auto pb-6 items-start">
        {columns.map((col) => {
          const colCards = cards.filter((c) => String(c.column_id) === String(col.id));

          return (
            <div key={col.id} className="w-72 bg-slate-200/70 border border-slate-300/70 rounded-xl p-3 flex-shrink-0 shadow-sm">
              {/* HEADER COLONNA */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-slate-800 text-sm">{col.name}</h3>
                <span className="text-xs bg-slate-300/80 text-slate-700 font-bold px-2 py-0.5 rounded-full">
                  {colCards.length}
                </span>
              </div>

              {/* LISTA SCHEDE PIÙ GRANDI */}
              <div className="space-y-2.5 mb-3 min-h-[40px]">
                {colCards.map((card) => {
                  const cardDetails = card.description || card.details;

                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCard(card)}
                      className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:border-blue-400 hover:shadow transition cursor-pointer"
                    >
                      {/* TITOLO SCHEDA */}
                      <h4 className="font-bold text-slate-800 text-xs mb-1 leading-snug">{card.title}</h4>

                      {/* ESTRATTO DETTAGLI/DESCRIZIONE */}
                      {cardDetails && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">
                          {cardDetails}
                        </p>
                      )}

                      {/* FOOTER SCHEDA: ICONA DETTAGLI + SIMBOLO E CONTEGGIO ALLEGATI */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-100">
                        <span>{cardDetails ? '📝 Con note' : ''}</span>
                        {card.attachments && card.attachments.length > 0 && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                            📎 {card.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FORM NUOVA SCHEDA INGRANDITO */}
              <div className="flex gap-1.5 pt-2 border-t border-slate-300/70">
                <input
                  type="text"
                  placeholder="Nuova scheda..."
                  value={newCardTitles[col.id] || ''}
                  onChange={(e) => setNewCardTitles({ ...newCardTitles, [col.id]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCard(col.id)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-inner"
                />
                <button
                  onClick={() => handleAddCard(col.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}

        {/* FORM NUOVA COLONNA INGRANDITO */}
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