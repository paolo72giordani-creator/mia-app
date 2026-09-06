import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { sendEmailNotification } from '../services/brevoApi';

export default function ShareModal({ activeBoard, currentUserEmail, onClose }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (activeBoard) fetchBoardMembers();
  }, [activeBoard]);

  const fetchBoardMembers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_board_members_with_emails', {
        p_board_id: activeBoard.id
      });
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvite = async () => {
    setError('');
    setSuccess('');
    const targetEmail = inviteEmail.trim().toLowerCase();
    if (!targetEmail) return setError('Inserisci un email valida.');

    try {
      const { error } = await supabase.rpc('invite_user_to_board', {
        p_board_id: String(activeBoard.id),
        p_email: targetEmail,
        p_role: inviteRole
      });
      if (error) throw error;

      await sendEmailNotification(targetEmail, activeBoard.title, inviteRole, currentUserEmail);
      setSuccess(`Invito inviato a ${targetEmail}!`);
      setInviteEmail('');
      fetchBoardMembers();
    } catch (err) {
      setError(err.message || 'Impossibile inviare invito.');
    }
  };

  const handleUpdateRole = async (targetUserId, newRole) => {
    try {
      const { error } = await supabase
        .from('board_members')
        .update({ role: newRole })
        .eq('board_id', activeBoard.id)
        .eq('user_id', targetUserId);

      if (error) throw error;
      fetchBoardMembers();
    } catch (err) {
      alert('Errore aggiornamento ruolo.');
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!window.confirm('Rimuovere questo collaboratore?')) return;
    try {
      const { error } = await supabase.rpc('remove_board_member', {
        p_board_id: activeBoard.id,
        p_target_user_id: targetUserId
      });
      if (error) throw error;
      fetchBoardMembers();
    } catch (err) {
      alert('Errore durante la rimozione.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 flex items-center justify-center p-3 z-50 text-xs">
      <div className="bg-white border rounded-xl w-full max-w-md p-4 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm text-slate-800">Condividi su Doceo Kanban</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        <div className="flex gap-1.5 mb-3">
          <input
            type="email"
            placeholder="email@collega.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="border rounded px-2 py-1 text-xs flex-1 focus:outline-none focus:border-blue-500"
          />
          <select 
            value={inviteRole} 
            onChange={(e) => setInviteRole(e.target.value)}
            className="border rounded px-1.5 py-1 text-xs bg-white"
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button onClick={handleInvite} className="bg-blue-600 text-white px-3 py-1 rounded font-medium">
            Invita
          </button>
        </div>

        {error && <p className="text-red-500 text-[10px] mb-2">{error}</p>}
        {success && <p className="text-green-600 text-[10px] mb-2">{success}</p>}

        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 mt-4">
          Collaboratori Attivi ({members.length})
        </h4>

        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic">Nessun collaboratore.</p>
          ) : (
            members.map((member) => (
              <div key={member.member_id} className="flex justify-between items-center bg-slate-50 p-2 rounded border">
                <span className="text-slate-700 font-medium">{member.email}</span>
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                    className="border rounded px-1 py-0.5 text-[10px] bg-white"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button 
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="text-red-500 hover:text-red-700 font-medium text-[10px]"
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
  );
}