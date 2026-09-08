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

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const { error } = await supabase
        .from('board_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      console.error('Errore modifica ruolo:', err.message);
      alert('Errore durante l\'aggiornamento del ruolo: ' + err.message);
    }
  };

  const sendBrevoEmail = async (targetEmail) => {
    const brevoApiKey = import.meta.env.VITE_BREVO_API_KEY;

    if (!brevoApiKey) {
      alert('ATTENZIONE: VITE_BREVO_API_KEY non è configurata nelle variabili d’ambiente!');
      return;
    }

    const subject = `Sei stato invitato alla bacheca "${activeBoard.title}" su Doceo Kanban`;
    const roleText = selectedRole === 'editor' ? 'Editor (Modifica)' : 'Visualizzatore (Sola lettura)';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
        <h2 style="color: #0f172a; margin-top: 0;">Ciao! 👋</h2>
        <p style="font-size: 15px; line-height: 1.6;">
          <strong>${currentUserEmail}</strong> ti ha invitato a collaborare alla bacheca <strong>"${activeBoard.title}"</strong> su Doceo Kanban con il ruolo di <em>${roleText}</em>.
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="https://doceokanban.vercel.app" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
            Apri la bacheca in Doceo Kanban
          </a>
        </div>
        <p style="font-size: 12px; color: #64748b; line-height: 1.5; border-t: 1px solid #f1f5f9; padding-top: 16px;">
          Se sei già registrato, effettua l'accesso per visualizzarla. Se non possiedi ancora un account, puoi registrarti gratuitamente sull'app con l'indirizzo email <strong>${targetEmail}</strong> per accedere direttamente alla bacheca condivisa.
        </p>
      </div>
    `;

    try {
      const verifiedBrevoSender = 'paolo72.giordani@gmail.com';

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoApiKey
        },
        body: JSON.stringify({
          sender: { name: 'Doceo Kanban', email: verifiedBrevoSender },
          replyTo: { email: currentUserEmail },
          to: [{ email: targetEmail }],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        console.error('Errore da Brevo API:', resData);
        alert(`Errore invio mail Brevo: ${resData.message || JSON.stringify(resData)}`);
      } else {
        console.log('Email inviata con successo via Brevo:', resData);
      }
    } catch (err) {
      console.error('Errore durante l\'invio email:', err);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setLoading(true);
    try {
      const emailToInvite = inviteEmail.trim().toLowerCase();

      const { error } = await supabase.from('board_members').upsert([
        {
          board_id: activeBoard.id,
          invited_email: emailToInvite,
          role: selectedRole
        }
      ]);

      if (error) throw error;

      await sendBrevoEmail(emailToInvite);

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

        {/* LISTA MEMBRI CON CAMBIO RUOLO DINAMICO */}
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
                    <p className="font-bold text-slate-800 truncate mb-1">{m.invited_email}</p>
                    
                    {/* MENU A TENDINA PER MODIFICARE IL RUOLO */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">Ruolo:</span>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
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