import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import BoardView from './components/BoardView';
import ShareModal from './components/ShareModal';

export default function App() {
  const [session, setSession] = useState(null);
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchBoards();
  }, [session]);

  const fetchBoards = async () => {
    if (!session?.user) return;
    try {
      const userEmail = session.user.email.toLowerCase();

      // 1. Bacheche proprietarie
      const { data: owned, error: ownedErr } = await supabase
        .from('boards_with_owners')
        .select('*')
        .eq('user_id', session.user.id);

      if (ownedErr) throw ownedErr;

      // 2. Inviti per user_id o email
      const { data: memberEntries, error: memberErr } = await supabase
        .from('board_members')
        .select('board_id, role, invited_email');

      if (memberErr) throw memberErr;

      const myMemberEntries = (memberEntries || []).filter(
        (m) =>
          (m.invited_email && m.invited_email.toLowerCase() === userEmail) ||
          m.user_id === session.user.id
      );

      let sharedList = [];
      if (myMemberEntries.length > 0) {
        const boardIds = [...new Set(myMemberEntries.map((m) => String(m.board_id)))];

        const { data: shared, error: sharedErr } = await supabase
          .from('boards_with_owners')
          .select('*')
          .in('id', boardIds);

        if (!sharedErr && shared) {
          sharedList = shared.map((board) => {
            const memberInfo = myMemberEntries.find((m) => String(m.board_id) === String(board.id));
            return {
              ...board,
              role: memberInfo?.role || 'viewer'
            };
          });
        }
      }

      setBoards([
        ...(owned || []).map((b) => ({
          ...b,
          isOwner: true,
          role: 'owner',
          ownerEmail: b.owner_email
        })),
        ...(sharedList || []).map((b) => ({
          ...b,
          isOwner: false,
          ownerEmail: b.owner_email
        }))
      ]);
    } catch (err) {
      console.error('Errore recupero bacheche:', err.message);
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

      const { error } = await supabase.from('boards').insert([newBoard]);
      if (error) throw error;

      await fetchBoards();
      setNewBoardTitle('');
      setIsCreatingBoard(false);
    } catch (err) {
      alert('Errore creazione bacheca: ' + err.message);
    }
  };

  // FUNZIONE ELIMINAZIONE BACHECA
  const handleDeleteBoard = async (boardId, boardTitle, e) => {
    e.stopPropagation();
    if (!window.confirm(`Sei sicuro di voler eliminare definitivamente la bacheca "${boardTitle}"?`)) return;

    try {
      const { error } = await supabase.from('boards').delete().eq('id', boardId);
      if (error) throw error;

      setBoards((prev) => prev.filter((b) => b.id !== boardId));
      if (activeBoard?.id === boardId) setActiveBoard(null);
    } catch (err) {
      alert('Errore eliminazione bacheca: ' + err.message);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <p className="text-slate-600 font-medium">Inizia effettuando l'accesso con Supabase Auth...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-800">
      {activeBoard ? (
        <BoardView
          activeBoard={activeBoard}
          currentUser={session.user}
          onBack={() => setActiveBoard(null)}
          onOpenShare={() => setIsShareModalOpen(true)}
        />
      ) : (
        <div className="max-w-5xl mx-auto">
          {/* HEADER DASHBOARD */}
          <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl border shadow-sm">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Le Tue Bacheche</h1>
              <p className="text-xs text-slate-500">Utente: {session.user.email}</p>
            </div>
            <button
              onClick={() => setIsCreatingBoard(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
            >
              + Nuova Bacheca
            </button>
          </div>

          {/* CREAZIONE BACHECA */}
          {isCreatingBoard && (
            <div className="mb-6 bg-white border p-4 rounded-xl shadow-sm flex gap-3 items-center">
              <input
                type="text"
                placeholder="Titolo bacheca..."
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-xs flex-1 focus:outline-none focus:border-blue-500"
              />
              <button onClick={handleCreateBoard} className="bg-blue-600 text-white font-bold text-xs px-4 py-1.5 rounded-lg">
                Crea
              </button>
              <button onClick={() => setIsCreatingBoard(false)} className="border text-slate-600 text-xs px-3 py-1.5 rounded-lg">
                Annulla
              </button>
            </div>
          )}

          {/* LISTA BACHECHE CON PULSANTE ELIMINA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                onClick={() => setActiveBoard(board)}
                className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-pointer relative flex justify-between items-start"
              >
                <div>
                  <h3 className="font-bold text-base text-slate-800 mb-1">{board.title}</h3>
                  <p className="text-xs text-slate-500">
                    Proprietario: {board.ownerEmail}
                  </p>
                  <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    board.isOwner ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {board.isOwner ? 'Proprietario' : board.role}
                  </span>
                </div>

                {/* PULSANTE CESTINO PER ELIMINARE LA BACHECA */}
                {board.isOwner && (
                  <button
                    onClick={(e) => handleDeleteBoard(board.id, board.title, e)}
                    title="Elimina bacheca"
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded transition hover:bg-red-50 text-sm font-bold"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isShareModalOpen && activeBoard && (
        <ShareModal
          activeBoard={activeBoard}
          currentUserEmail={session.user.email}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}