import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import BoardView from './components/BoardView';
import ShareModal from './components/ShareModal';
import CreateBoardModal from './components/CreateBoardModal';

// Palette Colori Pastello per la Dashboard
const PASTEL_PALETTE = [
  { label: 'Smeraldo', value: 'bg-emerald-50/80 border-emerald-100 hover:border-emerald-200' },
  { label: 'Cielo', value: 'bg-sky-50/80 border-sky-100 hover:border-sky-200' },
  { label: 'Rosa', value: 'bg-rose-50/80 border-rose-100 hover:border-rose-200' },
  { label: 'Ambra', value: 'bg-amber-50/80 border-amber-100 hover:border-amber-200' },
  { label: 'Viola', value: 'bg-purple-50/80 border-purple-100 hover:border-purple-200' },
  { label: 'Teal', value: 'bg-teal-50/80 border-teal-100 hover:border-teal-200' },
  { label: 'Indaco', value: 'bg-indigo-50/80 border-indigo-100 hover:border-indigo-200' }
];

const AVAILABLE_ICONS = ['📄', '📘', '📚', '🏫', '👥', '💡', '🎨', '🧠', '🔬', '🌍', '📐', '🎯'];

export default function App() {
  const [session, setSession] = useState(null);
  const [boards, setBoards] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Landing Page & Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Menu contestuale 3 pallini & Personalizzazione
  const [openMenuBoardId, setOpenMenuBoardId] = useState(null);
  const [editingBoardId, setEditingBoardId] = useState(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState('');
  const [activePicker, setActivePicker] = useState(null);

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
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword
        });
        
        if (error) throw error;

        if (data?.user && data?.user?.identities?.length === 0) {
          alert('Questa email risulta già registrata! Passaggio alla scheda Accedi...');
          setIsSignUp(false);
          setAuthLoading(false);
          return;
        }

        alert('Registrazione completata! Ora puoi effettuare l\'accesso con le tue credenziali.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword
        });
        if (error) throw error;
        setIsAuthModalOpen(false);
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
          icon: b.icon || '📄',
          color: b.color || null,
          position: b.position ?? 0
        })),
        ...(sharedList || []).map((b) => ({
          ...b,
          isOwner: false,
          ownerEmail: b.owner_email,
          icon: b.icon || '📚',
          color: b.color || null,
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
      const boardIcon = template.icon || '📄';

      const { error: boardErr } = await supabase.from('boards').insert([
        {
          id: boardId,
          user_id: session.user.id,
          title: title,
          icon: boardIcon,
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
        icon: boardIcon,
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

  const handleChangeIcon = async (boardId, icon) => {
    try {
      setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, icon } : b)));
      setActivePicker(null);
      setOpenMenuBoardId(null);

      await supabase.from('boards').update({ icon }).eq('id', boardId);
    } catch (err) {
      console.error('Errore cambio icona:', err);
    }
  };

  const handleChangeColor = async (boardId, color) => {
    try {
      setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, color } : b)));
      setActivePicker(null);
      setOpenMenuBoardId(null);

      await supabase.from('boards').update({ color }).eq('id', boardId);
    } catch (err) {
      console.error('Errore cambio colore:', err);
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

  const myBoards = boards.filter((b) => b.isOwner);
  const sharedBoards = boards.filter((b) => !b.isOwner);

  // LANDING PAGE PER UTENTI NON AUTENTICATI
  if (!session) {
    return (
      <div className="min-h-screen bg-[#fcfcfd] text-slate-900 font-sans flex flex-col justify-between">
        {/* NAVBAR LANDING */}
        <header className="max-w-6xl w-full mx-auto p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
              DK
            </div>
            <span className="text-xl font-black tracking-tight">
              Doceo <span className="text-blue-600">Kanban</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsSignUp(false);
                setIsAuthModalOpen(true);
              }}
              className="text-xs font-bold text-slate-700 hover:text-blue-600 px-4 py-2 transition"
            >
              Accedi
            </button>
            <button
              onClick={() => {
                setIsSignUp(true);
                setIsAuthModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-blue-500/20"
            >
              Inizia Gratis
            </button>
          </div>
        </header>

        {/* HERO SECTION */}
        <main className="max-w-5xl mx-auto px-6 py-12 text-center flex-1 flex flex-col items-center justify-center">
          <span className="bg-blue-50 text-blue-700 border border-blue-100 font-extrabold text-[11px] px-3.5 py-1.5 rounded-full mb-6 inline-flex items-center gap-1.5">
            ✨ La piattaforma didattica per organizzare bacheche e lezioni
          </span>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 max-w-3xl leading-tight mb-6">
            Pianifica, collabora e condividi la tua didattica in <span className="text-blue-600">stile NotebookLM</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mb-8 leading-relaxed font-medium">
            Doceo Kanban trasforma la gestione delle tue lezioni, consigli di classe e progetti di gruppo in un’esperienza visiva pulita, moderna e in tempo reale.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 w-full max-w-xs sm:max-w-none">
            <button
              onClick={() => {
                setIsSignUp(true);
                setIsAuthModalOpen(true);
              }}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm px-8 py-3.5 rounded-2xl transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              Crea la tua bacheca 🚀
            </button>
          </div>

          {/* ANTEPRIMA MOCKUP CARDS PASTEL */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-4xl text-left">
            <div className="bg-emerald-50/90 border border-emerald-100 rounded-2xl p-5 shadow-sm">
              <div className="text-3xl mb-3">📚</div>
              <h3 className="font-extrabold text-base mb-1">Unità Didattica</h3>
              <p className="text-xs text-slate-600 font-medium">Organizza gli argomenti, le verifiche e i materiali didattici della settimana.</p>
            </div>

            <div className="bg-sky-50/90 border border-sky-100 rounded-2xl p-5 shadow-sm">
              <div className="text-3xl mb-3">👥</div>
              <h3 className="font-extrabold text-base mb-1">Lavoro di Gruppo</h3>
              <p className="text-xs text-slate-600 font-medium">Assegna compiti e monitora l'avanzamento degli studenti in tempo reale.</p>
            </div>

            <div className="bg-amber-50/90 border border-amber-100 rounded-2xl p-5 shadow-sm">
              <div className="text-3xl mb-3">🏫</div>
              <h3 className="font-extrabold text-base mb-1">Consiglio di Classe</h3>
              <p className="text-xs text-slate-600 font-medium">Condividi note, verbali e programmazioni con i colleghi del plesso.</p>
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="text-center py-6 text-xs text-slate-400 font-medium border-t border-slate-100">
          Doceo Kanban © {new Date().getFullYear()} — La piattaforma Kanban per la scuola moderna
        </footer>

        {/* MODAL AUTH CON SELETTORE A TAB (ACCEDI / REGISTRATI) */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-5 justify-center">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
                  DK
                </div>
              </div>

              {/* TAB SWITCHER (ACCEDI / REGISTRATI) */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    !isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Accedi
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                    isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Registrati
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-3">
                <div>
                  <label className="block text-slate-600 font-bold text-xs mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="nome@scuola.it"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold text-xs mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition shadow-md shadow-blue-500/20 text-xs mt-2"
                >
                  {authLoading ? 'Elaborazione...' : isSignUp ? 'Crea Account' : 'Accedi'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // DASHBOARD PER UTENTI LOGGATI
  return (
    <div 
      className="min-h-screen bg-[#fcfcfd] p-6 text-slate-800" 
      onClick={() => {
        setOpenMenuBoardId(null);
        setActivePicker(null);
      }}
    >
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
        <div className="max-w-6xl mx-auto space-y-10">
          {/* HEADER DASHBOARD */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex justify-between items-center">
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

          {/* SEZIONE 1: LE MIE BACHECHE */}
          <section>
            <div className="flex items-center gap-2 mb-4 px-1">
              <h2 className="text-xl font-extrabold text-slate-900">Le mie bacheche</h2>
              <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full border border-slate-200">
                {myBoards.length}
              </span>
            </div>

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

              {/* LISTA BACHECHE PERSONALI */}
              {myBoards.map((board) => {
                const globalIndex = boards.findIndex((b) => b.id === board.id);
                const isBeingDragged = draggedBoardIndex === globalIndex;
                const isEditingThisBoard = editingBoardId === board.id;
                const isMenuOpen = openMenuBoardId === board.id;
                const pastelStyle = board.color || PASTEL_PALETTE[globalIndex % PASTEL_PALETTE.length].value;

                return (
                  <div
                    key={board.id}
                    draggable={!isEditingThisBoard}
                    onDragStart={(e) => handleBoardDragStart(e, globalIndex)}
                    onDragOver={(e) => handleBoardDragOver(e, globalIndex)}
                    onDragEnd={handleBoardDragEnd}
                    onClick={() => {
                      if (!isEditingThisBoard) setActiveBoard(board);
                    }}
                    className={`aspect-[4/3] border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing relative flex flex-col justify-between ${pastelStyle} ${
                      isBeingDragged ? 'opacity-30 border-2 border-dashed border-blue-500 scale-95' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div className="text-2xl">{board.icon || '📄'}</div>

                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuBoardId(isMenuOpen ? null : board.id);
                            setActivePicker(null);
                          }}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-white/60 transition"
                          title="Opzioni bacheca"
                        >
                          ⋮
                        </button>

                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-7 bg-white border border-slate-200 rounded-xl p-1 shadow-xl z-20 w-36 text-xs"
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
                              onClick={() => setActivePicker(activePicker?.type === 'icon' ? null : { boardId: board.id, type: 'icon' })}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 rounded-lg text-slate-700 font-medium flex items-center gap-2"
                            >
                              😀 Cambia icona
                            </button>

                            <button
                              onClick={() => setActivePicker(activePicker?.type === 'color' ? null : { boardId: board.id, type: 'color' })}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-100 rounded-lg text-slate-700 font-medium flex items-center gap-2"
                            >
                              🎨 Cambia colore
                            </button>

                            <button
                              onClick={(e) => handleDeleteBoard(board.id, board.title, e)}
                              className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 font-medium rounded-lg flex items-center gap-2 border-t border-slate-100 mt-0.5"
                            >
                              🗑️ Elimina
                            </button>
                          </div>
                        )}

                        {activePicker?.boardId === board.id && activePicker.type === 'icon' && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-7 bg-white border border-slate-200 rounded-xl p-2 shadow-2xl z-30 grid grid-cols-4 gap-1.5 w-40 text-lg"
                          >
                            {AVAILABLE_ICONS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleChangeIcon(board.id, emoji)}
                                className="p-1 hover:bg-slate-100 rounded-lg text-center transition hover:scale-110"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {activePicker?.boardId === board.id && activePicker.type === 'color' && (
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-7 bg-white border border-slate-200 rounded-xl p-2 shadow-2xl z-30 flex flex-wrap gap-1.5 w-36"
                          >
                            {PASTEL_PALETTE.map((c) => (
                              <button
                                key={c.label}
                                onClick={() => handleChangeColor(board.id, c.value)}
                                className={`w-6 h-6 rounded-full border border-black/10 transition hover:scale-110 ${c.value.split(' ')[0]}`}
                                title={c.label}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

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

                    <div className="text-[11px] text-slate-500 font-medium truncate pt-2 border-t border-black/5 flex items-center justify-between">
                      <span className="truncate">Personale</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SEZIONE 2: BACHECHE CONDIVISE CON ME */}
          {sharedBoards.length > 0 && (
            <section className="pt-4 border-t border-slate-200/70">
              <div className="flex items-center gap-2 mb-4 px-1">
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <span>👥</span> Condivise con me
                </h2>
                <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                  {sharedBoards.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                {sharedBoards.map((board) => {
                  const globalIndex = boards.findIndex((b) => b.id === board.id);
                  const isEditingThisBoard = editingBoardId === board.id;
                  const pastelStyle = board.color || PASTEL_PALETTE[globalIndex % PASTEL_PALETTE.length].value;

                  return (
                    <div
                      key={board.id}
                      onClick={() => {
                        if (!isEditingThisBoard) setActiveBoard(board);
                      }}
                      className={`aspect-[4/3] border-2 border-indigo-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer relative flex flex-col justify-between ${pastelStyle}`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="text-2xl">{board.icon || '📚'}</div>
                        <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                          {board.role === 'editor' ? 'Editor' : 'Viewer'}
                        </span>
                      </div>

                      <div className="my-auto">
                        <h3 className="font-bold text-base text-slate-900 leading-snug line-clamp-2">
                          {board.title}
                        </h3>
                      </div>

                      <div className="text-[11px] text-indigo-950 font-semibold truncate pt-2 border-t border-indigo-200/60 flex items-center gap-1.5">
                        <span className="text-xs">🔗</span>
                        <span className="truncate">
                          Da: {board.ownerEmail ? board.ownerEmail.split('@')[0] : 'Collega'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
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