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
      const { data: owned } = await supabase.from('boards').select('*').eq('user_id', session.user.id);
      const { data: memberEntries } = await supabase.from('board_members').select('board_id').eq('user_id', session.user.id);

      let sharedList = [];
      if (memberEntries && memberEntries.length > 0) {
        const { data: shared } = await supabase.from('boards').select('*').in('id', memberEntries.map((m) => m.board_id));
        sharedList = shared || [];
      }

      setBoards([
        ...(owned || []).map((b) => ({ ...b, isOwner: true, ownerEmail: session.user.email })),
        ...(sharedList || []).map((b) => ({ ...b, isOwner: false, ownerEmail: 'Condivisa' }))
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  // Drag & Drop Dashboard
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

      <main className="p-4 max-w-6xl mx-auto">
        {!activeBoardId ? (
          <div>
            <h2 className="text-sm font-bold text-slate-700 mb-3">Le Mie Bacheche</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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