import React, { useState } from 'react';
import { Lock, UserPlus, LogIn, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface AuthScreenProps {
  onLogin: () => void; // No longer passing User object directly, App handles session
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLoginMode) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Session handled by onAuthStateChange in App.tsx
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Compte créé ! Veuillez vérifier vos emails pour confirmer.');
        setIsLoginMode(true);
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-50 p-8 text-center border-b border-slate-100">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">CommentAI</h1>
          <p className="text-slate-500 mt-2">
            {isLoginMode ? 'Connectez-vous à votre espace Cloud' : 'Créez votre compte sécurisé'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adresse Email</label>
            <div className="relative">
                <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ex: thomas@entreprise.com"
                />
                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-sans"
                placeholder="••••••••"
              />
              <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            </div>
            {!isLoginMode && <p className="text-xs text-slate-400 mt-1">6 caractères minimum</p>}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full flex-shrink-0" />
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm mt-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isLoginMode ? <><LogIn size={20} /> Se connecter</> : <><UserPlus size={20} /> Créer mon compte</>)}
          </button>
        </form>

        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <button
            onClick={() => { setIsLoginMode(!isLoginMode); setError(''); setMessage(''); }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isLoginMode 
              ? "Pas encore de compte ? S'inscrire" 
              : "J'ai déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
};