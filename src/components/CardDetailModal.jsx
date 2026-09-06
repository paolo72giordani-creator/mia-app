import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function CardDetailModal({ card, columnId, isViewer = false, onClose, onSaveCard, onDeleteCard }) {
  const isNew = !card?.id;
  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || '');
  const [attachments, setAttachments] = useState(card?.attachments || []);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (card?.id) fetchAttachments();
  }, [card?.id]);

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

  const handleFileUpload = async (e) => {
    if (isViewer) return;
    const file = e.target.files[0];
    if (!file) return;

    if (isNew) {
      setPendingFiles((prev) => [...prev, file]);
    } else {
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

        const { data: { session } } = await supabase.auth.getSession();

        const newAttachment = {
          id: `att-${Date.now()}`,
          card_id: card.id,
          user_id: session?.user?.id || null,
          file_name: file.name,
          file_url: publicUrlData.publicUrl
        };

        const { data, error: attErr } = await supabase
          .from('attachments')
          .insert([newAttachment])
          .select();

        if (attErr) throw attErr;

        setAttachments((prev) => [...prev, data[0]]);
      } catch (err) {
        alert('Errore caricamento allegato: ' + err.message);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleDeleteAttachment = async (attId) => {
    if (isViewer) return;
    if (!window.confirm('Vuoi rimuovere questo allegato?')) return;

    try {
      const { error } = await supabase.from('attachments').delete().eq('id', attId);
      if (error) throw error;
      setAttachments((prev) => prev.filter((a) => a.id !== attId));
    } catch (err) {
      alert('Errore eliminazione allegato: ' + err.message);
    }
  };

  const handleRemovePendingFile = (index) => {
    if (isViewer) return;
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (isViewer) return;
    if (!title.trim()) {
      alert('Inserisci un titolo per la scheda.');
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      if (!currentUserId) {
        alert("Sessione utente non valida. Riapri l'applicazione.");
        return;
      }

      if (isNew) {
        const newCardPayload = {
          id: `card-${Date.now()}`,
          user_id: currentUserId,
          column_id: String(columnId),
          title: title.trim(),
          description: description.trim(),
          position: 0
        };

        const { data: createdCard, error } = await supabase
          .from('cards')
          .insert([newCardPayload])
          .select();

        if (error) throw error;
        const newCard = createdCard[0];

        const uploadedAttachments = [];
        if (pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            const fileExt = file.name.split('.').pop();
            const filePath = `${newCard.id}/${Date.now()}_${file.name}`;

            const { error: uploadErr } = await supabase.storage
              .from('card-attachments')
              .upload(filePath, file);

            if (!uploadErr) {
              const { data: publicUrlData } = supabase.storage
                .from('card-attachments')
                .getPublicUrl(filePath);

              const newAttachment = {
                id: `att-${Date.now()}-${Math.random()}`,
                card_id: newCard.id,
                user_id: currentUserId,
                file_name: file.name,
                file_url: publicUrlData.publicUrl
              };

              const { data: attData } = await supabase
                .from('attachments')
                .insert([newAttachment])
                .select();

              if (attData) uploadedAttachments.push(attData[0]);
            }
          }
        }

        onSaveCard({ ...newCard, attachments: uploadedAttachments }, true);
      } else {
        const { error } = await supabase
          .from('cards')
          .update({ title, description })
          .eq('id', card.id);

        if (error) throw error;
        onSaveCard({ ...card, title, description, attachments }, false);
      }
      onClose();
    } catch (err) {
      alert('Errore salvataggio: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/30 flex items-center justify-center p-3 z-50 text-xs">
      <div className="bg-white border rounded-xl w-full max-w-md p-4 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm text-slate-800">
            {isViewer ? 'Dettagli Scheda (Sola Lettura)' : isNew ? 'Nuova Scheda' : 'Dettagli Scheda'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        {/* TITOLO */}
        <div className="mb-2.5">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Titolo</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isViewer}
            readOnly={isViewer}
            placeholder="Inserisci il titolo..."
            autoFocus={!isViewer}
            className={`w-full border rounded px-2.5 py-1.5 text-sm font-semibold focus:outline-none ${
              isViewer ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'focus:border-blue-500'
            }`}
          />
        </div>

        {/* DESCRIZIONE */}
        <div className="mb-3">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Descrizione / Note</label>
          <textarea
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isViewer}
            readOnly={isViewer}
            placeholder={isViewer ? 'Nessuna descrizione.' : 'Aggiungi dettagli, note o istruzioni...'}
            className={`w-full border rounded p-2 text-sm focus:outline-none ${
              isViewer ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed' : 'focus:border-blue-500'
            }`}
          />
        </div>

        {/* ALLEGATI */}
        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Allegati</label>
          <div className="space-y-1.5 mb-2 max-h-28 overflow-y-auto">
            {attachments.map((att) => (
              <div key={att.id} className="flex justify-between items-center bg-slate-50 p-1.5 rounded border text-[11px]">
                <span className="truncate max-w-[180px] font-medium text-slate-700">📎 {att.file_name}</span>
                <div className="flex items-center gap-2">
                  <a href={att.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">
                    Apri ↗
                  </a>
                  {!isViewer && (
                    <button
                      onClick={() => handleDeleteAttachment(att.id)}
                      title="Elimina allegato"
                      className="text-slate-400 hover:text-red-600 transition p-0.5 rounded"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}

            {!isViewer && pendingFiles.map((f, idx) => (
              <div key={idx} className="flex justify-between items-center bg-blue-50/60 p-1.5 rounded border border-blue-200 text-[11px]">
                <span className="truncate max-w-[180px] font-medium text-slate-700">📎 {f.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-blue-600 font-semibold">(In attesa)</span>
                  <button
                    onClick={() => handleRemovePendingFile(idx)}
                    title="Rimuovi"
                    className="text-slate-400 hover:text-red-600 font-bold transition px-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {attachments.length === 0 && pendingFiles.length === 0 && (
              <p className="text-[10px] text-slate-400 italic">Nessun allegato presente.</p>
            )}
          </div>

          {!isViewer && (
            <label className="inline-block bg-slate-100 hover:bg-slate-200 border text-slate-700 px-2.5 py-1 rounded cursor-pointer font-medium text-[10px]">
              {uploading ? 'Elaborazione...' : '+ Carica File'}
              <input type="file" onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>
          )}
        </div>

        {/* AZIONI */}
        <div className="flex justify-between items-center pt-3 border-t">
          {!isViewer && !isNew ? (
            <button
              onClick={() => {
                if (window.confirm('Cancellare questa scheda?')) onDeleteCard(card.id);
              }}
              className="text-red-500 hover:underline text-[11px] font-medium"
            >
              Elimina Scheda
            </button>
          ) : <div />}

          <div className="flex gap-2">
            {isViewer ? (
              <button onClick={onClose} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded font-bold">
                Chiudi
              </button>
            ) : (
              <>
                <button onClick={onClose} className="border px-3 py-1.5 rounded text-slate-600 font-medium">Annulla</button>
                <button onClick={handleSave} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-bold">
                  {uploading ? 'Salvataggio...' : isNew ? 'Crea Scheda' : 'Salva'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}