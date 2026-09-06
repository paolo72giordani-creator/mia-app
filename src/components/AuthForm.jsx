import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthForm() {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email || !password) return setError('Inserisci sia email che password.');

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Registrazione completata! Puoi effettuare il login.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 p-6 rounded-xl max-w-xs w-full shadow-sm text-xs">
        <div className="text-center mb-4">
          <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-sm mx-auto mb-2">
            DK
          </div>
          <h1 className="text-lg font-bold text-blue-600">Doceo Kanban</h1>
          <p className="text-slate-400 mt-0.5">{authMode === 'login' ? 'Accedi al tuo account' : 'Crea un nuovo account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2 mb-3">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full border rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500" 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full border rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500" 
          />
          {error && <p className="text-red-500 text-[10px] font-medium">{error}</p>}
          {message && <p className="text-green-600 text-[10px] font-medium">{message}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 rounded transition">
            {authMode === 'login' ? 'Accedi' : 'Registrati'}
          </button>
        </form>

        <div className="relative my-3 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <span className="relative bg-white px-2 text-[10px] text-slate-400 uppercase">oppure</span>
        </div>

        <button 
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} 
          className="w-full border text-slate-600 hover:bg-slate-50 py-1.5 rounded font-medium transition"
        >
          Accedi con Google
        </button>

        <div className="mt-3 text-center">
          <button 
            onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }} 
            className="text-[11px] text-blue-600 hover:underline"
          >
            {authMode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
          </button>
        </div>
      </div>
    </div>
  );
}