import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function CardDetailModal({ card, onClose, onUpdateCard, onDeleteCard }) {
  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || '');
  const [attachments, setAttachments] = useState(card?.attachments || []);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAttachments();
  }, [card.id]);

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('card_id', card.id);
      if (!error) setAttachments(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('cards')
        .update({ title, description })
        .eq('id', card.id);

      if (error) throw error;
      onUpdateCard({ ...card, title, description, attachments });
      onClose();
    } catch (err) {
      alert('Errore salvataggio: ' + err.message);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${card.id}/${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('card-attachments')
        .upload(filePath, file);

      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = supabase.storage
        .from('card-attachments')
        .getPublicUrl(filePath);

      const newAttachment = {
        id: `att-${Date.now()}`,
        card_id: card.id,
        file_name: file.name,
        file_url: publicUrlData.publicUrl
      };

      const { data, error: attErr } = await supabase
        .from('attachments')
        .insert([newAttachment])
        .select();

      if (attErr) throw attErr;

      setAttachments([...attachments, data[0]]);
    } catch (err) {
      alert('Errore caricamento allegato: ' + err.message);
    } finally {
      setUploading(false);
    }
  };
  
  const newAttachment = {
        id: `att-${Date.now()}`,
        card_id: card.id,
        user_id: supabase.auth.getUser()?.id, // Traccia l'utente proprietario
        file_name: file.name,
        file_url: publicUrlData.publicUrl
      };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-3 z-50 text-xs">
      <div className="bg-white border rounded-xl w-full max-w-lg p-4 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm text-slate-800">Dettagli Scheda</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        {/* NOME SCHEDA */}
        <div className="mb-3">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Titolo</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* DESCRIZIONE */}
        <div className="mb-3">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Descrizione / Note</label>
          <textarea
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Aggiungi una descrizione più dettagliata..."
            className="w-full border rounded p-2 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* ALLEGATI */}
        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Allegati</label>
          <div className="space-y-1 mb-2">
            {attachments.map((att) => (
              <div key={att.id} className="flex justify-between items-center bg-slate-50 p-1.5 rounded border text-[11px]">
                <span className="truncate max-w-[200px] font-medium text-slate-700">{att.file_name}</span>
                <a href={att.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  Apri ↗
                </a>
              </div>
            ))}
          </div>

          <label className="inline-block bg-slate-100 hover:bg-slate-200 border text-slate-700 px-2.5 py-1 rounded cursor-pointer font-medium text-[11px]">
            {uploading ? 'Caricamento...' : '+ Aggiungi Allegato'}
            <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
        </div>

        {/* AZIONI */}
        <div className="flex justify-between items-center pt-2 border-t">
          <button
            onClick={() => {
              if (window.confirm('Cancellare questa scheda?')) onDeleteCard(card.id);
            }}
            className="text-red-600 hover:underline text-[11px] font-medium"
          >
            Elimina Scheda
          </button>
          <div className="flex gap-1.5">
            <button onClick={onClose} className="border px-3 py-1 rounded text-slate-600">Annulla</button>
            <button onClick={handleSave} className="bg-blue-600 text-white px-3 py-1 rounded font-medium">Salva</button>
          </div>
        </div>
      </div>
    </div>
  );
}