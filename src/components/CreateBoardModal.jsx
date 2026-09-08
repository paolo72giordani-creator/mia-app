import React, { useState } from 'react';

const TEACHING_TEMPLATES = [
  {
    id: 'empty',
    name: 'Bacheca vuota',
    icon: '📄',
    description: 'Una bacheca completamente personalizzabile da zero.',
    columns: [

    ]
  },
  {
    id: 'ud',
    name: 'Unità Didattica / Lezione',
    icon: '📚',
    description: 'Ideale per strutturare gli argomenti di una materia, materiali e verifiche.',
    columns: [
      { name: 'Obiettivi & Risorse', color: 'bg-sky-600' },
      { name: 'Spiegazione / Attività', color: 'bg-amber-600' },
      { name: 'Verifiche / Valutazioni', color: 'bg-rose-600' },
      { name: 'Archivio / Fatto', color: 'bg-emerald-600' }
    ]
  },
  {
    id: 'group_project',
    name: 'Lavoro di Gruppo / PCTO',
    icon: '👥',
    description: 'Gestisci i ruoli degli studenti, i compiti assegnati e i deliverable.',
    columns: [
      { name: 'Ideazione & Brief', color: 'bg-indigo-600' },
      { name: 'In Lavorazione', color: 'bg-blue-600' },
      { name: 'In Revisione Docente', color: 'bg-purple-600' },
      { name: 'Consegnato', color: 'bg-emerald-600' }
    ]
  },
  {
    id: 'pei_pdp',
    name: 'Inclusione (PEI / PDP)',
    icon: '🧩',
    description: 'Pianificazione di strategie, misure dispensative e obiettivi personalizzati.',
    columns: [
      { name: 'Analisi & Strategie', color: 'bg-teal-600' },
      { name: 'Strumenti Compensativi', color: 'bg-cyan-600' },
      { name: 'Attività in Corso', color: 'bg-amber-600' },
      { name: 'Obiettivi Raggiunti', color: 'bg-emerald-600' }
    ]
  },
  {
    id: 'class_council',
    name: 'Consiglio di Classe',
    icon: '🏫',
    description: 'Pianifica odg, programmazioni disciplinari, uscite didattiche e verbali.',
    columns: [
      { name: 'Ordine del Giorno', color: 'bg-slate-700' },
      { name: 'Programmazione & Uscite', color: 'bg-indigo-600' },
      { name: 'Segnalazioni / Note', color: 'bg-rose-600' },
      { name: 'Approvato / Concluso', color: 'bg-emerald-600' }
    ]
  },

  /* TEMPLATE SPECIFICI PER GRIGLIE DI VALUTAZIONE */
  {
    id: 'rubric_italiano',
    name: 'Griglia Valutazione: Italiano (Produzione/Comprende)',
    icon: '✍️',
    description: 'Valutazione di testi scritti, temi e analisi del testo.',
    columns: [
      { name: 'Aderenza alla traccia & Contenuto', color: 'bg-blue-600' },
      { name: 'Correttezza grammaticale', color: 'bg-rose-600' },
      { name: 'Sintassi & Lessico', color: 'bg-amber-600' },
      { name: 'Coerenza & Struttura', color: 'bg-emerald-600' }
    ]
  },
  {
    id: 'rubric_matematica',
    name: 'Griglia Valutazione: Matematica / STEM',
    icon: '📐',
    description: 'Correzione e valutazione di problemi, equazioni e prove pratiche.',
    columns: [
      { name: 'Comprensione del problema', color: 'bg-sky-600' },
      { name: 'Applicazione di formule/procedimenti', color: 'bg-indigo-600' },
      { name: 'Accuratezza dei calcoli', color: 'bg-amber-600' },
      { name: 'Argomentazione & Rappresentazione', color: 'bg-emerald-600' }
    ]
  },
  {
    id: 'rubric_lingue',
    name: 'Griglia Valutazione: Lingue Straniere',
    icon: '🌍',
    description: 'Criteri per prove scritte e orali secondo il quadro QCER.',
    columns: [
      { name: 'Fluency & Pronuncia', color: 'bg-teal-600' },
      { name: 'Vocabolario & Registro', color: 'bg-blue-600' },
      { name: 'Grammatica & Struttura', color: 'bg-purple-600' },
      { name: 'Comprensione & Interazione', color: 'bg-emerald-600' }
    ]
  },
  {
    id: 'rubric_umanistiche',
    name: 'Griglia Valutazione: Storia & Filosofia / Umanistiche',
    icon: '🏛️',
    description: 'Valutazione dell argomentazione storica, concettuale e delle fonti.',
    columns: [
      { name: 'Conoscenza dei fatti/concetti', color: 'bg-slate-600' },
      { name: 'Uso del lessico specifico', color: 'bg-indigo-600' },
      { name: 'Capacità di sintesi & Contestualizzazione', color: 'bg-amber-600' },
      { name: 'Rielaborazione critica', color: 'bg-emerald-600' }
    ]
  }
];

export default function CreateBoardModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(TEACHING_TEMPLATES[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate(title.trim(), selectedTemplate);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-black text-slate-900">
            Crea nuova bacheca
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* NOME BACHECA */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nome della bacheca
            </label>
            <input
              type="text"
              required
              placeholder="Es. Griglia Temi 3A / Verifica Algebra"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* SELEZIONE TEMPLATES */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Scegli un modello didattico o una griglia
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {TEACHING_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate.id === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between text-left ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{tmpl.icon}</span>
                      <h3 className="font-extrabold text-xs text-slate-900 truncate">
                        {tmpl.name}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug font-medium line-clamp-2">
                      {tmpl.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BOTTONI DI CONFERMA */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-md shadow-blue-500/20"
            >
              Crea Bacheca
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}