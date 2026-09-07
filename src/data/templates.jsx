export const BOARD_TEMPLATES = [
  {
    id: 'empty',
    title: 'Bacheca Vuota',
    icon: '➕',
    description: 'Parte da zero con una bacheca completamente personalizzabile.',
    columns: []
  },
  {
    id: 'lesson-plan',
    title: 'Unità Didattica / Lezione',
    icon: '📚',
    description: 'Struttura ideale per progettare moduli didattici e lezioni.',
    columns: [
      { name: '🎯 Obiettivi & Prerequisiti', color: 'bg-blue-600' },
      { name: '📄 Materiali & Link', color: 'bg-indigo-600' },
      { name: '✍️ Attività in Classe', color: 'bg-emerald-600' },
      { name: '🏠 Compiti a Casa', color: 'bg-amber-600' },
      { name: '📊 Valutazione & Verifiche', color: 'bg-rose-600' }
    ]
  },
  {
    id: 'group-project',
    title: 'Progetto di Gruppo Studenti',
    icon: '👥',
    description: 'Gestione del workflow per lavori a squadre e compiti di realtà.',
    columns: [
      { name: '💡 Idee & Brainstorming', color: 'bg-purple-600' },
      { name: '📌 Da Fare', color: 'bg-slate-800' },
      { name: '⚙️ In Corso', color: 'bg-blue-600' },
      { name: '👀 In Revisione Docente', color: 'bg-amber-600' },
      { name: '✅ Completato', color: 'bg-emerald-600' }
    ]
  },
  {
    id: 'class-management',
    title: 'Consiglio di Classe / ODG',
    icon: '🏫',
    description: 'Organizzazione di riunioni, punti all’ordine del giorno e delibere.',
    columns: [
      { name: '📋 Ordine del Giorno', color: 'bg-blue-600' },
      { name: '📁 Documenti & Circolari', color: 'bg-slate-800' },
      { name: '📝 Note & Discussione', color: 'bg-amber-600' },
      { name: '✔️ Delibere & Decisioni', color: 'bg-emerald-600' }
    ]
  }
];