import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ShareModal({ activeBoard, currentUserEmail, onClose }) {
  const [emailToInvite, setEmailToInvite] = useState('');
  const [selectedRole, setSelectedRole] = useState('editor');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeBoard) fetchMembers();
  }, [activeBoard]);

  const fetchMembers = async () => {
    try {
      // Recupera i membri dalla tabella board_members legati al loro email se disponibile
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

  // INVITARE UN NUOVO COLLABORATORE
  const handleInvite = async () => {
    if (!emailToInvite.trim()) return;
    if (emailToInvite.trim().toLowerCase() === currentUserEmail.toLowerCase()) {
      alert('Non puoi invitare te stesso.');
      return;
    }

    setLoading(true);
    try {
      // 1. Cerca l'user_id dell'utente invitato tramite la vista/tabella degli utenti o inserisci l'invito
      const newMember = {
        id: `bm-${Date.now()}`,
        board_id: activeBoard.id,
        invited_email: emailToInvite.trim().toLowerCase(),
        role: selectedRole
      };

      const { data, error } = await supabase
        .from('board_members')
        .insert([newMember])
        .select();

      if (error) throw error;

      setMembers((prev) => [...prev, data[0]]);
      setEmailToInvite('');
      alert('Collaboratore aggiunto con successo!');
    } catch (err) {
      alert('Errore invito: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // CAMBIARE PRIVILEGIO (EDITOR / VIEWER) IN TEMPO REALE
  const handleRoleChange = async (memberId, newRole) => {
    try {
      // Aggiornamento ottimistico locale
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );

      const { error } = await supabase
        .from('board_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
    } catch (err) {
      alert('Errore aggiornamento ruolo: ' + err.message);
      fetchMembers(); // Rollback in caso di errore
    }
  };

  // RIMUOVERE COLLABORATORE
  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Sei sicuro di voler rimuovere questo collaboratore?')) return;

    try {
      const { error } = await supabase
        .from('board_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      alert('Errore rimozione: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-3 z-50 text-xs">
      <div className="bg-white border rounded-xl w-full max-w-lg p-5 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-sm text-slate-800">
            Condividi su {activeBoard?.title}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
            ✕
          </button>
        </div>

        {/* FORM DI INVITO */}
        <div className="flex gap-2 mb-5">
          <input
            type="email"
            placeholder="email@collega.com"
            value={emailToInvite}
            onChange={(e) => setEmailToInvite(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
          />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition"
          >
            {loading ? '...' : 'Invita'}
          </button>
        </div>

        {/* LISTA COLLABORATORI ATTIVI */}
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Collaboratori Attivi ({members.length})
          </h4>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {members.length === 0 ? (
              <p className="text-slate-400 italic text-xs py-2">Nessun collaboratore condiviso.</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-lg"
                >
                  <span className="font-medium text-slate-700 text-xs truncate max-w-[200px]">
                    {member.invited_email || member.user_email || 'Utente'}
                  </span>

                  <div className="flex items-center gap-3">
                    {/* SELETTORE RUOLO IN TEMPO REALE */}
                    <select
                      value={member.role || 'viewer'}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-xs bg-white font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>

                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-500 hover:text-red-700 font-medium text-xs hover:underline"
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
    </div>
  );
}