import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Header from './components/Header';
import AuthForm from './components/AuthForm';
import BoardCard from './components/BoardCard';
import BoardView from './components/BoardView';
import ShareModal from './components/ShareModal';

export default function App() {
  const [session, setSession] = useState(null);
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [draggedBoardIndex, setDraggedBoardIndex] = useState(null);

  // Stati per la creazione di una nuova bacheca
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchBoards();
  }, [session]);

  const fetchBoards = async () => {
    if (!session?.user) return;
    try {
      // 1. Recupera le bacheche di cui sono proprietario (dalla Vista Dinamica)
      const { data: owned, error: ownedErr } = await supabase
        .from('boards_with_owners')
        .select('*')
        .eq('user_id', session.user.id);

      if (ownedErr) throw ownedErr;

      // 2. Recupera gli ID delle bacheche condivise con me
      const { data: memberEntries, error: memberErr } = await supabase
        .from('board_members')
        .select('board_id')
        .eq('user_id', session.user.id);

      if (memberErr) throw memberErr;

      let sharedList = [];
      if (memberEntries && memberEntries.length > 0) {
        const boardIds = memberEntries.map((m) => m.board_id);

        // 3. Recupera le bacheche condivise (dalla Vista Dinamica con l'email reale del creatore)
        const { data: shared, error: sharedErr } = await supabase
          .from('boards_with_owners')
          .select('*')
          .in('id', boardIds);

        if (!sharedErr) sharedList = shared || [];
      }

      // Mappatura totalmente dinamica
      setBoards([
        ...(owned || []).map((b) => ({
          ...b,
          isOwner: true,
          ownerEmail: b.owner_email // Lettura dinamica dal DB
        })),
        ...(sharedList || []).map((b) => ({
          ...b,
          isOwner: false,
          ownerEmail: b.owner_email // Lettura dinamica dell'email del proprietario originale
        }))
      ]);
    } catch (err) {
      console.error('Errore recupero bacheche dinamiche:', err.message);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim() || !session?.user) return;
    try {
      const newBoard = {
        id: `board-${Date.now()}`,
        user_id: session.user.id,
        title: newBoardTitle.trim()
      };

      // Inserimento nella tabella base 'boards'
      const { error } = await supabase.from('boards').insert([newBoard]);
      if (error) throw error;

      // Ricarica la lista per aggiornare lo stato con la vista SQL
      await fetchBoards();
      setNewBoardTitle('');
      setIsCreatingBoard(false);
    } catch (err) {
      alert('Errore creazione bacheca: ' + err.message);
    }
  };

  const handleDragStart = (e, index) => { setDraggedBoardIndex(index); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedBoardIndex === null || draggedBoardIndex === index) return;
    const updated = [...boards];
    const dragged = updated.splice(draggedBoardIndex, 1)[0];
    updated.splice(index, 0, dragged);
    setDraggedBoardIndex(index);
    setBoards(updated);
  };

  if (!session) return <AuthForm />;

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 text-xs">
      <Header userEmail={session.user.email} />

      <main className="p-6 max-w-6xl mx-auto">
        {!activeBoardId ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900">Le Mie Bacheche</h2>
            </div>

            {/* GRIGLIA BACHECHE CON CARD QUADRATE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {/* BOX AGGIUNGI BACHECA COME PRIMO ELEMENTO */}
              {isCreatingBoard ? (
                <div className="rounded-2xl p-6 border-2 border-blue-500 bg-white shadow-md flex flex-col justify-between aspect-square">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mb-2">Nuova Bacheca</h3>
                    <input
                      type="text"
                      placeholder="Titolo bacheca..."
                      value={newBoardTitle}
                      onChange={(e) => setNewBoardTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                      autoFocus
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setIsCreatingBoard(false); setNewBoardTitle(''); }}
                      className="flex-1 py-2 border rounded-lg text-slate-600 hover:bg-slate-50 transition text-xs font-semibold"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleCreateBoard}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition text-xs"
                    >
                      Crea
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setIsCreatingBoard(true)}
                  className="cursor-pointer rounded-2xl p-6 border-2 border-dashed border-slate-300 bg-white/70 hover:bg-white hover:border-blue-500 hover:shadow-lg transition flex flex-col items-center justify-center aspect-square text-slate-500 hover:text-blue-600"
                >
                  <span className="text-4xl font-light mb-2 text-blue-600">+</span>
                  <span className="font-bold text-sm">Crea Nuova Bacheca</span>
                </div>
              )}

              {/* LISTA BACHECHE ESISTENTI */}
              {boards.map((board, index) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  index={index}
                  onSelect={(id) => setActiveBoardId(id)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={() => setDraggedBoardIndex(null)}
                />
              ))}
            </div>
          </div>
        ) : (
          <BoardView
            activeBoard={activeBoard}
            currentUser={session.user}
            onBack={() => setActiveBoardId(null)}
            onOpenShare={() => setIsShareModalOpen(true)}
          />
        )}

        {isShareModalOpen && activeBoard && (
          <ShareModal
            activeBoard={activeBoard}
            currentUserEmail={session.user.email}
            onClose={() => setIsShareModalOpen(false)}
          />
        )}
      </main>
    </div>
  );
}