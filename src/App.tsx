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

  // Auth form state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [draggedBoardIndex, setDraggedBoardIndex] = useState(null);
  const [dragOverBoardIndex, setDragOverBoardIndex] = useState(null);

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

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) return;

    setAuthLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword
        });
        if (error) throw error;
        alert('Registrazione completata! Controlla la tua email o effettua il login.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword
        });
        if (error) throw error;
      }
    } catch (err) {
      alert('Errore autenticazione: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchBoards = async () => {
    if (!session?.user) return;
    try {
      const userEmail = session.user.email.toLowerCase();

      const { data: owned, error: ownedErr } = await supabase
        .from('boards_with_owners')
        .select('*')
        .eq('user_id', session.user.id);

      if (ownedErr) throw ownedErr;

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

      const allBoards = [
        ...(owned || []).map((b) => ({
          ...b,
          isOwner: true,
          role: 'owner',
          ownerEmail: b.owner_email,
          position: b.position ?? 0
        })),
        ...(sharedList || []).map((b) => ({
          ...b,
          isOwner: false,
          ownerEmail: b.owner_email,
          position: b.position ?? 0
        }))
      ];

      allBoards.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      setBoards(allBoards);
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
        title: newBoardTitle.trim(),
        position: boards.length
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveBoard(null);
  };

  const handleBoardDragStart = (e, index) => {
    e.stopPropagation();
    setDraggedBoardIndex(index);
  };

  const handleBoardDragOver = (e, index) => {
    e.preventDefault();
    if (draggedBoardIndex === null || draggedBoardIndex === index) return;
    setDragOverBoardIndex(index);
  };

  const handleBoardDrop = async (e, dropIndex) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedBoardIndex === null || draggedBoardIndex === dropIndex) {
      setDraggedBoardIndex(null);
      setDragOverBoardIndex(null);
      return;
    }

    const reordered = [...boards];
    const [movedBoard] = reordered.splice(draggedBoardIndex, 1);
    reordered.splice(dropIndex, 0, movedBoard);

    setBoards(reordered);
    setDraggedBoardIndex(null);
    setDragOverBoardIndex(null);

    try {
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from('boards')
          .update({ position: i })
          .eq('id', reordered[i].id);
      }
    } catch (err) {
      console.error('Errore salvataggio posizione bacheche:', err);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-xs">
        <div className="bg-white border rounded-xl max-w-sm w-full p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
              D
            </div>
            <h1 className="text-xl font-black text-slate-900">
              Doceo <span className="text-blue-600">Kanban</span>
            </h1>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Email</label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="nome@esempio.com"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Password</label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg transition shadow-sm mt-2"
            >
              {authLoading ? 'Elaborazione...' : isSignUp ? 'Registrati' : 'Accedi'}
            </button>
          </form>

          <div className="mt-4 text-center pt-3 border-t">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 hover:underline font-semibold text-xs"
            >
              {isSignUp ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati'}
            </button>
          </div>
        </div>
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
    onLogout={handleLogout}
        />
      ) : (
        <div className="max-w-6xl mx-auto">
          {/* HEADER DASHBOARD */}
          <div className="bg-white p-4 rounded-xl border shadow-sm mb-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
                D
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                  Doceo <span className="text-blue-600">Kanban</span>
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  Utente: {session.user.email}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              title="Disconnetti account"
            >
              <span>🚪</span> Esci
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {/* CARD 1: NUOVA BACHECA QUADRATA */}
            <div className="aspect-square bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 flex flex-col justify-center items-center transition shadow-sm">
              {!isCreatingBoard ? (
                <button
                  onClick={() => setIsCreatingBoard(true)}
                  className="w-full h-full flex flex-col items-center justify-center text-blue-600 hover:text-blue-700 font-bold text-sm gap-1"
                >
                  <span className="text-3xl">+</span>
                  <span className="font-extrabold text-sm">Nuova Bacheca</span>
                </button>
              ) : (
                <div className="w-full h-full flex flex-col justify-center space-y-2">
                  <input
                    type="text"
                    placeholder="Titolo bacheca..."
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                    autoFocus
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => setIsCreatingBoard(false)}
                      className="border px-2 py-1 rounded text-[10px] text-slate-600 font-medium"
                    >
                      Annulla
                    </button>
                    <button
                      onClick={handleCreateBoard}
                      className="bg-blue-600 text-white font-bold text-[10px] px-2.5 py-1 rounded"
                    >
                      Crea
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* LISTA BACHECHE SALVATE */}
            {boards.map((board, index) => {
              const isBeingDragged = draggedBoardIndex === index;
              const isDragOver = dragOverBoardIndex === index;

              return (
                <div
                  key={board.id}
                  draggable
                  onDragStart={(e) => handleBoardDragStart(e, index)}
                  onDragOver={(e) => handleBoardDragOver(e, index)}
                  onDrop={(e) => handleBoardDrop(e, index)}
                  onClick={() => setActiveBoard(board)}
                  className={`aspect-square border rounded-xl p-4 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing relative flex flex-col justify-between ${
                    isBeingDragged
                      ? 'opacity-30 border-dashed border-blue-500 scale-95'
                      : isDragOver
                      ? 'ring-2 ring-blue-500 border-blue-400 bg-blue-50/60'
                      : board.isOwner
                      ? 'bg-white border-slate-200 hover:border-blue-400'
                      : 'bg-indigo-50/40 border-indigo-200 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <h3 className="font-extrabold text-lg text-slate-900 leading-snug line-clamp-3">
                      {board.title}
                    </h3>
                    {board.isOwner && (
                      <button
                        onClick={(e) => handleDeleteBoard(board.id, board.title, e)}
                        title="Elimina bacheca"
                        className="text-slate-300 hover:text-red-600 transition p-0.5 rounded hover:bg-red-50 text-base font-bold flex-shrink-0"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-500 truncate mb-1" title={board.ownerEmail}>
                      Proprietario: {board.ownerEmail}
                    </p>
                    <span
                      className={`inline-block text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                        board.isOwner
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-purple-100 text-purple-700 border-purple-200'
                      }`}
                    >
                      {board.isOwner ? 'Proprietario' : `Condivisa (${board.role})`}
                    </span>
                  </div>
                </div>
              );
            })}
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