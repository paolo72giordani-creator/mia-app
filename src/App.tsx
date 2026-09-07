import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import BoardView from './components/BoardView';
import ShareModal from './components/ShareModal';
import CreateBoardModal from './components/CreateBoardModal';

// Palette Colori Pastello stile NotebookLM
const PASTEL_BG_CLASSES = [
  'bg-emerald-50/80 border-emerald-100 hover:border-emerald-200',
  'bg-sky-50/80 border-sky-100 hover:border-sky-200',
  'bg-rose-50/80 border-rose-100 hover:border-rose-200',
  'bg-amber-50/80 border-amber-100 hover:border-amber-200',
  'bg-purple-50/80 border-purple-100 hover:border-purple-200',
  'bg-teal-50/80 border-teal-100 hover:border-teal-200',
  'bg-indigo-50/80 border-indigo-100 hover:border-indigo-200'
];

export default function App() {
  const [session, setSession] = useState(null);
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Auth form state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Menu contestuale 3 pallini & Rinomina
  const [openMenuBoardId, setOpenMenuBoardId] = useState(null);
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState('');

  // Drag & drop bacheche
  const [draggedBoardIndex, setDraggedBoardIndex] = useState(null);

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

  const handleCreateBoardWithTemplate = async (title, template) => {
    if (!title || !session?.user) return;
    try {
      const boardId = `board-${Date.now()}`;
      const userEmail = session.user.email;

      const { error: boardErr } = await supabase.from('boards').insert([
        {
          id: boardId,
          user_id: session.user.id,
          title: title,
          position: boards.length
        }
      ]);
      if (boardErr) throw boardErr;

      if (template.columns && template.columns.length > 0) {
        const columnsToInsert = template.columns.map((col, idx) => ({
          id: `col-${Date.now()}-${idx}`,
          user_id: session.user.id,
          board_id: boardId,
          name: col.name,
          color: col.color,
          position: idx
        }));

        await supabase.from('columns').insert(columnsToInsert);
      }

      const newBoardObj = {
        id: boardId,
        user_id: session.user.id,
        title: title,
        icon: template.icon,
        isOwner: true,
        role: 'owner',
        ownerEmail: userEmail,
        position: boards.length
      };

      await fetchBoards();
      setIsCreatingBoard(false);
      setActiveBoard(newBoardObj);

    } catch (err) {
      alert('Errore creazione bacheca: ' + err.message);
    }
  };

  const handleRenameBoard = async (boardId) => {
    if (!editingBoardTitle.trim()) {
      setEditingBoardId(null);
      return;
    }
    const updatedTitle = editingBoardTitle.trim();
    try {
      setBoards((prev) =>
        prev.map((b) => (b.id === boardId ? { ...b, title: updatedTitle } : b))
      );
      if (activeBoard?.id === boardId) {
        setActiveBoard((prev) => ({ ...prev, title: updatedTitle }));
      }
      setEditingBoardId(null);

      await supabase
        .from('boards')
        .update({ title: updatedTitle })
        .eq('id', boardId);
    } catch (err) {
      console.error('Errore rinomina bacheca:', err);
    }
  };

  const handleDeleteBoard = async (boardId, boardTitle, e) => {
    if (e) e.stopPropagation();
    setOpenMenuBoardId(null);
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

    const reordered = [...boards];
    const [movedBoard] = reordered.splice(draggedBoardIndex, 1);
    reordered.splice(index, 0, movedBoard);

    setDraggedBoardIndex(index);
    setBoards(reordered);
  };

  const handleBoardDragEnd = async () => {
    if (draggedBoardIndex === null) return;
    setDraggedBoardIndex(null);

    try {
      for (let i = 0; i < boards.length; i++) {
        await supabase
          .from('boards')
          .update({ position: i })
          .eq('id', boards[i].id);
      }
    } catch (err) {
      console.error('Errore salvataggio posizione bacheche:', err);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 text-xs">
        <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
              DK
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
    <div className="min-h-screen bg-[#fcfcfd] p-6 text-slate-800" onClick={() => setOpenMenuBoardId(null)}>
      {activeBoard ? (
        <BoardView
          activeBoard={activeBoard}
          currentUser={session.user}
          onBack={() => setActiveBoard(null)}
          onOpenShare={() => setIsShareModalOpen(true)}
          onLogout={handleLogout}
          onBoardTitleChange={(newTitle) => {
            setBoards((prev) =>
              prev.map((b) => (b.id === activeBoard.id ? { ...b, title: newTitle } : b))
            );
            setActiveBoard((prev) => ({ ...prev, title: newTitle }));
          }}
        />
      ) : (
        <div className="max-w-6xl mx-auto">
          {/* HEADER DASHBOARD */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-8 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-base shadow-md shadow-blue-500/20 tracking-tighter">
                DK
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
              className="bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
              title="Disconnetti account"
            >
              <span>🚪</span> Esci
            </button>
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 mb-4 px-1">Le mie bacheche</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {/* CARD CREA NUOVA BACHECA */}
            <div
              onClick={() => setIsCreatingBoard(true)}
              className="aspect-[4/3] bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 flex flex-col justify-center items-center cursor-pointer transition-all shadow-sm hover:shadow-md group"
            >
              <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-full flex items-center justify-center mb-3 transition">
                <span className="text-2xl text-blue-600 font-bold">+</span>
              </div>
              <span className="font-bold text-sm text-slate-800">Crea nuova bacheca</span>
            </div>

            {/* LISTA BACHECHE CON ICONE E BADGE CONDIVISIONE */}
            {boards.map((board, index) => {
              const isBeingDragged = draggedBoardIndex === index;
              const isEditingThisBoard = editingBoardId === board.id;
              const isMenuOpen = openMenuBoardId === board.id;
              const pastelStyle = PASTEL_BG_CLASSES[index % PASTEL_BG_CLASSES.length];

              // Icona del template o predefinita
              const boardIcon = board.icon || (board.isOwner ? '📘' : '📚');

              return (
                <div
                  key={board.id}
                  draggable={!isEditingThisBoard}
                  onDragStart={(e) => handleBoardDragStart(e, index)}
                  onDragOver={(e) => handleBoardDragOver(e, index)}
                  onDragEnd={handleBoardDragEnd}
                  onClick={() => {
                    if (!isEditingThisBoard) setActiveBoard(board);
                  }}
                  className={`aspect-[4/3] border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing relative flex flex-col justify-between ${pastelStyle} ${
                    isBeingDragged ? 'opacity-30 border-2 border-dashed border-blue-500 scale-95' : ''
                  }`}
                >
                  {/* ICONA E MENU 3 PALLINI */}
                  <div className="flex justify-between items-start gap-1">
                    <div className="text-2xl">
                      {boardIcon}
                    </div>

                    {board.isOwner && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuBoardId(isMenuOpen ? null : board.id);
                          }}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-white/60 transition"
                          title="Opzioni bacheca"
                        >
                          ⋮
                        </button>

                        {isMenuOpen && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-7 bg-white border border-slate-200 rounded-xl p-1 shadow-xl z-20 w-32 text-xs"
                          >
                            <button
                              onClick={() => {
                                setEditingBoardId(board.id);
                                setEditingBoardTitle(board.title);
                                setOpenMenuBoardId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 rounded-lg text-slate-700 font-medium flex items-center gap-2"
                            >
                              ✏️ Rinomina
                            </button>
                            <button
                              onClick={(e) => handleDeleteBoard(board.id, board.title, e)}
                              className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 font-medium rounded-lg flex items-center gap-2"
                            >
                              🗑️ Elimina
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* TITOLO ED EDITING */}
                  <div className="my-auto">
                    {!isEditingThisBoard ? (
                      <h3 className="font-bold text-base text-slate-900 leading-snug line-clamp-2">
                        {board.title}
                      </h3>
                    ) : (
                      <input
                        type="text"
                        value={editingBoardTitle}
                        onChange={(e) => setEditingBoardTitle(e.target.value)}
                        onBlur={() => handleRenameBoard(board.id)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameBoard(board.id)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="w-full border border-blue-500 rounded px-2 py-1 text-sm font-bold text-slate-900 focus:outline-none bg-white"
                      />
                    )}
                  </div>

                  {/* METADATI E BADGE DI CONDIVISIONE */}
                  <div className="text-[11px] text-slate-500 font-medium truncate pt-2 border-t border-black/5 flex items-center justify-between">
                    {board.isOwner ? (
                      <span className="truncate">Personale</span>
                    ) : (
                      <div className="flex items-center gap-1.5 truncate text-indigo-900">
                        <span>🔗</span>
                        <span className="truncate">
                          {board.ownerEmail?.split('@')[0]}
                        </span>
                      </div>
                    )}

                    {!board.isOwner && (
                      <span className="text-[10px] bg-indigo-100/80 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200/80 font-semibold flex-shrink-0">
                        {board.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL CREAZIONE BACHECA CON TEMPLATE */}
      {isCreatingBoard && (
        <CreateBoardModal
          onClose={() => setIsCreatingBoard(false)}
          onCreate={handleCreateBoardWithTemplate}
        />
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