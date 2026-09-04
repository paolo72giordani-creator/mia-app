import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, GripVertical, AlertTriangle, LogOut, Mail, Lock, UserPlus, LogIn, LayoutDashboard, Sparkles } from 'lucide-react';
import { supabase } from './supabaseClient';

const COLUMN_THEMES = [
  {
    headerBg: 'bg-blue-100/80',
    headerBorder: 'border-blue-200',
    titleColor: 'text-blue-950',
    badgeBg: 'bg-blue-200/80',
    badgeText: 'text-blue-800',
    iconColor: 'text-blue-500 hover:text-blue-800'
  },
  {
    headerBg: 'bg-amber-100/80',
    headerBorder: 'border-amber-200',
    titleColor: 'text-amber-950',
    badgeBg: 'bg-amber-200/80',
    badgeText: 'text-amber-800',
    iconColor: 'text-amber-500 hover:text-amber-800'
  },
  {
    headerBg: 'bg-indigo-100/80',
    headerBorder: 'border-indigo-200',
    titleColor: 'text-indigo-950',
    badgeBg: 'bg-indigo-200/80',
    badgeText: 'text-indigo-800',
    iconColor: 'text-indigo-500 hover:text-indigo-800'
  },
  {
    headerBg: 'bg-purple-100/80',
    headerBorder: 'border-purple-200',
    titleColor: 'text-purple-950',
    badgeBg: 'bg-purple-200/80',
    badgeText: 'text-purple-800',
    iconColor: 'text-purple-500 hover:text-purple-800'
  },
  {
    headerBg: 'bg-emerald-100/80',
    headerBorder: 'border-emerald-200',
    titleColor: 'text-emerald-950',
    badgeBg: 'bg-emerald-200/80',
    badgeText: 'text-emerald-800',
    iconColor: 'text-emerald-600 hover:text-emerald-900'
  },
  {
    headerBg: 'bg-rose-100/80',
    headerBorder: 'border-rose-200',
    titleColor: 'text-rose-950',
    badgeBg: 'bg-rose-200/80',
    badgeText: 'text-rose-800',
    iconColor: 'text-rose-500 hover:text-rose-800'
  }
];

