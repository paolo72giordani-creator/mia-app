import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ShareModal({ activeBoard, currentUserEmail, onClose }) {
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('editor');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeBoard) fetchMembers();
  }, [activeBoard]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('board_members')
        .select('*')
        .eq('board_id', activeBoard.id);

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Errore recupero membri:', err.message);
    }
  };

  const sendBrevoEmail = async (targetEmail, isRegistered) => {
    const brevoApiKey = import.meta.env.VITE_BREVO_API_KEY;
    if (!brevoApiKey) {
      console.warn('VITE_BREVO_API_KEY non trovata nelle variabili d’ambiente.');
      return;
    }

    const subject = isRegistered
      ? `Invito alla bacheca "${activeBoard.title}" su Doceo Kanban`
      : `Invito a unirti a Doceo Kanban - Bacheca "${activeBoard.title}"`;

    const roleText = selectedRole === 'editor' ? 'Editor' : 'Visualizzatore';

    const htmlContent = isRegistered
      ? `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>Ciao! 👋</h2>
          <p><strong>${currentUserEmail}</strong> ti ha invitato a collaborare alla bacheca <strong>"${activeBoard.title}"</strong> con il ruolo di <em>${roleText}</em>.</p>
          <p style="margin-top: 20px;">
            <a href="https://doceokanban.vercel.app" style="background-color: #2563eb; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Accedi a Doceo Kanban
            </a>
          </p>
        </div>
      `
      : `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
          <h2>Benvenuto su Doceo Kanban! 🚀</h2>
          <p><strong>${currentUserEmail}</strong> ti ha invitato a collaborare sulla bacheca <strong>"${activeBoard.title}"</strong>.</p>
          <p>Non risulti ancora registrato sulla piattaforma. Per accettare l'invito e accedere alla bacheca, crea un account usando questa email (<em>${targetEmail}</em>).</p>
          <p style="margin-top: 20px;">
            <a href="https://doceokanban.vercel.app" style="background-color: #2563eb; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Registrati ora
            </a>
          </p>
        </div>
      `;

    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoApiKey
        },
        // Sostituisci la sezione del body della fetch con questa:
body: JSON.stringify({
  // IMPORTANTE: 'email' deve essere l'email con cui sei registrato su Brevo (o un mittente verificato su Brevo)
  sender: { name: 'Doceo Kanban', email: 'tua_email_registrata_su_brevo@gmail.com' },
  replyTo: { email: currentUserEmail },
  to: [{ email: targetEmail }],
  subject: subject,
  htmlContent: htmlContent
})
      });
    } catch (err) {
      console.error('Errore durante l\'invio email con Brevo:', err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setLoading(true);
    try {
      const emailToInvite = inviteEmail.trim().toLowerCase();

      // 1. Inserisci/Aggiorna il membro nella tabella board_members
      const { error } = await supabase.from('board_members').upsert([
        {
          board_id: activeBoard.id,
          invited_email: emailToInvite,
          role: selectedRole
        }
      ]);

      if (error) throw error;

      // 2. Verifica se l'utente esiste già nella lista dei membri o del sistema
      const isAlreadyMember = members.some(m => m.invited_email?.toLowerCase() === emailToInvite);

      // 3. Invio email transazionale tramite Brevo
      await sendBrevoEmail(emailToInvite, isAlreadyMember);

      setInviteEmail('');
      alert(`Invito inviato con successo a ${emailToInvite}!`);
      fetchMembers();
    } catch (err) {
      alert('Errore durante l\'invito: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Sei sicuro di voler rimuovere questo membro?')) return;
    try {
      const { error } = await supabase.from('board_members').delete().eq('id', memberId);
      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      alert('Errore eliminazione membro: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-slate-900">
            Condividi "{activeBoard?.title}"
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* FORM INVITO */}
        <form onSubmit={handleAddMember} className="space-y-3 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Email utente da invitare
            </label>
            <input
              type="email"
              required
              placeholder="collega@scuola.it"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-between items-center gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ruolo
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="editor">Editor (Modifica)</option>
                <option value="viewer">Viewer (Sola lettura)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow-sm"
            >
              {loading ? 'Invio...' : 'Invita'}
            </button>
          </div>
        </form>

        {/* LISTA MEMBRI INVITA TRAMITE EMAIL */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 mb-2">
            Membri con accesso ({members.length})
          </h3>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {members.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nessun utente invitato finora.</p>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="flex justify-between items-center bg-slate-50 border p-2.5 rounded-lg text-xs"
                >
                  <div className="truncate pr-2">
                    <p className="font-bold text-slate-800 truncate">{m.invited_email}</p>
                    <span className="text-[10px] text-slate-500 capitalize">Ruolo: {m.role}</span>
                  </div>

                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-slate-400 hover:text-red-600 font-bold text-xs p-1"
                    title="Rimuovi accesso"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}