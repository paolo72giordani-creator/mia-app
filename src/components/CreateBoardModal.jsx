import React, { useState } from 'react';
import { BOARD_TEMPLATES } from '../data/templates';

export default function CreateBoardModal({ onClose, onCreate }) {
  const [boardTitle, setBoardTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(BOARD_TEMPLATES[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!boardTitle.trim()) return;
    onCreate(boardTitle.trim(), selectedTemplate);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-slate-900">Nuova Bacheca</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Titolo della bacheca
            </label>
            <input
              type="text"
              placeholder="es. Matematica 3A, Progetto PCTO..."
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              autoFocus
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Scegli un modello (Template)
            </label>

            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
              {BOARD_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-300'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-2xl">{tmpl.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-bold text-xs text-slate-900">{tmpl.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-snug">{tmpl.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
            >
              Crea Bacheca
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}