const DEFAULT_COLUMNS = [
  { name: 'Backlog', position: 0 },
  { name: 'Da fare', position: 1 },
  { name: 'In corso', position: 2 },
  { name: 'In revisione', position: 3 },
  { name: 'Completato', position: 4 }
];

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modalità di autenticazione: 'login' o 'signup'
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Stati della bacheca
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);

  // Stati UI per le azioni
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [activeNewCardColumnId, setActiveNewCardColumnId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Gestione della sessione utente
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Caricamento dati
  useEffect(() => {
    if (session?.user) {
      fetchBoardData();
    }
  }, [session]);

  const fetchBoardData = async () => {
    setLoading(true);
    try {
      let { data: cols, error: colsErr } = await supabase
        .from('columns')
        .select('*')
        .order('position', { ascending: true });

      if (colsErr) throw colsErr;

      if (!cols || cols.length === 0) {
        const initialCols = DEFAULT_COLUMNS.map((col) => ({
          id: `col-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          user_id: session.user.id,
          name: col.name,
          position: col.position
        }));

        const { data: insertedCols, error: insertErr } = await supabase
          .from('columns')
          .insert(initialCols)
          .select();

        if (insertErr) throw insertErr;
        cols = insertedCols;
      }

      setColumns(cols || []);

      const { data: crds, error: crdsErr } = await supabase
        .from('cards')
        .select('*')
        .order('position', { ascending: true });

      if (crdsErr) throw crdsErr;
      setCards(crds || []);
    } catch (err) {
      console.error('Errore durante il caricamento:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Autenticazione (Accedi / Registrati)
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');
    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthSuccessMsg('Registrazione completata! Puoi effettuare l\'accesso con le tue credenziali.');
        setAuthMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setColumns([]);
    setCards([]);
    setAuthMode('login'); // Reimposta sulla scheda di Login al momento dell'uscita
    setEmail('');
    setPassword('');
    setAuthError('');
    setAuthSuccessMsg('');
  };

  // Azioni sulle colonne
  const handleAddColumn = async () => {
    const trimmed = newColumnName.trim();
    if (!trimmed || !session) return;

    const newCol = {
      id: `col-${Date.now()}`,
      user_id: session.user.id,
      name: trimmed,
      position: columns.length
    };

    setColumns((prev) => [...prev, newCol]);
    setNewColumnName('');
    setIsAddingColumn(false);

    const { error } = await supabase.from('columns').insert([newCol]);
    if (error) fetchBoardData();
  };

  const saveRenameColumn = async (id) => {
    const trimmed = editingColumnName.trim();
    if (trimmed) {
      setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
      await supabase.from('columns').update({ name: trimmed }).eq('id', id);
    }
    setEditingColumnId(null);
    setEditingColumnName('');
  };

  // Azioni sulle schede
  const handleAddCard = async (columnId) => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle || !session) return;

    const colCards = cards.filter((c) => c.column_id === columnId);
    const newCard = {
      id: `card-${Date.now()}`,
      user_id: session.user.id,
      column_id: columnId,
      title: trimmedTitle,
      details: newDetails.trim(),
      position: colCards.length
    };

    setCards((prev) => [...prev, newCard]);
    setNewTitle('');
    setNewDetails('');
    setActiveNewCardColumnId(null);

    const { error } = await supabase.from('cards').insert([newCard]);
    if (error) fetchBoardData();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    if (confirmDelete.type === 'card') {
      setCards((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      await supabase.from('cards').delete().eq('id', confirmDelete.id);
    } else if (confirmDelete.type === 'column') {
      setColumns((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      setCards((prev) => prev.filter((c) => c.column_id !== confirmDelete.id));
      await supabase.from('columns').delete().eq('id', confirmDelete.id);
    }

    setConfirmDelete(null);
  };

  // Drag and Drop
  const handleDragStart = (e, cardId) => {
    setDraggedCardId(cardId);
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDropTarget(null);
  };

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

  const handleColumnDragOver = (e, columnId, cardCount) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!dropTarget || dropTarget.columnId !== columnId) {
      setDropTarget({ columnId, index: cardCount });
    }
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    e.stopPropagation();

    const cardId = draggedCardId || e.dataTransfer.getData('text/plain');
    if (!cardId) {
      setDraggedCardId(null);
      setDropTarget(null);
      return;
    }

    const draggedCard = cards.find((c) => c.id === cardId);
    if (!draggedCard) return;

    const targetColId = dropTarget ? dropTarget.columnId : columnId;

    const updatedCards = cards.map((c) =>
      c.id === cardId ? { ...c, column_id: targetColId } : c
    );
    setCards(updatedCards);

    setDraggedCardId(null);
    setDropTarget(null);

    await supabase
      .from('cards')
      .update({ column_id: targetColId })
      .eq('id', cardId);
  };

  // Caricamento iniziale
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-300">Sincronizzazione bacheca...</span>
        </div>
      </div>
    );
  }

  // Schermata Login / Registrazione moderna
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        {/* Sfondo decorativo con sfumature */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800/80 p-8 z-10">
          {/* Header del Form */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4">
              <LayoutDashboard className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Bacheca Kanban
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Gestisci i tuoi task e progetti in un unico posto
            </p>
          </div>

          {/* Selettore Schede (Accedi / Registrati) */}
          <div className="grid grid-cols-2 bg-slate-800/60 p-1 rounded-2xl mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
                setAuthSuccessMsg('');
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                authMode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn size={14} />
              <span>Accedi</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setAuthError('');
                setAuthSuccessMsg('');
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                authMode === 'signup'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus size={14} />
              <span>Registrati</span>
            </button>
          </div>

          {/* Messaggi di Errore / Successo */}
          {authError && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-2.5">
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccessMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center space-x-2.5">
              <Sparkles size={16} className="shrink-0 text-emerald-400" />
              <span>{authSuccessMsg}</span>
            </div>
          )}

          {/* Form con chiave dinamica per forzare il reset del browser */}
          <form onSubmit={handleAuth} className="space-y-4" autoComplete="off" key={authMode}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Indirizzo Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  key={`email-${authMode}`}
                  type="email"
                  required
                  autoComplete="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-500" />
                <input
                  key={`password-${authMode}`}
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center space-x-2 mt-2"
            >
              {authLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{authMode === 'login' ? 'Accedi all\'Account' : 'Crea Nuovo Account'}</span>
              )}
            </button>
          </form>

          {/* Dettaglio footer */}
          <p className="mt-6 text-center text-[11px] text-slate-500">
            {authMode === 'login' 
              ? 'Non hai ancora un account? Seleziona "Registrati" in alto.' 
              : 'Hai già un account? Seleziona "Accedi" in alto per rientrare.'}
          </p>
        </div>
      </div>
    );
  }

  // Interfaccia Applicazione Kanban
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased selection:bg-orange-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-7 w-2.5 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-tight">
                Bacheca di Progetto
              </h1>
              <p className="text-[11px] text-slate-500">
                Sincronizzata con <span className="font-medium text-slate-700">{session.user.email}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-xs font-medium">
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-600 font-semibold">
              {columns.length} {columns.length === 1 ? 'Colonna' : 'Colonne'}
            </span>
            <span className="text-slate-500 hidden sm:inline">{cards.length} Schede</span>
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 font-medium shadow-2xs transition-colors"
            >
              <Plus size={14} />
              <span>Nuova colonna</span>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-700 px-3 py-1.5 font-medium transition-all"
            >
              <LogOut size={14} />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </header>

      {/* Area Colonne Kanban */}
      <main className="flex-1 overflow-x-auto p-6">
        <div className="flex items-start gap-5 min-w-max pb-4">
          {columns.map((col, colIdx) => {
            const columnCards = cards.filter((c) => c.column_id === col.id);
            const isColumnActive = dropTarget?.columnId === col.id;
            const theme = COLUMN_THEMES[colIdx % COLUMN_THEMES.length];

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleColumnDragOver(e, col.id, columnCards.length)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`w-80 shrink-0 flex flex-col rounded-xl border transition-colors duration-150 ${
                  isColumnActive
                    ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500/30'
                    : 'border-slate-200 bg-slate-100/75'
                }`}
              >
                <div className={`p-3.5 flex items-center justify-between border-b rounded-t-xl transition-colors ${theme.headerBg} ${theme.headerBorder}`}>
                  {editingColumnId === col.id ? (
                    <div className="flex items-center space-x-1 w-full">
                      <input
                        type="text"
                        value={editingColumnName}
                        onChange={(e) => setEditingColumnName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRenameColumn(col.id);
                          if (e.key === 'Escape') setEditingColumnId(null);
                        }}
                        autoFocus
                        className="w-full text-xs font-semibold px-2 py-1 border border-indigo-500 rounded outline-none bg-white text-slate-900"
                      />
                      <button onClick={() => saveRenameColumn(col.id)} className="p-1 text-emerald-700 hover:text-emerald-900">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingColumnId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold text-sm tracking-tight ${theme.titleColor}`}>
                          {col.name}
                        </span>
                        <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${theme.badgeBg} ${theme.badgeText}`}>
                          {columnCards.length}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingColumnId(col.id);
                            setEditingColumnName(col.name);
                          }}
                          className={`p-1 rounded transition-colors ${theme.iconColor}`}
                        >
                          <Edit2 size={13} />
                        </button>
                        {columns.length > 1 && (
                          <button
                            onClick={() =>
                              setConfirmDelete({
                                type: 'column',
                                id: col.id,
                                name: col.name,
                                cardCount: columnCards.length
                              })
                            }
                            className="p-1 text-rose-500 hover:text-rose-700 rounded transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="p-3 flex flex-col space-y-2.5 min-h-[320px]">
                  {columnCards.map((card, idx) => {
                    const isTargetBeforeThis =
                      dropTarget?.columnId === col.id && dropTarget?.index === idx;

                    return (
                      <React.Fragment key={card.id}>
                        {isTargetBeforeThis && (
                          <div className="rounded-lg border-2 border-dashed border-orange-500 bg-orange-50 py-2.5 px-3 flex items-center justify-center space-x-2 text-orange-950 text-xs font-semibold animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <span>Rilascia qui la scheda</span>
                          </div>
                        )}

                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleCardDragOver(e, col.id, idx)}
                          className={`group relative flex flex-col rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition-all duration-150 cursor-grab active:cursor-grabbing hover:shadow-sm overflow-hidden ${
                            draggedCardId === card.id ? 'opacity-30 border-dashed border-orange-400' : ''
                          }`}
                        >
                          <div className="absolute inset-y-0 left-0 w-1.5 bg-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none" />

                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                              <GripVertical size={12} className="text-slate-300 group-hover:text-slate-500 shrink-0" />
                              <h4 className="text-xs font-semibold text-slate-900 truncate leading-tight">
                                {card.title}
                              </h4>
                            </div>
                            <button
                              onClick={() =>
                                setConfirmDelete({
                                  type: 'card',
                                  id: card.id,
                                  name: card.title
                                })
                              }
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {card.details && (
                            <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-3">
                              {card.details}
                            </p>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {dropTarget?.columnId === col.id && dropTarget?.index === columnCards.length && (
                    <div className="rounded-lg border-2 border-dashed border-orange-500 bg-orange-50 py-2.5 px-3 flex items-center justify-center space-x-2 text-orange-950 text-xs font-semibold animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span>Rilascia qui la scheda</span>
                    </div>
                  )}

                  {activeNewCardColumnId === col.id ? (
                    <div className="rounded-lg border border-indigo-500 bg-white p-3 shadow-xs mt-2">
                      <input
                        type="text"
                        placeholder="Titolo scheda"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        autoFocus
                        className="w-full text-xs font-medium px-2 py-1.5 border border-slate-200 rounded outline-none focus:border-indigo-500 text-slate-900 mb-2"
                      />
                      <textarea
                        placeholder="Dettagli scheda"
                        rows={2}
                        value={newDetails}
                        onChange={(e) => setNewDetails(e.target.value)}
                        className="w-full text-xs text-slate-700 px-2 py-1.5 border border-slate-200 rounded outline-none focus:border-indigo-500 resize-none mb-3"
                      />
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setActiveNewCardColumnId(null)}
                          className="text-xs px-2.5 py-1 text-slate-500 hover:text-slate-800 font-medium"
                        >
                          Annulla
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddCard(col.id)}
                          className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded shadow-2xs transition-colors"
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
                      className="w-full flex items-center justify-center space-x-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-white transition-colors mt-auto"
                    >
                      <Plus size={14} />
                      <span>Aggiungi scheda</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {isAddingColumn ? (
            <div className="w-80 shrink-0 rounded-xl border border-indigo-500 bg-white p-3.5 shadow-xs">
              <h4 className="text-xs font-semibold text-slate-900 mb-2">Aggiungi colonna</h4>
              <input
                type="text"
                placeholder="Nome della colonna"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddColumn();
                  if (e.key === 'Escape') setIsAddingColumn(false);
                }}
                autoFocus
                className="w-full text-xs font-medium px-2 py-1.5 border border-slate-200 rounded outline-none focus:border-indigo-500 text-slate-900 mb-3"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="text-xs px-2.5 py-1 text-slate-500 hover:text-slate-800 font-medium"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded shadow-2xs transition-colors"
                >
                  Salva colonna
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingColumn(true)}
              className="w-80 shrink-0 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-white flex items-center justify-center space-x-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-all"
            >
              <Plus size={16} />
              <span>Aggiungi un'altra colonna</span>
            </button>
          )}
        </div>
      </main>

      {/* Modale di eliminazione */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-start space-x-3">
              <div className="rounded-full bg-rose-50 p-2 text-rose-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {confirmDelete.type === 'column' ? 'Elimina colonna' : 'Elimina scheda'}
                </h3>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  Sei sicuro di voler eliminare <span className="font-semibold text-slate-900">"{confirmDelete.name}"</span>?
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end space-x-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-medium text-white shadow-2xs"
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