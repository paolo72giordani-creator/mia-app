import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // assicurati che il percorso sia corretto

// --- BREVO CONFIG ---
const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY || '';

export default function App() {
  // Stati principali
  const [session, setSession] = useState(null);
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Stati Pop-up Condivisione
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [activeBoardMembers, setActiveBoardMembers] = useState([]);

  // Stato Drag & Drop
  const [draggedBoardIndex, setDraggedBoardIndex] = useState(null);

  // --- 1. CARICAMENTO BACHECHE E PROPRIETARIO ---
  const fetchBoards = async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      // Bacheche proprietario
      const { data: ownedBoards, error: ownedErr } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', session.user.id);

      if (ownedErr) throw ownedErr;

      // Inviti ricevuti
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

      // Arricchimento con il flag isOwner e recupero della mail del proprietario per quelle condivise
      const formattedOwned = (ownedBoards || []).map((b) => ({
        ...b,
        isOwner: true,
        ownerEmail: session.user.email
      }));

      const formattedShared = await Promise.all(
        sharedBoardsList.map(async (b) => {
          // Recupera l'email del proprietario della bacheca se non siamo noi
          const { data: ownerData } = await supabase
            .rpc('get_user_email_by_id', { p_user_id: b.user_id })
            .single();

          return {
            ...b,
            isOwner: false,
            ownerEmail: ownerData || 'Proprietario'
          };
        })
      );

      const combined = [...formattedOwned, ...formattedShared];
      setBoards(combined);
    } catch (err) {
      console.error('Errore caricamento bacheche:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. RECUPERO MEMBRI ATTIVI CON EMAIL NEL POPUP ---
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

  // --- 3. GESTIONE INVITO & NOTIFICA DOCEO KANBAN ---
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

      // Notifica Brevo Rebrand "Doceo Kanban"
      sendEmailNotification(emailToInvite, activeBoardObj?.title || 'Doceo Kanban', roleLabel);

      setInviteSuccess(`Invito inviato con successo a ${emailToInvite}!`);
      setInviteEmail('');
      fetchBoardMembers(activeBoardId);
    } catch (err) {
      setInviteError(err.message || 'Impossibile aggiungere il collaboratore.');
    }
  };

  // --- 4. CAMBIO RUOLO & RIMOZIONE COLLABORATORE ---
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
      alert('Errore durante l\'aggiornamento del ruolo.');
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Sei sicuro di voler rimuovere questo collaboratore?')) return;
    try {
      const { error } = await supabase.rpc('remove_board_member', {
        p_board_id: activeBoardId,
        p_target_user_id: targetUserId
      });
      if (error) throw error;
      fetchBoardMembers(activeBoardId);
    } catch (err) {
      alert('Errore durante la rimozione del collaboratore.');
    }
  };

  // --- 5. NOTIFICA EMAIL BREVO ---
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
      console.error('Errore invio mail Brevo:', err);
    }
  };

  // --- 6. DRAG AND DROP BACHECHE ---
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* HEADER PRINCIPALE */}
      <header className="border-b border-slate-800 bg-slate-950/80 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center flex-shrink-0 justify-center font-bold text-white shadow-lg shadow-blue-500/30">
            DK
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Doceo Kanban</h1>
        </div>
        {session && (
          <div className="text-sm text-slate-400">
            Connesso come <span className="text-blue-400 font-medium">{session.user.email}</span>
          </div>
        )}
      </header>

      {/* CONTENUTO DASHBOARD / BACHECA */}
      <main className="p-6 max-w-7xl mx-auto">
        {!activeBoardId ? (
          /* VISTA DASHBOARD */
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
              Le Mie Bacheche
            </h2>

            {/* GRIGLIA BACHECHE CON DRAG & DROP */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boards.map((board, index) => (
                <div
                  key={board.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => setActiveBoardId(board.id)}
                  className={`cursor-pointer rounded-xl p-5 border-2 transition-all duration-200 bg-slate-800/80 hover:bg-slate-800 shadow-lg relative ${
                    board.isOwner
                      ? 'border-blue-500/80 hover:border-blue-400 hover:shadow-blue-500/10'
                      : 'border-amber-500/80 hover:border-amber-400 hover:shadow-amber-500/10'
                  }`}
                >
                  {/* BADGE TIPO BACHECA */}
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        board.isOwner
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {board.isOwner ? 'Proprietario' : 'Condivisa'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2">{board.title}</h3>

                  {/* PROPRIETARIO DELLA BACHECA */}
                  <p className="text-xs text-slate-400 mt-4 flex items-center gap-1">
                    👤 Proprietario: <span className="text-slate-300 font-medium">{board.ownerEmail}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* VISTA DETTAGLIO BACHECA ATTIVA */
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <button
                  onClick={() => setActiveBoardId(null)}
                  className="text-xs text-slate-400 hover:text-white mb-1 inline-block"
                >
                  ← Torna alla Dashboard Doceo Kanban
                </button>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  {boards.find((b) => b.id === activeBoardId)?.title}
                  {/* Badge proprietario */}
                  <span className="text-xs font-normal text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                    Proprietario: {boards.find((b) => b.id === activeBoardId)?.ownerEmail}
                  </span>
                </h2>
              </div>

              <button
                onClick={() => {
                  setIsShareModalOpen(true);
                  fetchBoardMembers(activeBoardId);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-lg transition"
              >
                Condividi Bacheca
              </button>
            </div>
          </div>
        )}

        {/* POP-UP CONDIVISIONE E GESTIONE MEMBRI */}
        {isShareModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl text-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Condividi su Doceo Kanban</h3>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="text-slate-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              {/* FORM INVITO */}
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  placeholder="email.collega@esempio.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm flex-1 text-white focus:outline-none focus:border-blue-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Visualizzatore</option>
                </select>
                <button
                  onClick={handleInviteUser}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-lg"
                >
                  Invita
                </button>
              </div>

              {inviteError && <p className="text-red-400 text-xs mb-3">{inviteError}</p>}
              {inviteSuccess && <p className="text-green-400 text-xs mb-3">{inviteSuccess}</p>}

              {/* LISTA COLLABORATORI ATTIVI */}
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-6">
                Collaboratori Attivi ({activeBoardMembers.length})
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activeBoardMembers.map((member) => (
                  <div
                    key={member.member_id}
                    className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/50"
                  >
                    <span className="text-sm font-medium text-slate-200">{member.email}</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded text-xs px-2 py-1 text-slate-300"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Visualizzatore</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30"
                      >
                        Rimuovi
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}