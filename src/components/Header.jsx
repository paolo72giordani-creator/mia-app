import React from 'react';
import { supabase } from '../supabaseClient';

export default function Header({ userEmail }) {
  return (
    <header className="border-b bg-white px-4 py-2.5 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
          DK
        </div>
        <h1 className="font-bold text-sm text-slate-800">Doceo Kanban</h1>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-slate-500 font-medium">{userEmail}</span>
        <button 
          onClick={() => supabase.auth.signOut()} 
          className="border px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
        >
          Esci
        </button>
      </div>
    </header>
  );
}