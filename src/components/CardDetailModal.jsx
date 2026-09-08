import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function CardDetailModal({
  card,
  columnId,
  currentUser,
  isViewer,
  onClose,
  onSaveCard,
  onDeleteCard
}) {
  const isNew = !card;
  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || card?.details || '');
  const [attachments, setAttachments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Carica gli allegati salvati su Supabase ogni volta che il componente si apre o il card cambia
  useEffect(() => {
    if (card && card.id) {
      if (card.attachments && Array.isArray(card.attachments)) {
        setAttachments(card.attachments);
      }
      fetchAttachments(card.id);
    } else {
      setAttachments([]);
    }
  }, [card]);

  const fetchAttachments = async (cardId) => {
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('card_id', String(cardId));

      if (!error && data) {
        setAttachments(data);
      }
    } catch (err) {
      console.error('Errore recupero allegati:', err);
    }
  };

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

  const handleDeleteCardWithAttachments = async () => {
    if (!card?.id || isSaving) return;
    if (!window.confirm('Cancellare questa scheda e tutti i suoi allegati?')) return;

    setIsSaving(true);
    try {
      const currentCardId = String(card.id);

      // A. Recupera tutti i file memorizzati nel DB per questa scheda
      const { data: dbAttachments } = await supabase
        .from('attachments')
        .select('file_url')
        .eq('card_id', currentCardId);

      const filesToDelete = [];

      // Estrae i path dai file memorizzati
      if (dbAttachments && dbAttachments.length > 0) {
        dbAttachments.forEach((att) => {
          if (att.file_url) {
            const parts = att.file_url.split('/card-attachments/');
            if (parts.length > 1) {
              filesToDelete.push(decodeURIComponent(parts[1]));
            }
          }
        });
      }

      // B. Recupera anche eventuali altri file presenti nella cartella dello storage
      const { data: storageFiles } = await supabase.storage
        .from('card-attachments')
        .list(currentCardId);

      if (storageFiles && storageFiles.length > 0) {
        storageFiles.forEach((f) => {
          const path = `${currentCardId}/${f.name}`;
          if (!filesToDelete.includes(path)) {
            filesToDelete.push(path);
          }
        });
      }

      // C. Elimina i file dallo Storage
      if (filesToDelete.length > 0) {
        const { error: storageErr } = await supabase.storage
          .from('card-attachments')
          .remove(filesToDelete);

        if (storageErr) {
          console.error('Errore Storage Remove:', storageErr.message);
        }
      }

      // D. Elimina le righe dal DB
      await supabase.from('attachments').delete().eq('card_id', currentCardId);

      // E. Elimina la scheda
      if (onDeleteCard) {
        await onDeleteCard(card.id);
      }

      onClose();
    } catch (err) {
      alert("Errore durante l'eliminazione: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || currentUser?.id;

      const currentCardId = card?.id || `card-${Date.now()}`;

      const cardPayload = {
        id: currentCardId,
        user_id: userId,
        column_id: String(columnId),
        title: title.trim(),
        description: description.trim(),
        position: card?.position ?? Math.floor(Math.random() * 1000)
      };

      // 1. Salva/Aggiorna la Scheda
      const { data: savedCard, error: cardError } = await supabase
        .from('cards')
        .upsert([cardPayload])
        .select()
        .single();

      if (cardError) throw cardError;

      const newlyUploadedAttachments = [];

      // 2. Carica i file su 'card-attachments' e crea le righe nella tabella 'attachments'
      if (pendingFiles && pendingFiles.length > 0) {
        for (const fileObj of pendingFiles) {
          const fileExt = fileObj.file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${currentCardId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('card-attachments')
            .upload(filePath, fileObj.file);

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('card-attachments')
            .getPublicUrl(filePath);

          const { data: attData, error: attError } = await supabase
            .from('attachments')
            .insert([
              {
                id: `att-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
                card_id: currentCardId,
                user_id: userId,
                file_name: fileObj.file.name,
                file_url: urlData.publicUrl
              }
            ])
            .select()
            .single();

          if (attError) throw attError;

          if (attData) {
            newlyUploadedAttachments.push(attData);
          }
        }
      }

      // Costruisce l'oggetto scheda aggiornato includendo tutti gli allegati
      const completeCard = {
        ...savedCard,
        attachments: [...attachments, ...newlyUploadedAttachments]
      };

      if (onSaveCard) {
        onSaveCard(completeCard, isNew);
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
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 font-medium text-slate-800"
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
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-blue-500 font-medium resize-none text-slate-800"
            />
          </div>

          {/* ALLEGATI */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Allegati
            </label>

            {/* Allegati salvati su Supabase */}
            {attachments && attachments.length > 0 && (
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

            {/* File in attesa di salvataggio */}
            {pendingFiles && pendingFiles.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {pendingFiles.map((pf) => (
                  <div
                    key={pf.id}
                    className="flex justify-between items-center bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className="truncate max-w-[200px] font-medium">
                      📎 {pf.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingFile(pf.id)}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Bottone Seleziona File */}
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
                onClick={handleDeleteCardWithAttachments}
                disabled={isSaving}
                className="text-red-500 hover:underline text-xs font-medium disabled:opacity-50"
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