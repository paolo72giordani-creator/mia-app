import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY || '';

export default function App() {
  const [session, setSession] = useState(null);
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stati Auth (Email / Password)
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  // Stati Modale Condivisione
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [activeBoardMembers, setActiveBoardMembers] = useState([]);

  // Stati Form Colonne e Schede
  const [newColumnName, setNewColumnName] = useState('');
  const [newCardTitles, setNewCardTitles] = useState({});

  // Drag & Drop Dashboard
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
    if (session) {
      fetchBoards();
    }
  }, [session]);

  useEffect(() => {
    if (activeBoardId) {
      fetchBoardData(activeBoardId);
    }
  }, [activeBoardId]);

  // GESTIONE AUTENTICAZIONE EMAIL / PASSWORD
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');

    if (!authEmail || !authPassword) {
      setAuthError('Inserisci sia email che password.');
      return;
    }

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword
        });
        if (error) throw error;
        setAuthMessage('Registrazione completata! Controlla la tua email per la conferma o effettua il login.');
      }
    } catch (err) {
      setAuthError(err.message || 'Errore durante l\'autenticazione.');
    }
  };

  // 1. CARICAMENTO BACHECHE
  const fetchBoards = async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const { data: ownedBoards, error: ownedErr } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', session.user.id);

      if (ownedErr) throw ownedErr;

      const { data: memberEntries, error: memberErr } = await supabase
        .from('board_members')
        .select('board_id, role')
        .eq('user_id', session.user.id);

      if (memberErr) throw memberErr;

      let sharedBoardsList = [];
      if (memberEntries && memberEntries.length > 0) {
        const sharedBoardIds = memberEntries.map((m) => m.board_id);
        const { data: shared, error: sharedErr } = await supabase
          .from('boards')
          .select('*')
          .in('id', sharedBoardIds);

        if (sharedErr) throw sharedErr;
        sharedBoardsList = shared || [];
      }

      const formattedOwned = (ownedBoards || []).map((b) => ({
        ...b,
        isOwner: true,
        ownerEmail: session.user.email
      }));

      const formattedShared = (sharedBoardsList || []).map((b) => ({
        ...b,
        isOwner: false,
        ownerEmail: 'Altro Utente'
      }));

      setBoards([...formattedOwned, ...formattedShared]);
    } catch (err) {
      console.error('Errore caricamento bacheche:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. CARICAMENTO COLONNE E SCHEDE
  const fetchBoardData = async (boardId) => {
    try {
      const { data: cols, error: colErr } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true });

      if (colErr) throw colErr;
      setColumns(cols || []);

      const { data: crds, error: cardErr } = await supabase
        .from('cards')
        .select('*, attachments(*)')
        .eq('board_id', boardId)
        .order('position', { ascending: true });

      if (cardErr) throw cardErr;
      setCards(crds || []);
    } catch (err) {
      console.error('Errore dati bacheca:', err.message);
    }
  };

  // 3. CREAZIONE COLONNA E SCHEDA
  const handleAddColumn = async () => {
    if (!newColumnName.trim() || !activeBoardId) return;
    try {
      const newCol = {
        id: `col-${Date.now()}`,
        user_id: session.user.id,
        board_id: activeBoardId,
        name: newColumnName.trim(),
        position: columns.length
      };

      const { data, error } = await supabase.from('columns').insert([newCol]).select();
      if (error) throw error;
      setColumns([...columns, ...data]);
      setNewColumnName('');
    } catch (err) {
      alert('Errore creazione colonna: ' + err.message);
    }
  };

  const handleAddCard = async (columnId) => {
    const title = newCardTitles[columnId]?.trim();
    if (!title || !activeBoardId) return;

    try {
      const colCards = cards.filter((c) => c.column_id === columnId);
      const newCard = {
        id: `card-${Date.now()}`,
        user_id: session.user.id,
        board_id: activeBoardId,
        column_id: columnId,
        title: title,
        position: colCards.length
      };

      const { data, error } = await supabase.from('cards').insert([newCard]).select();
      if (error) throw error;
      setCards([...cards, { ...data[0], attachments: [] }]);
      setNewCardTitles({ ...newCardTitles, [columnId]: '' });
    } catch (err) {
      alert('Errore creazione scheda: ' + err.message);
    }
  };

  // 4. GESTIONE CONDIVISIONE E MEMBRI
  const fetchBoardMembers = async (boardId) => {
    try {
      const { data, error } = await supabase.rpc('get_board_members_with_emails', {
        p_board_id: boardId
      });
      if (error) throw error;
      setActiveBoardMembers(data || []);
    } catch (err) {
      console.error('Errore recupero membri:', err);
    }
  };

  const handleInviteUser = async () => {
    setInviteError('');
    setInviteSuccess('');
    const emailToInvite = inviteEmail.trim().toLowerCase();

    if (!emailToInvite) {
      setInviteError('Inserisci un indirizzo email valido.');
      return;
    }

    if (emailToInvite === session?.user?.email?.toLowerCase()) {
      setInviteError('Sei già il proprietario di questa bacheca.');
      return;
    }

    try {
      const { error } = await supabase.rpc('invite_user_to_board', {
        p_board_id: String(activeBoardId),
        p_email: emailToInvite,
        p_role: inviteRole
      });

      if (error) throw error;

      const activeBoardObj = boards.find((b) => b.id === activeBoardId);
      const roleLabel = inviteRole === 'editor' ? 'Editor' : 'Visualizzatore';

      sendEmailNotification(emailToInvite, activeBoardObj?.title || 'Doceo Kanban', roleLabel);

      setInviteSuccess(`Invito inviato a ${emailToInvite}!`);
      setInviteEmail('');
      fetchBoardMembers(activeBoardId);
    } catch (err) {
      setInviteError(err.message || 'Impossibile aggiungere il collaboratore.');
    }
  };

  const handleUpdateRole = async (targetUserId, newRole) => {
    try {
      const { error } = await supabase
        .from('board_members')
        .update({ role: newRole })
        .eq('board_id', activeBoardId)
        .eq('user_id', targetUserId);

      if (error) throw error;
      fetchBoardMembers(activeBoardId);
    } catch (err) {
      alert('Errore aggiornamento ruolo.');
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Rimuovere questo collaboratore?')) return;
    try {
      const { error } = await supabase.rpc('remove_board_member', {
        p_board_id: activeBoardId,
        p_target_user_id: targetUserId
      });
      if (error) throw error;
      fetchBoardMembers(activeBoardId);
    } catch (err) {
      alert('Errore rimozione collaboratore.');
    }
  };

  const sendEmailNotification = async (recipientEmail, boardTitle, roleName) => {
    if (!BREVO_API_KEY) return;
    const senderUserEmail = session?.user?.email || 'Un utente';

    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { 
            name: `Doceo Kanban (${senderUserEmail})`, 
            email: "paolo72.giordani@gmail.com" 
          },
          replyTo: { email: senderUserEmail },
          to: [{ email: recipientEmail }],
          subject: `${senderUserEmail} ti ha invitato su Doceo Kanban: "${boardTitle}"`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #2563eb;">Doceo Kanban</h2>
              <p>L'utente <strong>${senderUserEmail}</strong> ti ha invitato a collaborare sulla bacheca <strong>"${boardTitle}"</strong> come <strong>${roleName}</strong>.</p>
            </div>
          `
        })
      });
    } catch (err) {
      console.error('Errore invio Brevo:', err);
    }
  };

  // 5. DRAG & DROP DASHBOARD
  const handleDragStart = (e, index) => {
    setDraggedBoardIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedBoardIndex === null || draggedBoardIndex === index) return;

    const updatedBoards = [...boards];
    const draggedItem = updatedBoards[draggedBoardIndex];
    updatedBoards.splice(draggedBoardIndex, 1);
    updatedBoards.splice(index, 0, draggedItem);

    setDraggedBoardIndex(index);
    setBoards(updatedBoards);
  };

  const handleDragEnd = () => {
    setDraggedBoardIndex(null);
  };

  // SCHERMATA LOGIN / REGISTRAZIONE (TEMA CHIARO)
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-800 p-4">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-sm w-full shadow-xl">
          <div className="text-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/30 mx-auto mb-3 text-lg">
              DK
            </div>
            <h1 className="text-2xl font-bold text-blue-600">Doceo Kanban</h1>
            <p className="text-xs text-slate-500 mt-1">
              {authMode === 'login' ? 'Accedi al tuo account' : 'Crea un nuovo account'}
            </p>
          </div>

          {/* FORM EMAIL E PASSWORD */}
          <form onSubmit={handleEmailAuth} className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input
                type="email"
                placeholder="nome@esempio.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            {authError && <p className="text-red-600 text-xs font-medium">{authError}</p>}
            {authMessage && <p className="text-green-600 text-xs font-medium">{authMessage}</p>}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition text-sm shadow-md shadow-blue-500/20"
            >
              {authMode === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          </form>

          <div className="flex items-center gap-2 my-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-xs text-slate-400 uppercase font-semibold">oppure</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          {/* LOGIN CON GOOGLE */}
          <button
            onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium py-2 rounded-lg text-sm transition flex items-center justify-center gap-2"
          >
            Accedi con Google
          </button>

          {/* SWITCH LOGIN / REGISTRAZIONE */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthError('');
                setAuthMessage('');
              }}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              {authMode === 'login'
                ? 'Non hai un account? Registrati'
                : 'Hai già un account? Accedi'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeBoard = boards.find((b) => b.id === activeBoardId);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/30">
            DK
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Doceo Kanban</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500">
            <span className="text-blue-600 font-medium">{session.user.email}</span>
          </span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md border border-slate-300 transition"
          >
            Esci
          </button>
        </div>
      </header>

      {/* CONTENUTO */}
      <main className="p-6 max-w-7xl mx-auto">
        {!activeBoardId ? (
          /* DASHBOARD TEMA CHIARO */
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Le Mie Bacheche</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boards.map((board, index) => (
                <div
                  key={board.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveBoardId(board.id)}
                  className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 bg-white shadow-sm hover:shadow-md relative ${
                    board.isOwner
                      ? 'border-blue-500 hover:border-blue-600'
                      : 'border-orange-500 hover:border-orange-600'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                        board.isOwner
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}
                    >
                      {board.isOwner ? 'Proprietario' : 'Condivisa con me'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-4">{board.title}</h3>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                    <span>👤 Proprietario: <strong className="text-slate-700">{board.ownerEmail}</strong></span>
                    <span className="text-blue-600 font-medium">Apri →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* DETTAGLIO BACHECA TEMA CHIARO */
          <div>
            <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div>
                <button
                  onClick={() => setActiveBoardId(null)}
                  className="text-xs text-blue-600 hover:underline mb-1 inline-block font-medium"
                >
                  ← Torna alla Dashboard Doceo Kanban
                </button>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  {activeBoard?.title}
                  <span className="text-xs font-normal text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    Proprietario: {activeBoard?.ownerEmail}
                  </span>
                </h2>
              </div>

              <button
                onClick={() => {
                  setIsShareModalOpen(true);
                  fetchBoardMembers(activeBoardId);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition shadow-sm"
              >
                Condividi Bacheca
              </button>
            </div>

            {/* AREA COLONNE KANBAN */}
            <div className="flex gap-6 overflow-x-auto pb-6 items-start">
              {columns.map((col) => {
                const colCards = cards.filter((c) => c.column_id === col.id);

                return (
                  <div
                    key={col.id}
                    className="w-72 bg-slate-200/70 border border-slate-300/80 rounded-xl p-4 flex-shrink-0 shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-slate-800 text-sm">{col.name}</h3>
                      <span className="text-xs text-slate-500 font-semibold bg-slate-300/60 px-2 py-0.5 rounded-full">
                        {colCards.length}
                      </span>
                    </div>

                    {/* LISTA SCHEDE */}
                    <div className="space-y-3 mb-3 min-h-[50px]">
                      {colCards.map((card) => (
                        <div
                          key={card.id}
                          className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm hover:shadow transition"
                        >
                          <p className="text-sm font-medium text-slate-800">{card.title}</p>
                        </div>
                      ))}
                    </div>

                    {/* AGGIUNGI SCHEDA */}
                    <div className="flex gap-2 pt-2 border-t border-slate-300/60">
                      <input
                        type="text"
                        placeholder="Nuova scheda..."
                        value={newCardTitles[col.id] || ''}
                        onChange={(e) =>
                          setNewCardTitles({ ...newCardTitles, [col.id]: e.target.value })
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCard(col.id)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleAddCard(col.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded font-medium"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* FORM NUOVA COLONNA */}
              <div className="w-72 bg-white border-2 border-dashed border-slate-300 rounded-xl p-4 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Nome nuova colonna..."
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-sm mb-2 text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleAddColumn}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs py-2 rounded-lg transition"
                >
                  + Aggiungi Colonna
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE CONDIVISIONE */}
        {isShareModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Condividi su Doceo Kanban</h3>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  placeholder="email.collega@esempio.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm flex-1 text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Visualizzatore</option>
                </select>
                <button
                  onClick={handleInviteUser}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition"
                >
                  Invita
                </button>
              </div>

              {inviteError && <p className="text-red-600 text-xs mb-3">{inviteError}</p>}
              {inviteSuccess && <p className="text-green-600 text-xs mb-3">{inviteSuccess}</p>}

              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-6">
                Collaboratori Attivi ({activeBoardMembers.length})
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeBoardMembers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nessun collaboratore aggiunto.</p>
                ) : (
                  activeBoardMembers.map((member) => (
                    <div
                      key={member.member_id}
                      className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                    >
                      <span className="text-sm font-medium text-slate-700">{member.email}</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                          className="bg-white border border-slate-300 rounded text-xs px-2 py-1 text-slate-700"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Visualizzatore</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-red-600 hover:text-red-700 text-xs px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 font-medium"
                        >
                          Rimuovi
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}