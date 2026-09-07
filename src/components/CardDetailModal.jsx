import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function CardDetailModal({
  card,
  columnId,
  isViewer,
  onClose,
  onSaveCard,
  onDeleteCard
}) {
  const isNew = !card;
  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || card?.details || '');
  const [attachments, setAttachments] = useState(card?.attachments || []);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const filesArray = Array.from(e.target.files).map((f) => ({
      id: `pending-${Date.now()}-${Math.random()}`,
      file: f
    }));
    setPendingFiles((prev) => [...prev, ...filesArray]);
  };

  const handleRemovePendingFile = (id) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleRemoveAttachment = async (attachmentId) => {
    if (isViewer) return;
    try {
      await supabase.from('attachments').delete().eq('id', attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      alert('Errore eliminazione allegato: ' + err.message);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const currentCardId = card?.id || `card-${Date.now()}`;

      const cardPayload = {
        id: currentCardId,
        column_id: String(columnId),
        title: title.trim(),
        description: description.trim(),
        position: card?.position ?? Math.floor(Math.random() * 1000) // <--- Corretto qui (intero piccolo)
      };

      const { data: savedCard, error: cardError } = await supabase
        .from('cards')
        .upsert([cardPayload])
        .select()
        .single();

      if (cardError) throw cardError;

      // Caricamento allegati in sospeso su Storage
      if (pendingFiles && pendingFiles.length > 0) {
        for (const fileObj of pendingFiles) {
          const fileExt = fileObj.file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${currentCardId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(filePath, fileObj.file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('attachments')
            .getPublicUrl(filePath);

          await supabase.from('attachments').insert([
            {
              card_id: currentCardId,
              file_name: fileObj.file.name,
              file_url: urlData.publicUrl
            }
          ]);
        }
      }

      if (onSaveCard) {
        onSaveCard(savedCard, isNew);
      }
      onClose();
    } catch (err) {
      alert('Errore durante il salvataggio: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          disabled={isSaving}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 font-bold"
        >
          ✕
        </button>

        <h2 className="text-lg font-black text-slate-900 mb-4">
          {isNew ? 'Nuova Scheda' : 'Dettagli Scheda'}
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Titolo
            </label>
            <input
              type="text"
              required
              readOnly={isViewer}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Verifica scritta di Storia"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Descrizione / Note
            </label>
            <textarea
              rows={4}
              readOnly={isViewer}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Aggiungi dettagli, istruzioni o appunti..."
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 font-medium resize-none"
            />
          </div>

          {/* ALLEGATI */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Allegati
            </label>

            {/* Lista allegati salvati */}
            {attachments.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <a
                      href={att.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline font-medium truncate max-w-[200px]"
                    >
                      📎 {att.file_name}
                    </a>
                    {!isViewer && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="text-red-500 hover:text-red-700 font-bold ml-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Lista file in attesa di caricamento */}
            {pendingFiles.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {pendingFiles.map((pf) => (
                  <div
                    key={pf.id}
                    className="flex justify-between items-center bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className="truncate max-w-[200px] font-medium">
                      📎 {pf.file.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-blue-600 font-bold">(In attesa)</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePendingFile(pf.id)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pulsante aggiungi file */}
            {!isViewer && (
              <label className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition mt-1">
                <span>+ Carica File</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* BARRA AZIONI */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-4">
            {!isViewer && !isNew ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Cancellare questa scheda?')) onDeleteCard(card.id);
                }}
                className="text-red-500 hover:underline text-xs font-medium"
              >
                Elimina Scheda
              </button>
            ) : <div />}

            <div className="flex gap-2">
              {isViewer ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-xl font-bold text-xs"
                >
                  Chiudi
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="border px-3.5 py-1.5 rounded-xl text-slate-600 font-medium text-xs hover:bg-slate-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`bg-blue-600 text-white px-4 py-1.5 rounded-xl font-bold text-xs transition ${
                      isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 shadow-md shadow-blue-500/20'
                    }`}
                  >
                    {isSaving ? 'Salvataggio in corso...' : isNew ? 'Crea Scheda' : 'Salva'}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}